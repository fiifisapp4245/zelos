"use client"

import { useStore } from "../store"
import { resolveAudience } from "./get-nav-for-user"
import type { NavBadgeKey } from "./nav-config"

/**
 * Stub for the counts endpoint the sidebar will eventually poll. The numbers
 * differ by audience because the queues do: an HR Admin sees everything
 * awaiting the company, a manager only what is waiting on them.
 */
export function useNavBadges(): Record<NavBadgeKey, number> {
  const { session, leaveRequests, employees } = useStore()
  const audience = resolveAudience(session)

  const pending = leaveRequests.filter((r) => r.status === "pending")

  if (audience === "hr_admin") {
    return { approvals: pending.length }
  }

  if (audience === "manager") {
    const mine = new Set(
      employees
        .filter(
          (e) =>
            e.managerId === session.id || e.dottedLineManagerId === session.id
        )
        .map((e) => e.id)
    )
    return { approvals: pending.filter((r) => mine.has(r.employeeId)).length }
  }

  if (audience === "payroll") {
    // Payroll approves pay runs, not leave; nothing is queued in the seed.
    return { approvals: 0 }
  }

  return { approvals: 0 }
}
