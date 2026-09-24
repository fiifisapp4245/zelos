"use client"

import * as React from "react"
import Link from "next/link"
import { notFound, useParams } from "next/navigation"
import { AlertTriangle, Lock, RefreshCw, Send, Wallet } from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, PageHeader, Panel, Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Amount, RevealProvider, RevealToggle } from "@/components/pay/money"
import {
  ModeBadge,
  RUN_STATUS_LABEL,
  RunStepper,
} from "@/components/payroll/status"
import { ReadinessPanel } from "@/components/payroll/readiness-panel"
import { LinesTable, VariancePanel } from "@/components/payroll/lines-table"
import { LineSheet } from "@/components/payroll/line-sheet"
import { ExternalUpload } from "@/components/payroll/external-upload"
import { usePayroll, useReadiness } from "@/components/payroll/use-payroll"
import { useStore } from "@/lib/store"
import { blockingChecks, canApproveRun, runTotals } from "@/lib/pay/payroll"
import { signedMoney } from "@/lib/pay/money"
import type { PayrollLine, RunStatus } from "@/lib/pay/types"
import { formatDate, formatDateTime, fullName } from "@/lib/format"
import { cn } from "@/lib/utils"

export default function RunPage() {
  return (
    <React.Suspense fallback={null}>
      <Run />
    </React.Suspense>
  )
}

function Run() {
  const { id } = useParams<{ id: string }>()
  const store = useStore()
  const {
    runs,
    groupFor,
    linesFor,
    membersFor,
    isPreparer,
    canOpenPayroll,
  } = usePayroll()

  const run = runs.find((r) => r.id === id)
  const [revealed, setRevealed] = React.useState(false)
  const [open, setOpen] = React.useState<PayrollLine | null>(null)
  const [rejecting, setRejecting] = React.useState(false)

  const checks = useReadiness(
    run ?? {
      id: "none",
      payGroupId: "",
      kind: "regular",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-01",
      payDate: "2026-01-01",
      status: "upcoming",
      preparedBy: "",
      submittedAt: null,
      decision: null,
      fxRates: [],
      events: [],
    }
  )

  if (!run) notFound()
  if (!canOpenPayroll) {
    return (
      <PageShell crumbs={[{ label: "Pay" }, { label: "Payroll" }]}>
        <Panel bodyClassName="p-0">
          <EmptyState
            icon={Lock}
            title="Payroll is restricted"
            description="Runs are prepared by the Payroll Officer and approved by HR."
          />
        </Panel>
      </PageShell>
    )
  }

  const group = groupFor(run.payGroupId)
  const members = membersFor(run)
  const { lines, previous } = linesFor(run)
  const totals = runTotals(lines, previous)
  const flagged = lines.filter((l) => l.flags.length > 0)
  const blockers = blockingChecks(checks)
  const approval = canApproveRun(
    { employeeId: store.viewer.employeeId, roles: store.viewer.roles },
    run
  )

  const settled =
    run.status === "approved" ||
    run.status === "paying" ||
    run.status === "paid"
  const external = group?.calculationMode === "external"
  const awaitingUpload = external && lines.length === 0

  function advance(to: RunStatus, message: string) {
    store.advanceRun(run!.id, to)
    toast.success(message)
  }

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Pay" },
        { label: "Payroll", href: "/pay/payroll" },
        { label: group?.name ?? run.payGroupId },
      ]}
    >
      <PageHeader
        title={`${group?.name ?? "Run"} · ${formatDate(run.periodStart)} – ${formatDate(run.periodEnd)}`}
        description={
          <span>
            Pays {formatDate(run.payDate)} · prepared by{" "}
            {fullName(store.employeeById(run.preparedBy))}
            {run.kind === "off_cycle" && " · off-cycle"}
            {run.reason && ` · ${run.reason}`}
          </span>
        }
        meta={group && <ModeBadge mode={group.calculationMode} />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RevealToggle revealed={revealed} onChange={setRevealed} />

            {isPreparer && !settled && (
              <>
                {run.status === "upcoming" && (
                  <Button
                    size="lg"
                    onClick={() => advance("inputs_open", "Inputs are open")}
                  >
                    Open inputs
                  </Button>
                )}
                {run.status === "inputs_open" && (
                  <Button
                    size="lg"
                    onClick={() => advance("inputs_locked", "Inputs locked")}
                  >
                    <Lock className="size-4" />
                    Lock inputs
                  </Button>
                )}
                {run.status === "inputs_locked" && !external && (
                  <Button
                    size="lg"
                    disabled={blockers.length > 0}
                    onClick={() => advance("calculated", "Run calculated")}
                  >
                    Calculate
                  </Button>
                )}
                {run.status === "calculated" && (
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => advance("calculated", "Run recalculated")}
                    >
                      <RefreshCw className="size-4" />
                      Recalculate
                    </Button>
                    <Button
                      size="lg"
                      disabled={blockers.length > 0}
                      onClick={() =>
                        advance("pending_approval", "Sent for approval")
                      }
                    >
                      <Send className="size-4" />
                      Submit for approval
                    </Button>
                  </>
                )}
              </>
            )}

            {run.status === "pending_approval" && (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  disabled={!approval.allowed}
                  onClick={() => setRejecting(true)}
                >
                  Reject
                </Button>
                <Button
                  size="lg"
                  disabled={!approval.allowed}
                  onClick={() => {
                    store.decideRun(
                      run.id,
                      "approved",
                      "Approved as submitted."
                    )
                    toast.success("Run approved and the rates fixed")
                  }}
                >
                  Approve
                </Button>
              </>
            )}

            {settled && isPreparer && (
              <Button variant="outline" size="lg" asChild>
                <Link href="/pay/payroll">Correct with off-cycle run</Link>
              </Button>
            )}
          </div>
        }
      />

      {run.status === "pending_approval" && !approval.allowed && (
        <p className="-mt-2 mb-4 text-sm text-muted-foreground">
          {approval.reason}
        </p>
      )}

      <div className="mb-4 overflow-x-auto rounded-xl border bg-card px-4 py-3">
        <RunStepper status={run.status} />
      </div>

      {run.decision?.outcome === "rejected" && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-destructive bg-danger-muted px-4 py-3">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden
          />
          <p className="text-sm text-destructive">
            <strong className="font-medium">
              Sent back by {fullName(store.employeeById(run.decision.by))}
            </strong>{" "}
            on {formatDateTime(run.decision.at)} — “{run.decision.reason}”
          </p>
        </div>
      )}

      {settled && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-success-muted px-4 py-3 text-sm">
          <span className="font-medium text-primary">
            {RUN_STATUS_LABEL[run.status]}
          </span>
          <span className="text-muted-foreground">
            Approved by {fullName(store.employeeById(run.decision?.by))} on{" "}
            {run.decision && formatDateTime(run.decision.at)}. An approved run
            is never edited — a correction is a new off-cycle run.
          </span>
          {run.fxRates.map((fx) => (
            <Pill key={`${fx.from}-${fx.to}`} tone="neutral">
              1 {fx.from} = {fx.rate} {fx.to}, fixed at approval
            </Pill>
          ))}
        </div>
      )}

      <RevealProvider revealed={revealed}>
        <div className="space-y-4">
          <ReadinessPanel
            runId={run.id}
            checks={checks}
            canAcknowledge={isPreparer && !settled}
          />

          {awaitingUpload ? (
            <ExternalUpload
              run={run}
              members={members}
              canEdit={isPreparer && !settled}
            />
          ) : lines.length === 0 ? (
            <Panel bodyClassName="p-0">
              <EmptyState
                icon={Wallet}
                title="Nothing to pay yet"
                description="Nobody in this pay group has compensation in force for this period."
              />
            </Panel>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {totals.map((t) => (
                  <React.Fragment key={t.currency}>
                    <Figure
                      label="People paid"
                      value={t.headcount}
                      delta={t.delta?.headcount ?? null}
                      plain
                    />
                    <Figure
                      label={`Gross · ${t.currency}`}
                      value={t.gross}
                      currency={t.currency}
                      delta={t.delta?.gross ?? null}
                    />
                    <Figure
                      label={`Deductions · ${t.currency}`}
                      value={t.deductions}
                      currency={t.currency}
                      delta={t.delta?.deductions ?? null}
                    />
                    <Figure
                      label={`Employer contributions · ${t.currency}`}
                      value={t.employerContributions}
                      currency={t.currency}
                      delta={t.delta?.employerContributions ?? null}
                    />
                    <Figure
                      label={`Net pay · ${t.currency}`}
                      value={t.net}
                      currency={t.currency}
                      delta={t.delta?.net ?? null}
                    />
                    <Figure
                      label={`Total employer cost · ${t.currency}`}
                      value={t.employerCost}
                      currency={t.currency}
                      delta={t.delta?.employerCost ?? null}
                    />
                  </React.Fragment>
                ))}
              </div>

              <VariancePanel
                lines={flagged}
                threshold={group?.varianceThresholdPercent ?? 10}
                onOpen={setOpen}
              />

              <Panel
                title="Everyone in this run"
                description={
                  settled
                    ? "Read-only. This run has been approved."
                    : "Open a line to see what made the figure, or to change it."
                }
                bodyClassName="p-0"
              >
                <LinesTable lines={lines} onOpen={setOpen} />
              </Panel>
            </>
          )}
        </div>
      </RevealProvider>

      {open && (
        <LineSheet
          line={open}
          run={run}
          canAdjust={isPreparer && !settled}
          onClose={() => setOpen(null)}
        />
      )}

      {rejecting && (
        <RejectDialog runId={run.id} onClose={() => setRejecting(false)} />
      )}
    </PageShell>
  )
}

