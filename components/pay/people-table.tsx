"use client"

import { useRouter } from "next/navigation"

import { Initials } from "@/components/common"
import { Checkbox } from "@/components/ui/checkbox"
import { Amount, PayGroupLabel } from "./money"
import type { PayRow } from "./use-pay"
import type { PayGroup } from "@/lib/pay/types"
import { formatDate, fullName } from "@/lib/format"
import { cn } from "@/lib/utils"

const BASIS_LABEL: Record<string, string> = {
  salaried: "Salaried",
  hourly: "Hourly",
  daily: "Daily",
}

/**
 * Everyone this session may see, and what they are on.
 *
 * Selecting rows is how a bulk change starts, so the checkbox column is
 * first and the rest of the row opens the person. Amounts are masked
 * until the screen is revealed.
 */
export function PeopleTable({
  rows,
  groups,
  selected,
  onSelect,
  selectable,
}: {
  rows: PayRow[]
  groups: PayGroup[]
  selected: string[]
  onSelect: (ids: string[]) => void
  /** Managers and HR select to propose; Payroll and employees do not. */
  selectable: boolean
}) {
  const router = useRouter()
  const allSelected =
    rows.length > 0 && rows.every((r) => selected.includes(r.employee.id))

  function toggle(id: string) {
    onSelect(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id]
    )
  }

  function open(id: string) {
    router.push(`/employees/${id}?tab=compensation`)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Compensation by person. Each row opens that person&apos;s compensation
          record.
        </caption>
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            {selectable && (
              <th scope="col" className="w-10 py-2.5 pl-5">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) =>
                    onSelect(v === true ? rows.map((r) => r.employee.id) : [])
                  }
                  aria-label="Select everyone in this list"
                />
              </th>
            )}
            {[
              "Employee",
              "Department",
              "Pay group",
              "Basis",
              "Base pay",
              "Effective since",
              "Next change",
            ].map((h) => (
              <th
                key={h}
                scope="col"
                className={cn(
                  "px-4 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
                  !selectable && "first:pl-5",
                  "last:pr-5"
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(({ employee, version, scheduled }) => {
            const group = groups.find((g) => g.id === version?.payGroupId)
            const isSelected = selected.includes(employee.id)
            return (
              <tr
                key={employee.id}
                className={cn(
                  "transition-colors hover:bg-muted/30",
                  isSelected && "bg-success-muted/50"
                )}
              >
                {selectable && (
                  <td className="py-2.5 pl-5">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggle(employee.id)}
                      aria-label={`Select ${fullName(employee)}`}
                    />
                  </td>
                )}
                <td className={cn("py-2.5", !selectable && "pl-5")}>
                  <button
                    type="button"
                    onClick={() => open(employee.id)}
                    className="flex items-center gap-2.5 rounded text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Initials person={employee} size="xs" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium hover:underline">
                        {fullName(employee)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {employee.jobTitle}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-4 text-muted-foreground">
                  {employee.department}
                </td>
                <td className="px-4">
                  <PayGroupLabel group={group} />
                </td>
                <td className="px-4 text-muted-foreground">
                  {version ? BASIS_LABEL[version.payBasis] : "—"}
                </td>
                <td className="px-4 font-medium">
                  {version ? (
                    <Amount
                      value={version.baseAmount}
                      currency={version.currency}
                    />
                  ) : (
                    <span className="text-muted-foreground">
                      Nothing on file
                    </span>
                  )}
                </td>
                <td className="tabular px-4 text-muted-foreground">
                  {version ? formatDate(version.effectiveFrom) : "—"}
                </td>
                <td className="py-2.5 pr-5 pl-4">
                  {scheduled ? (
                    <span className="tabular text-xs">
                      {formatDate(scheduled.effectiveFrom)}
                      <span className="block text-muted-foreground">
                        Scheduled
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
