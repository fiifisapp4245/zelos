"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, CalendarClock, Globe, Lock, Pencil } from "lucide-react"
import { toast } from "sonner"

import {
  EmptyState,
  Field,
  Panel,
  Pill,
  SectionGrid,
} from "@/components/common"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Amount,
  CountryLabel,
  PayGroupLabel,
  RevealProvider,
  RevealToggle,
  VersionStatusPill,
} from "./money"
import { useStore } from "@/lib/store"
import { canProposeFor, canSeePay } from "@/lib/pay/access"
import {
  currentVersion,
  derivePayGroup,
  employerCost,
  history,
  isBlocked,
  previousVersion,
  FREQUENCY_LABEL,
} from "@/lib/pay/derive"
import { percent } from "@/lib/pay/money"
import { RESIDENCY_THRESHOLD_DAYS } from "@/lib/pay/types"
import { TODAY_ISO, formatDate, fullName } from "@/lib/format"
import { cn } from "@/lib/utils"

const BASIS_LABEL: Record<string, string> = {
  salaried: "Salaried",
  hourly: "Hourly",
  daily: "Daily",
}

/**
 * One person's package, and how it got there.
 *
 * The card is what they are on today; the history underneath is every
 * version that ever applied, including the ones that were rejected or
 * stood down. Nothing on this screen deletes anything.
 */
