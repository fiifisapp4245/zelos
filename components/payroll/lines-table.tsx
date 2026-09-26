"use client"

import { AlertTriangle } from "lucide-react"

import { Initials, Panel, Pill } from "@/components/common"
import { Amount } from "@/components/pay/money"
import { FLAG_LABEL, flagReason, totalDeductions } from "@/lib/pay/payroll"
import { signedMoney } from "@/lib/pay/money"
import type { PayrollLine } from "@/lib/pay/types"
import { useStore } from "@/lib/store"
import { fullName } from "@/lib/format"
import { useRevealed } from "@/components/pay/money"
import { cn } from "@/lib/utils"

/**
 * Only the lines somebody has to look at, with the reason attached to
 * each one. A flag without a sentence is just a colour.
 */
export function VariancePanel({
  lines,
  total,
  threshold,
  onOpen,
}: {
  lines: PayrollLine[]
  /** How many lines the run has, so the count reads as a proportion. */
  total: number
  threshold: number
  onOpen: (line: PayrollLine) => void
}) {
  const store = useStore()
  if (lines.length === 0) return null

  return (
    <Panel
      title="Worth a second look"
      description={`Lines that moved more than ${threshold}%, or that changed in a way the run cannot check for itself.`}
      bodyClassName="p-0"
      actions={
        <Pill tone="warning">
          <AlertTriangle className="size-3" aria-hidden />
          {lines.length} of {total} {total === 1 ? "line" : "lines"} flagged
        </Pill>
      }
    >
      <ul className="divide-y">
        {lines.map((line) => {
          const person = store.employeeById(line.employeeId)
          return (
            <li
              key={line.employeeId}
              className="flex flex-wrap gap-3 px-5 py-3"
            >
              <span className="flex min-w-[200px] items-center gap-2.5">
                {person && <Initials person={person} size="xs" />}
                <button
                  type="button"
                  onClick={() => onOpen(line)}
                  className="rounded text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {fullName(person)}
                </button>
              </span>
              <ul className="min-w-0 flex-1 space-y-1">
                {line.flags.map((flag) => (
                  <li key={flag} className="text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <Pill tone="warning">
                        <AlertTriangle className="size-3" aria-hidden />
                        {FLAG_LABEL[flag]}
                      </Pill>
                      <span className="text-muted-foreground">
                        {flagReason(flag, line, threshold)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

/** Everyone in the run, with what changed since last time. */
export function LinesTable({
  lines,
  onOpen,
}: {
  lines: PayrollLine[]
  onOpen: (line: PayrollLine) => void
}) {
  const store = useStore()
  const revealed = useRevealed()

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Every line in this run. Each row opens the breakdown behind it.
        </caption>
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            {[
              "Employee",
              "Gross",
              "Deductions",
              "Net",
              "Change",
              "Paid to",
              "Flags",
            ].map((h) => (
              <th
                key={h}
                scope="col"
                className="px-4 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:pl-5 last:pr-5"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {lines.map((line) => {
            const person = store.employeeById(line.employeeId)
            const delta =
              line.previousNet === null ? null : line.net - line.previousNet
            const adjusted = line.adjustments.length > 0
            // What the line would have been without the hand-made
            // changes, so the before is readable beneath the after.
            const beforeAdjustments = line.adjustments.reduce(
              (n, a) =>
                a.direction === "deduct" ? n + a.amount : n - a.amount,
              line.net
            )

            return (
              <tr
                key={line.employeeId}
                className="align-top transition-colors hover:bg-muted/30"
              >
                <td className="py-3 pl-5">
                  <button
                    type="button"
                    onClick={() => onOpen(line)}
                    className="flex items-center gap-2.5 rounded text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {person && <Initials person={person} size="xs" />}
                    <span className="min-w-0">
                      <span className="block truncate font-medium hover:underline">
                        {fullName(person)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {person?.department}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-4">
                  <Amount value={line.gross} currency={line.currency} />
                </td>
                <td className="px-4 text-muted-foreground">
                  <Amount
                    value={totalDeductions(line)}
                    currency={line.currency}
                  />
                </td>
                <td className="px-4 font-medium">
                  <Amount value={line.net} currency={line.currency} />
                  {adjusted && (
                    <span className="block text-xs text-muted-foreground line-through">
                      {revealed
                        ? signedMoney(beforeAdjustments, line.currency).replace(
                            /^\+/,
                            ""
                          )
                        : `${line.currency} ••••••`}
                    </span>
                  )}
                </td>
                <td className="tabular px-4">
                  {delta === null ? (
                    <span className="text-muted-foreground">New</span>
                  ) : (
                    <span
                      className={cn(
                        delta > 0 && "text-primary",
                        delta < 0 && "text-destructive"
                      )}
                    >
                      {revealed
                        ? signedMoney(delta, line.currency)
                        : `${line.currency} ••••••`}
                    </span>
                  )}
                </td>
                <td className="px-4 text-xs text-muted-foreground">
                  {line.paymentDestinationMasked ?? (
                    <span className="text-destructive">Nothing on file</span>
                  )}
                </td>
                <td className="py-3 pr-5 pl-4">
                  {line.flags.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {line.flags.map((f) => (
                        <Pill key={f} tone="warning">
                          {FLAG_LABEL[f]}
                        </Pill>
                      ))}
                    </span>
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
