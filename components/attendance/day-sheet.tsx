"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, Fingerprint, Globe } from "lucide-react"
import { toast } from "sonner"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Initials, Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DayCodeBadge } from "./day-code"
import { useStore } from "@/lib/store"
import { formatHours } from "@/lib/attendance/derive"
import type { DayRecord } from "@/lib/attendance/types"
import {
  LEAVE_TYPE_LABEL,
  formatDate,
  formatDateTime,
  fullName,
} from "@/lib/format"
import type { LeaveType } from "@/lib/types"

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b py-2.5 last:border-0">
      <dt className="w-[150px] shrink-0 text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm">{children}</dd>
    </div>
  )
}

/**
 * One person, one day, in full. The same sheet opens from a register cell
 * and from a timesheet row, so the detail never differs between them.
 */
export function DaySheet({
  record,
  onClose,
}: {
  record: DayRecord | null
  onClose: () => void
}) {
  if (!record) return null
  // Keyed by the day, so opening another one seeds the form fresh rather
  // than resetting it from an effect after the fact.
  return (
    <DaySheetBody
      key={`${record.employeeId}-${record.date}`}
      record={record}
      onClose={onClose}
    />
  )
}

function DaySheetBody({
  record,
  onClose,
}: {
  record: DayRecord
  onClose: () => void
}) {
  const store = useStore()
  const [correcting, setCorrecting] = React.useState(false)
  const [noting, setNoting] = React.useState(false)
  const [note, setNote] = React.useState("")
  const [inAt, setInAt] = React.useState(record.clockIn ?? "")
  const [outAt, setOutAt] = React.useState(record.clockOut ?? "")
  const [reason, setReason] = React.useState("")

  const employee = store.employeeById(record.employeeId)
  const SourceIcon = record.source === "web" ? Globe : Fingerprint

  function submitCorrection() {
    if (reason.trim().length < 5) return
    store.requestCorrection({
      eventId: `ce-${record.employeeId}-${record.date}`,
      employeeId: record.employeeId,
      date: record.date,
      field: "both",
      originalIn: record.clockIn,
      originalOut: record.clockOut,
      correctedIn: inAt || null,
      correctedOut: outAt || null,
      reason: reason.trim(),
    })
    toast.success("Correction requested. The original reading stays on file.")
    onClose()
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[520px]"
      >
        <SheetHeader className="space-y-0 border-b px-5 py-4 text-left">
          <SheetTitle className="text-base">
            {formatDate(record.date)}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Attendance detail for {fullName(employee)} on{" "}
            {formatDate(record.date)}
          </SheetDescription>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {employee && <Initials person={employee} size="md" />}
            <div className="min-w-0">
              <p className="text-sm font-medium">{fullName(employee)}</p>
              <p className="text-xs text-muted-foreground">
                {employee?.jobTitle} · {employee?.department}
              </p>
            </div>
            <span className="ml-auto">
              <DayCodeBadge code={record.code} />
            </span>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <dl>
            <Row label="Scheduled">
              {record.scheduled
                ? `${record.scheduled.start} – ${record.scheduled.end}`
                : "Not a working day"}
            </Row>
            <Row label="Captured">
              {record.clockIn || record.clockOut ? (
                <span className="tabular">
                  {record.clockIn ?? "—"} → {record.clockOut ?? "—"}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Nothing captured for this day
                </span>
              )}
            </Row>
            {record.source && (
              <Row label="Source">
                <span className="flex items-center gap-1.5">
                  <SourceIcon className="size-3.5 text-muted-foreground" />
                  {record.source === "web" ? "Web" : "Fingerprint"}
                  <span className="text-muted-foreground">
                    · {record.branch}
                  </span>
                </span>
              </Row>
            )}
            <Row label="Break">
              {record.breakMinutes ? `${record.breakMinutes} minutes` : "None"}
            </Row>
            <Row label="Total">
              <span className="tabular font-medium">
                {formatHours(record.hours)}
              </span>
              {record.scheduled && (
                <span className="tabular ml-2 text-xs text-muted-foreground">
                  {formatHours(record.varianceHours, { signed: true })} against
                  schedule
                </span>
              )}
            </Row>
            {record.leaveRequestId && (
              <Row label="Leave">
                <Link
                  href="/leave"
                  className="rounded font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {LEAVE_TYPE_LABEL[record.leaveType as LeaveType]} leave
                </Link>
                <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                  {record.leaveRequestId}
                </span>
              </Row>
            )}
            {record.holidayName && (
              <Row label="Public holiday">{record.holidayName}</Row>
            )}
          </dl>

          {record.autoClosed && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-warning/35 bg-warning-muted px-3 py-2.5 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
              <span>
                <strong className="font-medium">Auto-closed.</strong> No
                clock-out was captured, so the system closed the day. The hours
                stand at zero until a correction is approved.
              </span>
            </p>
          )}

          {record.adjustments.length > 0 && (
            <section className="mt-5" aria-labelledby="adj-heading">
              <h3
                id="adj-heading"
                className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
              >
                Adjustment history
              </h3>
              <ul className="space-y-2">
                {record.adjustments.map((a) => (
                  <li key={a.id} className="rounded-lg border px-3 py-2.5">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm">
                      <span className="tabular text-muted-foreground line-through">
                        {a.originalIn ?? "—"} → {a.originalOut ?? "—"}
                      </span>
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                      <span className="tabular font-medium text-primary">
                        {a.correctedIn ?? "—"} → {a.correctedOut ?? "—"}
                      </span>
                      <Pill
                        tone={
                          a.status === "approved"
                            ? "success"
                            : a.status === "declined"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {a.status === "pending"
                          ? "Awaiting decision"
                          : a.status}
                      </Pill>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requested by {fullName(store.employeeById(a.requestedBy))}{" "}
                      · {formatDateTime(a.requestedAt)}
                      {a.decidedBy && (
                        <>
                          {" "}
                          · decided by{" "}
                          {fullName(store.employeeById(a.decidedBy))}
                        </>
                      )}
                    </p>
                    <p className="mt-1 text-sm">“{a.reason}”</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {noting && (
            <section
              className="mt-5 rounded-lg border p-3"
              aria-label="Add a note"
            >
              <Label
                htmlFor="day-note"
                className="mb-1.5 block text-xs font-medium"
              >
                Note
              </Label>
              <Textarea
                id="day-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Context for whoever reviews this day."
              />
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  disabled={note.trim().length < 3}
                  onClick={() => {
                    toast.success("Note added to the day.")
                    setNote("")
                    setNoting(false)
                  }}
                >
                  Save note
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setNoting(false)}
                >
                  Cancel
                </Button>
              </div>
            </section>
          )}

          {correcting && (
            <section
              className="mt-5 rounded-lg border p-3"
              aria-label="Request a correction"
            >
              <p className="mb-3 text-xs text-muted-foreground">
                The captured reading stays on file. This files a correction
                against it for your manager to decide.
              </p>
              <div className="flex gap-3">
                <div className="min-w-0 flex-1">
                  <Label
                    htmlFor="corr-in"
                    className="mb-1.5 block text-xs font-medium"
                  >
                    Clock-in
                  </Label>
                  <Input
                    id="corr-in"
                    type="time"
                    className="h-9"
                    value={inAt}
                    onChange={(e) => setInAt(e.target.value)}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Label
                    htmlFor="corr-out"
                    className="mb-1.5 block text-xs font-medium"
                  >
                    Clock-out
                  </Label>
                  <Input
                    id="corr-out"
                    type="time"
                    className="h-9"
                    value={outAt}
                    onChange={(e) => setOutAt(e.target.value)}
                  />
                </div>
              </div>
              <Label
                htmlFor="corr-why"
                className="mt-3 mb-1.5 block text-xs font-medium"
              >
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="corr-why"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="What happened? This is kept with the correction."
              />
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  disabled={reason.trim().length < 5}
                  onClick={submitCorrection}
                >
                  Submit correction
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCorrecting(false)}
                >
                  Cancel
                </Button>
              </div>
            </section>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 border-t px-5 py-4">
          <Button size="sm" variant="outline" asChild>
            <Link href="/leave">Link to leave</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setNoting(true)}>
            Add note
          </Button>
          {!correcting && (
            <Button size="sm" onClick={() => setCorrecting(true)}>
              Request correction
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
