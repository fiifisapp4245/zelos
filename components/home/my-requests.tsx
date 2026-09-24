"use client"

import Link from "next/link"
import { toast } from "sonner"

import { Pill } from "@/components/common"
import { Widget, WidgetEmpty } from "./widget"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { myRequests } from "@/lib/home/home-data"
import { currentStep, stepPosition } from "@/lib/approvals/selectors"
import { TYPE_LABEL } from "@/lib/approvals/approval-chains"
import { relativeTime } from "@/lib/format"
import type { ApprovalItem } from "@/lib/approvals/types"
import { cn } from "@/lib/utils"

const STATUS_TONE = {
  pending: "warning",
  approved: "success",
  declined: "danger",
  cancelled: "neutral",
} as const

const STATUS_LABEL = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
  cancelled: "Cancelled",
} as const

/** What I have asked for, and who it is sitting with. */
export function MyRequests() {
  const store = useStore()
  const rows = myRequests(store.approvals, store.session.id)

  return (
    <Widget title="My requests" bodyClassName="p-0">
      {rows.length === 0 ? (
        <WidgetEmpty>You have not raised any requests.</WidgetEmpty>
      ) : (
        <ul className="divide-y">
          {rows.slice(0, 5).map((r) => (
            <Row key={r.id} request={r} />
          ))}
        </ul>
      )}
    </Widget>
  )
}

/** Which way a step went, if it has been decided at all. */
function decided(item: ApprovalItem, stepIndex: number) {
  const d = item.history.find((h) => h.stepIndex === stepIndex)
  if (!d) return null
  return d.action === "approve" || d.action === "verify" ? "approve" : "decline"
}

function Row({ request }: { request: ApprovalItem }) {
  const store = useStore()
  const { step, of } = stepPosition(request)
  const stage = currentStep(request)

  return (
    <li className="flex flex-wrap items-start gap-3 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">
            {TYPE_LABEL[request.type]}
          </span>
          <Pill tone={STATUS_TONE[request.status]}>
            {STATUS_LABEL[request.status]}
          </Pill>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {request.summary}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Raised {relativeTime(request.submittedAt)}
          {request.status === "pending" && stage && (
            <>
              {" · "}
              <span className="font-medium text-foreground">
                Step {step} of {of}
              </span>
              {" · with "}
              {stage.label}
            </>
          )}
        </p>

        <ol className="mt-1.5 flex flex-wrap items-center gap-1">
          {request.chain.map((s, i) => (
            <li key={`${s.role}-${i}`} className="flex items-center gap-1">
              {i > 0 && (
                <span className="text-muted-foreground/40" aria-hidden>
                  ›
                </span>
              )}
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[11px]",
                  decided(request, i) === "approve" &&
                    "bg-success-muted text-primary",
                  decided(request, i) === "decline" &&
                    "bg-danger-muted text-destructive",
                  !decided(request, i) && "bg-muted text-muted-foreground"
                )}
              >
                {s.label}
                {decided(request, i) === "approve" && " ✓"}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {request.status === "pending" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              store.decideApproval(
                request.id,
                "decline",
                "Cancelled by the requester"
              )
              toast.success("Request cancelled")
            }}
          >
            Cancel
          </Button>
        )}
        <Button size="sm" variant="outline" asChild>
          <Link href="/approvals">View</Link>
        </Button>
      </div>
    </li>
  )
}
