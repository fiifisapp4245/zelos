"use client"

import * as React from "react"

import { useStore } from "@/lib/store"
import { payRoleOf, payScope } from "@/lib/pay/access"
import { currentVersion, scheduledVersion } from "@/lib/pay/derive"
import { TODAY_ISO } from "@/lib/format"
import type { Employee } from "@/lib/types"

/**
 * The pay data this session may work with, scoped once so no screen has
 * to remember to narrow it.
 */
export function usePay() {
  const store = useStore()
  const role = payRoleOf(store.viewer)

  const scope: Employee[] = React.useMemo(
    () =>
      payScope(store.viewer, store.employees)
        .filter(
          (e) =>
            !["pre_hire", "resigned", "terminated", "retired"].includes(
              e.lifecycleState
            )
        )
        .sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [store.viewer, store.employees]
  )

  const rows = React.useMemo(
    () =>
      scope.map((employee) => ({
        employee,
        version: currentVersion(
          store.compensationVersions,
          employee.id,
          TODAY_ISO
        ),
        scheduled: scheduledVersion(
          store.compensationVersions,
          employee.id,
          TODAY_ISO
        ),
      })),
    [scope, store.compensationVersions]
  )

  return {
    role,
    scope,
    rows,
    groups: store.payGroups,
    entities: store.legalEntities,
    components: store.payComponents,
    rulePacks: store.countryRulePacks,
    versions: store.compensationVersions,
    requests: store.changeRequests,
    groupFor: (id: string | undefined) =>
      store.payGroups.find((g) => g.id === id),
    rulePackFor: (country: string) =>
      store.countryRulePacks.find((p) => p.country === country) ?? null,
  }
}

export type PayRow = ReturnType<typeof usePay>["rows"][number]
