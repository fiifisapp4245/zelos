"use client"

import { Initials } from "@/components/common"
import { ChangeStatusPill } from "./money"
import type { CompensationChangeRequest } from "@/lib/pay/types"
import { formatDate, fullName } from "@/lib/format"
import { useStore } from "@/lib/store"

const KIND_LABEL: Record<CompensationChangeRequest["kind"], string> = {
  individual: "One person",
  bulk: "Several people",
  relocation: "Relocation",
}

function describe(request: CompensationChangeRequest) {
  const { type, value } = request.definition
  if (type === "percent") return `${value > 0 ? "+" : ""}${value}%`
  if (type === "fixed_increase") return `+${value.toLocaleString()}`
  return `Set to ${value.toLocaleString()}`
}

/**
 * Every pay change and where it has got to. The amounts are deliberately
 * not here: this is a queue of decisions, and the figures belong in the
 * sheet where the decision is actually made.
 */
export function ChangesTable({
  requests,
  onOpen,
}: {
  requests: CompensationChangeRequest[]
  onOpen: (request: CompensationChangeRequest) => void
}) {
  const store = useStore()

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Pay change requests. Each row opens the request for a decision.
        </caption>
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            {[
              "Scope",
              "Change",
              "Effective",
              "Proposed by",
              "Decided by",
              "Status",
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
          {requests.map((r) => {
            const people = r.employeeIds
              .map((id) => store.employeeById(id))
              .filter(Boolean)
            const proposer = store.employeeById(r.proposedBy)
            const decider = store.employeeById(r.decision?.by)

            return (
              <tr
                key={r.id}
                className="cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => onOpen(r)}
              >
                <td className="py-3 pl-5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpen(r)
                    }}
                    className="rounded text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="block font-medium">
                      {people.length === 1
                        ? fullName(people[0])
                        : `${people.length} people`}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {KIND_LABEL[r.kind]}
                      {r.relocation && ` · to ${r.relocation.toCountry}`}
                    </span>
                  </button>
                </td>
                <td className="tabular px-4">{describe(r)}</td>
                <td className="tabular px-4 text-muted-foreground">
                  {formatDate(r.effectiveFrom)}
                </td>
                <td className="px-4">
                  <span className="flex items-center gap-2">
                    {proposer && <Initials person={proposer} size="xs" />}
                    <span className="truncate">{fullName(proposer)}</span>
                  </span>
                </td>
                <td className="px-4 text-muted-foreground">
                  {decider ? fullName(decider) : "—"}
                </td>
                <td className="py-3 pr-5 pl-4">
                  <ChangeStatusPill status={r.status} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