export function EmployeeCompensation({ employeeId }: { employeeId: string }) {
  const store = useStore()
  const employee = store.employeeById(employeeId)!
  const [revealed, setRevealed] = React.useState(false)
  const [cancelling, setCancelling] = React.useState(false)
  const [relocating, setRelocating] = React.useState(false)

  if (!canSeePay(store.viewer, employee, store.employees)) {
    return (
      <EmptyState
        icon={Lock}
        title="Compensation is not visible to your role"
        description="Pay is visible to the person themselves, their line manager, HR Admin and Payroll. Everyone else routes compensation conversations through HR — a deliberate boundary, not a missing permission."
      />
    )
  }

  const versions = store.compensationVersions
  const current = currentVersion(versions, employeeId, TODAY_ISO)
  const scheduled = versions.find(
    (v) =>
      v.employeeId === employeeId &&
      v.status === "scheduled" &&
      v.effectiveFrom > TODAY_ISO
  )
  const abroad = store.assignmentsAbroad.find(
    (a) => a.employeeId === employeeId
  )
  const rows = history(versions, employeeId)
  const mayPropose = canProposeFor(store.viewer, employee, store.employees)

  if (!current) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No compensation on file"
        description="Nothing has been agreed for this person yet. A first version is written when a change is approved."
      />
    )
  }

  const group = store.payGroups.find((g) => g.id === current.payGroupId)
  const entity = store.legalEntities.find((e) => e.id === current.entityId)
  const pack =
    store.countryRulePacks.find((p) => p.country === current.workCountry) ??
    null
  const cost = employerCost(current, pack, store.payComponents)
  const recurring = current.components
    .map((value) => ({
      value,
      definition: store.payComponents.find((c) => c.id === value.componentId),
    }))
    .filter((c) => c.definition?.recurrence === "recurring")

  return (
    <RevealProvider revealed={revealed}>
      <div className="space-y-4">
        {abroad && (
          <div
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3",
              abroad.daysAbroad >= RESIDENCY_THRESHOLD_DAYS
                ? "border-destructive bg-danger-muted"
                : "border-warning bg-warning-muted"
            )}
          >
            <AlertTriangle
              className="size-4 shrink-0 text-warning-foreground"
              aria-hidden
            />
            <p className="min-w-0 flex-1 text-sm text-warning-foreground">
              <strong className="font-medium">
                {abroad.daysAbroad} days in {abroad.country}
              </strong>{" "}
              since {formatDate(abroad.since)}, against a{" "}
              {RESIDENCY_THRESHOLD_DAYS}-day residency threshold. Past that, tax
              residency usually moves and who withholds changes with it.
            </p>
            <span className="tabular text-xs font-medium text-warning-foreground">
              {RESIDENCY_THRESHOLD_DAYS - abroad.daysAbroad} days left
            </span>
          </div>
        )}

        {scheduled && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-info/40 bg-info-muted px-4 py-3">
            <CalendarClock className="size-4 shrink-0 text-info" aria-hidden />
            <p className="min-w-0 flex-1 text-sm">
              <strong className="font-medium">Scheduled change</strong> from{" "}
              {formatDate(scheduled.effectiveFrom)}:{" "}
              <Amount
                value={scheduled.baseAmount}
                currency={scheduled.currency}
              />{" "}
              — {scheduled.reason}
            </p>
            {mayPropose && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-card"
                onClick={() => setCancelling(true)}
              >
                Cancel scheduled change
              </Button>
            )}
          </div>
        )}

        <Panel
          title="Current package"
          description={`In force since ${formatDate(current.effectiveFrom)}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <RevealToggle revealed={revealed} onChange={setRevealed} />
              {mayPropose && (
                <>
                  <Button variant="outline" size="sm" className="h-9" asChild>
                    <Link
                      href={`/pay/compensation/changes/new?employees=${employeeId}`}
                    >
                      <Pencil className="size-4" />
                      Propose change
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => setRelocating(true)}
                  >
                    <Globe className="size-4" />
                    Change work location
                  </Button>
                </>
              )}
            </div>
          }
        >
          <SectionGrid cols={3}>
            <Field
              label="Base pay"
              value={
                <Amount
                  value={current.baseAmount}
                  currency={current.currency}
                  className="text-base font-semibold"
                />
              }
            />
            <Field label="Basis" value={BASIS_LABEL[current.payBasis]} />
            <Field
              label="Frequency"
              value={FREQUENCY_LABEL[current.frequency]}
            />
            <Field label="Currency" value={current.currency} />
            <Field label="Pay group" value={<PayGroupLabel group={group} />} />
            <Field label="Employing entity" value={entity?.name ?? "—"} />
            <Field
              label="Work location"
              value={<CountryLabel country={current.workCountry} />}
            />
            <Field label="Tax residency" value={current.taxResidency} />
            <Field
              label="Worker type"
              value={
                current.workerType === "contractor" ? "Contractor" : "Employee"
              }
            />
          </SectionGrid>

          <div className="mt-4 border-t pt-4">
            <h3 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Recurring components
            </h3>
            {recurring.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Base pay only — no recurring allowances or deductions.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {recurring.map(({ value, definition }) => (
                  <li
                    key={value.componentId}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      {definition?.name}
                      <Pill tone="neutral">
                        {definition?.category === "deduction"
                          ? "Deduction"
                          : definition?.category === "benefit_in_kind"
                            ? "Benefit in kind"
                            : "Allowance"}
                      </Pill>
                    </span>
                    <span>
                      {value.rate !== undefined ? (
                        <span className="tabular">{value.rate}% of base</span>
                      ) : (
                        <Amount
                          value={value.amount ?? 0}
                          currency={current.currency}
                        />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
            <div className="rounded-lg border px-3.5 py-2.5">
              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Employer cost, monthly
              </p>
              <p className="mt-0.5 text-base font-semibold">
                <Amount value={cost.monthly.total} currency={cost.currency} />
              </p>
              <p className="text-xs text-muted-foreground">
                Gross{" "}
                <Amount value={cost.monthly.gross} currency={cost.currency} />{" "}
                plus{" "}
                <Amount
                  value={cost.monthly.employerContributions}
                  currency={cost.currency}
                />{" "}
                of employer contributions
              </p>
            </div>
            <div className="rounded-lg border px-3.5 py-2.5">
              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Employer cost, annual
              </p>
              <p className="mt-0.5 text-base font-semibold">
                <Amount value={cost.annual.total} currency={cost.currency} />
              </p>
              <p className="text-xs text-muted-foreground">
                {pack
                  ? `Contributions from the ${pack.country} rules, version ${pack.version}`
                  : "No country rules held here; results come from the local provider"}
              </p>
            </div>
          </div>
        </Panel>

        <Panel
          title="History"
          description="Every version ever agreed, newest first. Nothing is edited or removed."
          bodyClassName="p-0"
        >
          <ol className="divide-y">
            {rows.map((v) => {
              const previous = previousVersion(versions, v)
              const change =
                previous && previous.baseAmount > 0
                  ? ((v.baseAmount - previous.baseAmount) /
                      previous.baseAmount) *
                    100
                  : null
              return (
                <li key={v.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tabular text-sm font-medium">
                      {formatDate(v.effectiveFrom)}
                    </span>
                    <VersionStatusPill status={v.status} />
                    <span className="text-sm">
                      {previous && (
                        <>
                          <Amount
                            value={previous.baseAmount}
                            currency={previous.currency}
                            className="text-muted-foreground"
                          />
                          {" → "}
                        </>
                      )}
                      <Amount value={v.baseAmount} currency={v.currency} />
                      {change !== null && (
                        <span className="tabular ml-1.5 text-primary">
                          {percent(change)}
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {v.reason}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Proposed by {fullName(store.employeeById(v.proposedBy))}
                    {v.approvedBy &&
                      ` · approved by ${fullName(store.employeeById(v.approvedBy))}`}
                    {v.approvedAt &&
                      ` on ${formatDate(v.approvedAt.slice(0, 10))}`}
                  </p>
                </li>
              )
            })}
          </ol>
        </Panel>
      </div>

      {cancelling && scheduled && (
        <CancelScheduledDialog
          versionId={scheduled.id}
          effectiveFrom={scheduled.effectiveFrom}
          onClose={() => setCancelling(false)}
        />
      )}

      {relocating && (
        <RelocateDialog
          employeeId={employeeId}
          onClose={() => setRelocating(false)}
        />
      )}
    </RevealProvider>
  )
}

function CancelScheduledDialog({
  versionId,
  effectiveFrom,
  onClose,
}: {
  versionId: string
  effectiveFrom: string
  onClose: () => void
}) {
  const store = useStore()
  const [reason, setReason] = React.useState("")

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel the scheduled change</DialogTitle>
          <DialogDescription>
            The version dated {formatDate(effectiveFrom)} stays on the record,
            marked cancelled with your reason. It is not deleted.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="cancel-reason" className="mb-1.5 block">
            Reason
          </Label>
          <Textarea
            id="cancel-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why it is being stood down."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep it
          </Button>
          <Button
            disabled={reason.trim().length < 5}
            onClick={() => {
              store.cancelScheduledVersion(versionId, reason.trim())
              toast.success("Scheduled change cancelled and recorded")
              onClose()
            }}
          >
            Cancel the change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const COUNTRIES = ["Ghana", "Nigeria", "Kenya", "United Kingdom", "Rwanda"]

/**
 * Moving someone country is a pay question before it is an HR one, so
 * the dialog previews where they would land — and where they cannot
 * land, it says so and offers the two real ways forward instead of a
 * submit button that would fail.
 */
function RelocateDialog({
  employeeId,
  onClose,
}: {
  employeeId: string
  onClose: () => void
}) {
  const store = useStore()
  const current = currentVersion(
    store.compensationVersions,
    employeeId,
    TODAY_ISO
  )
  const [country, setCountry] = React.useState(current?.workCountry ?? "Ghana")
  const [effectiveFrom, setEffectiveFrom] = React.useState(TODAY_ISO)
  const [reason, setReason] = React.useState("")

  const entity = store.legalEntities.find((e) => e.country === country)
  const result = derivePayGroup(
    entity?.id ?? null,
    country,
    current?.workerType ?? "employee",
    {
      entities: store.legalEntities,
      payGroups: store.payGroups,
      rulePacks: store.countryRulePacks,
    }
  )
  const blocked = isBlocked(result)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change work location</DialogTitle>
          <DialogDescription>
            Where somebody works decides which entity employs them, which pay
            group they sit in and who withholds their tax.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Moving to</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {blocked ? (
            <div className="rounded-xl border border-warning bg-warning-muted p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-warning-foreground">
                <AlertTriangle className="size-4" aria-hidden />
                They cannot be employed there yet
              </p>
              <p className="mt-1 text-sm text-warning-foreground">
                {result.blocked}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card"
                  onClick={() =>
                    toast(
                      "Contractor conversion starts in the Leaver and joiner flow."
                    )
                  }
                >
                  Convert to contractor
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card"
                  onClick={() =>
                    toast(
                      "Register the entity under Settings → Pay → Pay groups."
                    )
                  }
                >
                  Register an entity
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl border p-3 text-sm">
                They would move onto{" "}
                <strong className="font-medium">{result.name}</strong>, paid in{" "}
                {result.currency} by{" "}
                {
                  store.legalEntities.find((e) => e.id === result.entityId)
                    ?.name
                }
                .
              </div>
              <div>
                <Label htmlFor="relocate-date" className="mb-1.5 block">
                  Effective from
                </Label>
                <Input
                  id="relocate-date"
                  type="date"
                  className="h-9 w-[180px]"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="relocate-reason" className="mb-1.5 block">
                  Reason
                </Label>
                <Textarea
                  id="relocate-reason"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why they are moving, and anything the approver needs."
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {!blocked && (
            <Button
              disabled={reason.trim().length < 5 || !current}
              onClick={() => {
                store.proposeCompensationChange({
                  kind: "relocation",
                  employeeIds: [employeeId],
                  definition: {
                    type: "new_amount",
                    value: current?.baseAmount ?? 0,
                  },
                  effectiveFrom,
                  reason: reason.trim(),
                  relocation: {
                    toCountry: country,
                    toEntityId: result.entityId,
                  },
                })
                toast.success("Relocation sent for approval")
                onClose()
              }}
            >
              Submit for approval
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
