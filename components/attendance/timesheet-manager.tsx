"use client"

import * as React from "react"
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  FileCheck2,
  Lock,
  Pencil,
} from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Initials, Panel, Pill, Th } from "@/components/common"
import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DayCodeBadge } from "./day-code"
import {
  exceptionsFrom,
  formatHours,
  isResolved,
} from "@/lib/attendance/derive"
import {
  PERIOD_STATUS_LABEL,
  TIMESHEET_STATUS_LABEL,
  blockersFor,
  statusFor,
  summarise,
  type TimesheetSummary,
} from "@/lib/attendance/timesheet"
import type {
  DayRecord,
  PayPeriod,
  TimesheetStatus,
} from "@/lib/attendance/types"
import { useStore } from "@/lib/store"
import { formatDate, fullName } from "@/lib/format"
import type { Employee } from "@/lib/types"
import { cn } from "@/lib/utils"

const TABS: { id: TimesheetStatus; label: string }[] = [
  { id: "pendingReview", label: "Pending review" },
  { id: "changesRequested", label: "Changes requested" },
  { id: "approved", label: "Approved" },
  { id: "notSubmitted", label: "Not submitted" },
]

export function TimesheetManager({
  period,
  periods,
  onPeriodChange,
  scope,
  records,
  onOpenDay,
}: {
  period: PayPeriod
  periods: PayPeriod[]
  onPeriodChange: (id: string) => void
  scope: Employee[]
  records: DayRecord[]
  onOpenDay: (r: DayRecord) => void
}) {
  const store = useStore()
  const [tab, setTab] = React.useState<TimesheetStatus>("pendingReview")
  const [expanded, setExpanded] = React.useState<string[]>([])
  const [selected, setSelected] = React.useState<string[]>([])
  const [asking, setAsking] = React.useState<string[] | null>(null)
  const [comment, setComment] = React.useState("")
  const [confirmClose, setConfirmClose] = React.useState(false)

  const locked = period.status === "closed"

  const summaries: TimesheetSummary[] = scope.map((e) =>
    summarise(e.id, records, statusFor(store.timesheets, period.id, e.id))
  )
  const shown = summaries.filter((s) => s.status === tab)
  const approved = summaries.filter((s) => s.status === "approved").length

  const openExceptions = exceptionsFrom(records).filter(
    (i) => !isResolved(i, store.exceptionResolutions)
  ).length
  const blockers = blockersFor({ summaries, openExceptions })

  function decide(ids: string[], status: TimesheetStatus, note?: string) {
    store.decideTimesheet(period.id, ids, status, note)
    setSelected([])
    toast.success(
      status === "approved"
        ? `${ids.length} ${ids.length === 1 ? "timesheet" : "timesheets"} approved`
        : `Changes requested on ${ids.length} ${ids.length === 1 ? "timesheet" : "timesheets"}`
    )
  }

  return (
    <>
      <Panel className="mb-4" bodyClassName="px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{period.label}</span>
              <Pill
                tone={
                  locked
                    ? "neutral"
                    : period.status === "readyForPayroll"
                      ? "success"
                      : "warning"
                }
              >
                {locked && <Lock className="size-3" aria-hidden />}
                {PERIOD_STATUS_LABEL[period.status]}
              </Pill>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDate(period.start)} – {formatDate(period.end)}
            </p>
          </div>

          <p className="text-sm">
            <span className="tabular font-semibold">
              {approved}/{summaries.length}
            </span>{" "}
            <span className="text-muted-foreground">timesheets approved</span>
          </p>

          <p className="flex items-center gap-1.5 text-sm">
            <AlertTriangle
              className={cn(
                "size-4",
                openExceptions > 0
                  ? "text-warning-foreground"
                  : "text-muted-foreground"
              )}
              aria-hidden
            />
            <span className="tabular font-semibold">{openExceptions}</span>
            <span className="text-muted-foreground">open exceptions</span>
          </p>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="period-picker">
              Pay period
            </label>
            <select
              id="period-picker"
              value={period.id}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="h-9 rounded-lg border bg-card px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {p.status === "closed" ? " · closed" : ""}
                </option>
              ))}
            </select>

            {locked ? (
              <Pill tone="neutral">
                <Lock className="size-3" aria-hidden />
                Read-only
              </Pill>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* A disabled button gives no tooltip, so the wrapper
                      carries it and explains what is blocking. */}
                  <span>
                    <Button
                      disabled={blockers.length > 0}
                      onClick={() => setConfirmClose(true)}
                    >
                      <FileCheck2 className="size-4" />
                      Close pay period
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[260px]">
                  {blockers.length === 0
                    ? "Everything is approved and resolved."
                    : `Blocked: ${blockers.join(", ")}.`}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </Panel>

      <div
        role="group"
        aria-label="Filter by timesheet status"
        className="mb-4 flex flex-wrap items-center gap-1 rounded-xl border bg-card p-1"
      >
        {TABS.map((t) => {
          const n = summaries.filter((s) => s.status === t.id).length
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id)
                setSelected([])
              }}
              aria-pressed={tab === t.id}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                tab === t.id
                  ? "bg-success-muted font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {t.label}
              <span
                className={cn(
                  "tabular rounded-full px-1.5 text-xs",
                  tab === t.id
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {n}
              </span>
            </button>
          )
        })}
      </div>

      {shown.length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyState
            icon={FileCheck2}
            title={`No timesheets ${TABS.find((t) => t.id === tab)?.label.toLowerCase()}`}
            description="Move between the statuses above to see the rest of the period."
          />
        </Panel>
      ) : (
        <Panel bodyClassName="p-0">
          <ul className="divide-y">
            {shown.map((s) => {
              const employee = scope.find((e) => e.id === s.employeeId)!
              const open = expanded.includes(s.employeeId)
              const panelId = `ts-${s.employeeId}`
              return (
                <li key={s.employeeId}>
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-5">
                    {!locked && tab === "pendingReview" && (
                      <span className="flex w-8 shrink-0 justify-center">
                        <Checkbox
                          checked={selected.includes(s.employeeId)}
                          onCheckedChange={(v) =>
                            setSelected((list) =>
                              v === true
                                ? [...list, s.employeeId]
                                : list.filter((x) => x !== s.employeeId)
                            )
                          }
                          aria-label={`Select timesheet for ${fullName(employee)}`}
                        />
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((list) =>
                          open
                            ? list.filter((x) => x !== s.employeeId)
                            : [...list, s.employeeId]
                        )
                      }
                      aria-expanded={open}
                      aria-controls={panelId}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform",
                          open && "rotate-180"
                        )}
                        aria-hidden
                      />
                      <Initials person={employee} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {fullName(employee)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {employee.department}
                        </span>
                      </span>
                      <span className="tabular hidden shrink-0 text-sm sm:block">
                        {formatHours(s.worked)}
                        <span className="text-muted-foreground">
                          {" "}
                          / {formatHours(s.scheduled)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "tabular hidden w-[92px] shrink-0 text-right text-sm md:block",
                          s.variance < 0
                            ? "text-destructive"
                            : s.variance > 0
                              ? "text-primary"
                              : "text-muted-foreground"
                        )}
                      >
                        {formatHours(s.variance, { signed: true })}
                      </span>
                      <Pill
                        tone={
                          s.status === "approved"
                            ? "success"
                            : s.status === "changesRequested"
                              ? "danger"
                              : s.status === "notSubmitted"
                                ? "neutral"
                                : "warning"
                        }
                      >
                        {TIMESHEET_STATUS_LABEL[s.status]}
                      </Pill>
                    </button>

                    {!locked && s.status !== "approved" && (
                      <span className="flex shrink-0 gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => decide([s.employeeId], "approved")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAsking([s.employeeId])}
                        >
                          Request changes
                        </Button>
                      </span>
                    )}
                  </div>

                  {open && (
                    <div
                      id={panelId}
                      className="overflow-x-auto border-t bg-muted/20"
                    >
                      <DayTable records={s.records} onOpenDay={onOpenDay} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      {selected.length > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          className="sticky bottom-4 z-20 mx-auto mt-4 flex w-fit max-w-full flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg"
        >
          <p className="text-sm">
            <strong className="tabular font-semibold">{selected.length}</strong>{" "}
            selected
          </p>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear
          </Button>
          <Button size="sm" onClick={() => decide(selected, "approved")}>
            Approve selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAsking(selected)}
          >
            Request changes
          </Button>
        </div>
      )}

      {asking && (
        <FormDialog
          title={`Request changes on ${asking.length} ${asking.length === 1 ? "timesheet" : "timesheets"}`}
          description="The comment goes back to whoever submitted it, and stays on the timesheet."
          onClose={() => {
            setAsking(null)
            setComment("")
          }}
          footer={
            <>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  setAsking(null)
                  setComment("")
                }}
              >
                Cancel
              </Button>
              <Button
                size="lg"
                disabled={comment.trim().length < 5}
                onClick={() => {
                  decide(asking, "changesRequested", comment.trim())
                  setAsking(null)
                  setComment("")
                }}
              >
                Request changes
              </Button>
            </>
          }
        >
          <Label
            htmlFor="ts-comment"
            className="mb-1.5 block text-sm font-medium"
          >
            What needs changing? <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="ts-comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Be specific — they can only fix what you name."
          />
        </FormDialog>
      )}

      {confirmClose && (
        <FormDialog
          title={`Close ${period.label}?`}
          description="Closing locks the period. Days, corrections and approvals in it become read-only."
          onClose={() => setConfirmClose(false)}
          footer={
            <>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setConfirmClose(false)}
              >
                Cancel
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  store.closePayPeriod(period.id)
                  setConfirmClose(false)
                  toast.success(`${period.label} closed`)
                }}
              >
                Close the period
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            All {summaries.length} timesheets are approved and no exceptions
            remain open. Nothing in the period can be changed afterwards — a
            later correction would have to be carried into the next one.
          </p>
        </FormDialog>
      )}
    </>
  )
}

