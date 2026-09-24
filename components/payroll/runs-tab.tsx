"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, ArrowRight, Plus, Wallet } from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Panel, StatCard } from "@/components/common"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CountryLabel } from "@/components/pay/money"
import { ModeBadge, RUN_STATUS_LABEL, RunStatusPill } from "./status"
import { usePayroll } from "./use-payroll"
import { useStore } from "@/lib/store"
import { FREQUENCY_LABEL } from "@/lib/pay/derive"
import type { PayrollRun, RunStatus } from "@/lib/pay/types"
import { TODAY_ISO, formatDate, fullName } from "@/lib/format"
import { addDays } from "@/lib/time"

const ACTIVE: RunStatus[] = [
  "inputs_open",
  "inputs_locked",
  "calculated",
  "pending_approval",
  "approved",
  "paying",
]

/** What the person looking at this run would do next, if anything. */
export function nextAction(
  run: PayrollRun,
  role: { isApprover: boolean; isPreparer: boolean }
): { label: string; mine: boolean } {
  switch (run.status) {
    case "upcoming":
      return { label: "Open inputs", mine: role.isPreparer }
    case "inputs_open":
      return { label: "Lock inputs", mine: role.isPreparer }
    case "inputs_locked":
      return { label: "Calculate", mine: role.isPreparer }
    case "calculated":
      return { label: "Submit for approval", mine: role.isPreparer }
    case "pending_approval":
      return { label: "Review and approve", mine: role.isApprover }
    case "approved":
      return { label: "Start payments", mine: role.isPreparer }
    case "paying":
      return { label: "Confirm payments", mine: role.isPreparer }
    case "paid":
      return { label: "Open run", mine: false }
  }
}

