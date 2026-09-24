"use client"

import * as React from "react"

import { useStore } from "@/lib/store"
import { currentVersion } from "@/lib/pay/derive"
import { readiness, type ReadinessSource } from "@/lib/pay/payroll"
import {
  destinationFor,
  linesForRun,
  membersOf,
  previousRunOf,
  type RunSource,
} from "@/lib/pay/run-lines"
import { reconcileItems, isReconciled } from "@/lib/leave/reconcile"
import { dayRecordsFor } from "@/lib/attendance/derive"
import { ATTENDANCE_POLICY } from "@/lib/data/attendance-log"
import { RUN_DESTINATION_OVERRIDES } from "@/lib/data/payroll"
import { datesBetween } from "@/lib/time"
import { TODAY_ISO } from "@/lib/format"
import type { PayrollRun } from "@/lib/pay/types"

/**
 * Everything a payroll screen needs, assembled once.
 *
 * The readiness checklist reaches outside Pay on purpose: attendance
 * owns whether the hours are settled, Leave owns whether the days are
 * explained, and the employee record owns where the money goes. Payroll
 * reads all three rather than keeping its own copy of any of them.
 */
export function usePayroll() {
  const store = useStore()

  const source: RunSource = React.useMemo(
    () => ({
      employees: store.employees,
      versions: store.compensationVersions,
      payGroups: store.payGroups,
      rulePacks: store.countryRulePacks,
      components: store.payComponents,
      oneOffs: store.oneOffPayments,
      adjustments: store.lineAdjustments,
      externalResults: store.externalResults,
      destinationOverrides: RUN_DESTINATION_OVERRIDES,
      runs: store.payrollRuns,
    }),
    [
      store.employees,
      store.compensationVersions,
      store.payGroups,
      store.countryRulePacks,
      store.payComponents,
      store.oneOffPayments,
      store.lineAdjustments,
      store.externalResults,
      store.payrollRuns,
    ]
  )

  const isApprover = store.viewer.roles.includes("hr_admin")
  const isPreparer = store.viewer.roles.includes("payroll")

  return {
    source,
    runs: store.payrollRuns,
    groups: store.payGroups,
    isApprover,
    isPreparer,
    canOpenPayroll: isApprover || isPreparer,
    groupFor: (id: string) => store.payGroups.find((g) => g.id === id),
    linesFor: (run: PayrollRun) => linesForRun(run, source),
    membersFor: (run: PayrollRun) => membersOf(run, source),
    previousFor: (run: PayrollRun) => previousRunOf(run, store.payrollRuns),
  }
}

/** The checklist for one run, read from the modules that own each fact. */
export function useReadiness(run: PayrollRun) {
  const store = useStore()
  const { source } = usePayroll()

  return React.useMemo(() => {
    const members = membersOf(run, source)
    const dates = datesBetween(run.periodStart, run.periodEnd)

    const records = dayRecordsFor(
      members.map((e) => e.id),
      // Nothing after today has happened yet, so nothing after today can
      // be unexplained.
      dates.filter((d) => d <= TODAY_ISO),
      {
        employees: store.employees,
        patterns: store.workPatterns,
        assignments: store.patternAssignments,
        shifts: store.shifts,
        defaultGraceMinutes: ATTENDANCE_POLICY.graceMinutes,
        events: store.clockEvents,
        adjustments: store.timeAdjustments,
        leave: store.leaveRequests,
      }
    )

    const open = reconcileItems({
      records,
      leave: store.leaveRequests,
      events: store.clockEvents,
      dates,
      todayIso: TODAY_ISO,
    }).filter((i) => !isReconciled(i, store.reconciliations))

    const ids = new Set(members.map((e) => e.id))

    const checkSource: ReadinessSource = {
      payPeriods: store.payPeriods,
      openReconciliations: open.reduce((n, i) => n + i.dates.length, 0),
      pendingPaymentChanges: store.approvals
        .filter(
          (a) =>
            a.type === "bankDetailsChange" &&
            a.status === "pending" &&
            ids.has(a.requester)
        )
        .map((a) => a.requester),
      missingDestinations: members
        .filter((e) => destinationFor(e).masked === null)
        .map((e) => e.id),
      missingCompensation: members
        .filter(
          (e) =>
            !currentVersion(store.compensationVersions, e.id, run.periodEnd)
        )
        .map((e) => e.id),
      acknowledgements: store.readinessAcknowledgements.filter(
        (a) => a.runId === run.id
      ),
    }

    return readiness(run, checkSource)
  }, [run, source, store])
}
