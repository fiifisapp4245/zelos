"use client"

import { Check, X } from "lucide-react"

import { Initials, Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ChainStepper } from "./chain-stepper"
import { useStore } from "@/lib/store"
import {
  TYPE_LABEL,
  actionWordsFor,
  canBulkApprove,
} from "@/lib/approvals/approval-chains"
import { isOverdue, stepPosition } from "@/lib/approvals/selectors"
import { TODAY, daysUntil, fullName, relativeTime } from "@/lib/format"
import type { ApprovalItem } from "@/lib/approvals/types"
import { cn } from "@/lib/utils"

/**
 * One request in a queue. The same row serves the Approvals page and the
 * Home widget — Home simply leaves out the checkbox and the quick actions.
 */
export function ApprovalRow({
  item,
  onOpen,
  selected,
  onSelect,
  onQuickDecide,
  compact = false,
}: {
  item: ApprovalItem
  onOpen: (el: HTMLElement) => void
  /** Omit both to hide the checkbox column entirely, as Home does. */
  selected?: boolean
  onSelect?: (next: boolean) => void
  onQuickDecide?: (action: "approve" | "decline" | "verify" | "reject") => void
  compact?: boolean
}) {
  const store = useStore()
  const requester = store.employeeById(item.requester)
  const subject = store.employeeById(item.subject)
  if (!requester) return null

  const overdue = isOverdue(item, TODAY)
  const left = daysUntil(item.dueAt) ?? 0
  const { step, of } = stepPosition(item)
  const words = actionWordsFor(item.type)
  const eligible = canBulkApprove(item.type)
  const forSomeoneElse = subject && subject.id !== requester.id

  return (
    <li
      className={cn(
        "flex flex-wrap items-start gap-3 px-4 py-3.5 md:flex-nowrap md:items-center md:px-5",
        overdue && "bg-danger-muted/25"
      )}
    >
      {onSelect && (
        // Fixed width whether or not a checkbox lands in it, so every row
        // lines up down the column.
        <span className="flex w-8 shrink-0 justify-center pt-1 md:pt-0">
          {eligible ? (
            <Checkbox
              checked={selected}
              onCheckedChange={(v) => onSelect(v === true)}
              aria-label={`Select ${TYPE_LABEL[item.type].toLowerCase()} from ${fullName(requester)}`}
            />
          ) : (
            <span
              className="block size-4 rounded border border-dashed border-border/70"
              title="Decide individually"
            >
              <span className="sr-only">
                {TYPE_LABEL[item.type]} from {fullName(requester)} must be
                decided individually
              </span>
            </span>
          )}
        </span>
      )}

      <button
        type="button"
        onClick={(e) => onOpen(e.currentTarget)}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Initials person={requester} size="md" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium">{fullName(requester)}</span>
            <span className="text-sm text-muted-foreground">
              {TYPE_LABEL[item.type]}
            </span>
            {forSomeoneElse && (
              <Pill tone="neutral">for {subject.firstName}</Pill>
            )}
            {overdue ? (
              <Pill tone="danger">{Math.abs(left)}d overdue</Pill>
            ) : left === 0 ? (
              <Pill tone="warning">Due today</Pill>
            ) : null}
          </span>

          <span className="mt-0.5 block text-sm text-muted-foreground">
            {item.summary}
          </span>

          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{relativeTime(item.submittedAt)}</span>
            <span aria-hidden>·</span>
            <span className="font-medium text-foreground">
              Step {step} of {of}
            </span>
            <span aria-hidden>·</span>
            <span>You</span>
          </span>

          {!compact && (
            <span className="mt-2 block">
              <ChainStepper item={item} />
            </span>
          )}
        </span>
      </button>

      {onQuickDecide && (
        <span className="flex shrink-0 items-center gap-1.5">
          <Button size="sm" onClick={() => onQuickDecide(words.positive)}>
            <Check className="size-4" />
            {words.positive === "verify" ? "Verify" : "Approve"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              // A refusal needs a reason, which lives in the drawer.
              onOpen(e.currentTarget)
            }}
          >
            <X className="size-4" />
            {words.negative === "reject" ? "Reject" : "Decline"}
          </Button>
        </span>
      )}
    </li>
  )
}