export function RunsTab() {
  const store = useStore()
  const router = useRouter()
  const { runs, groups, isApprover, isPreparer, linesFor } = usePayroll()
  const params = useSearchParams()
  const [tab, setTab] = React.useState("active")
  const [offCycle, setOffCycle] = React.useState(params.get("offCycle") === "1")

  const settings = store.approvalSettings
  const rolesConfigured =
    settings.payrollPreparerRole !== settings.payrollApproverRole

  const active = runs.filter((r) => ACTIVE.includes(r.status))
  const upcoming = runs.filter((r) => r.status === "upcoming")
  const completed = runs
    .filter((r) => r.status === "paid")
    .sort((a, b) => b.payDate.localeCompare(a.payDate))

  const mine = active.filter(
    (r) => nextAction(r, { isApprover, isPreparer }).mine
  )
  const dueThisWeek = [...active, ...upcoming].filter(
    (r) => r.payDate >= TODAY_ISO && r.payDate <= addDays(TODAY_ISO, 7)
  )
  const overdue = active.filter((r) => r.payDate < TODAY_ISO)

  if (!rolesConfigured) {
    return (
      <Panel bodyClassName="p-0">
        <EmptyState
          icon={AlertTriangle}
          title="Payroll cannot run yet"
          description="A run has to be prepared by one person and approved by another. At the moment both roles resolve to the same person, so nobody would be checking the run before it goes out."
          action={
            <Button variant="outline" asChild>
              <Link href="/settings/payroll-approval">
                Set the approval roles
              </Link>
            </Button>
          }
        />
      </Panel>
    )
  }

  const lists: Record<string, PayrollRun[]> = {
    active,
    upcoming,
    completed,
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Waiting on you"
          value={mine.length}
          hint={
            mine.length === 0
              ? "Nothing needs you right now"
              : "Runs you can move on"
          }
        />
        <StatCard
          label="Paying this week"
          value={dueThisWeek.length}
          hint={`Pay dates to ${formatDate(addDays(TODAY_ISO, 7))}`}
        />
        <StatCard
          label="Past their pay date"
          value={overdue.length}
          hint={overdue.length === 0 ? "Nothing is late" : "Still not paid"}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SegmentedTabs
            tabs={[
              { value: "active", label: "Active", count: active.length },
              { value: "upcoming", label: "Upcoming", count: upcoming.length },
              {
                value: "completed",
                label: "Completed",
                count: completed.length,
              },
            ]}
            emphasise={mine.length > 0 ? ["active"] : undefined}
          />
          {isPreparer && (
            <Button size="sm" className="h-9" onClick={() => setOffCycle(true)}>
              <Plus className="size-4" />
              Start off-cycle run
            </Button>
          )}
        </div>

        {(["active", "upcoming", "completed"] as const).map((key) => (
          <TabsContent key={key} value={key}>
            <Panel bodyClassName="p-0">
              {lists[key].length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title={
                    key === "active"
                      ? "No run is open"
                      : key === "upcoming"
                        ? "Nothing scheduled beyond the open runs"
                        : "No completed runs yet"
                  }
                  description={
                    key === "completed"
                      ? "Runs stay here once they are paid, with everything that was decided on them."
                      : "A run opens for each pay group when its period begins."
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">
                      Payroll runs. Each row opens the run.
                    </caption>
                    <thead>
                      <tr className="border-b bg-muted/40 text-left">
                        {[
                          "Pay group",
                          "Entity",
                          "Mode",
                          "Cycle",
                          "Period",
                          "Pay date",
                          "People",
                          "Status",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            scope="col"
                            className="px-4 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:pl-5 last:pr-5"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lists[key].map((run) => {
                        const group = groups.find(
                          (g) => g.id === run.payGroupId
                        )
                        const entity = store.legalEntities.find(
                          (e) => e.id === group?.entityId
                        )
                        const action = nextAction(run, {
                          isApprover,
                          isPreparer,
                        })
                        const headcount = linesFor(run).lines.length

                        return (
                          <tr
                            key={run.id}
                            className="transition-colors hover:bg-muted/30"
                          >
                            <td className="py-3 pl-5">
                              <Link
                                href={`/pay/payroll/runs/${run.id}`}
                                className="font-medium hover:underline"
                              >
                                {group ? (
                                  <span className="flex items-center gap-1.5">
                                    {group.country !== "—" && (
                                      <CountryLabel country={group.country} />
                                    )}
                                    {group.country === "—" && group.name}
                                  </span>
                                ) : (
                                  run.payGroupId
                                )}
                              </Link>
                              <span className="block text-xs text-muted-foreground">
                                {group?.name}
                                {run.kind === "off_cycle" && " · off-cycle"}
                              </span>
                            </td>
                            <td className="px-4 text-muted-foreground">
                              {entity?.name ?? "—"}
                            </td>
                            <td className="px-4">
                              {group && (
                                <ModeBadge mode={group.calculationMode} />
                              )}
                            </td>
                            <td className="px-4 text-muted-foreground">
                              {group && FREQUENCY_LABEL[group.frequency]}
                            </td>
                            <td className="tabular px-4 text-muted-foreground">
                              {formatDate(run.periodStart)} –{" "}
                              {formatDate(run.periodEnd)}
                            </td>
                            <td className="tabular px-4">
                              {formatDate(run.payDate)}
                            </td>
                            <td className="tabular px-4">{headcount}</td>
                            <td className="px-4">
                              <RunStatusPill status={run.status} />
                            </td>
                            <td className="py-3 pr-5 text-right">
                              <Button
                                variant={action.mine ? "default" : "outline"}
                                size="sm"
                                className="h-8"
                                onClick={() =>
                                  router.push(`/pay/payroll/runs/${run.id}`)
                                }
                              >
                                {action.mine ? action.label : "Open run"}
                                <ArrowRight className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </TabsContent>
        ))}
      </Tabs>

      {offCycle && <OffCycleDialog onClose={() => setOffCycle(false)} />}
    </div>
  )
}

/**
 * An off-cycle run exists because something went wrong or somebody
 * cannot wait for the 28th. It says who it is for and why, because an
 * unexplained extra payment is exactly what an audit asks about.
 */
function OffCycleDialog({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const router = useRouter()
  const { groups, membersFor } = usePayroll()
  const [payGroupId, setPayGroupId] = React.useState(groups[0]?.id ?? "")
  const [selected, setSelected] = React.useState<string[]>([])
  const [reason, setReason] = React.useState("")
  const [payDate, setPayDate] = React.useState(addDays(TODAY_ISO, 3))

  const candidates = membersFor({
    id: "draft",
    payGroupId,
    kind: "off_cycle",
    periodStart: TODAY_ISO,
    periodEnd: TODAY_ISO,
    payDate,
    status: "inputs_open",
    preparedBy: store.viewer.employeeId,
    submittedAt: null,
    decision: null,
    fxRates: [],
    events: [],
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start an off-cycle run</DialogTitle>
          <DialogDescription>
            For pay that cannot wait for the next cycle, or to correct a run
            that has already been approved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Pay group</Label>
            <Select
              value={payGroupId}
              onValueChange={(v) => {
                setPayGroupId(v)
                setSelected([])
              }}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="off-cycle-date" className="mb-1.5 block">
              Pay date
            </Label>
            <Input
              id="off-cycle-date"
              type="date"
              className="h-9 w-[180px]"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">
              Who is being paid
            </legend>
            <ul className="max-h-[220px] space-y-1 overflow-y-auto rounded-xl border p-2">
              {candidates.map((e) => (
                <li key={e.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded px-1.5 py-1 text-sm hover:bg-muted/50">
                    <Checkbox
                      checked={selected.includes(e.id)}
                      onCheckedChange={(v) =>
                        setSelected((s) =>
                          v === true
                            ? [...s, e.id]
                            : s.filter((x) => x !== e.id)
                        )
                      }
                      aria-label={`Include ${fullName(e)}`}
                    />
                    {fullName(e)}
                    <span className="text-xs text-muted-foreground">
                      {e.department}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <div>
            <Label htmlFor="off-cycle-reason" className="mb-1.5 block">
              Reason
            </Label>
            <Textarea
              id="off-cycle-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this cannot wait for the next cycle."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={selected.length === 0 || reason.trim().length < 5}
            onClick={() => {
              const run = store.startOffCycleRun({
                payGroupId,
                employeeIds: selected,
                reason: reason.trim(),
                payDate,
              })
              toast.success(
                `Off-cycle run started for ${selected.length} ${selected.length === 1 ? "person" : "people"}`
              )
              onClose()
              router.push(`/pay/payroll/runs/${run.id}`)
            }}
          >
            Start run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { RUN_STATUS_LABEL }
