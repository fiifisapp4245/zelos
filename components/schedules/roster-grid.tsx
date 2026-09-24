"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Plus } from "lucide-react"

import { Initials } from "@/components/common"
import { ShiftChip, shiftLabel } from "./shift-chip"
import { liveShifts, shiftHours } from "@/lib/schedules/derive"
import type { RosterWarning, Shift } from "@/lib/schedules/types"
import { holidaysBetween } from "@/lib/fixtures/ghanaHolidays"
import { LEAVE_TYPE_LABEL, formatDate, fullName } from "@/lib/format"
import { formatHours } from "@/lib/time"
import type { Employee, LeaveRequest } from "@/lib/types"
import { cn } from "@/lib/utils"

const DAY_NAME = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface Row {
  kind: "open" | "employee"
  department: string
  employee?: Employee
}

/**
 * People down, days across, grouped by department.
 *
 * The first column and the header stay put while the days scroll, and
 * the scrolling happens inside this container so the page itself never
 * moves sideways. Arrow keys walk the cells and Enter opens one, because
 * building a week by mouse alone is slow work.
 */
export function RosterGrid({
  scope,
  dates,
  shifts,
  leave,
  warnings,
  onOpenShift,
  onNewShift,
  canEdit,
}: {
  scope: Employee[]
  dates: string[]
  shifts: Shift[]
  leave: LeaveRequest[]
  warnings: RosterWarning[]
  onOpenShift: (shift: Shift) => void
  onNewShift: (employeeId: string | null, date: string) => void
  canEdit: boolean
}) {
  const [collapsed, setCollapsed] = React.useState<string[]>([])
  const [active, setActive] = React.useState({ row: 0, col: 0 })
  const gridRef = React.useRef<HTMLTableSectionElement>(null)

  const departments = [...new Set(scope.map((e) => e.department))].sort()

  const rows: Row[] = departments.flatMap((department) =>
    collapsed.includes(department)
      ? []
      : [
          { kind: "open" as const, department },
          ...scope
            .filter((e) => e.department === department)
            .map((employee) => ({
              kind: "employee" as const,
              department,
              employee,
            })),
        ]
  )

  const warnedShiftIds = new Set(warnings.flatMap((w) => w.shiftIds))

  function move(dRow: number, dCol: number) {
    const row = Math.min(Math.max(active.row + dRow, 0), rows.length - 1)
    const col = Math.min(Math.max(active.col + dCol, 0), dates.length - 1)
    setActive({ row, col })
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-cell="${row}-${col}"]`)
      ?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const moves: Record<string, [number, number]> = {
      ArrowRight: [0, 1],
      ArrowLeft: [0, -1],
      ArrowDown: [1, 0],
      ArrowUp: [-1, 0],
    }
    const delta = moves[e.key]
    if (!delta) return
    e.preventDefault()
    move(delta[0], delta[1])
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <caption className="sr-only">
          Shift roster, {formatDate(dates[0])} to{" "}
          {formatDate(dates[dates.length - 1])}. Arrow keys move between cells;
          Enter opens one.
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-20 min-w-[200px] border-b bg-card px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
            >
              Who
            </th>
            {dates.map((d) => {
              const day = new Date(`${d}T00:00:00`)
              const holiday = holidaysBetween(d, d)[0]
              const scheduled = liveShifts(shifts).filter(
                (s) => s.date === d
              ).length
              return (
                <th
                  key={d}
                  scope="col"
                  className={cn(
                    "min-w-[150px] border-b px-2 py-2 text-center text-xs font-medium",
                    holiday ? "bg-muted" : "bg-muted/40"
                  )}
                >
                  <span className="block text-muted-foreground">
                    {DAY_NAME[day.getDay()]}{" "}
                    <span className="tabular">{day.getDate()}</span>
                  </span>
                  {holiday ? (
                    <span className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-foreground">
                      <span
                        className="grid size-4 place-items-center rounded bg-card text-[10px]"
                        aria-hidden
                      >
                        H
                      </span>
                      <span className="truncate">{holiday.name}</span>
                    </span>
                  ) : (
                    <span className="tabular mt-0.5 block text-[11px] font-normal text-muted-foreground">
                      {scheduled} scheduled
                    </span>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody ref={gridRef} onKeyDown={onKeyDown}>
          {departments.map((department) => {
            const isCollapsed = collapsed.includes(department)
            const people = scope.filter((e) => e.department === department)
            const deptShifts = liveShifts(shifts).filter(
              (s) => s.department === department
            )
            return (
              <React.Fragment key={department}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={dates.length + 1}
                    className="sticky left-0 z-10 border-b bg-muted/60 px-4 py-1.5 text-left"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsed((c) =>
                          c.includes(department)
                            ? c.filter((x) => x !== department)
                            : [...c, department]
                        )
                      }
                      aria-expanded={!isCollapsed}
                      className="flex items-center gap-1.5 rounded text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="size-3.5" aria-hidden />
                      ) : (
                        <ChevronDown className="size-3.5" aria-hidden />
                      )}
                      {department}
                      <span className="tabular font-normal text-muted-foreground">
                        · {people.length}{" "}
                        {people.length === 1 ? "person" : "people"} ·{" "}
                        {formatHours(
                          deptShifts.reduce((n, s) => n + shiftHours(s), 0)
                        )}
                      </span>
                    </button>
                  </th>
                </tr>

                {rows
                  .filter((r) => r.department === department)
                  .map((row) => {
                    const rowIndex = rows.indexOf(row)
                    return (
                      <tr key={`${department}-${row.employee?.id ?? "open"}`}>
                        <th
                          scope="row"
                          className="sticky left-0 z-10 border-b bg-card px-4 py-2 text-left font-normal"
                        >
                          {row.kind === "open" ? (
                            <span className="text-xs font-medium text-muted-foreground">
                              Open shifts
                            </span>
                          ) : (
                            <span className="flex min-w-0 items-center gap-2.5">
                              <Initials person={row.employee!} size="sm" />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">
                                  {fullName(row.employee)}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {row.employee!.branch}
                                </span>
                              </span>
                            </span>
                          )}
                        </th>

                        {dates.map((date, col) => {
                          const cellShifts = shifts.filter(
                            (s) =>
                              s.date === date &&
                              s.department === department &&
                              (row.kind === "open"
                                ? s.employeeId === null
                                : s.employeeId === row.employee!.id)
                          )
                          const onLeave =
                            row.kind === "employee"
                              ? leave.find(
                                  (l) =>
                                    l.employeeId === row.employee!.id &&
                                    (l.status === "approved" ||
                                      l.status === "pending") &&
                                    l.startDate <= date &&
                                    l.endDate >= date
                                )
                              : undefined
                          const holiday = holidaysBetween(date, date)[0]
                          const focusable =
                            active.row === rowIndex && active.col === col

                          return (
                            <td
                              key={date}
                              className={cn(
                                "border-b p-1 align-top",
                                holiday && "bg-muted/40"
                              )}
                            >
                              <div className="space-y-1">
                                {onLeave && (
                                  <span
                                    className={cn(
                                      "block rounded-lg border px-2 py-1 text-[11px]",
                                      onLeave.status === "approved"
                                        ? "border-info/40 bg-info-muted text-info"
                                        : "border-dashed border-muted-foreground/50 bg-card text-muted-foreground"
                                    )}
                                  >
                                    {onLeave.status === "approved"
                                      ? `V · ${LEAVE_TYPE_LABEL[onLeave.type]} leave`
                                      : "Pending leave"}
                                  </span>
                                )}

                                {cellShifts.map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    data-cell={`${rowIndex}-${col}`}
                                    tabIndex={focusable ? 0 : -1}
                                    onFocus={() =>
                                      setActive({ row: rowIndex, col })
                                    }
                                    onClick={() => onOpenShift(s)}
                                    aria-label={`${row.kind === "open" ? "Open shift" : fullName(row.employee)}, ${formatDate(date)}: ${shiftLabel(s)}`}
                                    className="block w-full rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                  >
                                    <ShiftChip
                                      shift={s}
                                      warned={warnedShiftIds.has(s.id)}
                                    />
                                  </button>
                                ))}

                                {cellShifts.length === 0 && (
                                  <button
                                    type="button"
                                    data-cell={`${rowIndex}-${col}`}
                                    tabIndex={focusable ? 0 : -1}
                                    disabled={!canEdit}
                                    onFocus={() =>
                                      setActive({ row: rowIndex, col })
                                    }
                                    onClick={() =>
                                      onNewShift(
                                        row.kind === "open"
                                          ? null
                                          : row.employee!.id,
                                        date
                                      )
                                    }
                                    aria-label={`Add a shift for ${row.kind === "open" ? "nobody in particular" : fullName(row.employee)} on ${formatDate(date)}`}
                                    className={cn(
                                      "grid h-10 w-full place-items-center rounded-lg border border-dashed border-transparent text-muted-foreground transition-colors",
                                      canEdit &&
                                        "hover:border-ring/50 hover:bg-muted/50",
                                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40"
                                    )}
                                  >
                                    {canEdit && (
                                      <Plus className="size-3.5" aria-hidden />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
              </React.Fragment>
            )
          })}
        </tbody>

        <tfoot>
          <tr>
            <th
              scope="row"
              className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
            >
              Scheduled
            </th>
            {dates.map((date) => {
              const day = liveShifts(shifts).filter((s) => s.date === date)
              return (
                <td
                  key={date}
                  className="px-2 py-2.5 text-center text-xs text-muted-foreground"
                >
                  <span className="tabular block font-medium text-foreground">
                    {formatHours(day.reduce((n, s) => n + shiftHours(s), 0))}
                  </span>
                  <span className="tabular">
                    {new Set(day.map((s) => s.employeeId).filter(Boolean)).size}{" "}
                    on
                  </span>
                </td>
              )
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
