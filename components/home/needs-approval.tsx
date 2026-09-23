"use client"

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { toast } from "sonner"

import { Initials, Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Widget, ViewAll, WidgetEmpty } from "./widget"
import { useStore } from "@/lib/store"
import { resolveAudience } from "@/lib/nav/get-nav-for-user"
import {
  STAGE_LABEL,
  approvalsFor,
  currentStep,
  stepPosition,
} from "@/lib/home/home-data"
import type { WidgetScope } from "@/lib/home/home-config"
import { holidaysBetween } from "@/lib/fixtures/ghanaHolidays"
import {
  LEAVE_TYPE_LABEL,
  daysUntil,
  formatDate,
  fullName,
  relativeTime,
} from "@/lib/format"
import type { ApprovalRequest } from "@/lib/types"
import { cn } from "@/lib/utils"

type Filter = "all" | "leave" | "pay_details" | "lifecycle" | "document"

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "leave", label: "Leave" },
  { id: "pay_details", label: "Pay details" },
  { id: "lifecycle", label: "Lifecycle" },
  { id: "document", label: "Documents" },
]

const KIND_LABEL: Record<ApprovalRequest["kind"], string> = {
  leave: "Leave request",
  pay_details: "Pay details change",
  lifecycle: "Lifecycle change",
  document: "Document verification",
}

/** What the toast calls the thing, which is not the row's label. */
const KIND_NOUN: Record<ApprovalRequest["kind"], string> = {
  leave: "Leave",
  pay_details: "Pay details",
  lifecycle: "Lifecycle change",
  document: "Document",
}

