"use client"

import { Check, X } from "lucide-react"

import { useStore } from "@/lib/store"
import { stepPosition } from "@/lib/approvals/selectors"
import { formatDateTime, fullName } from "@/lib/format"
import type { ApprovalItem } from "@/lib/approvals/types"
import { cn } from "@/lib/utils"

/**
 * Where the request has been and where it still has to go. The visual chain
 * is decorative — the sentence beside it is what a screen reader gets.
 */
export function ChainStepper({
  item,
  detailed = false,
}: {
  item: ApprovalItem
  /** Adds who decided, when, and what they wrote. */
  detailed?: boolean
}) {
  const store = useStore()
  const { step, of } = stepPosition(item)
  const settled = item.status !== "pending"

  const sentence = settled
    ? `${item.status === "approved" ? "Approved" : "Declined"} after ${item.history.length} of ${of} steps`
    : `Step ${step} of ${of}, waiting on ${item.chain[item.currentStepIndex]?.label}`

  if (!detailed) {
    return (
      <>
        <span className="sr-only">{sentence}</span>
        <ol aria-hidden className="flex flex-wrap items-center gap-1">
          {item.chain.map((s, i) => {
            const decision = item.history.find((d) => d.stepIndex === i)
            const current = !settled && i === item.currentStepIndex
            const approved =
              decision?.action === "approve" || decision?.action === "verify"
            const refused =
              decision?.action === "decline" || decision?.action === "reject"
            return (
              <li key={`${s.role}-${i}`} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground/40">›</span>}
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[11px]",
                    approved && "bg-success-muted text-primary",
                    refused && "bg-danger-muted text-destructive",
                    current &&
                      "bg-warning-muted font-medium text-warning-foreground",
                    !decision && !current && "bg-muted text-muted-foreground"
                  )}
                >
                  {s.label}
                  {approved && " ✓"}
                  {refused && " ✕"}
                </span>
              </li>
            )
          })}
        </ol>
      </>
    )
  }

  return (
    <ol className="space-y-2.5">
      <li className="sr-only">{sentence}</li>
      {item.chain.map((s, i) => {
        const decision = item.history.find((d) => d.stepIndex === i)
        const current = !settled && i === item.currentStepIndex
        const refused =
          decision?.action === "decline" || decision?.action === "reject"
        return (
          <li key={`${s.role}-${i}`} className="flex gap-2.5">
            <span
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px]",
                decision && !refused && "bg-success-muted text-primary",
                refused && "bg-danger-muted text-destructive",
                current && "bg-warning-muted text-warning-foreground",
                !decision && !current && "bg-muted text-muted-foreground"
              )}
            >
              {decision && !refused ? (
                <Check className="size-3" />
              ) : refused ? (
                <X className="size-3" />
              ) : (
                i + 1
              )}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {s.label}
                {current && (
                  <span className="ml-1.5 text-xs font-normal text-warning-foreground">
                    waiting on you
                  </span>
                )}
              </p>
              {decision && (
                <p className="text-xs text-muted-foreground">
                  {fullName(store.employeeById(decision.actorId))} ·{" "}
                  {formatDateTime(decision.at)}
                </p>
              )}
              {decision?.note && (
                <p className="mt-1 rounded-lg border-l-2 border-border bg-muted/50 px-2.5 py-1.5 text-xs">
                  {decision.note}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
