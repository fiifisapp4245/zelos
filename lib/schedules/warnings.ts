import type { LeaveRequest } from "../types"
import { restMinutesBetween, startOfWeek, toMinutes } from "../time"
import { liveShifts, shiftHours } from "./derive"
import type { RosterWarning, Shift, WarningKind } from "./types"

export const WARNING_LABEL: Record<WarningKind, string> = {
  onLeave: "Scheduled on approved leave",
  overlap: "Overlapping shifts",
  overtime: "Above the weekly hours threshold",
  shortRest: "Short rest between shifts",
  openShift: "Unfilled open shift",
}

export interface RosterThresholds {
  /** Weekly hours above which a roster counts as overtime. */
  overtimeWeeklyHours: number
  /** Hours of rest a person should get between two shifts. */
  shortRestHours: number
}

/**
 * Everything wrong with a roster, as a flat list.
 *
 * A warning never blocks anything. It is the roster telling whoever is
 * building it what they are about to commit people to, and publishing is
 * still allowed once they have seen it.
 */
export function rosterWarnings(
  shifts: Shift[],
  leave: LeaveRequest[],
  thresholds: RosterThresholds
): RosterWarning[] {
  const live = liveShifts(shifts)
  const out: RosterWarning[] = []

  for (const s of live) {
    if (!s.employeeId) {
      out.push({
        key: `openShift:${s.id}`,
        kind: "openShift",
        employeeId: null,
        date: s.date,
        detail: `${s.position} at ${s.branch}, ${s.start}–${s.end}, with nobody on it`,
        shiftIds: [s.id],
      })
      continue
    }

    const onLeave = leave.find(
      (l) =>
        l.employeeId === s.employeeId &&
        l.status === "approved" &&
        l.startDate <= s.date &&
        l.endDate >= s.date
    )
    if (onLeave) {
      out.push({
        key: `onLeave:${s.id}`,
        kind: "onLeave",
        employeeId: s.employeeId,
        date: s.date,
        detail: `Rostered ${s.start}–${s.end} on approved leave (${onLeave.id})`,
        shiftIds: [s.id],
      })
    }
  }

  // Per person, so overlap, rest and weekly hours all read the same list.
  const byPerson = new Map<string, Shift[]>()
  for (const s of live) {
    if (!s.employeeId) continue
    const list = byPerson.get(s.employeeId)
    if (list) list.push(s)
    else byPerson.set(s.employeeId, [s])
  }

  for (const [employeeId, list] of byPerson) {
    const ordered = [...list].sort(
      (a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)
    )

    for (let i = 0; i < ordered.length - 1; i++) {
      const a = ordered[i]
      const b = ordered[i + 1]

      if (a.date === b.date && toMinutes(b.start) < toMinutes(a.end)) {
        out.push({
          key: `overlap:${a.id}:${b.id}`,
          kind: "overlap",
          employeeId,
          date: a.date,
          detail: `${a.start}–${a.end} overlaps ${b.start}–${b.end}`,
          shiftIds: [a.id, b.id],
        })
        continue
      }

      const rest = restMinutesBetween(
        { date: a.date, end: a.end },
        { date: b.date, start: b.start }
      )
      if (rest < thresholds.shortRestHours * 60) {
        out.push({
          key: `shortRest:${a.id}:${b.id}`,
          kind: "shortRest",
          employeeId,
          date: b.date,
          detail: `${Math.round((rest / 60) * 10) / 10}h between ${a.end} and ${b.start} the next day, against a ${thresholds.shortRestHours}h minimum`,
          shiftIds: [a.id, b.id],
        })
      }
    }

    const byWeek = new Map<string, Shift[]>()
    for (const s of ordered) {
      const week = startOfWeek(s.date)
      const list = byWeek.get(week)
      if (list) list.push(s)
      else byWeek.set(week, [s])
    }
    for (const [week, weekShifts] of byWeek) {
      const hours =
        Math.round(weekShifts.reduce((n, s) => n + shiftHours(s), 0) * 10) / 10
      if (hours > thresholds.overtimeWeeklyHours) {
        out.push({
          key: `overtime:${employeeId}:${week}`,
          kind: "overtime",
          employeeId,
          date: week,
          detail: `${hours}h rostered in the week of ${week}, above the ${thresholds.overtimeWeeklyHours}h threshold`,
          shiftIds: weekShifts.map((s) => s.id),
        })
      }
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export function countByKind(warnings: RosterWarning[]) {
  const out = {} as Record<WarningKind, number>
  for (const k of Object.keys(WARNING_LABEL) as WarningKind[]) out[k] = 0
  for (const w of warnings) out[w.kind] += 1
  return out
}

/** Drafts and shifts edited since they were published. */
export function unpublished(shifts: Shift[]) {
  return shifts.filter((s) => s.state === "draft" || s.changedSincePublish)
}

/** Scheduled hours and headcount, for the roster's footer. */
export function rosterTotals(shifts: Shift[]) {
  const live = liveShifts(shifts)
  return {
    hours: Math.round(live.reduce((n, s) => n + shiftHours(s), 0) * 10) / 10,
    headcount: new Set(live.map((s) => s.employeeId).filter(Boolean)).size,
    open: live.filter((s) => !s.employeeId).length,
  }
}
