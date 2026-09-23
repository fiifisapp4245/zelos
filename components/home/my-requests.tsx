"use client"

import Link from "next/link"
import { toast } from "sonner"

import { Pill } from "@/components/common"
import { Widget, WidgetEmpty } from "./widget"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import {
  STAGE_LABEL,
  currentStep,
  myRequests,
  stepPosition,
} from "@/lib/home/home-data"
import { LEAVE_TYPE_LABEL, formatDate, relativeTime } from "@/lib/format"
import type { ApprovalRequest } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS_TONE = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
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

function Row({ request }: { request: ApprovalRequest }) {
  const store = useStore()
  const { step, of } = stepPosition(request)
  const stage = currentStep(request)
  const waiting =
    request.kind === "document" && request.waitingOn === "employee"

  return (
    <li className="flex flex-wrap items-start gap-3 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{title(request)}</span>
          <Pill tone={STATUS_TONE[request.status]}>
            {request.status === "rejected"
              ? "Declined"
              : capitalise(request.status)}
          </Pill>
          {waiting && <Pill tone="warning">Waiting on you</Pill>}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Raised {relativeTime(request.submittedAt)}
          {request.status === "pending" && stage && (
            <>
              {" · "}
              <span className="font-medium text-foreground">
                Step {step} of {of}
              </span>
              {" · with "}
              {STAGE_LABEL[stage.stage]}
            </>
          )}
        </p>

        <ol className="mt-1.5 flex flex-wrap items-center gap-1">
          {request.chain.map((s, i) => (
            <li key={`${s.stage}-${i}`} className="flex items-center gap-1">
              {i > 0 && (
                <span className="text-muted-foreground/40" aria-hidden>
                  ›
                </span>
              )}
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[11px]",
                  s.decision === "approved" && "bg-success-muted text-primary",
                  s.decision === "declined" &&
                    "bg-danger-muted text-destructive",
                  s.decision === "pending" && "bg-muted text-muted-foreground"
                )}
              >
                {STAGE_LABEL[s.stage]}
                {s.decision === "approved" && " ✓"}
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
                "declined",
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

function title(r: ApprovalRequest) {
  switch (r.kind) {
    case "leave":
      return `${LEAVE_TYPE_LABEL[r.leaveType]} leave · ${formatDate(r.startDate)} – ${formatDate(r.endDate)}`
    case "pay_details":
      return `${r.method === "bank" ? "Bank account" : "Mobile money"} change`
    case "lifecycle":
      return `${r.after.jobTitle} from ${formatDate(r.effectiveDate)}`
    case "document":
      return r.documentName
  }
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
