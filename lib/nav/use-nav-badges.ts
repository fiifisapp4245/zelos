"use client"

import { useStore } from "../store"
import { getApprovalsForUser } from "../approvals/selectors"
import { TODAY } from "../format"
import type { NavBadgeKey } from "./nav-config"

/**
 * The count beside Approvals. It runs the same selector the Approvals page
 * and the Home widget run, so the three can never disagree.
 */
export function useNavBadges(): Record<NavBadgeKey, number> {
  const { session, approvals, employees } = useStore()

  return {
    approvals: getApprovalsForUser(session, approvals, {
      tab: "waiting",
      employees,
      now: TODAY,
    }).length,
  }
}
