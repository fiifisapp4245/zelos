"use client"

import * as React from "react"
import {
  AlertTriangle,
  BellRing,
  Calculator,
  Download,
  Flag,
} from "lucide-react"
import { toast } from "sonner"

import { Panel, Pill } from "@/components/common"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CountryLabel } from "./money"
import { money } from "@/lib/pay/money"
import {
  allocationGap,
  bandThresholds,
  coveredCountries,
  differences,
  packFor,
  remitteeName,
  taxTreatmentText,
  versionsFor,
} from "@/lib/pay/rule-packs"
import {
  acknowledgementOf,
  complianceCalendar,
  packImpact,
  REMIND_DAYS_BEFORE,
  reportRows,
  toCsv,
  upcomingVersions,
  type CalendarRow,
  type FilingStatus,
  type ImpactTotals,
} from "@/lib/pay/compliance"
import { calculateLine, remittancesFor } from "@/lib/pay/payroll"
import { linesForRun } from "@/lib/pay/run-lines"
import { addDays } from "@/lib/time"
import { usePayroll } from "@/components/payroll/use-payroll"
import { useStore } from "@/lib/store"
import { TODAY_ISO, formatDate, fullName } from "@/lib/format"
import type {
  CompensationVersion,
  CountryRulePack,
  CountrySetup,
  CoverageChoice,
} from "@/lib/pay/types"

/**
 * Money in the currency a country is paid in: its pay group's, or its
 * entity's where no group pays there yet. Rule packs hold amounts, not
 * currencies, so the country's own currency is looked up rather than
 * assumed.
 */
export function countryMoney(
  store: ReturnType<typeof useStore>,
  country: string
): (amount: number) => string {
  const currency =
    store.payGroups.find((g) => g.country === country)?.currency ??
    store.legalEntities.find((e) => e.country === country)?.currency
  return (amount) =>
    currency ? money(amount, currency) : amount.toLocaleString("en-GB")
}


/* ── 3. Country rules ────────────────────────────────────────────────── */

export function CountryRulesPanel() {
  const store = useStore()
  const covered = coveredCountries(store.countryRulePacks)
  const used = [
    ...new Set(store.payGroups.map((g) => g.country).filter((c) => c !== "—")),
  ]

  return (
    <div className="space-y-8">
      {covered.map((country) => (
        <section key={country} className="space-y-4">
          <PackUpdates country={country} />
          <CountryPack country={country} />
          <YourSetup country={country} />
          <ComplianceCalendar country={country} />
        </section>
      ))}

      {used
        .filter((c) => !covered.includes(c))
        .map((country) => (
          <CoverageChoicePanel key={country} country={country} />
        ))}
    </div>
  )
}

/** A heading above a list, used throughout the pack. */
function RuleHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </h3>
  )
}

function Row({
  label,
  note,
  value,
  toVerify,
}: {
  label: string
  note?: string
  value: string
  toVerify?: string
}) {
  return (
    <li className="flex justify-between gap-3">
      <span className="min-w-0">
        {label}
        {note && (
          <span className="block text-xs text-muted-foreground">{note}</span>
        )}
        {toVerify && <ToVerify against={toVerify} />}
      </span>
      <span className="tabular shrink-0 text-muted-foreground">{value}</span>
    </li>
  )
}

/**
 * A figure the pack holds that has not yet been confirmed against its
 * source. Shown beside the figure, so nobody reads a placeholder as law.
 */
export function ToVerify({ against }: { against: string }) {
  return (
    <span className="mt-0.5 block">
      <Pill tone="warning" className="whitespace-normal">
        To verify against {against}
      </Pill>
    </span>
  )
}

/**
 * One country's rules, in full and read-only, with the version that was
 * in force selectable. Everything here is the law rather than a company
 * decision, so there is nothing to edit — but there is a great deal to
 * check, which is why it is all on screen rather than summarised.
 */