/** The days behind one person's total. */
function DayTable({
  records,
  onOpenDay,
}: {
  records: DayRecord[]
  onOpenDay: (r: DayRecord) => void
}) {
  const worked = records.filter((r) => r.code !== "-")
  if (worked.length === 0) {
    return (
      <p className="px-5 py-6 text-center text-sm text-muted-foreground">
        No scheduled days in this period.
      </p>
    )
  }

  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Days in this pay period</caption>
      <thead>
        <tr className="border-b">
          <Th className="pl-5">Date</Th>
          <Th>Scheduled</Th>
          <Th>Actual</Th>
          <Th>Break</Th>
          <Th>Total</Th>
          <Th>Variance</Th>
          <Th>Flags</Th>
          <Th className="pr-5 text-right">Actions</Th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {worked.map((r) => (
          <tr key={r.date}>
            <td className="py-2.5 pr-3 pl-5 whitespace-nowrap">
              {formatDate(r.date)}
            </td>
            <td className="tabular py-2.5 pr-3 whitespace-nowrap text-muted-foreground">
              {r.scheduled ? `${r.scheduled.start}–${r.scheduled.end}` : "—"}
            </td>
            <td className="tabular py-2.5 pr-3 whitespace-nowrap">
              {r.clockIn || r.clockOut
                ? `${r.clockIn ?? "—"} → ${r.clockOut ?? "—"}`
                : "—"}
            </td>
            <td className="tabular py-2.5 pr-3 whitespace-nowrap text-muted-foreground">
              {r.breakMinutes ? `${r.breakMinutes}m` : "—"}
            </td>
            <td className="tabular py-2.5 pr-3 whitespace-nowrap">
              {formatHours(r.hours)}
            </td>
            <td
              className={cn(
                "tabular py-2.5 pr-3 whitespace-nowrap",
                r.varianceHours < 0
                  ? "text-destructive"
                  : r.varianceHours > 0
                    ? "text-primary"
                    : "text-muted-foreground"
              )}
            >
              {r.scheduled
                ? formatHours(r.varianceHours, { signed: true })
                : "—"}
            </td>
            <td className="py-2.5 pr-3">
              <span className="flex flex-wrap gap-1">
                {r.code === "L" && (
                  <Pill tone="warning">
                    <Clock className="size-3" aria-hidden />
                    Late
                  </Pill>
                )}
                {r.autoClosed && (
                  <Pill tone="danger">
                    <AlertTriangle className="size-3" aria-hidden />
                    Auto-closed
                  </Pill>
                )}
                {r.adjustments.length > 0 && (
                  <Pill tone="info">
                    <Pencil className="size-3" aria-hidden />
                    Adjusted
                  </Pill>
                )}
                {r.overtimeHours > 0 && (
                  <Pill tone="success">
                    <Clock className="size-3" aria-hidden />
                    Overtime {formatHours(r.overtimeHours)}
                  </Pill>
                )}
                {r.code === "N" && <DayCodeBadge code="N" />}
                {r.code === "V" && <DayCodeBadge code="V" />}
                {r.code === "H" && <DayCodeBadge code="H" />}
              </span>
            </td>
            <td className="py-2.5 pr-5 text-right">
              <Button size="sm" variant="ghost" onClick={() => onOpenDay(r)}>
                View day
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
