"use client"

import * as React from "react"
import Link from "next/link"
import { CalendarPlus, Check, ClipboardList, Ban, X } from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  Panel,
  Pill,
  StatCard,
} from "@/components/common"
import { RequestBadge } from "@/components/common/status"
import { RowActions } from "@/components/common/row-actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStore } from "@/lib/store"
import { isDottedReport } from "@/lib/rbac"
import { pendingApprovalsFor, visibleEmployees } from "@/lib/selectors"
import {
  LEAVE_TYPE_LABEL,
  formatDate,
  fullName,
  relativeTime,
} from "@/lib/format"
import type { LeaveRequest, LeaveType } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function LeavePage() {
  const store = useStore()
  const { viewer, employees, leaveRequests, leaveBalances } = store
  const me = store.employeeById(viewer.employeeId)!
  const scopeIds = new Set(visibleEmployees(viewer, employees).map((e) => e.id))

  const [requestOpen, setRequestOpen] = React.useState(false)
  const [decision, setDecision] = React.useState<{
    request: LeaveRequest
    action: "approved" | "rejected"
  } | null>(null)

  const approvals = pendingApprovalsFor(viewer, employees, leaveRequests)
  const mine = leaveRequests.filter((r) => r.employeeId === me.id)
  const teamHistory = leaveRequests
    .filter((r) => scopeIds.has(r.employeeId) && r.employeeId !== me.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))

  const balance = leaveBalances.find((b) => b.employeeId === me.id)
  const remaining = balance
    ? balance.annualEntitlement +
      balance.carriedOver -
      balance.annualTaken -
      balance.annualPending
    : 0

  const onLeaveNow = employees.filter(
    (e) => scopeIds.has(e.id) && e.lifecycleState === "on_leave"
  )

  return (
    <PageShell
      width="wide"
      crumbs={[{ label: "Workspace", href: "/overview" }, { label: "Leave" }]}
    >
      <PageHeader
        title="Leave"
        description="Requests, balances and approvals. A dotted-line manager can approve alongside the primary line manager."
        actions={
          <Button size="lg" onClick={() => setRequestOpen(true)}>
            <CalendarPlus className="size-4" />
            Request leave
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Awaiting your decision"
          value={approvals.length}
          hint="Blocked until you act"
        />
        <StatCard
          label="Your annual leave left"
          value={remaining}
          hint={`of ${(balance?.annualEntitlement ?? 0) + (balance?.carriedOver ?? 0)} days`}
        />
        <StatCard
          label="Away right now"
          value={onLeaveNow.length}
          hint="In your scope"
        />
        <StatCard
          label="Your pending requests"
          value={mine.filter((r) => r.status === "pending").length}
          hint="Submitted, not yet decided"
        />
      </div>

      <Tabs defaultValue={approvals.length > 0 ? "approvals" : "mine"}>
        <TabsList
          variant="line"
          className="mb-5 h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0"
        >
          {[
            [
              "approvals",
              `Approvals${approvals.length ? ` (${approvals.length})` : ""}`,
            ],
            ["mine", "My leave"],
            ["team", "Team history"],
            ["balances", "Balances"],
          ].map(([v, l]) => (
            <TabsTrigger
              key={v}
              value={v}
              className="flex-none rounded-none border-0 px-3.5 py-2.5 text-sm after:bottom-0 data-active:font-medium data-active:text-primary data-active:after:bg-primary"
            >
              {l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="approvals">
          <Panel bodyClassName="p-0">
            {approvals.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Nothing waiting on you"
                description="When someone in your reporting line requests leave, it appears here."
              />
            ) : (
              <ul className="divide-y">
                {approvals.map((r) => {
                  const emp = store.employeeById(r.employeeId)!
                  const viaDotted = isDottedReport(viewer, emp)
                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-3 px-5 py-4"
                    >
                      <Initials person={emp} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/employees/${emp.id}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {fullName(emp)}
                          </Link>
                          <Pill tone="neutral">{LEAVE_TYPE_LABEL[r.type]}</Pill>
                          {viaDotted && (
                            <Pill tone="info">via dotted line</Pill>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {r.days} {r.days === 1 ? "day" : "days"} ·{" "}
                          {formatDate(r.startDate)} – {formatDate(r.endDate)} ·
                          submitted {relativeTime(r.submittedAt)}
                        </p>
                        <p className="mt-1 text-sm">{r.reason}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setDecision({ request: r, action: "rejected" })
                          }
                        >
                          <X className="size-3.5" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            setDecision({ request: r, action: "approved" })
                          }
                        >
                          <Check className="size-3.5" />
                          Approve
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="mine">
          <Panel bodyClassName="p-0">
            {mine.length === 0 ? (
              <EmptyState
                icon={CalendarPlus}
                title="No requests yet"
                action={
                  <Button
                    variant="outline"
                    onClick={() => setRequestOpen(true)}
                  >
                    Request leave
                  </Button>
                }
              />
            ) : (
              <RequestList requests={mine} showPerson={false} />
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="team">
          <Panel bodyClassName="p-0">
            {teamHistory.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No team requests in your scope"
              />
            ) : (
              <RequestList requests={teamHistory} showPerson />
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="balances">
          <Panel bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    {[
                      "Employee",
                      "Entitlement",
                      "Carried over",
                      "Taken",
                      "Pending",
                      "Remaining",
                      "Sick used",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:pl-5 last:pr-5"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leaveBalances
                    .filter((b) => scopeIds.has(b.employeeId))
                    .map((b) => {
                      const emp = store.employeeById(b.employeeId)
                      if (!emp) return null
                      const left =
                        b.annualEntitlement +
                        b.carriedOver -
                        b.annualTaken -
                        b.annualPending
                      return (
                        <tr
                          key={b.employeeId}
                          className="transition-colors hover:bg-muted/30"
                        >
                          <td className="py-2.5 pl-5">
                            <Link
                              href={`/employees/${emp.id}`}
                              className="flex items-center gap-2.5"
                            >
                              <Initials person={emp} size="xs" />
                              <span className="truncate font-medium">
                                {fullName(emp)}
                              </span>
                            </Link>
                          </td>
                          <td className="tabular px-4">
                            {b.annualEntitlement}
                          </td>
                          <td className="tabular px-4">{b.carriedOver}</td>
                          <td className="tabular px-4">{b.annualTaken}</td>
                          <td className="tabular px-4">{b.annualPending}</td>
                          <td className="px-4">
                            <span
                              className={cn(
                                "tabular font-medium",
                                left <= 2 ? "text-destructive" : "text-primary"
                              )}
                            >
                              {left}
                            </span>
                          </td>
                          <td className="tabular py-2.5 pr-5">
                            {b.sickTaken}/{b.sickEntitlement}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>

      <RequestLeaveDialog open={requestOpen} onOpenChange={setRequestOpen} />
      {decision && (
        <DecisionDialog
          key={`${decision.request.id}-${decision.action}`}
          decision={decision}
          onClose={() => setDecision(null)}
        />
      )}
    </PageShell>
  )
}

function RequestList({
  requests,
  showPerson,
}: {
  requests: LeaveRequest[]
  showPerson: boolean
}) {
  const store = useStore()
  return (
    <ul className="divide-y">
      {requests.map((r) => {
        const emp = store.employeeById(r.employeeId)
        const decider = store.employeeById(r.decidedBy)
        return (
          <li
            key={r.id}
            className="flex flex-wrap items-center gap-3 px-5 py-3.5"
          >
            {showPerson && emp && <Initials person={emp} size="sm" />}
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                {showPerson && (
                  <Link
                    href={`/employees/${r.employeeId}`}
                    className="font-medium hover:underline"
                  >
                    {fullName(emp)}
                  </Link>
                )}
                <span className={cn(!showPerson && "font-medium")}>
                  {LEAVE_TYPE_LABEL[r.type]} · {r.days}{" "}
                  {r.days === 1 ? "day" : "days"}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {r.id}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDate(r.startDate)} – {formatDate(r.endDate)} · {r.reason}
              </p>
              {r.decisionNote && (
                <p className="mt-1.5 rounded-lg border-l-2 border-border bg-muted/50 px-3 py-1.5 text-xs">
                  <span className="text-muted-foreground">
                    {fullName(decider)} said:
                  </span>{" "}
                  {r.decisionNote}
                </p>
              )}
            </div>
            <RequestBadge status={r.status} />
            {r.employeeId === store.viewer.employeeId &&
              r.status === "pending" && (
                <RowActions
                  label={`Actions for ${r.id}`}
                  actions={[
                    {
                      label: "Cancel request",
                      icon: Ban,
                      destructive: true,
                      onSelect: () => {
                        store.cancelLeave(r.id)
                        toast.success(`${r.id} cancelled.`)
                      },
                    },
                  ]}
                />
              )}
          </li>
        )
      })}
    </ul>
  )
}

/** Sequential, so IDs stay predictable while demoing. */
function nextRequestId(existing: LeaveRequest[]) {
  const highest = existing.reduce((max, r) => {
    const n = Number(r.id.split("-").at(-1))
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return `LR-2026-${String(highest + 1).padStart(3, "0")}`
}

function RequestLeaveDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const store = useStore()
  const me = store.employeeById(store.viewer.employeeId)!
  const [type, setType] = React.useState<LeaveType>("annual")
  const [start, setStart] = React.useState("")
  const [end, setEnd] = React.useState("")
  const [reason, setReason] = React.useState("")

  const days =
    start && end
      ? Math.max(
          1,
          Math.round(
            (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000
          ) + 1
        )
      : 0

  const balance = store.leaveBalances.find((b) => b.employeeId === me.id)
  const remaining = balance
    ? balance.annualEntitlement +
      balance.carriedOver -
      balance.annualTaken -
      balance.annualPending
    : 0
  const overBalance = type === "annual" && days > remaining

  function submit() {
    if (!start || !end || days <= 0) {
      toast.error("Pick a start and end date.")
      return
    }
    store.submitLeave({
      id: nextRequestId(store.leaveRequests),
      employeeId: me.id,
      type,
      startDate: start,
      endDate: end,
      days,
      reason: reason.trim() || "—",
      status: "pending",
      submittedAt: new Date().toISOString(),
      decidedBy: null,
      decidedAt: null,
    })
    const manager = store.employeeById(me.managerId)
    toast.success(`Request sent to ${fullName(manager)} for approval.`)
    onOpenChange(false)
    setStart("")
    setEnd("")
    setReason("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request leave</DialogTitle>
          <DialogDescription>
            Goes to {fullName(store.employeeById(me.managerId))} for approval
            {me.dottedLineManagerId &&
              `, or ${fullName(store.employeeById(me.dottedLineManagerId))} on the dotted line`}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-sm font-medium">
              Leave type
            </Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              {Object.entries(LEAVE_TYPE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label
                htmlFor="start"
                className="mb-1.5 block text-sm font-medium"
              >
                First day
              </Label>
              <Input
                id="start"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <Label htmlFor="end" className="mb-1.5 block text-sm font-medium">
                Last day
              </Label>
              <Input
                id="end"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="h-10"
              />
            </div>
          </div>

          {days > 0 && (
            <div
              className={cn(
                "rounded-lg border px-3.5 py-2.5 text-sm",
                overBalance
                  ? "border-destructive/30 bg-danger-muted text-destructive"
                  : "bg-muted/50"
              )}
            >
              {days} {days === 1 ? "day" : "days"} requested.{" "}
              {type === "annual" && (
                <span className={overBalance ? "" : "text-muted-foreground"}>
                  {overBalance
                    ? `That is ${days - remaining} more than your ${remaining}-day balance.`
                    : `${remaining - days} days would remain.`}
                </span>
              )}
            </div>
          )}

          <div>
            <Label
              htmlFor="reason"
              className="mb-1.5 block text-sm font-medium"
            >
              Reason
            </Label>
            <Textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Helps your manager decide quickly."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="lg" onClick={submit}>
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DecisionDialog({
  decision,
  onClose,
}: {
  decision: { request: LeaveRequest; action: "approved" | "rejected" } | null
  onClose: () => void
}) {
  const store = useStore()
  const [note, setNote] = React.useState("")

  if (!decision) return null
  const emp = store.employeeById(decision.request.employeeId)
  const approving = decision.action === "approved"

  function submit() {
    if (!approving && note.trim().length < 5) {
      toast.error("Give a reason when rejecting — the employee sees it.")
      return
    }
    store.decideLeave(decision!.request.id, decision!.action, note.trim())
    toast.success(
      `${approving ? "Approved" : "Rejected"} — ${fullName(emp)} has been notified.`
    )
    onClose()
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {approving ? "Approve" : "Reject"} leave for {fullName(emp)}
          </DialogTitle>
          <DialogDescription>
            {LEAVE_TYPE_LABEL[decision.request.type]} · {decision.request.days}{" "}
            {decision.request.days === 1 ? "day" : "days"} ·{" "}
            {formatDate(decision.request.startDate)} –{" "}
            {formatDate(decision.request.endDate)}
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label htmlFor="note" className="mb-1.5 block text-sm font-medium">
            Note {!approving && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id="note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              approving
                ? "Optional — anything they should know before they go."
                : "Required — explain why, and what they could do instead."
            }
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant={approving ? "default" : "destructive"}
            onClick={submit}
          >
            {approving ? "Approve request" : "Reject request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
