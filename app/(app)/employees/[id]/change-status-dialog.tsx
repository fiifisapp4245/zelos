"use client"

import * as React from "react"
import { AlertTriangle, ArrowRight, Ban } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { LifecycleBadge } from "@/components/common/status"
import { useStore } from "@/lib/store"
import {
  IRREVERSIBLE,
  LIFECYCLE_LABEL,
  LIFECYCLE_TRANSITIONS,
  fullName,
} from "@/lib/format"
import type { LifecycleState } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATE_BLURB: Partial<Record<LifecycleState, string>> = {
  probation:
    "Starts the probation clock. A probation-end alert is generated automatically.",
  active: "Full access to self-service. Counts towards headcount and payroll.",
  on_leave: "Stays on payroll. Attendance stops being expected for the period.",
  suspended:
    "Access is revoked pending a disciplinary outcome. Pay treatment is set by policy.",
  notice:
    "Starts the notice period and opens an offboarding case with a clearance checklist.",
  resigned:
    "Employment has ended by the employee's choice. This cannot be undone.",
  terminated: "Employment has ended by the employer. This cannot be undone.",
  retired:
    "Employment has ended at statutory retirement age. This cannot be undone.",
}

export function ChangeStatusDialog({
  employeeId,
  open,
  onOpenChange,
}: {
  employeeId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <ChangeStatusForm employeeId={employeeId} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  )
}

/**
 * Radix unmounts dialog content on close, so this form's state resets on its own —
 * no effect needed to clear it.
 */
function ChangeStatusForm({
  employeeId,
  onOpenChange,
}: {
  employeeId: string
  onOpenChange: (v: boolean) => void
}) {
  const store = useStore()
  const employee = store.employeeById(employeeId)
  const [target, setTarget] = React.useState<LifecycleState | null>(null)
  const [reason, setReason] = React.useState("")
  const [effective, setEffective] = React.useState("2026-09-18")
  const [confirmText, setConfirmText] = React.useState("")

  if (!employee) return null

  const current = employee.lifecycleState
  const allowed = LIFECYCLE_TRANSITIONS[current]
  const blocked = (Object.keys(LIFECYCLE_LABEL) as LifecycleState[]).filter(
    (s) => s !== current && !allowed.includes(s)
  )
  const irreversible = target ? IRREVERSIBLE.includes(target) : false
  const confirmWord = target ? LIFECYCLE_LABEL[target].toUpperCase() : ""
  const canSubmit =
    target !== null &&
    reason.trim().length >= 5 &&
    (!irreversible || confirmText.trim().toUpperCase() === confirmWord)

  function submit() {
    if (!target || !canSubmit) return
    store.changeLifecycle(employeeId, target, reason.trim(), effective)
    toast.success(
      `${fullName(employee)} moved to ${LIFECYCLE_LABEL[target]}. Logged against your name.`
    )
    onOpenChange(false)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Change lifecycle state</DialogTitle>
        <DialogDescription>
          {fullName(employee)} is currently{" "}
          <strong className="text-foreground">
            {LIFECYCLE_LABEL[current]}
          </strong>
          . Only the transitions permitted by the state machine are offered.
        </DialogDescription>
      </DialogHeader>

      {allowed.length === 0 ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-danger-muted p-4 text-sm">
          <Ban className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-muted-foreground">
            <strong className="text-destructive">
              {LIFECYCLE_LABEL[current]} is an end state.
            </strong>{" "}
            No further transitions are permitted. To re-employ this person,
            create a new record so their previous service history stays intact.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm font-medium">Move to</Label>
            <div className="grid gap-2">
              {allowed.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTarget(s)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    target === s
                      ? "border-primary bg-success-muted"
                      : "hover:bg-muted/60"
                  )}
                >
                  <span className="mt-0.5 flex items-center gap-2">
                    <LifecycleBadge state={current} />
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                    <LifecycleBadge state={s} />
                  </span>
                  <span className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground">
                    {STATE_BLURB[s]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {blocked.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Not available from {LIFECYCLE_LABEL[current]}:{" "}
              {blocked.map((b) => LIFECYCLE_LABEL[b]).join(", ")}.
            </p>
          )}

          <div>
            <Label
              htmlFor="effective"
              className="mb-1.5 block text-sm font-medium"
            >
              Effective date
            </Label>
            <Input
              id="effective"
              type="date"
              value={effective}
              onChange={(e) => setEffective(e.target.value)}
              className="h-10"
            />
          </div>

          <div>
            <Label
              htmlFor="reason"
              className="mb-1.5 block text-sm font-medium"
            >
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="What prompted this change? This becomes part of the permanent record."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Stored with your name and a timestamp. It cannot be edited later.
            </p>
          </div>

          {irreversible && target && (
            <div className="rounded-lg border border-destructive/30 bg-danger-muted p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="size-4" />
                {LIFECYCLE_LABEL[target]} cannot be undone
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                The record leaves active headcount, access is revoked and
                payroll stops after the final run. Re-employment requires a new
                record.
              </p>
              <Label
                htmlFor="confirm"
                className="mt-3 mb-1.5 block text-xs font-medium"
              >
                Type <strong className="font-mono">{confirmWord}</strong> to
                confirm
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="h-9"
                autoComplete="off"
              />
            </div>
          )}
        </div>
      )}

      <DialogFooter>
        <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        {allowed.length > 0 && (
          <Button size="lg" disabled={!canSubmit} onClick={submit}>
            {irreversible ? "Confirm and end employment" : "Change status"}
          </Button>
        )}
      </DialogFooter>
    </>
  )
}