function CountryPack({ country }: { country: string }) {
  const store = useStore()
  const versions = versionsFor(store.countryRulePacks, country)
  // The version in force today, not the newest published: a version
  // that has not started yet is reviewed above, not read as the law.
  const inForce = packFor(store.countryRulePacks, country, TODAY_ISO)
  const [versionId, setVersionId] = React.useState(
    inForce?.version ?? versions[0]?.version ?? ""
  )
  const [testing, setTesting] = React.useState(false)
  const [reporting, setReporting] = React.useState(false)
  const pack = versions.find((v) => v.version === versionId) ?? versions[0]
  if (!pack) return null

  const current = inForce?.version === pack.version
  const future = pack.effectiveFrom > TODAY_ISO
  const previous = versions[versions.indexOf(pack) + 1] ?? null
  const componentName = (id: string) =>
    store.payComponents.find((c) => c.id === id)?.name ?? id
  const changes = previous ? differences(previous, pack, componentName) : []

  const payerTotal = [
    ...pack.employeeContributionRules,
    ...pack.employerContributionRules,
  ].reduce((n, r) => n + r.percentOfBase, 0)
  const gap = allocationGap(pack)

  // Thresholds rather than widths, which is what a person checking their
  // own tax actually wants to see.
  const bands = bandThresholds(pack)

  const fmt = countryMoney(store, country)
  const caps = Object.entries(pack.componentTreatments).filter(
    ([, t]) => t.cap !== undefined
  )
  const preTax = Object.entries(pack.componentTreatments).filter(
    ([, t]) => t.preTax
  )

  return (
    <Panel
      title={<CountryLabel country={pack.country} />}
      description={`Version ${pack.version} · in force from ${formatDate(pack.effectiveFrom)}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={current ? "success" : future ? "info" : "neutral"}>
            {current ? "In force" : future ? "Not yet in force" : "Past version"}
          </Pill>
          {versions.length > 1 && (
            <Select value={pack.version} onValueChange={setVersionId}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.version} value={v.version}>
                    {v.version}
                    {v.version === inForce?.version
                      ? " (in force)"
                      : v.effectiveFrom > TODAY_ISO
                        ? " (upcoming)"
                        : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            onClick={() => setTesting(true)}
          >
            <Calculator className="size-4" />
            Test a calculation
          </Button>
        </div>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <RuleHeading>Contributions · who pays</RuleHeading>
          <ul className="space-y-1 text-sm">
            {pack.employeeContributionRules.map((r) => (
              <Row
                key={r.id}
                label={r.name}
                note={r.note}
                value={`${r.percentOfBase}% of base`}
                toVerify={r.toVerify}
              />
            ))}
            {pack.employerContributionRules.map((r) => (
              <Row
                key={r.id}
                label={r.name}
                note={r.note}
                value={`${r.percentOfBase}% of base`}
                toVerify={r.toVerify}
              />
            ))}
            {payerTotal === 0 && (
              <li className="text-sm text-muted-foreground">None.</li>
            )}
          </ul>
          {payerTotal > 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {payerTotal}% of base between them. The employee&rsquo;s share
              comes out of gross; the employer&rsquo;s is paid on top.
            </p>
          )}
        </div>

        {pack.contributionAllocations.length > 0 && (
          <div>
            <RuleHeading>Contributions · where it goes</RuleHeading>
            <ul className="space-y-1 text-sm">
              {pack.contributionAllocations.map((a) => (
                <Row
                  key={a.id}
                  label={a.name}
                  note={`${a.note} Remitted to ${remitteeName(a.remittedTo)}${
                    a.remittedTo.kind === "company_choice"
                      ? ", named in your setup below."
                      : "."
                  }`}
                  value={`${a.percentOfBase}% of base`}
                  toVerify={a.toVerify}
                />
              ))}
            </ul>
            {gap === 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                The same {payerTotal}%, split by destination rather than by
                who pays it.
              </p>
            ) : (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-destructive">
                <AlertTriangle className="mt-px size-3.5 shrink-0" />
                These add up to {payerTotal - gap}%, but {payerTotal}% is
                collected. The pack disagrees with itself.
              </p>
            )}
          </div>
        )}

        {pack.voluntarySchemes.length > 0 && (
          <div className="sm:col-span-2">
            <RuleHeading>Voluntary schemes</RuleHeading>
            <ul className="space-y-1 text-sm">
              {pack.voluntarySchemes.map((v) => (
                <Row
                  key={v.id}
                  label={v.name}
                  note={v.note}
                  value="No set rate"
                />
              ))}
            </ul>
          </div>
        )}

        <div className="sm:col-span-2">
          <RuleHeading>Income tax bands, per month</RuleHeading>
          {pack.taxBandsToVerify && (
            <div className="mb-1.5">
              <ToVerify against={pack.taxBandsToVerify} />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  {["Chargeable income", "Width", "Rate"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="py-1.5 pr-4 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {bands.map((b, i) => (
                  <tr key={i}>
                    <td className="tabular py-1.5 pr-4">
                      {b.to === null
                        ? `Above ${fmt(b.from)}`
                        : `${fmt(b.from)} – ${fmt(b.to)}`}
                    </td>
                    <td className="tabular py-1.5 pr-4 text-muted-foreground">
                      {b.to === null
                        ? "The rest"
                        : fmt(b.to - b.from)}
                    </td>
                    <td className="tabular py-1.5 pr-4">{b.ratePercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            The first {fmt(bands[0]?.to ?? 0)} is taxed at nothing.
            Bands apply to pay after the employee contribution is taken off.
          </p>
        </div>

        {caps.length > 0 && (
          <div className="sm:col-span-2">
            <RuleHeading>Exempt up to a cap</RuleHeading>
            <ul className="space-y-1 text-sm">
              {caps.map(([id, t]) => (
                <Row
                  key={id}
                  label={componentName(id)}
                  note={taxTreatmentText(t, "allowance", fmt).label}
                  value={fmt(t.cap!)}
                  toVerify={t.toVerify}
                />
              ))}
            </ul>
          </div>
        )}

        {preTax.length > 0 && (
          <div className="sm:col-span-2">
            <RuleHeading>Deductions taken before tax</RuleHeading>
            <ul className="space-y-1 text-sm">
              {preTax.map(([id, t]) => {
                const text = taxTreatmentText(t, "deduction", fmt)
                return (
                  <Row
                    key={id}
                    label={componentName(id)}
                    note={text.detail}
                    value={text.label}
                    toVerify={t.toVerify}
                  />
                )
              })}
            </ul>
          </div>
        )}

        <div>
          <RuleHeading>Filing deadlines</RuleHeading>
          <ul className="space-y-1 text-sm">
            {pack.filingDeadlines.map((d) => (
              <Row key={d.name} label={d.name} value={d.due} />
            ))}
          </ul>
        </div>

        <div>
          <RuleHeading>Statutory reports</RuleHeading>
          <ul className="flex flex-wrap gap-1.5">
            {pack.statutoryReports.map((r) => (
              <li key={r}>
                <Pill tone="neutral">{r}</Pill>
              </li>
            ))}
          </ul>
        </div>

        {changes.length > 0 && previous && (
          <div className="sm:col-span-2">
            <RuleHeading>What moved since {previous.version}</RuleHeading>
            <ul className="space-y-1 text-sm">
              {changes.map((c) => (
                <Row
                  key={c.label}
                  label={c.label}
                  value={`${c.before} → ${c.after}`}
                />
              ))}
            </ul>
          </div>
        )}

        <div className="sm:col-span-2">
          <RuleHeading>Updates</RuleHeading>
          <ol className="space-y-2 border-l pl-3">
            {[...pack.updates]
              .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
              .map((u) => (
                <li key={u.title} className="text-sm">
                  <span className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{u.title}</span>
                    <span className="tabular text-xs text-muted-foreground">
                      from {formatDate(u.effectiveFrom)}
                    </span>
                  </span>
                  <span className="block text-muted-foreground">
                    {u.summary}
                  </span>
                </li>
              ))}
          </ol>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-xs text-muted-foreground">
          The rules above cannot be edited. They are the country&rsquo;s, and
          they change when Zelos publishes a new version.
        </p>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => setReporting(true)}
        >
          <Flag className="size-3.5" />
          Report an issue with this pack
        </Button>
      </div>

      {testing && (
        <TestCalculationSheet
          country={country}
          initialVersion={pack.version}
          onClose={() => setTesting(false)}
        />
      )}
      {reporting && (
        <ReportIssueDialog pack={pack} onClose={() => setReporting(false)} />
      )}
    </Panel>
  )
}



/* ── Who may do what ─────────────────────────────────────────────────── */

/**
 * HR Admin owns the company's side of a country: its setup, and saying a
 * new version has been seen. Filing and paying is the Payroll Officer's
 * day-to-day work, which HR Admin can also do. Nobody edits the rules.
 */
function usePermissions() {
  const store = useStore()
  const roles = store.viewer.roles
  const hrAdmin = roles.includes("hr_admin")
  return {
    canEditSetup: hrAdmin,
    canAcknowledge: hrAdmin,
    canChooseCoverage: hrAdmin,
    canFile: hrAdmin || roles.includes("payroll"),
  }
}

/* ── Pack updates ────────────────────────────────────────────────────── */

/** A banner per version published but not yet in force. */
function PackUpdates({ country }: { country: string }) {
  const store = useStore()
  const [reviewing, setReviewing] = React.useState<CountryRulePack | null>(
    null
  )
  const upcoming = upcomingVersions(store.countryRulePacks, country, TODAY_ISO)
  if (upcoming.length === 0) return null

  return (
    <>
      {upcoming.map((next) => {
        const ack = acknowledgementOf(
          store.packAcknowledgements,
          country,
          next.version
        )
        return (
          <div
            key={next.version}
            className={
              ack
                ? "flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3"
                : "flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning-muted px-4 py-3"
            }
          >
            <BellRing className="size-4 shrink-0 text-muted-foreground" />
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-medium">
                {country} {next.version} takes effect{" "}
                {formatDate(next.effectiveFrom)}.
              </span>{" "}
              <span className="text-muted-foreground">
                {ack
                  ? `Acknowledged by ${fullName(store.employeeById(ack.by))} on ${formatDate(ack.at.slice(0, 10))}.`
                  : "Nobody has reviewed it yet. A run under it will warn the preparer until somebody does."}
              </span>
            </p>
            <Button
              size="sm"
              variant={ack ? "outline" : "default"}
              className="h-9"
              onClick={() => setReviewing(next)}
            >
              Review changes
            </Button>
          </div>
        )
      })}
      {reviewing && (
        <ReviewSheet next={reviewing} onClose={() => setReviewing(null)} />
      )}
    </>
  )
}

/**
 * What a new version changes, side by side, and what it does to the
 * people paid under it — worked out by the engine a run uses, so the
 * preview and the first run under the new rules cannot disagree.
 */
function ReviewSheet({
  next,
  onClose,
}: {
  next: CountryRulePack
  onClose: () => void
}) {
  const store = useStore()
  const { canAcknowledge } = usePermissions()
  const previous = packFor(
    store.countryRulePacks,
    next.country,
    addDays(next.effectiveFrom, -1)
  )
  const componentName = (id: string) =>
    store.payComponents.find((c) => c.id === id)?.name ?? id
  const changes = previous ? differences(previous, next, componentName) : []
  const impact = packImpact({
    next,
    packs: store.countryRulePacks,
    groups: store.payGroups,
    versions: store.compensationVersions,
    components: store.payComponents,
  })
  const ack = acknowledgementOf(
    store.packAcknowledgements,
    next.country,
    next.version
  )

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[640px]"
      >
        <SheetHeader>
          <SheetTitle>
            {next.country} {next.version}
          </SheetTitle>
          <SheetDescription>
            Takes effect {formatDate(next.effectiveFrom)}
            {previous ? `, replacing ${previous.version}` : ""}. Acknowledging
            it says you have seen the change. It does not approve the law,
            which needs nobody&rsquo;s approval.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          <div>
            <RuleHeading>What changes</RuleHeading>
            {changes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rate, band or cap moves. Only the dates or wording change.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      {[
                        "",
                        `Now (${previous?.version})`,
                        `From ${formatDate(next.effectiveFrom)}`,
                      ].map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="py-1.5 pr-4 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {changes.map((c) => (
                      <tr key={c.label}>
                        <td className="py-1.5 pr-4">{c.label}</td>
                        <td className="tabular py-1.5 pr-4 text-muted-foreground">
                          {c.before}
                        </td>
                        <td className="tabular py-1.5 pr-4 font-medium">
                          {c.after}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {next.taxBandsToVerify && (
              <div className="mt-2">
                <ToVerify against={next.taxBandsToVerify} />
              </div>
            )}
          </div>

          <div>
            <RuleHeading>What it does to pay, per month</RuleHeading>
            {impact.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No pay group in {next.country} is calculated by Zelos.
              </p>
            )}
            <div className="space-y-4">
              {impact.map((g) => (
                <div key={g.groupId} className="rounded-xl border p-3">
                  <p className="text-sm font-medium">{g.groupName}</p>
                  <p className="text-sm text-muted-foreground">
                    {g.affected} of {g.people}{" "}
                    {g.people === 1 ? "person" : "people"} see their net pay
                    change.
                  </p>
                  <table className="mt-2 w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        {["", "Now", "Under " + next.version, "Change"].map(
                          (h) => (
                            <th
                              key={h}
                              scope="col"
                              className="py-1.5 pr-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(
                        [
                          ["Gross", "gross"],
                          ["Income tax", "tax"],
                          ["Net pay", "net"],
                          ["Employer cost", "employerCost"],
                        ] as [string, keyof ImpactTotals][]
                      ).map(([label, key]) => {
                        const delta = g.after[key] - g.before[key]
                        return (
                          <tr key={key}>
                            <td className="py-1.5 pr-3">{label}</td>
                            <td className="tabular py-1.5 pr-3 text-muted-foreground">
                              {money(g.before[key], g.currency)}
                            </td>
                            <td className="tabular py-1.5 pr-3">
                              {money(g.after[key], g.currency)}
                            </td>
                            <td className="tabular py-1.5 pr-3">
                              {delta === 0
                                ? "—"
                                : `${delta > 0 ? "+" : "−"}${money(Math.abs(delta), g.currency)}`}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Everybody each group would pay on{" "}
              {formatDate(next.effectiveFrom)}, on their regular package,
              calculated under both versions by the payroll engine. One-off
              payments and adjustments are left out, so this is the rules&rsquo;
              effect alone.
            </p>
          </div>
        </div>

        <SheetFooter>
          {ack ? (
            <p className="text-sm text-muted-foreground">
              Acknowledged by {fullName(store.employeeById(ack.by))} on{" "}
              {formatDate(ack.at.slice(0, 10))}.
            </p>
          ) : canAcknowledge ? (
            <Button
              onClick={() => {
                store.acknowledgePack(next.country, next.version)
                toast.success(
                  `${next.country} ${next.version} acknowledged`
                )
                onClose()
              }}
            >
              Acknowledge
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Only an HR Admin can acknowledge a new version.
            </p>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/* ── Your setup ──────────────────────────────────────────────────────── */

const BLANK_SETUP = (country: string): CountrySetup => ({
  country,
  registrations: {},
  providers: {},
  remittanceRefs: {},
  filingOwnerId: null,
})

/**
 * The company's answers to what the country's rules ask of it. The pack
 * says which numbers, providers and payees exist; this is where the
 * company records its own. Editable by HR Admin, and nothing here is a
 * rate.
 */
function YourSetup({ country }: { country: string }) {
  const store = useStore()
  const { canEditSetup } = usePermissions()
  const pack = packFor(store.countryRulePacks, country, TODAY_ISO)
  const saved =
    store.countrySetups.find((c) => c.country === country) ??
    BLANK_SETUP(country)
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState<CountrySetup>(saved)
  if (!pack) return null

  // The schemes the company has to name a provider for: an allocation
  // the law leaves to the company, or a voluntary scheme that has one.
  const providerSlots = [
    ...pack.contributionAllocations
      .filter((a) => a.remittedTo.kind === "company_choice")
      .map((a) => ({
        id: a.id,
        label:
          a.remittedTo.kind === "company_choice" ? a.remittedTo.role : a.name,
        optional: false,
      })),
    ...pack.voluntarySchemes
      .filter((v) => v.needsProvider)
      .map((v) => ({ id: v.id, label: `${v.name} provider`, optional: true })),
  ]
  const people = [...store.employees].sort((a, b) =>
    fullName(a).localeCompare(fullName(b))
  )
  const value = editing ? draft : saved

  function field(
    id: string,
    label: string,
    text: string | undefined,
    onChange: (v: string) => void,
    hint?: string
  ) {
    return (
      <div key={id}>
        <Label htmlFor={`setup-${country}-${id}`} className="mb-1.5 block">
          {label}
        </Label>
        {editing ? (
          <Input
            id={`setup-${country}-${id}`}
            value={text ?? ""}
            placeholder={hint}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <p className="text-sm">
            {text?.trim() || (
              <span className="text-muted-foreground">{hint ?? "Not set"}</span>
            )}
          </p>
        )}
      </div>
    )
  }

  return (
    <Panel
      title={`Your setup for ${country}`}
      description="The company's own registrations, providers and payment details for this country. The rules above say what is needed; this is what you have."
      actions={
        canEditSetup && !editing ? (
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            onClick={() => {
              setDraft(saved)
              setEditing(true)
            }}
          >
            Edit setup
          </Button>
        ) : null
      }
      bodyClassName="px-5 py-4"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-3">
          <RuleHeading>Registrations</RuleHeading>
          {pack.registrations.map((r) =>
            field(r.id, r.label, value.registrations[r.id], (v) =>
              setDraft((d) => ({
                ...d,
                registrations: { ...d.registrations, [r.id]: v },
              }))
            )
          )}
        </div>

        <div className="space-y-3">
          <RuleHeading>Providers you appoint</RuleHeading>
          {providerSlots.map((slot) =>
            field(
              slot.id,
              slot.label,
              value.providers[slot.id],
              (v) =>
                setDraft((d) => ({
                  ...d,
                  providers: { ...d.providers, [slot.id]: v },
                })),
              slot.optional ? "None" : "Not set — required"
            )
          )}
        </div>

        <div className="space-y-3">
          <RuleHeading>Where remittances go</RuleHeading>
          {pack.payees.map((p) =>
            field(
              p.id,
              p.name,
              value.remittanceRefs[p.id],
              (v) =>
                setDraft((d) => ({
                  ...d,
                  remittanceRefs: { ...d.remittanceRefs, [p.id]: v },
                })),
              "Account or payment reference"
            )
          )}
        </div>

        <div className="space-y-3">
          <RuleHeading>Filing</RuleHeading>
          <div>
            <Label className="mb-1.5 block">Responsible for filing</Label>
            {editing ? (
              <Select
                value={draft.filingOwnerId ?? ""}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, filingOwnerId: v }))
                }
              >
                <SelectTrigger
                  className="h-9 w-full"
                  aria-label="Responsible for filing"
                >
                  <SelectValue placeholder="Choose a person" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {fullName(e)} · {e.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm">
                {saved.filingOwnerId ? (
                  fullName(store.employeeById(saved.filingOwnerId))
                ) : (
                  <span className="text-muted-foreground">Nobody yet</span>
                )}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Reminded {REMIND_DAYS_BEFORE} days before each deadline. Anything
              overdue also goes to HR Admin.
            </p>
          </div>
        </div>
      </div>

      {editing && (
        <div className="mt-5 flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              store.saveCountrySetup(draft)
              toast.success(`Setup for ${country} saved`)
              setEditing(false)
            }}
          >
            Save
          </Button>
        </div>
      )}
    </Panel>
  )
}

/* ── Compliance calendar ─────────────────────────────────────────────── */


const STATUS_PILL: Record<
  FilingStatus,
  { tone: "neutral" | "success" | "danger" | "info"; label: string }
> = {
  due: { tone: "neutral", label: "Due" },
  filed: { tone: "info", label: "Filed" },
  paid: { tone: "success", label: "Paid" },
  overdue: { tone: "danger", label: "Overdue" },
}

function periodLabel(period: string) {
  if (period.length === 4) return `Year ${period}`
  const [y, m] = period.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

/**
 * Every return and remittance the country's rules set, per period, with
 * what the company has done about each. The deadlines come from the pack;
 * the filed and paid records are the company's.
 */
function ComplianceCalendar({ country }: { country: string }) {
  const store = useStore()
  const { canFile } = usePermissions()
  const { source } = usePayroll()
  const pack = packFor(store.countryRulePacks, country, TODAY_ISO)
  const [marking, setMarking] = React.useState<{
    row: CalendarRow
    as: "filed" | "paid"
  } | null>(null)
  const receiptFor = React.useRef<CalendarRow | null>(null)
  const fileInput = React.useRef<HTMLInputElement>(null)
  if (!pack) return null

  const setup = store.countrySetups.find((c) => c.country === country)
  const owner = setup?.filingOwnerId
    ? fullName(store.employeeById(setup.filingOwnerId))
    : null
  const rows = complianceCalendar({
    pack,
    filings: store.filingRecords,
    todayIso: TODAY_ISO,
  })
  const overdue = rows.filter((r) => r.status === "overdue").length

  function download(row: CalendarRow) {
    const groups = store.payGroups.filter(
      (g) => g.country === country && g.calculationMode === "native"
    )
    const runs = store.payrollRuns.filter(
      (r) =>
        r.kind === "regular" &&
        groups.some((g) => g.id === r.payGroupId) &&
        r.periodStart.startsWith(row.period)
    )
    const lines = runs.flatMap((run) =>
      linesForRun(run, source).lines.map((line) => {
        const employee = store.employeeById(line.employeeId)
        return {
          line,
          base:
            line.earnings.find((e) => e.componentId === "pc-base")?.amount ?? 0,
          person: {
            name: fullName(employee),
            tin: employee?.compensation.tin ?? "—",
            ssnitNumber: employee?.compensation.ssnitNumber ?? "—",
          },
        }
      })
    )
    if (lines.length === 0) {
      toast.error(
        `No ${country} run for ${periodLabel(row.period)} yet, so there is nothing to report.`
      )
      return
    }
    const csv = toCsv(reportRows(row.deadline, pack!, lines))
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${row.deadline.id}-${row.period}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Panel
      title={`Filings and remittances · ${country}`}
      description={
        owner
          ? `${owner} files these and is reminded ${REMIND_DAYS_BEFORE} days before each is due.`
          : "Nobody is responsible for filing yet. Choose somebody in your setup above."
      }
      actions={
        overdue > 0 ? (
          <Pill tone="danger">
            {overdue} overdue · escalated to HR Admin
          </Pill>
        ) : null
      }
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {["Obligation", "Period", "Due", "Status", "Record", ""].map(
                (h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-4 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:pl-5 last:pr-5"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const pill = STATUS_PILL[row.status]
              const payee = pack.payees.find(
                (p) => p.id === row.deadline.payeeId
              )
              return (
                <tr key={row.key}>
                  <td className="py-3 pl-5">
                    <span className="font-medium">{row.deadline.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {row.deadline.kind === "return"
                        ? "Return"
                        : "Remittance"}{" "}
                      to {payee?.name ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 whitespace-nowrap">
                    {periodLabel(row.period)}
                  </td>
                  <td className="tabular px-4 whitespace-nowrap">
                    {formatDate(row.dueOn)}
                  </td>
                  <td className="px-4">
                    <Pill tone={pill.tone}>{pill.label}</Pill>
                    {row.escalated ? (
                      <span className="mt-0.5 block text-xs text-destructive">
                        Escalated to HR Admin
                      </span>
                    ) : row.reminded && owner ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {owner} reminded {formatDate(row.remindOn)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 text-xs text-muted-foreground">
                    {row.record?.filed && (
                      <span className="block">
                        Filed {formatDate(row.record.filed.on)} ·{" "}
                        {row.record.filed.ref}
                      </span>
                    )}
                    {row.record?.paid && (
                      <span className="block">
                        Paid {formatDate(row.record.paid.on)} ·{" "}
                        {row.record.paid.ref}
                      </span>
                    )}
                    {row.record?.receiptName && (
                      <span className="block">
                        Receipt: {row.record.receiptName}
                      </span>
                    )}
                    {!row.record && "—"}
                  </td>
                  <td className="py-3 pr-5 text-right">
                    <RowActions
                      label={`Actions for ${row.deadline.name}, ${periodLabel(row.period)}`}
                      actions={[
                        Boolean(row.deadline.report) && {
                          label: `Download ${row.deadline.report}`,
                          icon: Download,
                          onSelect: () => download(row),
                        },
                        canFile &&
                          !row.record?.filed && {
                            label: "Mark filed",
                            onSelect: () => setMarking({ row, as: "filed" }),
                          },
                        canFile &&
                          row.deadline.kind === "remittance" &&
                          !row.record?.paid && {
                            label: "Mark paid",
                            onSelect: () => setMarking({ row, as: "paid" }),
                          },
                        canFile && {
                          label: row.record?.receiptName
                            ? "Replace receipt"
                            : "Attach receipt",
                          onSelect: () => {
                            receiptFor.current = row
                            fileInput.current?.click()
                          },
                        },
                      ]}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <input
        ref={fileInput}
        type="file"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          const row = receiptFor.current
          e.target.value = ""
          if (!file || !row) return
          store.recordFiling({
            country,
            deadlineId: row.deadline.id,
            period: row.period,
            receiptName: file.name,
          })
          toast.success(`Receipt attached to ${row.deadline.name}`)
        }}
      />

      {marking && (
        <MarkDialog
          row={marking.row}
          as={marking.as}
          onClose={() => setMarking(null)}
          onSave={(on, ref) => {
            store.recordFiling({
              country,
              deadlineId: marking.row.deadline.id,
              period: marking.row.period,
              [marking.as]: { on, ref, by: store.viewer.employeeId },
            })
            toast.success(
              `${marking.row.deadline.name} marked ${marking.as}`
            )
            setMarking(null)
          }}
        />
      )}
    </Panel>
  )
}

function MarkDialog({
  row,
  as,
  onClose,
  onSave,
}: {
  row: CalendarRow
  as: "filed" | "paid"
  onClose: () => void
  onSave: (on: string, ref: string) => void
}) {
  const [on, setOn] = React.useState(TODAY_ISO)
  const [ref, setRef] = React.useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Mark {row.deadline.name} {as}
          </DialogTitle>
          <DialogDescription>
            For {periodLabel(row.period)}, due {formatDate(row.dueOn)}. The
            reference is what the authority gave you, so the record can be
            matched to their acknowledgement.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="mark-on" className="mb-1.5 block">
              Date {as}
            </Label>
            <Input
              id="mark-on"
              type="date"
              value={on}
              max={TODAY_ISO}
              onChange={(e) => setOn(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="mark-ref" className="mb-1.5 block">
              Reference
            </Label>
            <Input
              id="mark-ref"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!on || ref.trim() === ""}
            onClick={() => onSave(on, ref.trim())}
          >
            Mark {as}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Test a calculation ──────────────────────────────────────────────── */

/**
 * A payslip worked out by the real engine for a salary somebody types in,
 * under any version of the country's rules. For checking a payslip or
 * answering a question about one, without running payroll.
 */
function TestCalculationSheet({
  country,
  initialVersion,
  onClose,
}: {
  country: string
  initialVersion: string
  onClose: () => void
}) {
  const store = useStore()
  const versions = versionsFor(store.countryRulePacks, country)
  const [version, setVersion] = React.useState(initialVersion)
  const [base, setBase] = React.useState("5000")
  const [amounts, setAmounts] = React.useState<Record<string, string>>({})
  const pack = versions.find((v) => v.version === version) ?? versions[0]
  const fmt = countryMoney(store, country)
  const currency =
    store.payGroups.find((g) => g.country === country)?.currency ??
    store.legalEntities.find((e) => e.country === country)?.currency ??
    ""

  // Fixed-amount components the pack has a view on: what somebody here
  // could actually be paid or have deducted.
  const components = store.payComponents.filter(
    (c) => c.calculation === "fixed" && pack?.componentTreatments[c.id]
  )
  const baseAmount = Math.max(0, Number(base) || 0)

  const version_: CompensationVersion = {
    id: "test",
    employeeId: "test",
    versionNumber: 1,
    effectiveFrom: pack?.effectiveFrom ?? TODAY_ISO,
    entityId: "",
    workCountry: country,
    taxResidency: country,
    workerType: "employee",
    payGroupId: "",
    payBasis: "salaried",
    baseAmount,
    currency,
    frequency: "monthly",
    components: components
      .map((c) => ({ componentId: c.id, amount: Number(amounts[c.id]) || 0 }))
      .filter((v) => v.amount > 0),
    reason: "",
    proposedBy: "",
    proposedAt: "",
    approvedBy: null,
    approvedAt: null,
    status: "effective",
    supersedesVersionId: null,
    changeRequestId: null,
  }
  const line = pack
    ? calculateLine(
        version_,
        pack,
        [],
        [],
        { start: pack.effectiveFrom, end: pack.effectiveFrom },
        {
          runId: "test",
          components: store.payComponents,
          previousNet: null,
          paymentChannel: "bank_transfer",
          paymentDestinationMasked: null,
        }
      )
    : null
  const employer = line
    ? line.employerContributions.reduce((n, c) => n + c.amount, 0)
    : 0

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[560px]"
      >
        <SheetHeader>
          <SheetTitle>Test a calculation · {country}</SheetTitle>
          <SheetDescription>
            One month&rsquo;s pay, worked out by the payroll engine under the
            version you choose. Nothing is saved and nobody is paid.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="test-base" className="mb-1.5 block">
                Basic salary, per month
              </Label>
              <Input
                id="test-base"
                type="number"
                min={0}
                value={base}
                onChange={(e) => setBase(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Rules</Label>
              <Select value={version} onValueChange={setVersion}>
                <SelectTrigger className="h-9 w-full" aria-label="Rules">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.version} value={v.version}>
                      {v.version} · from {formatDate(v.effectiveFrom)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {components.map((c) => (
              <div key={c.id}>
                <Label htmlFor={`test-${c.id}`} className="mb-1.5 block">
                  {c.name}
                </Label>
                <Input
                  id={`test-${c.id}`}
                  type="number"
                  min={0}
                  placeholder="0"
                  value={amounts[c.id] ?? ""}
                  onChange={(e) =>
                    setAmounts((a) => ({ ...a, [c.id]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>

          {line && pack && (
            <div className="space-y-4 rounded-xl border p-4">
              <BreakdownList title="Earnings" items={line.earnings} fmt={fmt} />
              <BreakdownList
                title="Deductions"
                items={line.deductions}
                fmt={fmt}
              />
              <div className="flex justify-between border-t pt-3 text-sm font-semibold">
                <span>Net pay</span>
                <span className="tabular">{fmt(line.net)}</span>
              </div>
              <BreakdownList
                title="Employer pays on top"
                items={line.employerContributions}
                fmt={fmt}
              />
              <div className="flex justify-between text-sm">
                <span>Cost to the employer</span>
                <span className="tabular">{fmt(line.gross + employer)}</span>
              </div>
              {pack.contributionAllocations.length > 0 && (
                <BreakdownList
                  title="Where the contributions go"
                  items={remittancesFor(baseAmount, pack).map((r) => ({
                    componentId: r.allocationId,
                    label: r.name,
                    amount: r.amount,
                  }))}
                  fmt={fmt}
                />
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function BreakdownList({
  title,
  items,
  fmt,
}: {
  title: string
  items: { componentId: string; label: string; amount: number }[]
  fmt: (n: number) => string
}) {
  if (items.length === 0) return null
  return (
    <div>
      <RuleHeading>{title}</RuleHeading>
      <ul className="space-y-1 text-sm">
        {items.map((i) => (
          <li key={i.componentId + i.label} className="flex justify-between">
            <span>{i.label}</span>
            <span className="tabular text-muted-foreground">
              {fmt(i.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Report an issue ─────────────────────────────────────────────────── */

/**
 * Telling Zelos a value looks wrong. The value is not changed here — it
 * changes when the pack is corrected and republished, for everybody.
 */
function ReportIssueDialog({
  pack,
  onClose,
}: {
  pack: CountryRulePack
  onClose: () => void
}) {
  const store = useStore()
  const componentName = (id: string) =>
    store.payComponents.find((c) => c.id === id)?.name ?? id
  const fields = [
    ...pack.employeeContributionRules.map((r) => r.name),
    ...pack.employerContributionRules.map((r) => r.name),
    ...pack.contributionAllocations.map((a) => a.name),
    "Income tax bands",
    ...Object.entries(pack.componentTreatments)
      .filter(([id]) => id !== "pc-base")
      .map(([id]) => `${componentName(id)} treatment`),
    ...pack.filingDeadlines.map((d) => `${d.name} deadline`),
    "Something else",
  ]
  const [field, setField] = React.useState(fields[0])
  const [comment, setComment] = React.useState("")

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Report an issue with {pack.country} {pack.version}
          </DialogTitle>
          <DialogDescription>
            Tell Zelos what looks wrong and why. The value stays as it is until
            the pack is corrected and republished.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block">What looks wrong</Label>
            <Select value={field} onValueChange={setField}>
              <SelectTrigger className="h-9 w-full" aria-label="What looks wrong">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="issue-comment" className="mb-1.5 block">
              What you believe is right, and where it comes from
            </Label>
            <Textarea
              id="issue-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={comment.trim() === ""}
            onClick={() => {
              store.reportPackIssue({
                country: pack.country,
                version: pack.version,
                field,
                comment: comment.trim(),
              })
              toast.success("Sent to Zelos")
              onClose()
            }}
          >
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Countries without a pack ────────────────────────────────────────── */

const COVERAGE_COPY: Record<
  CoverageChoice,
  { label: string; explains: string }
> = {
  upload: {
    label: "Upload results",
    explains:
      "A local provider calculates pay and you upload their figures for each run, using the template.",
  },
  customer_pack: {
    label: "Maintain your own pack",
    explains:
      "Your company keeps this country's rules itself and Zelos calculates from them. You own their accuracy. Until the pack exists, results are uploaded.",
  },
  request_coverage: {
    label: "Ask Zelos to cover it",
    explains:
      "Zelos adds the country's rules and keeps them current. Until then, results are uploaded.",
  },
}

/**
 * How a country Zelos has no rules for is paid. Every choice still pays
 * by upload today; what differs is who will own the rules later.
 */
function CoverageChoicePanel({ country }: { country: string }) {
  const store = useStore()
  const { canChooseCoverage } = usePermissions()
  const decision = store.coverageDecisions.find((d) => d.country === country)
  const chosen: CoverageChoice = decision?.choice ?? "upload"

  function template() {
    const blob = new Blob(["employeeId,gross,deductions,net\n"], {
      type: "text/csv",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${country.toLowerCase()}-results-template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Panel
      title={<CountryLabel country={country} />}
      description="Zelos has no rules for this country, so it cannot calculate pay here yet. Choose how it is handled."
      actions={<Pill tone="neutral">Uploaded results</Pill>}
      bodyClassName="px-5 py-4"
    >
      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup">
        {(Object.keys(COVERAGE_COPY) as CoverageChoice[]).map((c) => {
          const selected = c === chosen
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!canChooseCoverage}
              onClick={() => {
                if (selected) return
                store.chooseCoverage(country, c)
                toast.success(
                  c === "request_coverage"
                    ? `Coverage for ${country} requested`
                    : `${country}: ${COVERAGE_COPY[c].label.toLowerCase()}`
                )
              }}
              className={
                selected
                  ? "rounded-xl border-2 border-primary bg-card p-3 text-left"
                  : "rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-70"
              }
            >
              <span className="text-sm font-medium">
                {COVERAGE_COPY[c].label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {COVERAGE_COPY[c].explains}
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-xs text-muted-foreground">
          {decision
            ? `Chosen by ${fullName(store.employeeById(decision.by))} on ${formatDate(decision.at.slice(0, 10))}.`
            : "Results are uploaded until somebody chooses otherwise."}
          {!canChooseCoverage && " Only an HR Admin can change this."}
        </p>
        <Button size="sm" variant="outline" className="h-9" onClick={template}>
          <Download className="size-4" />
          Results template
        </Button>
      </div>
    </Panel>
  )
}
