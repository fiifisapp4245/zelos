"use client"

import { useStore } from "../store"
import { resolveAudience } from "./get-nav-for-user"
import { approvalsFor } from "../home/home-data"
import type { NavBadgeKey } from "./nav-config"

/**
 * The count beside Approvals. It reads the same queue Home renders, through
 * the same selector, so the badge and the page can never disagree.
 */
export function useNavBadges(): Record<NavBadgeKey, number> {
  const { session, approvals, employees } = useStore()
  const audience = resolveAudience(session)

  const scope =
    audience === "manager"
      ? "team"
      : audience === "payroll"
        ? "payDetails"
        : "company"

  return {
    approvals: approvalsFor(approvals, audience, session.id, employees, scope)
      .length,
  }
}
