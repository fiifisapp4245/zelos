import { describe, expect, it } from "vitest"

import {
  buildIcs,
  canChange,
  groupByDay,
  holidayDates,
  newToken,
  slotsFor,
  type SlotContext,
} from "./slots"
import type { Availability, Booking, BookingPage } from "../types"

// Friday 18 Sept 2026, 09:00 UTC.
const NOW = new Date("2026-09-18T09:00:00Z")

const page: BookingPage = {
  id: "bp",
  name: "Technical",
  requisitionId: null,
  kind: "technical",
  durationMin: 30,
  bufferMin: 15,
  advanceDays: 7,
  minNoticeHours: 24,
  dailyLimit: 4,
  interviewerIds: ["a", "b"],
  assign: "round_robin",
  video: "zelos_meet",
  videoLink: "",
  questions: [],
  cancelCutoffHours: 12,
  active: true,
}

const av = (id: string, days = [1, 2, 3, 4, 5]): Availability => ({
  employeeId: id,
  days,
  start: "09:00",
  end: "11:00",
})

const ctx = (over: Partial<SlotContext> = {}): SlotContext => ({
  now: NOW,
  availability: [av("a"), av("b")],
  leave: [],
  holidays: [],
  bookings: [],
  pages: [page],
  ...over,
})

const booked = (start: string, who: string, id = "bk"): Booking => ({
  id,
  token: "t",
  candidateId: "c",
  pageId: "bp",
  status: "booked",
  invitedOn: "2026-09-17",
  expiresOn: "2026-10-01",
  slotStart: start,
  interviewerId: who,
  timeZone: "Africa/Accra",
  answers: {},
  bookedOn: "2026-09-17",
  link: null,
  interviewId: null,
  history: [],
})

describe("which slots are offered", () => {
  it("never offers anything inside the minimum notice", () => {
    const s = slotsFor(page, ctx())
    expect(s.length).toBeGreaterThan(0)
    for (const x of s)
      expect(new Date(x.start).getTime()).toBeGreaterThanOrEqual(
        NOW.getTime() + 24 * 3600_000
      )
  })

  it("skips weekends when nobody works them, and stops at the booking window", () => {
    const days = new Set(slotsFor(page, ctx()).map((s) => s.start.slice(0, 10)))
    expect(days.has("2026-09-19")).toBe(false) // Saturday
    expect(days.has("2026-09-20")).toBe(false) // Sunday
    for (const d of days) expect(d <= "2026-09-25").toBe(true)
  })

  it("leaves a buffer between interviews", () => {
    const s = slotsFor(page, ctx({ availability: [av("a")] })).filter((x) =>
      x.start.startsWith("2026-09-21")
    )
    const fixed = slotsFor(
      { ...page, interviewerIds: ["a"] },
      ctx({ availability: [av("a")] })
    ).filter((x) => x.start.startsWith("2026-09-21"))
    expect(s.length).toBeGreaterThan(0)
    const mins = fixed.map(
      (x) =>
        new Date(x.start).getUTCHours() * 60 + new Date(x.start).getUTCMinutes()
    )
    expect(mins).toEqual([540, 585, 630].filter((m) => m + 30 <= 660))
  })

  it("takes out public holidays and approved leave", () => {
    const withHoliday = slotsFor(page, ctx({ holidays: ["2026-09-21"] }))
    expect(withHoliday.some((s) => s.start.startsWith("2026-09-21"))).toBe(
      false
    )
    const onLeave = slotsFor(
      { ...page, interviewerIds: ["a"] },
      ctx({
        leave: [
          {
            id: "l",
            employeeId: "a",
            type: "annual",
            startDate: "2026-09-21",
            endDate: "2026-09-22",
            days: 2,
            reason: "",
            status: "approved",
            submittedAt: "",
            decidedBy: null,
            decidedAt: null,
          },
        ],
      })
    )
    expect(onLeave.some((s) => s.start.startsWith("2026-09-21"))).toBe(false)
    expect(onLeave.some((s) => s.start.startsWith("2026-09-23"))).toBe(true)
  })

  it("does not offer a slot that is taken, but offers the next once the buffer ends", () => {
    const only = { ...page, interviewerIds: ["a"] }
    const b = booked("2026-09-21T09:00:00.000Z", "a")
    const s = slotsFor(only, ctx({ availability: [av("a")], bookings: [b] }))
    const starts = s.map((x) => x.start)
    expect(starts).not.toContain("2026-09-21T09:00:00.000Z")
    expect(starts).toContain("2026-09-21T09:45:00.000Z") // the buffer has ended exactly here
    expect(starts).toContain("2026-09-21T10:30:00.000Z")
  })

  it("frees a booking's own time when it is being moved", () => {
    const only = { ...page, interviewerIds: ["a"] }
    const b = booked("2026-09-21T09:00:00.000Z", "a", "mine")
    const s = slotsFor(
      only,
      ctx({ availability: [av("a")], bookings: [b], ignoreBookingId: "mine" })
    )
    expect(s.map((x) => x.start)).toContain("2026-09-21T09:00:00.000Z")
  })

  it("still offers a time while the other interviewer is free, and balances the load", () => {
    const b = booked("2026-09-21T09:00:00.000Z", "a")
    const s = slotsFor(page, ctx({ bookings: [b] }))
    const nine = s.find((x) => x.start === "2026-09-21T09:00:00.000Z")
    expect(nine?.interviewerId).toBe("b")
  })

  it("closes a day once the daily limit is reached", () => {
    const bs = [0, 1, 2, 3].map((i) =>
      booked(
        `2026-09-22T0${9 + (i % 2)}:${i < 2 ? "00" : "45"}:00.000Z`,
        i % 2 ? "a" : "b",
        `b${i}`
      )
    )
    const s = slotsFor({ ...page, dailyLimit: 4 }, ctx({ bookings: bs }))
    expect(s.some((x) => x.start.startsWith("2026-09-22"))).toBe(false)
  })

  it("offers nothing from an inactive page", () => {
    expect(slotsFor({ ...page, active: false }, ctx())).toEqual([])
  })
})

