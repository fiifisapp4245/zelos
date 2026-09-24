"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Initials, Pill } from "@/components/common"
import { ApprovalContext } from "./approval-context"
import { ChainStepper } from "./chain-stepper"
import { DecisionActions } from "./decision-actions"
import { useStore } from "@/lib/store"
import {
  MODULE_HREF,
  MODULE_LABEL,
  TYPE_LABEL,
} from "@/lib/approvals/approval-chains"
import { isOverdue } from "@/lib/approvals/selectors"
import { TODAY, formatDate, formatDateTime, fullName } from "@/lib/format"
import type { ApprovalItem } from "@/lib/approvals/types"

/**
 * The full request. Radix handles the focus trap, Escape and returning focus
 * to whatever opened it; below 768px the sheet fills the screen.
 */
export function ApprovalDrawer({
  item,
  onClose,
  onDecide,
}: {
  item: ApprovalItem | null
  onClose: () => void
  onDecide: (
    item: ApprovalItem,
    action: "approve" | "decline" | "verify" | "reject",
    note?: string
  ) => void
}) {
  const store = useStore()
  if (!item) return null

  const requester = store.employeeById(item.requester)
  const subject = store.employeeById(item.subject)
  const overdue = isOverdue(item, TODAY)
  const settled = item.status !== "pending"

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]"
      >
        <SheetHeader className="space-y-0 border-b px-5 py-4 text-left">
          <SheetTitle className="text-base">{TYPE_LABEL[item.type]}</SheetTitle>
          <SheetDescription className="sr-only">
            Request {item.id} from {fullName(requester)}
          </SheetDescription>

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {requester && <Initials person={requester} size="md" />}
            <div className="min-w-0">
              <p className="text-sm font-medium">{fullName(requester)}</p>
              <p className="text-xs text-muted-foreground">
                {subject && subject.id !== requester?.id
                  ? `On behalf of ${fullName(subject)}`
                  : requester?.jobTitle}
              </p>
            </div>
            <span className="ml-auto flex flex-wrap items-center gap-1.5">
              <Pill tone="neutral">{MODULE_LABEL[item.module]}</Pill>
              {overdue && <Pill tone="danger">Overdue</Pill>}
              {settled && (
                <Pill tone={item.status === "approved" ? "success" : "danger"}>
                  {item.status === "approved" ? "Approved" : "Declined"}
                </Pill>
              )}
            </span>
          </div>

          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <span>
              <dt className="inline text-muted-foreground">Submitted </dt>
              <dd className="inline font-medium">
                {formatDateTime(item.submittedAt)}
              </dd>
            </span>
            <span>
              <dt className="inline text-muted-foreground">Due </dt>
              <dd className="inline font-medium">{formatDate(item.dueAt)}</dd>
            </span>
            <span>
              <dt className="inline text-muted-foreground">Reference </dt>
              <dd className="inline font-mono">{item.id}</dd>
            </span>
          </dl>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <section aria-labelledby={`${item.id}-summary`}>
            <h3
              id={`${item.id}-summary`}
              className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
            >
              Request
            </h3>
            <p className="text-sm">{item.summary}</p>
          </section>

          <section aria-labelledby={`${item.id}-context`}>
            <h3
              id={`${item.id}-context`}
              className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
            >
              What you need to decide
            </h3>
            <ApprovalContext item={item} />
          </section>

          <section aria-labelledby={`${item.id}-chain`}>
            <h3
              id={`${item.id}-chain`}
              className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
            >
              Approval chain
            </h3>
            <ChainStepper item={item} detailed />
          </section>

          <Link
            href={MODULE_HREF[item.module]}
            className="inline-flex items-center gap-1 rounded text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            View in {MODULE_LABEL[item.module]}
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        {!settled && (
          <div className="shrink-0 border-t px-5 py-4">
            <DecisionActions
              item={item}
              requesterName={requester?.firstName ?? "them"}
              onDecide={(action, note) => onDecide(item, action, note)}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
