import { describe, expect, it } from "vitest"

import {
  linkProblem,
  meetingLinkFor,
  planBooking,
  type BookingWorld,
} from "./plan"
import { BOOKING_PAGES, AVAILABILITY } from "../data/hiring-extra"
import type { Booking, Candidate } from "../types"

const NOW = new Date("2026-09-18T09:00:00Z")

const cand = (over: Partial<Candidate> = {}): Candidate => ({
  id: "c1",
  requisitionId: "REQ-014",
  name: "Kwaku Boateng",
  email: "k@x.com",
  phone: "",
  stage: "screening",
  appliedOn: "2026-09-01",
  source: "LinkedIn",
  rating: 3,
  avatarTone: "",
  notes: "",
  rejectedReason: null,
  interviews: [],
  offer: null,
  employeeId: null,
  ...over,
})

const bk = (over: Partial<Booking> = {}): Booking => ({
  id: "bk1",
  token: "abcdef0123456789abcdef0123456789",
  candidateId: "c1",
  pageId: "bp-tech-014",
  status: "invited",
  invitedOn: "2026-09-17",
  expiresOn: "2026-09-30",
  slotStart: null,
  interviewerId: null,
  timeZone: null,
  answers: {},
  bookedOn: null,
  link: null,
  interviewId: null,
  history: [],
  ...over,
})

const world = (over: Partial<BookingWorld> = {}): BookingWorld => ({
  candidates: [cand()],
  bookings: [bk()],
  bookingPages: BOOKING_PAGES,
  availability: AVAILABILITY,
  leaveRequests: [],
  holidays: [],
  ...over,
})

// Wednesday 23 Sept 2026, inside Adwoa's Tue–Thu hours.
const SLOT = "2026-09-23T10:00:00.000Z"
const answers: Record<string, string> = {
  "Link to your portfolio or GitHub": "github.com/k",
  "Notice period": "1 month",
}
const plan = (
  w = world(),
  a = answers,
  start = SLOT,
  token = "abcdef0123456789abcdef0123456789"
) =>
  planBooking(w, token, start, "Africa/Accra", a, NOW, { interview: "iv-new" })

describe("planning a booking", () => {
  it("books a free slot and builds the interview that goes on the record", () => {
    const p = plan()
    expect(p.ok).toBe(true)
    if (!p.ok) return
    expect(p.interview).toMatchObject({
      id: "iv-new",
      kind: "technical",
      startsAt: SLOT,
      durationMin: 60,
      bookingId: "bk1",
      status: "scheduled",
    })
    expect(p.meetingLink).toMatch(/^https:\/\/meet\.trovesuite\.com\/zelos-/)
    expect(p.rescheduled).toBe(false)
  })

  it("refuses a link that is not theirs", () => {
    const p = plan(world(), answers, SLOT, "nope")
    expect(p).toEqual({ ok: false, reason: "This booking link is not valid." })
  })

  it("refuses an expired link, a cancelled one and a finished one", () => {
    expect(linkProblem(bk({ expiresOn: "2026-09-17" }), "2026-09-18")).toMatch(
      /expired/
    )
    expect(linkProblem(bk({ status: "cancelled" }), "2026-09-18")).toMatch(
      /cancelled/
    )
    expect(linkProblem(bk({ status: "completed" }), "2026-09-18")).toMatch(
      /already taken place/
    )
    expect(linkProblem(bk(), "2026-09-18")).toBeNull()
  })

  it("lets an already booked link be used again to reschedule, even past its invite expiry", () => {
    expect(
      linkProblem(
        bk({ status: "booked", expiresOn: "2026-09-01" }),
        "2026-09-18"
      )
    ).toBeNull()
  })

  it("refuses a time that is not in the offered slots", () => {
    const p = plan(world(), answers, "2026-09-23T03:00:00.000Z")
    expect(p.ok).toBe(false)
  })

  it("refuses a slot someone else took first — it can never be booked twice", () => {
    const taken = bk({
      id: "bk2",
      token: "other",
      candidateId: "c2",
      status: "booked",
      slotStart: SLOT,
      interviewerId: "adwoa",
    })
    const w = world({ bookings: [bk(), taken] })
    // Selorm is also on this page, so the time stays offered but goes to him,
    // and with both busy it is gone.
    const both = bk({
      id: "bk3",
      token: "o3",
      candidateId: "c3",
      status: "booked",
      slotStart: SLOT,
      interviewerId: "selorm",
    })
    const full = world({ bookings: [bk(), taken, both] })
    expect(plan(w).ok).toBe(true)
    const p = plan(full)
    expect(p.ok).toBe(false)
    if (!p.ok) expect(p.reason).toMatch(/just been taken/)
  })

  it("asks for the questions the page asks", () => {
    const p = plan(world(), { "Notice period": "1 month" })
    expect(p).toEqual({
      ok: false,
      reason: "Please answer: Link to your portfolio or GitHub",
    })
  })

  it("refuses for a candidate who has been rejected or hired", () => {
    expect(plan(world({ candidates: [cand({ stage: "rejected" })] })).ok).toBe(
      false
    )
    expect(plan(world({ candidates: [cand({ stage: "hired" })] })).ok).toBe(
      false
    )
  })

  it("moves a booked interview rather than adding a second one", () => {
    const existing = {
      id: "iv-old",
      kind: "technical" as const,
      scheduledFor: "2026-09-22",
      interviewerId: "adwoa",
      score: null,
      feedback: null,
    }
    const w = world({
      candidates: [cand({ interviews: [existing] })],
      bookings: [
        bk({
          status: "booked",
          slotStart: "2026-09-22T10:00:00.000Z",
          interviewerId: "adwoa",
          interviewId: "iv-old",
        }),
      ],
    })
    const p = plan(w)
    expect(p.ok).toBe(true)
    if (!p.ok) return
    expect(p.rescheduled).toBe(true)
    expect(p.interview.id).toBe("iv-old")
    expect(p.previousStart).toBe("2026-09-22T10:00:00.000Z")
  })
})

describe("the video link", () => {
  it("makes one for a built-in meeting, uses the fixed link, and has none in person", () => {
    const [phone, , final] = BOOKING_PAGES
    expect(meetingLinkFor(phone, "0123456789abcdef")).toBe(
      "https://meet.trovesuite.com/zelos-0123-4567-89ab"
    )
    expect(meetingLinkFor(final, "x")).toBe(
      "https://meet.google.com/zel-final-room"
    )
    expect(
      meetingLinkFor(
        { ...phone, video: "in_person", videoLink: "Accra HQ" },
        "x"
      )
    ).toBeNull()
  })
})
