"use client"

import * as React from "react"

import { useStore } from "@/lib/store"
import { resolveAudience } from "@/lib/nav/get-nav-for-user"
import { visibleEmployees } from "@/lib/selectors"
import { ATTENDANCE_POLICY } from "@/lib/data/attendance-log"
import {
  dayRecordsFor,
  datesBetween,
  type AttendanceInput,
} from "@/lib/attendance/derive"
import { TODAY, TODAY_ISO } from "@/lib/format"
import type { Employee } from "@/lib/types"

export type PeriodKey = "thisWeek" | "twoWeeks" | "thisMonth" | "custom"

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  thisWeek: "This week",
  twoWeeks: "Last 2 weeks",
  thisMonth: "This month",
  custom: "Custom",
}

function startOfWeek(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  const shift = (d.getDay() + 6) % 7 // Monday
  d.setDate(d.getDate() - shift)
  return d.toISOString().slice(0, 10)
}

/** The dates a period covers, ending today rather than running into the future. */
export function rangeFor(
  key: PeriodKey,
  custom?: { from: string; to: string }
) {
  if (key === "custom" && custom?.from && custom?.to) return custom
  if (key === "thisWeek") return { from: startOfWeek(TODAY_ISO), to: TODAY_ISO }
  if (key === "twoWeeks") {
    const d = new Date(`${startOfWeek(TODAY_ISO)}T00:00:00`)
    d.setDate(d.getDate() - 7)
    return { from: d.toISOString().slice(0, 10), to: TODAY_ISO }
  }
  return { from: `${TODAY_ISO.slice(0, 7)}-01`, to: TODAY_ISO }
}

export interface ScopeFilters {
  /** Empty means no narrowing, which is how the chips read when unset. */
  departments?: string[]
  branches?: string[]
  search?: string
}

/**
 * Who this session may look at, and their days.
 *
 * HR sees the organisation, a manager sees their own people, and an
 * employee sees only themselves — the scope is settled here so no view has
 * to remember to narrow it.
 */
export function useAttendance({
  from,
  to,
  filters = {},
  employeeId,
}: {
  from: string
  to: string
  filters?: ScopeFilters
  /** Pins the scope to one person, for the profile tab and the employee view. */
  employeeId?: string
}) {
  const store = useStore()
  const audience = resolveAudience(store.session)

  const scope: Employee[] = React.useMemo(() => {
    if (employeeId) {
      const one = store.employees.find((e) => e.id === employeeId)
      return one ? [one] : []
    }
    if (audience === "employee") {
      const me = store.employees.find((e) => e.id === store.session.id)
      return me ? [me] : []
    }
    const base = visibleEmployees(store.viewer, store.employees).filter(
      (e) =>
        !["pre_hire", "resigned", "terminated", "retired"].includes(
          e.lifecycleState
        )
    )
    const q = (filters.search ?? "").trim().toLowerCase()
    return base
      .filter(
        (e) =>
          !filters.departments?.length ||
          filters.departments.includes(e.department)
      )
      .filter(
        (e) => !filters.branches?.length || filters.branches.includes(e.branch)
      )
      .filter(
        (e) =>
          !q ||
          `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
          e.jobTitle.toLowerCase().includes(q)
      )
      .sort((a, b) => a.lastName.localeCompare(b.lastName))
  }, [
    store.employees,
    store.viewer,
    store.session.id,
    audience,
    employeeId,
    filters.departments,
    filters.branches,
    filters.search,
  ])

  const input: AttendanceInput = React.useMemo(
    () => ({
      employees: store.employees,
      patterns: store.workPatterns,
      schedules: store.employeeSchedules,
      events: store.clockEvents,
      adjustments: store.timeAdjustments,
      leave: store.leaveRequests,
      graceMinutes: ATTENDANCE_POLICY.graceMinutes,
    }),
    [
      store.employees,
      store.workPatterns,
      store.employeeSchedules,
      store.clockEvents,
      store.timeAdjustments,
      store.leaveRequests,
    ]
  )

  const dates = React.useMemo(() => datesBetween(from, to), [from, to])

  const records = React.useMemo(
    () =>
      dayRecordsFor(
        scope.map((e) => e.id),
        dates,
        input
      ),
    [scope, dates, input]
  )

  return { audience, scope, dates, records, input, today: TODAY }
}
