"use client"

import * as React from "react"
import { AlertTriangle, Clock, Pencil, Send } from "lucide-react"
import { toast } from "sonner"

import { Panel, Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { DayCodeBadge } from "./day-code"
import { formatHours } from "@/lib/attendance/derive"
import {
  TIMESHEET_STATUS_LABEL,
  statusFor,
  summarise,
} from "@/lib/attendance/timesheet"
import type { DayRecord, PayPeriod } from "@/lib/attendance/types"
import { useStore } from "@/lib/store"
import { LEAVE_TYPE_LABEL, formatDate, fullName } from "@/lib/format"
import type { LeaveType } from "@/lib/types"
import { cn } from "@/lib/utils"

function Figure({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone?: "danger" | "primary"
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "tabular mt-0.5 text-lg leading-tight font-semibold",
          tone === "danger" && "text-destructive",
          tone === "primary" && "text-primary"
        )}
      >
        {value}
      </dd>
    </div>
  )
}

/** What one person sees: their own period, and a way to query a day. */
export function TimesheetEmployee({
  period,
  records,
  onOpenDay,
}: {
  period: PayPeriod
  records: DayRecord[]
  onOpenDay: (r: DayRecord) => void
}) {
  const store = useStore()
  const me = store.session.id
  const status = statusFor(store.timesheets, period.id, me)
  const sheet = store.timesheets.find(
    (t) => t.periodId === period.id && t.employeeId === me
  )
  const s = summarise(me, records, status)
  const locked = period.status === "closed" || status === "approved"

  return (
    <>
      <Panel className="mb-4" bodyClassName="px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{period.label}</span>
              <Pill
                tone={
                  status === "approved"
                    ? "success"
                    : status === "changesRequested"
                      ? "danger"
                      : status === "notSubmitted"
                        ? "neutral"
                        : "warning"
                }
              >
                {TIMESHEET_STATUS_LABEL[status]}
              </Pill>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDate(period.start)} – {formatDate(period.end)}
            </p>
          </div>

          {!locked && (
            <Button
              onClick={() => {
                store.submitTimesheet(period.id, me)
                toast.success("Timesheet submitted for review")
              }}
            >
              <Send className="size-4" />
              {status === "changesRequested" ? "Resubmit" : "Submit timesheet"}
            </Button>
          )}
        </div>

        {sheet?.comment && status === "changesRequested" && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-danger-muted px-3 py-2.5 text-sm">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden
            />
            <span>
              <strong className="font-medium">Changes requested</strong>
              {sheet.decidedBy && (
                <> by {fullName(store.employeeById(sheet.decidedBy))}</>
              )}
              : {sheet.comment}
            </span>
          </p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3 lg:grid-cols-6">
          <Figure label="Hours" value={formatHours(s.worked)} />
          <Figure label="Scheduled" value={formatHours(s.scheduled)} />
          <Figure
            label="Variance"
            value={formatHours(s.variance, { signed: true })}
            tone={
              s.variance < 0 ? "danger" : s.variance > 0 ? "primary" : undefined
            }
          />
          <Figure label="Days present" value={s.daysPresent} />
          <Figure
            label="No record"
            value={s.noRecordDays}
            tone={s.noRecordDays > 0 ? "danger" : undefined}
          />
          <Figure label="Adjustments" value={s.adjustmentCount} />
        </dl>

        {s.autoClosedDays > 0 && (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle
              className="size-3.5 text-warning-foreground"
              aria-hidden
            />
            {s.autoClosedDays}{" "}
            {s.autoClosedDays === 1 ? "day was" : "days were"} closed by the
            system with no clock-out. Request a correction on each.
          </p>
        )}
      </Panel>

      <Panel
        title="Day by day"
        description="Open any day to see what the clock captured, and to query it."
        bodyClassName="p-0"
      >
        <ul className="divide-y">
          {records.map((r) => (
            <li
              key={r.date}
              className={cn(
                "flex flex-wrap items-center gap-3 px-4 py-3 md:px-5",
                r.code === "-" && "bg-muted/20"
              )}
            >
              <span className="w-[130px] shrink-0 text-sm font-medium">
                {formatDate(r.date)}
              </span>

              {r.code === "-" ? (
                <span className="text-sm text-muted-foreground">
                  Not a working day
                </span>
              ) : r.code === "V" ? (
                <span className="flex items-center gap-2 text-sm">
                  <DayCodeBadge code="V" />
                  <span className="text-muted-foreground">
                    {LEAVE_TYPE_LABEL[r.leaveType as LeaveType]} leave
                  </span>
                </span>
              ) : r.code === "H" ? (
                <span className="flex items-center gap-2 text-sm">
                  <DayCodeBadge code="H" />
                  <span className="text-muted-foreground">{r.holidayName}</span>
                </span>
              ) : (
                <>
                  <span className="tabular w-[120px] shrink-0 text-sm text-muted-foreground">
                    {r.scheduled
                      ? `${r.scheduled.start}–${r.scheduled.end}`
                      : "—"}
                  </span>
                  <span className="tabular w-[150px] shrink-0 text-sm">
                    {r.clockIn || r.clockOut ? (
                      <>
                        {r.clockIn ?? "—"} → {r.clockOut ?? "—"}
                        {r.source && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            {r.source === "web" ? "web" : "fingerprint"}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        Nothing captured
                      </span>
                    )}
                  </span>
                  <span className="tabular w-[70px] shrink-0 text-sm">
                    {formatHours(r.hours)}
                  </span>
                  <span
                    className={cn(
                      "tabular w-[90px] shrink-0 text-sm",
                      r.varianceHours < 0
                        ? "text-destructive"
                        : r.varianceHours > 0
                          ? "text-primary"
                          : "text-muted-foreground"
                    )}
                  >
                    {formatHours(r.varianceHours, { signed: true })}
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {r.code === "N" && <DayCodeBadge code="N" />}
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
                  </span>
                </>
              )}

              {r.code !== "-" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={() => onOpenDay(r)}
                >
                  {r.code === "N" || r.autoClosed
                    ? "Request correction"
                    : "View day"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </>
  )
}