export function NeedsApproval({ scope }: { scope?: WidgetScope }) {
  const store = useStore()
  const { session, approvals, employees } = store
  const audience = resolveAudience(session)

  const [filter, setFilter] = React.useState<Filter>("all")
  // Rows leave on a delay so the decision is visibly acknowledged; with
  // reduced motion the CSS collapses the transition to nothing.
  const [leaving, setLeaving] = React.useState<string[]>([])
  const [expanded, setExpanded] = React.useState<string | null>(null)

  const queue = approvalsFor(approvals, audience, session.id, employees, scope)
  const shown = queue
    .filter((r) => filter === "all" || r.kind === filter)
    .filter((r) => !leaving.includes(r.id))

  function decide(
    request: ApprovalRequest,
    decision: "approved" | "declined",
    note?: string
  ) {
    setLeaving((l) => [...l, request.id])
    setExpanded(null)
    const noun = KIND_NOUN[request.kind]
    window.setTimeout(() => {
      store.decideApproval(request.id, decision, note)
      toast.success(
        `${noun} ${decision === "approved" ? "approved" : "declined"}`
      )
    }, 220)
  }

  // Payroll only ever sees pay details, so the chips would be one chip.
  const showFilters = scope !== "payDetails"

  return (
    <Widget
      id="needs-approval"
      title="Needs your approval"
      count={queue.length}
      weight="primary"
      actions={
        queue.length > 0 && <ViewAll href="/approvals" count={queue.length} />
      }
      bodyClassName="p-0"
    >
      {showFilters && (
        <div
          role="group"
          aria-label="Filter by module"
          className="flex flex-wrap gap-1.5 border-b px-5 py-3"
        >
          {FILTERS.map((f) => {
            const n =
              f.id === "all"
                ? queue.length
                : queue.filter((r) => r.kind === f.id).length
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  filter === f.id
                    ? "border-primary bg-success-muted font-medium text-primary"
                    : "text-muted-foreground hover:border-ring/50 hover:text-foreground"
                )}
              >
                {f.label}
                {n > 0 && (
                  <span className="tabular ml-1.5 opacity-60">{n}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {shown.length === 0 ? (
        <WidgetEmpty>All caught up. Nothing is waiting on you.</WidgetEmpty>
      ) : (
        <ul className="divide-y">
          {shown.slice(0, 5).map((request) => (
            <ApprovalRow
              key={request.id}
              request={request}
              expanded={expanded === request.id}
              onToggle={() =>
                setExpanded((id) => (id === request.id ? null : request.id))
              }
              onDecide={decide}
            />
          ))}
        </ul>
      )}
    </Widget>
  )
}

function ApprovalRow({
  request,
  expanded,
  onToggle,
  onDecide,
}: {
  request: ApprovalRequest
  expanded: boolean
  onToggle: () => void
  onDecide: (
    r: ApprovalRequest,
    decision: "approved" | "declined",
    note?: string
  ) => void
}) {
  const store = useStore()
  const employee = store.employeeById(request.employeeId)
  const [note, setNote] = React.useState("")
  const [declining, setDeclining] = React.useState(false)
  const panelId = `${request.id}-detail`

  if (!employee) return null

  const left = daysUntil(request.dueOn) ?? 0
  const { step, of } = stepPosition(request)
  const stage = currentStep(request)

  return (
    <li className="motion-safe:animate-in motion-safe:fade-in">
      <div className="flex flex-wrap items-start gap-3 px-5 py-4">
        <Initials person={employee} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium">{fullName(employee)}</span>
            <span className="text-sm text-muted-foreground">
              {KIND_LABEL[request.kind]}
            </span>
            {left < 0 ? (
              <Pill tone="danger">{Math.abs(left)}d overdue</Pill>
            ) : left === 0 ? (
              <Pill tone="warning">Due today</Pill>
            ) : null}
          </div>

          <p className="mt-0.5 text-sm text-muted-foreground">
            {summarise(request)}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{relativeTime(request.submittedAt)}</span>
            <span aria-hidden>·</span>
            <span className="font-medium text-foreground">
              Step {step} of {of}
            </span>
            {stage && (
              <>
                <span aria-hidden>·</span>
                <span>You ({STAGE_LABEL[stage.stage]})</span>
              </>
            )}
          </div>

          <Stepper request={request} />
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {expanded ? "Hide" : "Review"}
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              expanded && "rotate-180"
            )}
          />
        </button>
      </div>

      {expanded && (
        <div id={panelId} className="border-t bg-muted/20 px-5 py-4">
          <Context request={request} />

          <div className="mt-4">
            <Label
              htmlFor={`${request.id}-note`}
              className="mb-1.5 block text-xs font-medium"
            >
              Note to {employee.firstName}
              {declining ? (
                <span className="text-destructive"> — required to decline</span>
              ) : (
                <span className="text-muted-foreground"> (optional)</span>
              )}
            </Label>
            <Textarea
              id={`${request.id}-note`}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                declining
                  ? "Why is this being declined?"
                  : "Anything they should know."
              }
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() =>
                onDecide(request, "approved", note.trim() || undefined)
              }
            >
              <Check className="size-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant={declining ? "destructive" : "outline"}
              onClick={() => {
                if (!declining) return setDeclining(true)
                if (note.trim().length < 3) return
                onDecide(request, "declined", note.trim())
              }}
              disabled={declining && note.trim().length < 3}
            >
              <X className="size-4" />
              {declining ? "Confirm decline" : "Decline"}
            </Button>
            {declining && note.trim().length < 3 && (
              <span className="text-xs text-muted-foreground">
                Add a reason first.
              </span>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

/** Where the request has been and where it still has to go. */
function Stepper({ request }: { request: ApprovalRequest }) {
  return (
    <ol className="mt-2 flex flex-wrap items-center gap-1.5">
      {request.chain.map((s, i) => {
        const settled = s.decision !== "pending"
        const isCurrent =
          !settled &&
          request.chain.findIndex((x) => x.decision === "pending") === i
        return (
          <li key={`${s.stage}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && (
              <span className="text-muted-foreground/40" aria-hidden>
                ›
              </span>
            )}
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[11px]",
                s.decision === "approved" && "bg-success-muted text-primary",
                s.decision === "declined" && "bg-danger-muted text-destructive",
                isCurrent &&
                  "bg-warning-muted font-medium text-warning-foreground",
                !settled && !isCurrent && "bg-muted text-muted-foreground"
              )}
            >
              {STAGE_LABEL[s.stage]}
              {s.decision === "approved" && " ✓"}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** The facts you need to decide, without opening the record. */
function Context({ request }: { request: ApprovalRequest }) {
  const store = useStore()

  if (request.kind === "leave") {
    const balance = store.leaveBalances.find(
      (b) => b.employeeId === request.employeeId
    )
    const tile = balance?.byType.find((t) => t.type === request.leaveType)
    const remaining = tile ? tile.entitlement - tile.taken : 0
    const overlapping = store.leaveRequests.filter(
      (l) =>
        l.status === "approved" &&
        l.employeeId !== request.employeeId &&
        l.startDate <= request.endDate &&
        l.endDate >= request.startDate
    )
    const holidays = holidaysBetween(request.startDate, request.endDate)

    return (
      <dl className="grid gap-3 sm:grid-cols-3">
        <Fact label="Balance after approval">
          <span className="tabular">
            {remaining} → {remaining - request.days} days
          </span>
          <span className="block text-xs text-muted-foreground">
            of {tile?.entitlement ?? 0} {LEAVE_TYPE_LABEL[request.leaveType]}
          </span>
        </Fact>
        <Fact label="Away at the same time">
          {overlapping.length === 0 ? (
            <span className="text-muted-foreground">Nobody else</span>
          ) : (
            <ul className="space-y-0.5">
              {overlapping.slice(0, 3).map((l) => (
                <li key={l.id} className="truncate text-xs">
                  {fullName(store.employeeById(l.employeeId))}
                </li>
              ))}
            </ul>
          )}
        </Fact>
        <Fact label="Public holidays in range">
          {holidays.length === 0 ? (
            <span className="text-muted-foreground">None</span>
          ) : (
            <ul className="space-y-0.5">
              {holidays.map((h) => (
                <li key={h.date} className="truncate text-xs">
                  {h.name} · {formatDate(h.date)}
                </li>
              ))}
            </ul>
          )}
        </Fact>
      </dl>
    )
  }

  if (request.kind === "pay_details") {
    return (
      <dl className="grid gap-3 sm:grid-cols-3">
        <Fact label="Current">
          {request.before.provider}
          <span className="block font-mono text-xs">
            {request.before.account}
          </span>
        </Fact>
        <Fact label="Requested">
          <span className="text-primary">{request.after.provider}</span>
          <span className="block font-mono text-xs text-primary">
            {request.after.account}
          </span>
        </Fact>
        <Fact label="Requested by">
          {fullName(store.employeeById(request.requestedBy))}
          <span className="block text-xs text-muted-foreground">
            {relativeTime(request.submittedAt)}
          </span>
        </Fact>
      </dl>
    )
  }

  if (request.kind === "lifecycle") {
    return (
      <dl className="grid gap-3 sm:grid-cols-3">
        <Fact label="Current">
          {request.before.jobTitle}
          <span className="block text-xs text-muted-foreground">
            {request.before.payGrade} · {request.before.department}
          </span>
        </Fact>
        <Fact label="Proposed">
          <span className="text-primary">{request.after.jobTitle}</span>
          <span className="block text-xs text-primary">
            {request.after.payGrade} · {request.after.department}
          </span>
        </Fact>
        <Fact label="Effective">
          {formatDate(request.effectiveDate)}
          <span className="block text-xs text-muted-foreground">
            {request.reason}
          </span>
        </Fact>
      </dl>
    )
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <Fact label="Document">{request.documentName}</Fact>
      <Fact label="Category">
        <span className="capitalize">{request.category}</span>
        <span className="block text-xs text-muted-foreground">
          Uploaded {relativeTime(request.submittedAt)}
        </span>
      </Fact>
    </dl>
  )
}

function Fact({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{children}</dd>
    </div>
  )
}

function summarise(r: ApprovalRequest) {
  switch (r.kind) {
    case "leave":
      return `${LEAVE_TYPE_LABEL[r.leaveType]} · ${formatDate(r.startDate)} – ${formatDate(r.endDate)} · ${r.days} days`
    case "pay_details":
      return `${r.method === "bank" ? "Bank account" : "Mobile money"} · ${r.before.provider} → ${r.after.provider}`
    case "lifecycle":
      return `${r.before.jobTitle} → ${r.after.jobTitle} from ${formatDate(r.effectiveDate)}`
    case "document":
      return `${r.documentName} · uploaded ${formatDate(r.submittedAt.slice(0, 10))}`
  }
}