function Figure({
  label,
  value,
  currency,
  delta,
  plain,
}: {
  label: string
  value: number
  currency?: string
  delta: number | null
  plain?: boolean
}) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">
        {plain || !currency ? (
          <span className="tabular">{value}</span>
        ) : (
          <Amount value={value} currency={currency} />
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        {delta === null ? (
          "No run before this one to compare with"
        ) : delta === 0 ? (
          "Unchanged on last run"
        ) : (
          <span className={cn(delta > 0 ? "text-primary" : "text-destructive")}>
            {plain || !currency
              ? `${delta > 0 ? "+" : ""}${delta}`
              : signedMoney(delta, currency)}{" "}
            on last run
          </span>
        )}
      </p>
    </div>
  )
}

function RejectDialog({
  runId,
  onClose,
}: {
  runId: string
  onClose: () => void
}) {
  const store = useStore()
  const [reason, setReason] = React.useState("")

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send this run back</DialogTitle>
          <DialogDescription>
            It goes back to the preparer as calculated, with your reason on it.
            Nothing is discarded.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="reject-reason" className="mb-1.5 block">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="reject-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What has to change before you would approve it."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={reason.trim().length < 5}
            onClick={() => {
              store.decideRun(runId, "rejected", reason.trim())
              toast.success("Sent back to the preparer")
              onClose()
            }}
          >
            Send back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
