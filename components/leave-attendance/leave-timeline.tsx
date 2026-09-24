"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"

import { Initials } from "@/components/common"
import { expectedFor, type ScheduleInput } from "@/lib/schedules/derive"
import { coverage } from "@/lib/leave/reconcile"
import { holidaysBetween } from "@/lib/fixtures/ghanaHolidays"
import { LEAVE_TYPE_LABEL, formatDate, fullName } from "@/lib/format"
import type { Employee, LeaveRequest } from "@/lib/types"
import { cn } from "@/lib/utils"

const DAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"]

/**
 * People down, days across, with leave drawn across the days it covers.
 *
 * Approved leave is solid and says what it is; pending is dashed and
 * says "Pending", because the difference decides whether anyone can
 * plan around it. Days nobody is expected to work are muted and say so,
 * so a quiet Saturday is never mistaken for a week off.
 */
export function LeaveTimeline({
  scope,
  dates,
  leave,
  input,
  coverWarnPercent,
  onOpen,
}: {
  scope: Employee[]
  dates: string[]
  leave: LeaveRequest[]
  input: ScheduleInput
  coverWarnPercent: number
  onOpen: (request: LeaveRequest) => void
}) {
  const departments = [...new Set(scope.map((e) => e.department))].sort()
  const cover = coverage(scope, dates, leave, coverWarnPercent)

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <caption className="sr-only">
          Team leave, {formatDate(dates[0])} to{" "}
          {formatDate(dates[dates.length - 1])}. Each block opens the request
          behind it.
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-20 min-w-[190px] border-b bg-card px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
            >
              Employee
            </th>
            {dates.map((d) => {
              const day = new Date(`${d}T00:00:00`)
              const holiday = holidaysBetween(d, d)[0]
              return (
                <th
                  key={d}
                  scope="col"
                  className={cn(
                    "min-w-[34px] border-b px-1 py-2 text-center text-[11px] font-medium text-muted-foreground",
                    holiday ? "bg-muted" : "bg-muted/40"
                  )}
                >
                  <span className="block" aria-hidden>
                    {DAY_LETTER[day.getDay()]}
                  </span>
                  {holiday ? (
                    <span
                      className="mx-auto mt-0.5 grid size-5 place-items-center rounded bg-card text-[10px] font-semibold text-foreground"
                      title={holiday.name}
                    >
                      H
                    </span>
                  ) : (
                    <span className="tabular block">{day.getDate()}</span>
                  )}
                  <span className="sr-only">
                    {formatDate(d)}
                    {holiday && `, ${holiday.name}`}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {departments.map((department) => (
            <React.Fragment key={department}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={dates.length + 1}
                  className="sticky left-0 z-10 border-b bg-muted/60 px-4 py-1.5 text-left text-xs font-semibold"
                >
                  {department}
                </th>
              </tr>

              {scope
                .filter((e) => e.department === department)
                .map((e) => (
                  <tr key={e.id} className="group">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b bg-card px-4 py-2 text-left font-normal group-hover:bg-muted/30"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Initials person={e} size="sm" />
                        <span className="block truncate text-sm font-medium">
                          {fullName(e)}
                        </span>
                      </span>
                    </th>

                    {dates.map((date) => {
                      const request = leave.find(
                        (l) =>
                          l.employeeId === e.id &&
                          (l.status === "approved" || l.status === "pending") &&
                          l.startDate <= date &&
                          l.endDate >= date
                      )
                      const holiday = holidaysBetween(date, date)[0]
                      const working = expectedFor(e, date, input) !== null

                      return (
                        <td
                          key={date}
                          className={cn(
                            "border-b p-0.5 text-center",
                            holiday && "bg-muted/40",
                            !working && !request && "bg-muted/20"
                          )}
                        >
                          {request ? (
                            <button
                              type="button"
                              onClick={() => onOpen(request)}
                              aria-label={`${fullName(e)}, ${formatDate(date)}: ${LEAVE_TYPE_LABEL[request.type]} leave, ${request.status === "approved" ? "approved" : "pending"}. ${request.days} days from ${formatDate(request.startDate)}.`}
                              className={cn(
                                "grid h-7 w-full place-items-center rounded text-[10px] font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                                request.status === "approved"
                                  ? "bg-info-muted text-info"
                                  : "border border-dashed border-muted-foreground/60 text-muted-foreground"
                              )}
                            >
                              {request.status === "approved"
                                ? LEAVE_TYPE_LABEL[request.type][0]
                                : "P"}
                            </button>
                          ) : (
                            <span
                              className="grid h-7 place-items-center text-[10px] text-muted-foreground/60"
                              aria-hidden
                            >
                              {holiday ? "H" : working ? "" : "·"}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}

              <tr>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b bg-card px-4 py-1.5 text-left text-[11px] font-normal text-muted-foreground"
                >
                  Cover
                </th>
                {dates.map((date) => {
                  const cell = cover.find(
                    (c) => c.department === department && c.date === date
                  )
                  if (!cell) return <td key={date} className="border-b" />
                  return (
                    <td
                      key={date}
                      className={cn(
                        "border-b px-0.5 py-1 text-center text-[10px]",
                        cell.warn
                          ? "bg-warning-muted font-semibold text-warning-foreground"
                          : "text-muted-foreground"
                      )}
                      title={`${cell.away} of ${cell.headcount} away`}
                    >
                      <span className="sr-only">
                        {department}, {formatDate(date)}: {cell.away} of{" "}
                        {cell.headcount} away
                        {cell.warn && ", above the coverage threshold"}
                      </span>
                      <span aria-hidden className="tabular">
                        {cell.away > 0 ? `${cell.away}/${cell.headcount}` : "–"}
                      </span>
                    </td>
                  )
                })}
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** The key underneath, since no block is only a colour. */
export function TimelineLegend({ warnPercent }: { warnPercent: number }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span className="grid size-5 place-items-center rounded bg-info-muted text-[10px] font-semibold text-info">
          A
        </span>
        Approved leave, by first letter of the type
      </li>
      <li className="flex items-center gap-1.5">
        <span className="grid size-5 place-items-center rounded border border-dashed border-muted-foreground/60 text-[10px] font-semibold">
          P
        </span>
        Pending
      </li>
      <li className="flex items-center gap-1.5">
        <span className="grid size-5 place-items-center rounded bg-muted text-[10px] font-semibold">
          H
        </span>
        Public holiday
      </li>
      <li className="flex items-center gap-1.5">
        <span className="grid size-5 place-items-center rounded bg-muted/40 text-[10px]">
          ·
        </span>
        Not a working day for that person
      </li>
      <li className="flex items-center gap-1.5">
        <AlertTriangle
          className="size-3.5 text-warning-foreground"
          aria-hidden
        />
        Cover shaded where {warnPercent}% or more of a department is away
      </li>
    </ul>
  )
}
