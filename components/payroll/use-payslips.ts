"use client"

import * as React from "react"

import { useStore } from "@/lib/store"
import { currentVersion } from "@/lib/pay/derive"
import { isStated, payslipFor } from "@/lib/pay/payslips"
import { linesForRun } from "@/lib/pay/run-lines"
import { RUN_DESTINATION_OVERRIDES } from "@/lib/data/payroll"
import type { Payslip } from "@/lib/pay/types"

/**
 * One person's payslips, newest first.
 *
 * Derived from the runs rather than stored, so a payslip can never say
 * something the register does not. Year-to-date counts every stated run
 * in the same calendar year up to and including the one being read.
 */
export function usePayslips(employeeId: string) {
  const store = useStore()

  const payslips: Payslip[] = React.useMemo(() => {
    const source = {
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
    }

    const stated = store.payrollRuns
      .filter(isStated)
      .sort((a, b) => a.payDate.localeCompare(b.payDate))

    const mine = stated
      .map((run) => ({
        run,
        line: linesForRun(run, source).lines.find(
          (l) => l.employeeId === employeeId
        ),
      }))
      .filter((entry) => entry.line !== undefined)

    return mine
      .map(({ run, line }, i) => {
        const group = store.payGroups.find((g) => g.id === run.payGroupId)
        const pack =
          store.countryRulePacks.find((p) => p.country === group?.country) ??
          null
        const year = run.periodStart.slice(0, 4)
        const priorLines = mine
          .slice(0, i + 1)
          .filter((e) => e.run.periodStart.slice(0, 4) === year)
          .map((e) => e.line!)

        return payslipFor(
          run,
          line!,
          priorLines,
          pack,
          currentVersion(store.compensationVersions, employeeId, run.periodEnd)
            ?.id ?? null
        )
      })
      .reverse()
  }, [employeeId, store])

  return { payslips }
}