describe("holidays and cut-offs", () => {
  it("turns 'D Month' rows into dates for a year, skipping unobserved ones", () => {
    expect(
      holidayDates(
        [
          { date: "1 January", observed: "Yes" },
          { date: "6 March", observed: "No" },
          { date: "nonsense" },
        ],
        2026
      )
    ).toEqual(["2026-01-01"])
  })

  it("stops letting a candidate change a booking inside the cut-off", () => {
    expect(canChange(page, "2026-09-18T22:00:00Z", NOW)).toBe(true) // 13h away
    expect(canChange(page, "2026-09-18T20:00:00Z", NOW)).toBe(false) // 11h away
  })

  it("groups by the day it is in the candidate's time zone", () => {
    const g = groupByDay(
      [{ start: "2026-09-21T23:30:00.000Z", end: "", interviewerId: "a" }],
      "Asia/Singapore"
    )
    expect(g[0].day).toBe("2026-09-22")
  })
})

describe("calendar file and token", () => {
  it("writes a valid, escaped, CRLF calendar event", () => {
    const ics = buildIcs({
      uid: "x1",
      start: "2026-09-21T09:00:00.000Z",
      end: "2026-09-21T09:30:00.000Z",
      summary: "Interview, Zelos; round 1",
      description: "Line one\nLine two",
    })
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true)
    expect(ics).toContain("DTSTART:20260921T090000Z")
    expect(ics).toContain("SUMMARY:Interview\\, Zelos\; round 1")
    expect(ics).toContain("DESCRIPTION:Line one\\nLine two")
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true)
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true)
  })

  it("marks a cancelled event as cancelled", () => {
    const ics = buildIcs({
      uid: "x",
      start: "2026-09-21T09:00:00Z",
      end: "2026-09-21T09:30:00Z",
      summary: "s",
      cancelled: true,
    })
    expect(ics).toContain("METHOD:CANCEL")
    expect(ics).toContain("STATUS:CANCELLED")
  })

  it("makes long unguessable tokens", () => {
    const a = newToken()
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(newToken()).not.toBe(a)
  })
})
