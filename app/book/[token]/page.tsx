"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { CalendarCheck, CalendarPlus, Clock, MapPin, Video } from "lucide-react"

import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/talent/form"
import { Input } from "@/components/ui/input"
import { useStore } from "@/lib/store"
import { TODAY } from "@/lib/format"
import {
  TIME_ZONES,
  buildIcs,
  canChange,
  formatSlotDay,
  formatSlotTime,
  groupByDay,
  holidayDates,
  slotsFor,
  addMinutes,
} from "@/lib/booking/slots"
import { linkProblem } from "@/lib/booking/plan"
import { cn } from "@/lib/utils"

function useTimeZone() {
  const [tz, setTz] = React.useState("Africa/Accra")
  React.useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Accra")
    } catch {
      // Keep the company's zone.
    }
  }, [])
  return [tz, setTz] as const
}

function Shell({
  company,
  children,
}: {
  company: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            {company.slice(0, 1).toUpperCase()}
          </span>
          <span className="text-sm font-medium">{company}</span>
        </div>
        {children}
      </div>
    </main>
  )
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-md rounded-xl border p-8 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}

export default function BookingPage() {
  const { token } = useParams<{ token: string }>()
  const store = useStore()
  const [tz, setTz] = useTimeZone()
  const [rescheduling, setRescheduling] = React.useState(false)
  const [picked, setPicked] = React.useState<string | null>(null)
  const [day, setDay] = React.useState<string | null>(null)
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [error, setError] = React.useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = React.useState(false)

  const company = store.company.tradingName || store.company.legalName
  const booking = store.bookings.find((b) => b.token === token)
  const page =
    booking && store.bookingPages.find((p) => p.id === booking.pageId)
  const candidate =
    booking && store.candidates.find((c) => c.id === booking.candidateId)
  const req =
    candidate &&
    store.requisitions.find((r) => r.id === candidate.requisitionId)

  const slots = React.useMemo(() => {
    if (!page || !booking) return []
    const rows = (store.tables["public-holidays"] ?? []) as {
      date?: string
      observed?: string
    }[]
    const y = TODAY.getFullYear()
    return slotsFor(page, {
      now: TODAY,
      availability: store.availability,
      leave: store.leaveRequests,
      holidays: [...holidayDates(rows, y), ...holidayDates(rows, y + 1)],
      bookings: store.bookings,
      pages: store.bookingPages,
      ignoreBookingId: booking.id,
    })
  }, [
    page,
    booking,
    store.availability,
    store.leaveRequests,
    store.tables,
    store.bookings,
    store.bookingPages,
  ])

  if (!store.ready)
    return (
      <Shell company={company}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Shell>
    )

  const problem = linkProblem(booking, TODAY.toISOString().slice(0, 10))
  if (problem || !booking || !page || !candidate)
    return (
      <Shell company={company}>
        <Message
          title="This link cannot be used"
          body={problem ?? "This booking page is no longer open."}
        />
      </Shell>
    )

  const zones = TIME_ZONES.includes(tz) ? TIME_ZONES : [tz, ...TIME_ZONES]
  const role = req?.title ?? "the role"
  const first = candidate.name.split(" ")[0]
  const booked =
    booking.status === "booked" && booking.slotStart && !rescheduling

  const detail = (
    <aside className="space-y-3 text-sm md:w-64 md:shrink-0 md:border-r md:pr-6">
      <p className="text-xs text-muted-foreground">{company}</p>
      <h1 className="text-lg font-semibold">{page.name}</h1>
      <p className="text-muted-foreground">For {role}</p>
      <p className="flex items-center gap-2">
        <Clock className="size-4 text-muted-foreground" />
        {page.durationMin} minutes
      </p>
      <p className="flex items-center gap-2">
        {page.video === "in_person" ? (
          <MapPin className="size-4 text-muted-foreground" />
        ) : (
          <Video className="size-4 text-muted-foreground" />
        )}
        {page.video === "in_person"
          ? page.videoLink
          : "Video call, link in your confirmation"}
      </p>
    </aside>
  )

  /* ── Booked: the confirmation ── */
  if (booked) {
    const start = booking.slotStart!
    const zone = booking.timeZone ?? tz
    const end = addMinutes(start, page.durationMin)
    const changeable = canChange(page, start, TODAY)
    const interviewer = store.employeeById(booking.interviewerId ?? undefined)

    function downloadIcs() {
      const ics = buildIcs({
        uid: booking!.id,
        start,
        end,
        summary: `${page!.name}: ${company}`,
        description: `Interview for ${role}${booking!.link ? `\nJoin: ${booking!.link}` : ""}`,
        location:
          booking!.link ??
          (page!.video === "in_person" ? page!.videoLink : undefined),
        stamp: booking!.bookedOn ? `${booking!.bookedOn}T09:00:00Z` : start,
      })
      const url = URL.createObjectURL(
        new Blob([ics], { type: "text/calendar;charset=utf-8" })
      )
      const a = document.createElement("a")
      a.href = url
      a.download = "interview.ics"
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    return (
      <Shell company={company}>
        <div className="rounded-xl border p-6 md:flex md:gap-8">
          {detail}
          <div className="mt-6 flex-1 md:mt-0">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <CalendarCheck className="size-4" />
              Confirmed
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              You are booked, {first}.
            </h2>
            <p className="mt-3 text-sm">
              {formatSlotDay(start, tz)} at {formatSlotTime(start, tz)}
              <span className="text-muted-foreground">
                {" "}
                ({tz.replace("_", " ")})
              </span>
            </p>
            {interviewer && (
              <p className="mt-1 text-sm text-muted-foreground">
                With {interviewer.firstName} {interviewer.lastName},{" "}
                {interviewer.jobTitle}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {booking.link && (
                <Button asChild>
                  <a
                    href={booking.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Video className="size-4" />
                    Join
                  </a>
                </Button>
              )}
              <Button variant="outline" onClick={downloadIcs}>
                <CalendarPlus className="size-4" />
                Add to calendar
              </Button>
            </div>
            <div className="mt-6 border-t pt-4">
              {changeable ? (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRescheduling(true)
                      setPicked(null)
                      // They have already answered; do not ask again.
                      setAnswers(booking!.answers)
                    }}
                  >
                    Reschedule
                  </Button>
                  {!confirmCancel ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmCancel(true)}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <>
                      <span className="text-muted-foreground">
                        Cancel this interview?
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          store.cancelBooking(token, "candidate")
                          setConfirmCancel(false)
                        }}
                      >
                        Yes, cancel
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmCancel(false)}
                      >
                        Keep it
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  It is less than {page.cancelCutoffHours} hours away, so it can
                  no longer be changed here. Please contact the recruiter.
                </p>
              )}
            </div>
            {zone !== tz && (
              <p className="mt-3 text-xs text-muted-foreground">
                Shown in your time zone. Booked from {zone.replace("_", " ")}.
              </p>
            )}
          </div>
        </div>
      </Shell>
    )
  }

  /* ── Choosing a time ── */
  const days = groupByDay(slots, tz)
  const activeDay = days.find((d) => d.day === day) ?? days[0]
  const chosen = slots.find((s) => s.start === picked)

  function confirm() {
    setError(null)
    if (!picked) return
    // A missing answer is theirs to fix, so it keeps the time they chose.
    const missing = page!.questions.find((q) => !(answers[q] ?? "").trim())
    if (missing) {
      setError(`Please answer: ${missing}`)
      return
    }
    const r = store.makeBooking(token, picked, tz, answers)
    if (!r.ok) {
      // The time itself is the problem, so go back to choosing.
      setError(r.reason)
      setPicked(null)
      return
    }
    setRescheduling(false)
  }

  return (
    <Shell company={company}>
      <div className="rounded-xl border p-6 md:flex md:gap-8">
        {detail}
        <div className="mt-6 min-w-0 flex-1 md:mt-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">
              {rescheduling ? "Choose a new time" : `Choose a time, ${first}`}
            </h2>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Time zone
              <NativeSelect
                value={tz}
                onChange={(e) => {
                  setTz(e.target.value)
                  setPicked(null)
                }}
                className="h-8 w-auto text-xs"
              >
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z.replace("_", " ")}
                  </option>
                ))}
              </NativeSelect>
            </label>
          </div>

          {rescheduling && !chosen && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 -ml-2"
              onClick={() => setRescheduling(false)}
            >
              ← Keep my current time
            </Button>
          )}

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-destructive/30 bg-danger-muted/40 px-3 py-2 text-sm"
            >
              {error}
            </p>
          )}

          {days.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              There are no free times right now. Please check back soon, or
              contact the recruiter.
            </p>
          ) : chosen ? (
            <div className="mt-5 space-y-4">
              <p className="text-sm">
                <strong className="font-medium">
                  {formatSlotDay(chosen.start, tz)}
                </strong>{" "}
                at{" "}
                <strong className="font-medium">
                  {formatSlotTime(chosen.start, tz)}
                </strong>
                <span className="text-muted-foreground">
                  {" "}
                  · {tz.replace("_", " ")}
                </span>
              </p>
              {page.questions.map((q, i) => (
                <div key={q}>
                  <label
                    htmlFor={`q-${i}`}
                    className="mb-1.5 block text-sm font-medium"
                  >
                    {q}
                  </label>
                  <Input
                    id={`q-${i}`}
                    value={answers[q] ?? ""}
                    onChange={(e) =>
                      setAnswers((a) => ({ ...a, [q]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <Button onClick={confirm}>
                  {rescheduling ? "Confirm new time" : "Confirm booking"}
                </Button>
                <Button variant="ghost" onClick={() => setPicked(null)}>
                  Choose another time
                </Button>
                {rescheduling && (
                  <Button
                    variant="ghost"
                    onClick={() => setRescheduling(false)}
                  >
                    Keep my current time
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-6 sm:grid-cols-[220px_1fr]">
              <ul className="space-y-1" aria-label="Days">
                {days.map((d) => (
                  <li key={d.day}>
                    <button
                      type="button"
                      onClick={() => setDay(d.day)}
                      aria-current={
                        activeDay?.day === d.day ? "date" : undefined
                      }
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        activeDay?.day === d.day
                          ? "bg-success-muted font-medium text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      <span>
                        {formatSlotDay(d.slots[0].start, tz).replace(
                          / \d{4}$/,
                          ""
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {d.slots.length}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div>
                <p className="mb-2 text-sm font-medium">
                  {activeDay && formatSlotDay(activeDay.slots[0].start, tz)}
                </p>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {activeDay?.slots.map((s) => (
                    <li key={s.start}>
                      <button
                        type="button"
                        onClick={() => setPicked(s.start)}
                        className="w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-success-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {formatSlotTime(s.start, tz)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
