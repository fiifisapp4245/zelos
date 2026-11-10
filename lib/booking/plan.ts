/**
 * Turning "this candidate chose this time" into the records it changes.
 *
 * It decides everything that can be wrong, in one place and before anything is
 * written: a link that is not theirs, one that has run out, a time that has
 * just been taken. The store only applies a plan that came back ok.
 */
import type {
  Availability,
  Booking,
  BookingPage,
  Candidate,
  EmailMessage,
  Employee,
  Interview,
  LeaveRequest,
} from "../types"
import {
  addMinutes,
  formatSlotDay,
  formatSlotTime,
  isSlotFree,
  type Slot,
} from "./slots"

export interface BookingWorld {
  candidates: Candidate[]
  bookings: Booking[]
  bookingPages: BookingPage[]
  availability: Availability[]
  leaveRequests: LeaveRequest[]
  holidays: string[]
}

export type BookingPlan =
  | {
      ok: true
      booking: Booking
      page: BookingPage
      candidate: Candidate
      slot: Slot
      interview: Interview
      rescheduled: boolean
      meetingLink: string | null
      previousStart: string | null
    }
  | { ok: false; reason: string }

export function meetingLinkFor(page: BookingPage, token: string) {
  if (page.video === "zelos_meet")
    return `https://meet.trovesuite.com/zelos-${token.slice(0, 4)}-${token.slice(4, 8)}-${token.slice(8, 12)}`
  if (page.video === "external") return page.videoLink || null
  return null
}

/** Why a link cannot be used, or null when it can. Shared by the page that shows it and the plan. */
export function linkProblem(
  b: Booking | undefined,
  today: string
): string | null {
  if (!b) return "This booking link is not valid."
  if (b.status === "cancelled")
    return "This booking was cancelled. Ask the recruiter for a new link."
  if (b.status === "no_show" || b.status === "completed")
    return "This interview has already taken place."
  if (b.status === "invited" && b.expiresOn < today)
    return "This link has expired. Ask the recruiter for a new one."
  return null
}

export function planBooking(
  w: BookingWorld,
  token: string,
  start: string,
  timeZone: string,
  answers: Record<string, string>,
  now: Date,
  ids: { interview: string }
): BookingPlan {
  const booking = w.bookings.find((b) => b.token === token)
  const problem = linkProblem(booking, now.toISOString().slice(0, 10))
  if (problem || !booking)
    return { ok: false, reason: problem ?? "This booking link is not valid." }

  const page = w.bookingPages.find((p) => p.id === booking.pageId)
  if (!page || !page.active)
    return { ok: false, reason: "This booking page is no longer open." }
  const candidate = w.candidates.find((c) => c.id === booking.candidateId)
  if (
    !candidate ||
    candidate.stage === "rejected" ||
    candidate.stage === "hired"
  )
    return { ok: false, reason: "This application is no longer open." }

  const missing = page.questions.filter((q) => !(answers[q] ?? "").trim())
  if (missing.length)
    return { ok: false, reason: `Please answer: ${missing[0]}` }

  const slot = isSlotFree(
    page,
    {
      now,
      availability: w.availability,
      leave: w.leaveRequests,
      holidays: w.holidays,
      bookings: w.bookings,
      pages: w.bookingPages,
      ignoreBookingId: booking.id,
    },
    start
  )
  if (!slot)
    return {
      ok: false,
      reason: "That time has just been taken. Please choose another.",
    }

  const meetingLink = meetingLinkFor(page, booking.token)
  const existing = candidate.interviews.find(
    (i) => i.id === booking.interviewId
  )
  const interview: Interview = {
    id: existing?.id ?? ids.interview,
    kind: page.kind,
    scheduledFor: slot.start.slice(0, 10),
    interviewerId: slot.interviewerId,
    score: existing?.score ?? null,
    feedback: existing?.feedback ?? null,
    startsAt: slot.start,
    durationMin: page.durationMin,
    link: meetingLink ?? undefined,
    bookingId: booking.id,
    status: "scheduled",
  }
  return {
    ok: true,
    booking,
    page,
    candidate,
    slot,
    interview,
    rescheduled: booking.status === "booked",
    meetingLink,
    previousStart: booking.status === "booked" ? booking.slotStart : null,
  }
}

/* ── The emails a booking sends ─────────────────────────────────────────── */

type NewEmail = Omit<EmailMessage, "id" | "createdAt" | "status">

const when = (iso: string, tz: string) =>
  `${formatSlotDay(iso, tz)} at ${formatSlotTime(iso, tz)} (${tz.replace("_", " ")})`

