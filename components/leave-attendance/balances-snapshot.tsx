"use client"

import Link from "next/link"
import { AlertTriangle, Wallet } from "lucide-react"

import { EmptyState, Initials, Panel, Pill } from "@/components/common"
import { leaveLink } from "@/lib/leave/links"
import { useStore } from "@/lib/store"
import { LEAVE_TYPE_LABEL, fullName } from "@/lib/format"
import type { Employee, LeaveType } from "@/lib/types"
import { cn } from "@/lib/utils"

const SHOWN: LeaveType[] = ["annual", "sick", "compassionate", "study"]

/**
 * Remaining days per person per type, for the people HR is responsible
 * for. Flags carry words: a tint alone would not say whether a number
 * is a problem or simply small.
 */
export function BalancesSnapshot({
  scope,
  /** Months left in the leave year, for the unused-balance flag. */
  monthsToYearEnd,
}: {
  scope: Employee[]
  monthsToYearEnd: number
}) {
  const store = useStore()
  const ids = new Set(scope.map((e) => e.id))
  const balances = store.leaveBalances.filter((b) => ids.has(b.employeeId))

  return (
    <Panel
      description="Remaining days by type. Balances are held and edited in the Leave module."
      bodyClassName="p-0"
    >
      {balances.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No balances in your scope"
          description="Balances appear once people in your scope have an entitlement on file."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-2.5 pl-5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Employee
                </th>
                {SHOWN.map((t) => (
                  <th
                    key={t}
                    className="px-4 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
                  >
                    {LEAVE_TYPE_LABEL[t]}
                  </th>
                ))}
                <th className="px-4 py-2.5 pr-5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Flags
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {balances.map((b) => {
                const person = store.employeeById(b.employeeId) as Employee
                const annual = b.byType.find((t) => t.type === "annual")
                const annualLeft = annual
                  ? annual.entitlement +
                    b.carriedOver -
                    annual.taken -
                    annual.pending
                  : 0
                const negative = annualLeft < 0
                // More than half the year's entitlement still untaken with
                // the year nearly out is a problem for the business as much
                // as for the person.
                const hoarding =
                  !negative &&
                  monthsToYearEnd <= 4 &&
                  annual !== undefined &&
                  annualLeft > annual.entitlement / 2

                return (
                  <tr
                    key={b.employeeId}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="py-2.5 pl-5">
                      <Link
                        href={leaveLink.balances(b.employeeId)}
                        className="flex items-center gap-2.5 hover:underline"
                      >
                        <Initials person={person} size="xs" />
                        <span className="truncate font-medium">
                          {fullName(person)}
                        </span>
                      </Link>
                    </td>
                    {SHOWN.map((t) => {
                      const row = b.byType.find((x) => x.type === t)
                      if (!row)
                        return (
                          <td key={t} className="px-4 text-muted-foreground">
                            —
                          </td>
                        )
                      const left =
                        row.entitlement -
                        row.taken -
                        row.pending +
                        (t === "annual" ? b.carriedOver : 0)
                      return (
                        <td key={t} className="px-4">
                          <span
                            className={cn(
                              "tabular font-medium",
                              left < 0 && "text-destructive"
                            )}
                          >
                            {left}
                          </span>
                          <span className="tabular text-xs text-muted-foreground">
                            {" "}
                            / {row.entitlement}
                          </span>
                        </td>
                      )
                    })}
                    <td className="py-2.5 pr-5">
                      <span className="flex flex-wrap gap-1.5">
                        {negative && (
                          <Pill tone="danger">
                            <AlertTriangle className="size-3" aria-hidden />
                            Negative balance
                          </Pill>
                        )}
                        {hoarding && (
                          <Pill tone="warning">
                            <AlertTriangle className="size-3" aria-hidden />
                            High unused balance near year end
                          </Pill>
                        )}
                        {!negative && !hoarding && (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
