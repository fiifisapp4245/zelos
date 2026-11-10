/**
 * Working out which times a candidate may book.
 *
 * Pure: the clock, the availability, leave, holidays and what is already
 * booked all come in as arguments, so the same inputs always give the same
 * slots and a slot can never be offered twice. Times are UTC, which is the
 * company's own time zone (Africa/Accra has no daylight saving); a candidate
 * sees them in theirs, converted at the edge.
 */
import type { Availability, Booking, BookingPage, LeaveRequest } from "../types"

export interface Slot {
  /** ISO instant, UTC. */
  start: string
  end: string
  interviewerId: string
}

export interface SlotContext {
  now: Date
  availability: Availability[]
  leave: LeaveRequest[]
  /** yyyy-mm-dd dates nobody works. */
  holidays: string[]
  /** Every booking, so busy time and the daily limit can be counted. */
  bookings: Booking[]
  pages: BookingPage[]
  /** A booking being moved: its own time is free again. */
  ignoreBookingId?: string
}

const MIN = 60_000

function parseHm(hm: string) {
  const [h, m] = hm.split(":").map(Number)
  return h * 60 + (m || 0)
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * MIN).toISOString()
}

/** Mon = 1 … Sun = 7, for a UTC date. */
function weekday(d: Date) {
  const w = d.getUTCDay()
  return w === 0 ? 7 : w
}

/** The company's holiday table writes "1 January"; turn it into a date for a given year. */
export function holidayDates(
  rows: { date?: string; observed?: string }[],
  year: number
) {
  const out: string[] = []
  for (const r of rows) {
    if (
      !r.date ||
      r.observed === "No" ||
      !/^\d{1,2} [A-Za-z]+$/.test(r.date.trim())
    )
      continue
    const d = new Date(`${r.date} ${year} 12:00:00 UTC`)
    if (!Number.isNaN(d.getTime())) out.push(isoDate(d))
  }
  return out
}

export function slotsFor(page: BookingPage, ctx: SlotContext): Slot[] {
  if (!page.active) return []
  const interviewers =
    page.assign === "fixed"
      ? page.interviewerIds.slice(0, 1)
      : page.interviewerIds
  const first = new Date(ctx.now.getTime() + page.minNoticeHours * 60 * MIN)
  const last = new Date(ctx.now.getTime() + page.advanceDays * 24 * 60 * MIN)

  const live = ctx.bookings.filter(
    (b) =>
      b.status === "booked" &&
      b.slotStart &&
      b.interviewerId &&
      b.id !== ctx.ignoreBookingId
  )
  const durationOf = (b: Booking) =>
    ctx.pages.find((p) => p.id === b.pageId)?.durationMin ?? page.durationMin
  const bufferOf = (b: Booking) =>
    ctx.pages.find((p) => p.id === b.pageId)?.bufferMin ?? page.bufferMin

  const busy = (who: string, start: number, end: number) =>
    live.some((b) => {
      if (b.interviewerId !== who) return false
      const bs = new Date(b.slotStart!).getTime() - bufferOf(b) * MIN
      const be =
        new Date(b.slotStart!).getTime() + (durationOf(b) + bufferOf(b)) * MIN
      return start < be && end > bs
    })

  const bookedOnDay = (day: string) =>
    live.filter(
      (b) => b.pageId === page.id && b.slotStart!.slice(0, 10) === day
    ).length

  const load = (who: string) =>
    live.filter((b) => b.interviewerId === who).length

  const out: Slot[] = []
  const day = new Date(`${isoDate(ctx.now)}T00:00:00Z`)
  while (day <= last) {
    const date = isoDate(day)
    const open =
      !ctx.holidays.includes(date) && bookedOnDay(date) < page.dailyLimit
    if (open) {
      const starts = new Map<number, string[]>()
      for (const who of interviewers) {
        const av = ctx.availability.find((a) => a.employeeId === who)
        if (!av || !av.days.includes(weekday(day))) continue
        const onLeave = ctx.leave.some(
          (l) =>
            l.employeeId === who &&
            l.status === "approved" &&
            l.startDate <= date &&
            l.endDate >= date
        )
        if (onLeave) continue
        const from = parseHm(av.start)
        const to = parseHm(av.end)
        const step = page.durationMin + page.bufferMin
        for (let m = from; m + page.durationMin <= to; m += step) {
          const t = new Date(`${date}T00:00:00Z`).getTime() + m * MIN
          if (t < first.getTime() || t > last.getTime()) continue
          const end = t + page.durationMin * MIN
          if (busy(who, t, end)) continue
          starts.set(t, [...(starts.get(t) ?? []), who])
        }
      }
      // The day's limit stops the day being offered once it is reached (above).
      // Each slot offered is bookable on its own; taking one re-checks the limit.
      for (const t of [...starts.keys()].sort((a, b) => a - b)) {
        const free = starts.get(t)!
        const who =
          page.assign === "round_robin"
            ? [...free].sort((a, b) => load(a) - load(b))[0]
            : free[0]
        out.push({
          start: new Date(t).toISOString(),
          end: new Date(t + page.durationMin * MIN).toISOString(),
          interviewerId: who,
        })
      }
    }
    day.setUTCDate(day.getUTCDate() + 1)
  }
  return out
}

/** Whether a given slot is still free right now: the check a booking must pass at the moment it is made. */
export function isSlotFree(page: BookingPage, ctx: SlotContext, start: string) {
  return slotsFor(page, ctx).find((s) => s.start === start) ?? null
}

/** Can this booking still be changed by the candidate? */
export function canChange(page: BookingPage, slotStart: string, now: Date) {
  const hoursLeft = (new Date(slotStart).getTime() - now.getTime()) / (60 * MIN)
  return hoursLeft >= page.cancelCutoffHours
}

/** Groups slots by the day they fall on in a time zone, for showing a calendar. */
export function groupByDay(slots: Slot[], timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const map = new Map<string, Slot[]>()
  for (const s of slots) {
    const key = fmt.format(new Date(s.start))
    map.set(key, [...(map.get(key) ?? []), s])
  }
  return [...map.entries()].map(([day, list]) => ({ day, slots: list }))
}

export function formatSlotTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso))
}

export function formatSlotDay(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso))
}

export function newToken() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")
}

/* ── Calendar file ───────────────────────────────────────────────────────── */

function icsStamp(iso: string) {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")
}

function icsEscape(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
}

/** Folds a line at 75 octets, as RFC 5545 asks, so every calendar app accepts it. */
function fold(line: string) {
  const out: string[] = []
  let rest = line
  while (rest.length > 74) {
    out.push(rest.slice(0, 74))
    rest = " " + rest.slice(74)
  }
  out.push(rest)
  return out.join("\r\n")
}

export function buildIcs(e: {
  uid: string
  start: string
  end: string
  summary: string
  description?: string
  location?: string
  url?: string
  cancelled?: boolean
  stamp?: string
}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zelos HR//Interview booking//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${e.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${e.uid}@zelos.hr`,
    `DTSTAMP:${icsStamp(e.stamp ?? e.start)}`,
    `DTSTART:${icsStamp(e.start)}`,
    `DTEND:${icsStamp(e.end)}`,
    `SUMMARY:${icsEscape(e.summary)}`,
    ...(e.description ? [`DESCRIPTION:${icsEscape(e.description)}`] : []),
    ...(e.location ? [`LOCATION:${icsEscape(e.location)}`] : []),
    ...(e.url ? [`URL:${e.url}`] : []),
    `STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
  return lines.map(fold).join("\r\n") + "\r\n"
}

export const TIME_ZONES = [
  "Africa/Accra",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
]