export function inviteEmail(p: {
  candidate: Candidate
  page: BookingPage
  role: string
  company: string
  url: string
  expiresOn: string
  sendAt: string
}): NewEmail {
  return {
    kind: "booking_invite",
    to: p.candidate.email,
    toName: p.candidate.name,
    subject: `${p.company}: choose a time for your ${p.page.kind === "phone" ? "phone screen" : "interview"}`,
    body: `Hello ${p.candidate.name.split(" ")[0]},\n\nThank you for applying for ${p.role}. Please pick a time for your ${p.page.name.toLowerCase()} (${p.page.durationMin} minutes). The link is private to you and works until ${p.expiresOn}.`,
    cta: { label: "Choose a time", href: p.url },
    sendAt: p.sendAt,
    relatedId: undefined,
  }
}

export function confirmationEmail(p: {
  plan: Extract<BookingPlan, { ok: true }>
  tz: string
  role: string
  company: string
  url: string
  interviewerName: string
  sendAt: string
}): NewEmail {
  const { plan } = p
  return {
    kind: "booking_confirmation",
    to: plan.candidate.email,
    toName: plan.candidate.name,
    subject: `${plan.rescheduled ? "Rescheduled" : "Confirmed"}: ${plan.page.name}, ${formatSlotDay(plan.slot.start, p.tz)}`,
    body: [
      `Hello ${plan.candidate.name.split(" ")[0]},`,
      "",
      `Your ${plan.page.name.toLowerCase()} for ${p.role} is ${plan.rescheduled ? "moved to" : "booked for"}:`,
      when(plan.slot.start, p.tz),
      `With ${p.interviewerName}. ${plan.page.durationMin} minutes.`,
      plan.meetingLink
        ? `Join: ${plan.meetingLink}`
        : plan.page.video === "in_person"
          ? `Where: ${plan.page.videoLink}`
          : "",
      "",
      "A calendar file is attached. You can reschedule or cancel from the link below until " +
        `${plan.page.cancelCutoffHours} hours before.`,
    ]
      .filter((l, i, a) => l !== "" || a[i - 1] !== "")
      .join("\n"),
    cta: { label: "Reschedule or cancel", href: p.url },
    sendAt: p.sendAt,
    relatedId: plan.booking.id,
  }
}

export function interviewerEmail(p: {
  plan: Extract<BookingPlan, { ok: true }>
  interviewer: Employee
  role: string
  url: string
  sendAt: string
}): NewEmail {
  const tz = "Africa/Accra"
  return {
    kind: "booking_confirmation",
    to: p.interviewer.email,
    toName: `${p.interviewer.firstName} ${p.interviewer.lastName}`,
    subject: `Interview booked: ${p.plan.candidate.name}, ${formatSlotDay(p.plan.slot.start, tz)}`,
    body: `${p.plan.candidate.name} booked a ${p.plan.page.name.toLowerCase()} for ${p.role}.\n${when(p.plan.slot.start, tz)}\nYou are marked busy for this time. Feedback is asked for when it ends.`,
    cta: { label: "Open the candidate", href: p.url },
    sendAt: p.sendAt,
    relatedId: p.plan.booking.id,
  }
}

export function reminderEmails(p: {
  plan: Extract<BookingPlan, { ok: true }>
  tz: string
  url: string
}): NewEmail[] {
  const { plan } = p
  return ([24, 1] as const).map((h) => ({
    kind: "booking_reminder" as const,
    to: plan.candidate.email,
    toName: plan.candidate.name,
    subject: `Reminder: your interview is ${h === 24 ? "tomorrow" : "in 1 hour"}`,
    body: `Hello ${plan.candidate.name.split(" ")[0]},\n\nA reminder that your ${plan.page.name.toLowerCase()} is on ${when(plan.slot.start, p.tz)}.${plan.meetingLink ? `\nJoin: ${plan.meetingLink}` : ""}`,
    cta: { label: "Manage your booking", href: p.url },
    sendAt: addMinutes(plan.slot.start, -h * 60),
    relatedId: plan.booking.id,
  }))
}

export function cancelledEmail(p: {
  candidate: Candidate
  page: BookingPage
  slotStart: string
  tz: string
  by: "candidate" | "recruiter"
  sendAt: string
  relatedId: string
  url: string
}): NewEmail {
  return {
    kind: "booking_cancelled",
    to: p.candidate.email,
    toName: p.candidate.name,
    subject: `Cancelled: ${p.page.name}, ${formatSlotDay(p.slotStart, p.tz)}`,
    body: `Hello ${p.candidate.name.split(" ")[0]},\n\nYour ${p.page.name.toLowerCase()} on ${when(p.slotStart, p.tz)} has been cancelled${p.by === "candidate" ? " at your request" : " by the recruiter"}.${p.by === "recruiter" ? " You can choose another time with the link below." : ""}`,
    cta:
      p.by === "recruiter"
        ? { label: "Choose another time", href: p.url }
        : undefined,
    sendAt: p.sendAt,
    relatedId: p.relatedId,
  }
}
