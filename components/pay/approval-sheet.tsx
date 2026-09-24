"use client"

import * as React from "react"
import { AlertTriangle, ArrowRight } from "lucide-react"
import { toast } from "sonner"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Initials, Pill } from "@/components/common"
import {
  Amount,
  ChangeStatusPill,
  CountryLabel,
  RevealProvider,
  RevealToggle,
} from "./money"
import { useStore } from "@/lib/store"
import {
  applyChange,
  canApprove,
  employerCost,
  isBlocked,
  derivePayGroup,
  periodFor,
  prorate,
} from "@/lib/pay/derive"
import { totalPerCurrency } from "@/lib/pay/money"
import type { CompensationChangeRequest } from "@/lib/pay/types"
import { TODAY_ISO, formatDate, formatDateTime, fullName } from "@/lib/format"
import { percent } from "@/lib/pay/money"

/**
 * One request, and the decision on it.
 *
 * The before-and-after is the whole argument, so it is the first thing
 * in the sheet and the cost sits under it. Where the viewer cannot
 * decide, the button stays where it is and says why — hiding it would
 * leave someone hunting for a control that was never going to appear.
 */
export function ApprovalSheet({
  request,
  onClose,
}: {
  request: CompensationChangeRequest
  onClose: () => void
}) {
  const store = useStore()
  const [reason, setReason] = React.useState("")
  const [rejecting, setRejecting] = React.useState(false)
  const [revealed, setRevealed] = React.useState(false)

  const check = canApprove(
    { employeeId: store.viewer.employeeId, roles: store.viewer.roles },
    request
  )

  const rows = applyChange(
    request.definition,
    request.employeeIds,
    store.compensationVersions,
    TODAY_ISO
  )

  const relocationTarget = request.relocation
    ? derivePayGroup(
        request.relocation.toEntityId,
        request.relocation.toCountry,
        "employee",
        {
          entities: store.legalEntities,
          payGroups: store.payGroups,
          rulePacks: store.countryRulePacks,
        }
      )
    : null
  const relocationBlocked =
    relocationTarget !== null && isBlocked(relocationTarget)

  // Cost is grouped per currency: a bulk change can cross entities, and
  // GHS plus NGN is not a number anyone can act on.
  const monthlyDelta = totalPerCurrency(
    rows
      .filter((r) => r.currency)
      .map((r) => {
        const version = r.current!
        const pack = store.countryRulePacks.find(
          (p) => p.country === version.workCountry
        )
        const before = employerCost(version, pack ?? null, store.payComponents)
        const after = employerCost(
          { ...version, baseAmount: r.newAmount },
          pack ?? null,
          store.payComponents
        )
        return {
          amount: after.monthly.total - before.monthly.total,
          currency: r.currency!,
        }
      })
  )

  function decide(action: "approved" | "rejected") {
    if (action === "rejected" && reason.trim().length < 5) {
      toast.error("Give a reason when rejecting — the proposer sees it.")
      return
    }
    store.decideCompensationChange(request.id, action, reason.trim())
    toast.success(
      action === "approved"
        ? `Approved. ${rows.length} ${rows.length === 1 ? "version" : "versions"} written, effective ${formatDate(request.effectiveFrom)}.`
        : "Rejected, and the proposer has been told why."
    )
    onClose()
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[640px]"
      >
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            {request.employeeIds.length === 1
              ? fullName(store.employeeById(request.employeeIds[0]))
              : `${request.employeeIds.length} people`}
            <ChangeStatusPill status={request.status} />
          </SheetTitle>
          <SheetDescription>
            Effective {formatDate(request.effectiveFrom)} · proposed by{" "}
            {fullName(store.employeeById(request.proposedBy))}
          </SheetDescription>
        </SheetHeader>

        <RevealProvider revealed={revealed}>
          <div className="space-y-5 px-4 pb-4">
            <p className="rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
              {request.reason}
            </p>

            {request.relocation && (
              <div
                className={
                  relocationBlocked
                    ? "rounded-xl border border-warning bg-warning-muted p-3"
                    : "rounded-xl border p-3"
                }
              >
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {relocationBlocked && (
                    <AlertTriangle
                      className="size-4 text-warning-foreground"
                      aria-hidden
                    />
                  )}
                  Relocating to{" "}
                  <CountryLabel country={request.relocation.toCountry} />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {relocationTarget && isBlocked(relocationTarget)
                    ? relocationTarget.blocked
                    : relocationTarget && !isBlocked(relocationTarget)
                      ? `They would move onto ${relocationTarget.name}.`
                      : ""}
                </p>
                {relocationTarget && isBlocked(relocationTarget) && (
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>· Convert them to a contractor in that country.</li>
                    <li>· Register an entity there first.</li>
                  </ul>
                )}
              </div>
            )}

            <section>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Before and after
                </h3>
                <RevealToggle revealed={revealed} onChange={setRevealed} />
              </div>

              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      {[
                        "Employee",
                        "Now",
                        "",
                        "After",
                        "Change",
                        "This period",
                      ].map((h, i) => (
                        <th
                          key={i}
                          className="px-3 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:pl-4 last:pr-4"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row) => {
                      const person = store.employeeById(row.employeeId)
                      if (!row.current || !row.currency)
                        return (
                          <tr key={row.employeeId}>
                            <td className="py-2 pl-4">{fullName(person)}</td>
                            <td
                              colSpan={5}
                              className="px-3 text-muted-foreground"
                            >
                              {row.blocked}
                            </td>
                          </tr>
                        )
                      const group = store.payGroups.find(
                        (g) => g.id === row.current!.payGroupId
                      )
                      const period = group
                        ? periodFor(group, request.effectiveFrom)
                        : {
                            start: request.effectiveFrom,
                            end: request.effectiveFrom,
                          }
                      const split = prorate(
                        row.currentAmount,
                        row.newAmount,
                        request.effectiveFrom,
                        period
                      )
                      return (
                        <tr key={row.employeeId}>
                          <td className="py-2 pl-4">
                            <span className="flex items-center gap-2">
                              {person && <Initials person={person} size="xs" />}
                              <span className="truncate">
                                {fullName(person)}
                              </span>
                            </span>
                          </td>
                          <td className="px-3">
                            <Amount
                              value={row.currentAmount}
                              currency={row.currency}
                            />
                          </td>
                          <td className="px-1 text-muted-foreground">
                            <ArrowRight className="size-3.5" aria-hidden />
                          </td>
                          <td className="px-3 font-medium">
                            <Amount
                              value={row.newAmount}
                              currency={row.currency}
                            />
                          </td>
                          <td className="tabular px-3 text-primary">
                            {percent(row.deltaPercent)}
                          </td>
                          <td className="px-3 py-2 pr-4 text-xs text-muted-foreground">
                            {split.midPeriod
                              ? `${split.daysOnOld}d old · ${split.daysOnNew}d new`
                              : "Full period"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Cost impact, per currency
              </h3>
              <ul className="space-y-1.5">
                {monthlyDelta.map((t) => (
                  <li
                    key={t.currency}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">
                      Employer cost, {t.currency}
                    </span>
                    <span>
                      <Amount value={t.amount} currency={t.currency} signed /> a
                      month ·{" "}
                      <Amount
                        value={t.amount * 12}
                        currency={t.currency}
                        signed
                      />{" "}
                      a year
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                History
              </h3>
              <ol className="space-y-2 border-l pl-3">
                {request.events.map((e, i) => (
                  <li key={i} className="text-xs">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Pill tone="neutral">{e.action}</Pill>
                      <span className="font-medium">
                        {fullName(store.employeeById(e.by))}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDateTime(e.at)}
                      </span>
                    </span>
                    {e.note && (
                      <span className="mt-0.5 block text-muted-foreground">
                        “{e.note}”
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            {(rejecting || check.allowed) && request.status === "pending" && (
              <div>
                <Label htmlFor="decision-note" className="mb-1.5 block">
                  Note{" "}
                  {rejecting && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  id="decision-note"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    rejecting
                      ? "Required — what would need to change for this to be approved."
                      : "Optional — anything the proposer should know."
                  }
                />
              </div>
            )}
          </div>
        </RevealProvider>

        {request.status === "pending" && (
          <SheetFooter className="flex-col items-stretch gap-2">
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="outline"
                disabled={!check.allowed}
                onClick={() =>
                  rejecting ? decide("rejected") : setRejecting(true)
                }
              >
                {rejecting ? "Confirm rejection" : "Reject"}
              </Button>
              <Button
                disabled={!check.allowed}
                onClick={() => decide("approved")}
              >
                Approve
              </Button>
            </div>
            {!check.allowed && (
              <p className="text-right text-xs text-muted-foreground">
                {check.reason}
              </p>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
