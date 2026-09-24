"use client"

import * as React from "react"
import { CalendarRange, MessageSquare } from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Panel, Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useStore } from "@/lib/store"
import {
  breakSummary,
  expectedFor,
  hoursSummary,
  patternForDate,
  shiftsOn,
} from "@/lib/schedules/derive"
import type { ScheduleInput } from "@/lib/schedules/derive"
import type { Shift } from "@/lib/schedules/types"
import { holidaysBetween } from "@/lib/fixtures/ghanaHolidays"
import { addDays, datesBetween, formatHours } from "@/lib/time"
import { LEAVE_TYPE_LABEL, TODAY_ISO, formatDate, fullName } from "@/lib/format"
import { expectedHours } from "@/lib/schedules/derive"
import type { Employee } from "@/lib/types"

/**
 * What someone is working, for the next fortnight.
 *
 * Read-only on purpose. If a shift does not work for them, the answer
 * is a word with their manager, not a marketplace of swaps behind the
 * manager's back.
 */
export function MySchedule({
  employee,
  input,
}: {
  employee: Employee
  input: ScheduleInput
}) {
  const store = useStore()
  const [flagging, setFlagging] = React.useState<Shift | null>(null)
  const [note, setNote] = React.useState("")

  const dates = datesBetween(TODAY_ISO, addDays(TODAY_ISO, 13))
  const pattern = patternForDate(employee, TODAY_ISO, input)

  const days = dates.map((date) => {
    const holiday = holidaysBetween(date, date)[0]
    const leave = store.leaveRequests.find(
      (l) =>
        l.employeeId === employee.id &&
        (l.status === "approved" || l.status === "pending") &&
        l.startDate <= date &&
        l.endDate >= date
    )
    const shift = shiftsOn(input.shifts, date, employee.id).find(
      (s) => s.state === "published"
    )
    return {
      date,
      holiday,
      leave,
      shift,
      expected: expectedFor(employee, date, input),
    }
  })

  const working = days.filter((d) => d.expected && !d.holiday && !d.leave)

  function sendNote() {
    if (!flagging) return
    store.addNotification({
      title: `${fullName(employee)} can't work a shift`,
      body: `${formatDate(flagging.date)}, ${flagging.start}–${flagging.end}: ${note.trim()}`,
      kind: "system",
      href: "/schedules",
    })
    toast.success("Your line manager has been told")
    setFlagging(null)
    setNote("")
  }

  return (
    <div className="space-y-4">
      {pattern && (
        <Panel
          description="Your working pattern, which is what your attendance is measured against."
          bodyClassName="px-5 py-4"
        >
          <p className="text-sm">
            <strong className="font-semibold">{pattern.name}</strong> ·{" "}
            {hoursSummary(pattern)} · {breakSummary(pattern)}
          </p>
        </Panel>
      )}

      <Panel
        description={`The next two weeks · ${working.length} working ${working.length === 1 ? "day" : "days"}`}
        bodyClassName="p-0"
      >
        {days.every((d) => !d.expected && !d.holiday && !d.leave) ? (
          <EmptyState
            icon={CalendarRange}
            title="Nothing scheduled"
            description="When your manager publishes a roster, or you are put on a work pattern, it appears here."
          />
        ) : (
          <ul className="divide-y">
            {days.map((d) => (
              <li
                key={d.date}
                className="flex flex-wrap items-center gap-3 px-5 py-3"
              >
                <span className="w-[150px] shrink-0">
                  <span className="block text-sm font-medium">
                    {formatDate(d.date)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(`${d.date}T00:00:00`).toLocaleDateString(
                      "en-GB",
                      { weekday: "long" }
                    )}
                  </span>
                </span>

                <span className="min-w-0 flex-1">
                  {d.holiday ? (
                    <Pill tone="neutral">H · {d.holiday.name}</Pill>
                  ) : d.leave ? (
                    <Pill
                      tone={d.leave.status === "approved" ? "info" : "neutral"}
                    >
                      {d.leave.status === "approved"
                        ? `V · ${LEAVE_TYPE_LABEL[d.leave.type]} leave`
                        : `Pending ${LEAVE_TYPE_LABEL[d.leave.type].toLowerCase()} leave`}
                    </Pill>
                  ) : d.expected ? (
                    <span className="text-sm">
                      <span className="tabular font-medium">
                        {d.expected.start}–{d.expected.end}
                      </span>
                      <span className="text-muted-foreground">
                        {" · "}
                        {d.shift
                          ? `${d.shift.position}, ${d.shift.branch}`
                          : employee.branch}
                        {" · "}
                        {d.expected.breakMinutes} min break
                        {" · "}
                        {formatHours(expectedHours(d.expected))}
                      </span>
                      {d.shift?.note && (
                        <span className="block text-xs text-muted-foreground">
                          {d.shift.note}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Not a working day
                    </span>
                  )}
                </span>

                {d.shift && !d.leave && !d.holiday && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0"
                    onClick={() => setFlagging(d.shift!)}
                  >
                    <MessageSquare className="size-3.5" />
                    Can&apos;t work this shift
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {flagging && (
        <Dialog open onOpenChange={(o) => !o && setFlagging(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tell your line manager</DialogTitle>
              <DialogDescription>
                {formatDate(flagging.date)}, {flagging.start}–{flagging.end},{" "}
                {flagging.position}. They decide what happens to the shift.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why you can't work it, and anything that would help."
              aria-label="Note to your line manager"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setFlagging(null)}>
                Cancel
              </Button>
              <Button disabled={note.trim().length < 4} onClick={sendNote}>
                Send note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
