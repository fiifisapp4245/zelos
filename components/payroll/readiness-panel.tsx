"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, ArrowUpRight, Check, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

import { Panel, Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useStore } from "@/lib/store"
import type { ReadinessCheck } from "@/lib/pay/types"
import { formatDateTime, fullName } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * What has to be true before this run can be calculated.
 *
 * A blocker stops the run, because the answer would be wrong. A warning
 * does not: somebody can decide to proceed, and their reason stays on
 * the run where the approver will see it.
 */
export function ReadinessPanel({
  runId,
  checks,
  canAcknowledge,
}: {
  runId: string
  checks: ReadinessCheck[]
  canAcknowledge: boolean
}) {
  const store = useStore()
  const [acknowledging, setAcknowledging] =
    React.useState<ReadinessCheck | null>(null)

  const blockers = checks.filter(
    (c) => c.severity === "blocker" && c.status === "fail"
  )
  const warnings = checks.filter(
    (c) => c.severity === "warning" && c.status !== "pass"
  )

  return (
    <Panel
      title="Before this run can go out"
      description={
        blockers.length > 0
          ? "One thing has to be fixed before the run can be calculated."
          : warnings.length > 0
            ? "Nothing is blocking it. These are worth a look first."
            : "Everything this run depends on is settled."
      }
      bodyClassName="p-0"
      actions={
        blockers.length > 0 ? (
          <Pill tone="danger">
            <ShieldAlert className="size-3" aria-hidden />
            {blockers.length} blocking
          </Pill>
        ) : warnings.length > 0 ? (
          <Pill tone="warning">
            <AlertTriangle className="size-3" aria-hidden />
            {warnings.length} to look at
          </Pill>
        ) : (
          <Pill tone="success">All clear</Pill>
        )
      }
    >
      <ul className="divide-y">
        {checks.map((check) => (
          <li
            key={check.id}
            className={cn(
              "flex flex-wrap items-start gap-3 px-5 py-3",
              check.status === "fail" &&
                check.severity === "blocker" &&
                "bg-danger-muted/40"
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                check.status === "pass"
                  ? "bg-success-muted text-primary"
                  : check.status === "acknowledged"
                    ? "bg-muted text-muted-foreground"
                    : check.severity === "blocker"
                      ? "bg-danger-muted text-destructive"
                      : "bg-warning-muted text-warning-foreground"
              )}
            >
              {check.status === "pass" ? (
                <Check className="size-3.5" aria-hidden />
              ) : (
                <AlertTriangle className="size-3.5" aria-hidden />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {check.label}
                {check.status === "fail" && (
                  <Pill
                    tone={check.severity === "blocker" ? "danger" : "warning"}
                  >
                    {check.severity === "blocker" ? "Blocking" : "Warning"}
                  </Pill>
                )}
                {check.status === "acknowledged" && (
                  <Pill tone="neutral">Acknowledged</Pill>
                )}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {check.detail}
              </p>
              {check.acknowledgement && (
                <p className="mt-1 text-xs text-primary">
                  {fullName(store.employeeById(check.acknowledgement.by))} ·{" "}
                  {formatDateTime(check.acknowledgement.at)} · “
                  {check.acknowledgement.reason}”
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {check.status !== "pass" && (
                <Button variant="outline" size="sm" className="h-8" asChild>
                  <Link href={check.link}>
                    Fix it
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
              )}
              {check.status === "fail" &&
                check.severity === "warning" &&
                canAcknowledge && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setAcknowledging(check)}
                  >
                    Proceed anyway
                  </Button>
                )}
            </div>
          </li>
        ))}
      </ul>

      {acknowledging && (
        <AcknowledgeDialog
          runId={runId}
          check={acknowledging}
          onClose={() => setAcknowledging(null)}
        />
      )}
    </Panel>
  )
}

function AcknowledgeDialog({
  runId,
  check,
  onClose,
}: {
  runId: string
  check: ReadinessCheck
  onClose: () => void
}) {
  const store = useStore()
  const [reason, setReason] = React.useState("")

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Proceed past this warning</DialogTitle>
          <DialogDescription>
            {check.detail} Your reason stays on the run, and the approver sees
            it before they sign anything off.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="ack-reason" className="mb-1.5 block">
            Reason
          </Label>
          <Textarea
            id="ack-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why this run can go ahead with it outstanding."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={reason.trim().length < 5}
            onClick={() => {
              store.acknowledgeReadiness(runId, check.id, reason.trim())
              toast.success("Acknowledged and recorded on the run")
              onClose()
            }}
          >
            Acknowledge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
