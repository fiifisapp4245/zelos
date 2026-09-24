"use client"

import * as React from "react"

import { useStore } from "@/lib/store"
import { resolveAudience } from "@/lib/nav/get-nav-for-user"
import { visibleEmployees } from "@/lib/selectors"
import { ATTENDANCE_POLICY } from "@/lib/data/attendance-log"
import { SCHEDULE_POLICY } from "@/lib/data/schedules"
import type { ScheduleInput } from "@/lib/schedules/derive"
import { addDays, startOfWeek } from "@/lib/time"
import { TODAY_ISO } from "@/lib/format"
import type { Employee } from "@/lib/types"

/**
 * Who this session may schedule, and what the schedule is built from.
 *
 * The scope is settled once here so the roster, the patterns and the
 * employee's own view all draw the same line: HR sees the organisation,
 * a manager sees their reports, an employee sees themselves.
 */
export function useSchedules() {
  const store = useStore()
  const audience = resolveAudience(store.session)

  const scope: Employee[] = React.useMemo(() => {
    if (audience === "employee") {
      const me = store.employees.find((e) => e.id === store.session.id)
      return me ? [me] : []
    }
    return visibleEmployees(store.viewer, store.employees)
      .filter(
        (e) =>
          !["pre_hire", "resigned", "terminated", "retired"].includes(
            e.lifecycleState
          )
      )
      .sort((a, b) => a.lastName.localeCompare(b.lastName))
  }, [audience, store.employees, store.session.id, store.viewer])

  const input: ScheduleInput = React.useMemo(
    () => ({
      patterns: store.workPatterns,
      assignments: store.patternAssignments,
      shifts: store.shifts,
      defaultGraceMinutes: ATTENDANCE_POLICY.graceMinutes,
    }),
    [store.workPatterns, store.patternAssignments, store.shifts]
  )

  return {
    audience,
    scope,
    input,
    policy: SCHEDULE_POLICY,
    defaultGraceMinutes: ATTENDANCE_POLICY.graceMinutes,
  }
}

/** The Monday of the week in view, and the week either side of it. */
export function useRosterWeek() {
  const [monday, setMonday] = React.useState(() => startOfWeek(TODAY_ISO))
  return {
    monday,
    goTo: setMonday,
    previous: () => setMonday((m) => addDays(m, -7)),
    next: () => setMonday((m) => addDays(m, 7)),
    today: () => setMonday(startOfWeek(TODAY_ISO)),
    isThisWeek: monday === startOfWeek(TODAY_ISO),
  }
}
