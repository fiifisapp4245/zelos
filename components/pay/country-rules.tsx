"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  CheckCircle2,
  ChevronRight,
  CalendarClock,
  Calculator,
  Download,
  Flag,
  Send,
} from "lucide-react"
import { toast } from "sonner"

import { Panel, Pill } from "@/components/common"
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
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
  upcomingVersions,
  type ImpactTotals,
} from "@/lib/pay/compliance"
import { calculatorVersion, explain } from "@/lib/pay/calculator"
import { addDays } from "@/lib/time"
import { useFilingSummary } from "@/components/payroll/filings-tab"
import { CALCULATION_MODE_COPY } from "@/lib/pay/derive"
import { useStore } from "@/lib/store"
import { TODAY_ISO, formatDate, fullName } from "@/lib/format"
import type {
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
  return (
    <React.Suspense fallback={null}>
      <CountryRules />
    </React.Suspense>
  )
}

/** "ghana" in the address, "Ghana" on the page. */
const slugOf = (country: string) => country.toLowerCase().replace(/\s+/g, "-")

/**
 * The countries the company pays in, as a list; one of them, opened. A
 * country's rules are a lot to read, so the list says only what needs a
 * person and the detail page holds the rest, folded until it is wanted.
 */
function CountryRules() {
  const store = useStore()
  const params = useSearchParams()
  const countries = paidCountriesWithRules(store)
  const chosen = countries.find(
    (c) => slugOf(c.country) === params.get("country")
  )

  return chosen ? (
    <CountryDetail country={chosen.country} covered={chosen.covered} />
  ) : (
    <CountryList countries={countries} />
  )
}

function paidCountriesWithRules(store: ReturnType<typeof useStore>) {
  const covered = coveredCountries(store.countryRulePacks)
  const paid = store.payGroups.map((g) => g.country).filter((c) => c !== "—")
  return [...new Set([...covered, ...paid])]
    .sort((a, b) => a.localeCompare(b))
    .map((country) => ({ country, covered: covered.includes(country) }))
}

/** Whether the company has answered everything the country's rules ask. */
function setupGaps(pack: CountryRulePack, setup: CountrySetup | undefined) {
  const gaps: string[] = []
  for (const r of pack.registrations)
    if (!setup?.registrations[r.id]?.trim()) gaps.push(r.label)
  for (const a of pack.contributionAllocations)
    if (
      a.remittedTo.kind === "company_choice" &&
      !setup?.providers[a.id]?.trim()
    )
      gaps.push(a.remittedTo.role)
  for (const p of pack.payees)
    if (!setup?.remittanceRefs[p.id]?.trim()) gaps.push(`${p.name} reference`)
  if (!setup?.filingOwnerId) gaps.push("Filing owner")
  return gaps
}

/** How many figures in a pack are placeholders awaiting a check. */
function toVerifyCount(pack: CountryRulePack) {
  return (
    [
      ...pack.employeeContributionRules,
      ...pack.employerContributionRules,
      ...pack.contributionAllocations,
      ...Object.values(pack.componentTreatments),
    ].filter((x) => x.toVerify).length + (pack.taxBandsToVerify ? 1 : 0)
  )
}

/* ── The list ────────────────────────────────────────────────────────── */

function CountryList({
  countries,
}: {
  countries: { country: string; covered: boolean }[]
}) {
  const store = useStore()
  const router = useRouter()

  return (
    <Panel
      title="Countries you pay in"
      description="Each country's statutory rules come from Zelos and cannot be edited. Open one to review an update, check a figure or complete your setup."
      actions={
        <Button asChild size="sm" variant="outline" className="h-9">
          <Link href="/settings/pay-groups?new=1">Add a country</Link>
        </Button>
      }
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {[
                "Country",
                "Rules in force",
                "Pay is",
                "Your setup",
                "Needs attention",
                "",
              ].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className={cn(
                    "px-4 py-2.5 text-[11px] font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase first:pl-5 last:pr-5",
                    h === "" && "sticky-actions"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {countries.map(({ country, covered }) => {
              const href = `/settings/statutory-settings?country=${slugOf(country)}`
              const pack = packFor(store.countryRulePacks, country, TODAY_ISO)
              const setup = store.countrySetups.find(
                (c) => c.country === country
              )
              const gaps = pack ? setupGaps(pack, setup) : []
              const upcoming = upcomingVersions(
                store.countryRulePacks,
                country,
                TODAY_ISO
              ).filter(
                (v) =>
                  !acknowledgementOf(
                    store.packAcknowledgements,
                    country,
                    v.version
                  )
              )
              const overdue = pack
                ? complianceCalendar({
                    pack,
                    filings: store.filingRecords,
                    todayIso: TODAY_ISO,
                  }).filter((r) => r.status === "overdue").length
                : 0
              const decision = store.coverageDecisions.find(
                (d) => d.country === country
              )

              return (
                <tr
                  key={country}
                  onClick={() => router.push(href)}
                  className="cursor-pointer transition-colors hover:bg-muted/30"
                >
                  <td className="py-3.5 pl-5 font-medium">
                    <CountryLabel country={country} />
                  </td>
                  <td className="px-4 whitespace-nowrap">
                    {pack ? (
                      <>
                        {pack.version}
                        <span className="block text-xs text-muted-foreground">
                          since {formatDate(pack.effectiveFrom)}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        No rule pack
                      </span>
                    )}
                  </td>
                  <td className="px-4">
                    <Pill tone={covered ? "primary" : "neutral"}>
                      {covered
                        ? CALCULATION_MODE_COPY.native.label
                        : CALCULATION_MODE_COPY.external.label}
                    </Pill>
                  </td>
                  <td className="px-4 whitespace-nowrap">
                    {!pack ? (
                      <span className="text-muted-foreground">—</span>
                    ) : gaps.length === 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="size-4 text-primary" />
                        Complete
                      </span>
                    ) : (
                      <span className="text-warning-foreground">
                        {gaps.length} missing
                      </span>
                    )}
                  </td>
                  <td className="px-4">
                    <span className="flex flex-wrap gap-1.5">
                      {upcoming.map((v) => (
                        <Pill key={v.version} tone="warning">
                          Review {v.version}
                        </Pill>
                      ))}
                      {overdue > 0 && (
                        <Pill tone="danger">
                          {overdue} overdue{" "}
                          {overdue === 1 ? "filing" : "filings"}
                        </Pill>
                      )}
                      {!covered && (
                        <Pill tone="neutral">
                          {decision
                            ? COVERAGE_COPY[decision.choice].label
                            : "Choose how it is paid"}
                        </Pill>
                      )}
                      {covered && upcoming.length === 0 && overdue === 0 && (
                        <span className="text-muted-foreground">Nothing</span>
                      )}
                    </span>
                  </td>
                  <td className="sticky-actions py-3.5 pr-5 pl-2 text-right">
                    <Button asChild size="sm" variant="outline" className="h-8">
                      <Link href={href} onClick={(e) => e.stopPropagation()}>
                        Open
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

/* ── One country ─────────────────────────────────────────────────────── */

function BackToList() {
  return (
    <Link
      href="/settings/statutory-settings"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      All countries
    </Link>
  )
}

function CountryDetail({
  country,
  covered,
}: {
  country: string
  covered: boolean
}) {
  if (!covered)
    return (
      <div className="space-y-4">
        <BackToList />
        <CoverageChoicePanel country={country} />
      </div>
    )
  return <CoveredCountry country={country} />
}

/**
 * One country Zelos calculates: what needs a person first, then the
 * headline figures in plain words, then each part of the rules folded
 * until it is opened. The rules stay read-only; the company's own setup
 * is the one part that can be edited here.
 */
function CoveredCountry({ country }: { country: string }) {
  const store = useStore()
  const versions = versionsFor(store.countryRulePacks, country)
  // The version in force today, not the newest published: one that has
  // not started yet is reviewed in the banner, not read as the law.
  const inForce = packFor(store.countryRulePacks, country, TODAY_ISO)
  const [versionId, setVersionId] = React.useState(
    inForce?.version ?? versions[0]?.version ?? ""
  )
  const [testing, setTesting] = React.useState(false)
  const [reporting, setReporting] = React.useState(false)
  const filings = useFilingSummary(country)
  const pack = versions.find((v) => v.version === versionId) ?? versions[0]
  if (!pack) return null

  const current = inForce?.version === pack.version
  const future = pack.effectiveFrom > TODAY_ISO
  const previous = versions[versions.indexOf(pack) + 1] ?? null
  const componentName = (id: string) =>
    store.payComponents.find((c) => c.id === id)?.name ?? id
  const changes = previous ? differences(previous, pack, componentName) : []
  const fmt = countryMoney(store, country)
  const bands = bandThresholds(pack)
  const rates = pack.taxBands.map((b) => b.ratePercent)
  const employee = pack.employeeContributionRules.reduce(
    (n, r) => n + r.percentOfBase,
    0
  )
  const employer = pack.employerContributionRules.reduce(
    (n, r) => n + r.percentOfBase,
    0
  )
  const gap = allocationGap(pack)
  const caps = Object.entries(pack.componentTreatments).filter(
    ([, t]) => t.cap !== undefined
  )
  const preTax = Object.entries(pack.componentTreatments).filter(
    ([, t]) => t.preTax
  )
  const verify = toVerifyCount(pack)
  const setup = store.countrySetups.find((c) => c.country === country)
  const gaps = setupGaps(pack, setup)

  return (
    <div className="space-y-4">
      <BackToList />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CountryLabel country={country} />
          </h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Pill tone="primary">{CALCULATION_MODE_COPY.native.label}</Pill>
            <Pill tone={current ? "success" : future ? "info" : "neutral"}>
              {current
                ? "In force"
                : future
                  ? "Not yet in force"
                  : "Past version"}
            </Pill>
            Version {pack.version}, from {formatDate(pack.effectiveFrom)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {versions.length > 1 && (
            <Select value={pack.version} onValueChange={setVersionId}>
              <SelectTrigger className="h-9 w-[150px]" aria-label="Version">
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
          <Button
            size="sm"
            variant="ghost"
            className="h-9"
            onClick={() => setReporting(true)}
          >
            <Flag className="size-4" />
            Report an issue
          </Button>
        </div>
      </div>

      <PackUpdates country={country} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Employee pays"
          value={`${employee}%`}
          note="of basic, taken from gross"
        />
        <SummaryCard
          label="Employer pays"
          value={`${employer}%`}
          note="of basic, on top of gross"
        />
        <SummaryCard
          label="Income tax"
          value={`${Math.min(...rates)}% – ${Math.max(...rates)}%`}
          note={`${rates.length} monthly bands; first ${fmt(bands[0]?.to ?? 0)} tax-free`}
        />
        <SummaryCard
          label="Filings"
          value={
            filings && filings.overdue.length > 0
              ? `${filings.overdue.length} overdue`
              : "Up to date"
          }
          tone={filings && filings.overdue.length > 0 ? "danger" : undefined}
          note={
            filings?.nextDue
              ? `Next: ${filings.nextDue.deadline.name}, ${formatDate(filings.nextDue.dueOn)}`
              : ""
          }
        />
      </div>

      {verify > 0 && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-px size-3.5 shrink-0 text-warning-foreground" />
          {verify}{" "}
          {verify === 1
            ? "figure is a placeholder"
            : "figures are placeholders"}{" "}
          awaiting verification. Each is marked with this sign below; hover it
          to see what it should be checked against.
        </p>
      )}

      <div className="space-y-2">
        <Section
          title="Contributions"
          hint={`Employee ${employee}% · employer ${employer}%`}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <RuleHeading>Who pays</RuleHeading>
              <ul className="space-y-2 text-sm">
                {[
                  ...pack.employeeContributionRules,
                  ...pack.employerContributionRules,
                ].map((r) => (
                  <Row
                    key={r.id}
                    label={r.name}
                    note={r.note}
                    value={`${r.percentOfBase}%`}
                    toVerify={r.toVerify}
                  />
                ))}
              </ul>
            </div>
            {pack.contributionAllocations.length > 0 && (
              <div>
                <RuleHeading>Where it goes</RuleHeading>
                <ul className="space-y-2 text-sm">
                  {pack.contributionAllocations.map((a) => (
                    <Row
                      key={a.id}
                      label={a.name}
                      note={`To ${remitteeName(a.remittedTo)}`}
                      value={`${a.percentOfBase}%`}
                      toVerify={a.toVerify}
                    />
                  ))}
                </ul>
                {gap !== 0 && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="mt-px size-3.5 shrink-0" />
                    These do not add up to what is collected.
                  </p>
                )}
              </div>
            )}
          </div>
          {pack.voluntarySchemes.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Voluntary: {pack.voluntarySchemes.map((v) => v.name).join(", ")}.
              No set rate; what anyone puts in is a pay component.
            </p>
          )}
        </Section>

        <Section
          title="Income tax"
          hint={`${rates.length} bands · ${Math.min(...rates)}% to ${Math.max(...rates)}%`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  {["Monthly taxable pay", "Rate"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="py-1.5 pr-4 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
                    >
                      {h}
                      {h === "Rate" && pack.taxBandsToVerify && (
                        <VerifyMark against={pack.taxBandsToVerify} />
                      )}
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
                    <td className="tabular py-1.5 pr-4">{b.ratePercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Worked out on pay after the employee&rsquo;s contribution.
          </p>
        </Section>

        <Section
          title="Allowances and deductions"
          hint={`${caps.length + preTax.length} with special treatment`}
        >
          <ul className="space-y-2 text-sm">
            {caps.map(([id, t]) => (
              <Row
                key={id}
                label={componentName(id)}
                note={taxTreatmentText(t, "allowance", fmt).label}
                value={fmt(t.cap!)}
                toVerify={t.toVerify}
              />
            ))}
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
          <p className="mt-3 text-xs text-muted-foreground">
            Everything else is taxed in full. Each component&rsquo;s treatment
            is listed under{" "}
            <Link
              href="/settings/allowance-deduction-type"
              className="underline underline-offset-2"
            >
              Pay components
            </Link>
            .
          </p>
        </Section>

        <Section
          title="Deadlines and reports"
          hint={`${pack.filingDeadlines.length} deadlines`}
        >
          <ul className="space-y-2 text-sm">
            {pack.filingDeadlines.map((d) => (
              <Row
                key={d.id}
                label={d.name}
                note={d.report ? `Report: ${d.report}` : undefined}
                value={d.due}
              />
            ))}
          </ul>
          <div className="mt-4">
            <FilingsSummary country={country} />
          </div>
        </Section>

        <Section
          title="Your setup"
          hint={gaps.length === 0 ? "Complete" : `${gaps.length} missing`}
          hintTone={gaps.length === 0 ? undefined : "warning"}
        >
          <YourSetup country={country} />
        </Section>

        <Section
          title="History"
          hint={
            previous
              ? `${changes.length} changes since ${previous.version}`
              : "First version"
          }
        >
          {changes.length > 0 && previous && (
            <div className="mb-4">
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
          <RuleHeading>Updates</RuleHeading>
          <ol className="space-y-2 border-l pl-3">
            {[...pack.updates]
              .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
              .map((u) => (
                <li key={u.title} className="text-sm">
                  <span className="font-medium">{u.title}</span>{" "}
                  <span className="tabular text-xs text-muted-foreground">
                    from {formatDate(u.effectiveFrom)}
                  </span>
                  <span className="block text-muted-foreground">
                    {u.summary}
                  </span>
                </li>
              ))}
          </ol>
        </Section>
      </div>

      <p className="text-xs text-muted-foreground">
        The rules cannot be edited here. They are the country&rsquo;s, and they
        change when Zelos publishes a new version for you to review.
      </p>

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
    </div>
  )
}

function SummaryCard({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: string
  note: string
  tone?: "danger"
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "tabular mt-1 text-xl font-semibold",
          tone === "danger" && "text-destructive"
        )}
      >
        {value}
      </p>
      {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}

/** A part of the rules, folded until somebody opens it. */
function Section({
  title,
  hint,
  hintTone,
  children,
}: {
  title: string
  hint: string
  hintTone?: "warning"
  children: React.ReactNode
}) {
  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-5 py-3.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        <span className="flex-1 font-medium">{title}</span>
        <span
          className={cn(
            "text-right text-sm",
            hintTone === "warning"
              ? "text-warning-foreground"
              : "text-muted-foreground"
          )}
        >
          {hint}
        </span>
      </summary>
      <div className="border-t px-5 py-4">{children}</div>
    </details>
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
        {toVerify && <VerifyMark against={toVerify} />}
        {note && (
          <span className="block text-xs text-muted-foreground">{note}</span>
        )}
      </span>
      <span className="tabular shrink-0 text-muted-foreground">{value}</span>
    </li>
  )
}

/**
 * A figure the pack holds that has not yet been confirmed against its
 * source: a small sign beside it, with the source on hover or focus, so
 * nobody reads a placeholder as law and the page is not a wall of tags.
 */
export function VerifyMark({ against }: { against: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`To verify against ${against}`}
          className="ml-1.5 inline-flex translate-y-0.5 rounded text-warning-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <AlertTriangle className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>To verify against {against}</TooltipContent>
    </Tooltip>
  )
}

/** The same mark, kept under its old name for the other pay screens. */
export const ToVerify = VerifyMark

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
  const [reviewing, setReviewing] = React.useState<CountryRulePack | null>(null)
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
        className="flex flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[640px]"
      >
        <SheetHeader className="border-b">
          <SheetTitle>
            {next.country} {next.version}
          </SheetTitle>
          <SheetDescription>
            Takes effect {formatDate(next.effectiveFrom)}
            {previous ? `, replacing ${previous.version}` : ""}. Acknowledging
            it says you have seen the change. It does not approve the law, which
            needs nobody&rsquo;s approval.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4">
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
              Everybody each group would pay on {formatDate(next.effectiveFrom)}
              , on their regular package, calculated under both versions by the
              payroll engine. One-off payments and adjustments are left out, so
              this is the rules&rsquo; effect alone.
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
                toast.success(`${next.country} ${next.version} acknowledged`)
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
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Your company&rsquo;s registrations, the providers you appoint and
          where payments go. The rules say what is needed; this is what you
          have.
        </p>
        {canEditSetup && !editing && (
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
        )}
      </div>
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
    </div>
  )
}

/* ── Filings, in summary ─────────────────────────────────────────────── */

/**
 * Where the country's filings stand. Recording them is payroll's work and
 * happens under Payroll; HR Admin sees here whether anything is late.
 */
function FilingsSummary({ country }: { country: string }) {
  const summary = useFilingSummary(country)
  if (!summary) return null
  const { overdue, nextDue } = summary

  return (
    <div
      className={
        overdue.length > 0
          ? "flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-danger-muted px-4 py-3"
          : "flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3"
      }
    >
      <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-medium">
          Filings and remittances · {country}.
        </span>{" "}
        <span className="text-muted-foreground">
          {overdue.length > 0
            ? `${overdue.length} overdue: ${overdue.map((r) => r.deadline.name).join(", ")}. `
            : "Nothing overdue. "}
          {nextDue
            ? `Next: ${nextDue.deadline.name}, due ${formatDate(nextDue.dueOn)}.`
            : ""}
        </span>
      </p>
      <Button asChild size="sm" variant="outline" className="h-9">
        <Link href="/pay/payroll?tab=filings">Open filings</Link>
      </Button>
    </div>
  )
}

/* ── Test a calculation ──────────────────────────────────────────────── */

/**
 * A payslip worked out by the real engine for figures somebody types in,
 * under any version of the country's rules, laid out in the order it is
 * worked out. For checking a payslip or answering a question about one,
 * without running payroll. The impact preview calls the same function.
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
  const groups = store.payGroups.filter((g) => g.country === country)
  const [groupId, setGroupId] = React.useState(groups[0]?.id ?? "")
  const [version, setVersion] = React.useState(initialVersion)
  const [base, setBase] = React.useState("5000")
  const [values, setValues] = React.useState<Record<string, string>>({})
  const pack = versions.find((v) => v.version === version) ?? versions[0]
  const group = groups.find((g) => g.id === groupId) ?? groups[0]

  // The whole library, as a package can hold it: an amount for a fixed
  // component, a rate for one worked off base. Employer contributions are
  // the country's, not something typed in.
  const library = store.payComponents.filter(
    (c) => c.category !== "employer_contribution"
  )
  const fmt = (n: number) =>
    group ? money(n, group.currency) : n.toLocaleString("en-GB")

  const explanation =
    pack && group
      ? explain(
          calculatorVersion(
            {
              group,
              baseAmount: Number(base) || 0,
              components: library.map((c) =>
                c.calculation === "percent_of_base"
                  ? { componentId: c.id, rate: Number(values[c.id]) || 0 }
                  : { componentId: c.id, amount: Number(values[c.id]) || 0 }
              ),
            },
            pack.effectiveFrom
          ),
          pack,
          store.payComponents
        )
      : null

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[600px]"
      >
        <SheetHeader className="border-b">
          <SheetTitle>Test a calculation · {country}</SheetTitle>
          <SheetDescription>
            One period&rsquo;s pay, worked out by the payroll engine under the
            version you choose. Nothing is saved and nobody is paid.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pay group pays in {country} yet, so there is nothing to
              calculate for.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="mb-1.5 block">Pay group</Label>
                <Select value={group?.id ?? ""} onValueChange={setGroupId}>
                  <SelectTrigger className="h-9 w-full" aria-label="Pay group">
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
              <div>
                <Label htmlFor="test-base" className="mb-1.5 block">
                  Basic salary
                </Label>
                <Input
                  id="test-base"
                  type="number"
                  min={0}
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                />
              </div>
            </div>
          )}

          {groups.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {library.map((c) => (
                <div key={c.id}>
                  <Label htmlFor={`test-${c.id}`} className="mb-1.5 block">
                    {c.name}
                    <span className="ml-1 font-normal text-muted-foreground">
                      {c.calculation === "percent_of_base"
                        ? "· % of base"
                        : c.category === "deduction"
                          ? "· deduction"
                          : ""}
                    </span>
                  </Label>
                  <Input
                    id={`test-${c.id}`}
                    type="number"
                    min={0}
                    placeholder="0"
                    value={values[c.id] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [c.id]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {explanation && pack && (
            <ol className="space-y-4 rounded-xl border p-4 text-sm">
              <Step title="1 · Earnings">
                <Items items={explanation.earnings} fmt={fmt} />
                <Total label="Gross pay" value={fmt(explanation.gross)} />
              </Step>

              {explanation.preTax.length > 0 && (
                <Step title="2 · Deductions before tax">
                  {explanation.preTax.map((d) => (
                    <Line
                      key={d.componentId}
                      label={d.label}
                      note={
                        d.relief < d.amount
                          ? `${fmt(d.relief)} of it is relieved from tax; the rest is not`
                          : "All of it is relieved from tax"
                      }
                      value={fmt(d.amount)}
                    />
                  ))}
                </Step>
              )}

              <Step title="3 · Employee pension">
                <Items items={explanation.employeeContributions} fmt={fmt} />
              </Step>

              <Step title="4 · Taxable income">
                <Line label="Gross pay" value={fmt(explanation.gross)} />
                {explanation.untaxed > 0 && (
                  <Line
                    label="Less pay the country does not tax"
                    note="Exempt components, and allowances up to their caps"
                    value={`− ${fmt(explanation.untaxed)}`}
                  />
                )}
                {explanation.employeeContributions.map((d) => (
                  <Line
                    key={d.componentId}
                    label={`Less ${d.label.toLowerCase()}`}
                    value={`− ${fmt(d.amount)}`}
                  />
                ))}
                {explanation.preTax.map((d) => (
                  <Line
                    key={d.componentId}
                    label={`Less ${d.label.toLowerCase()} relief`}
                    value={`− ${fmt(d.relief)}`}
                  />
                ))}
                <Total
                  label="Taxable income"
                  value={fmt(explanation.taxable)}
                />
              </Step>

              <Step title="5 · Tax, band by band">
                {explanation.bands.length === 0 ? (
                  <p className="text-muted-foreground">Nothing is taxable.</p>
                ) : (
                  explanation.bands.map((b, i) => (
                    <Line
                      key={i}
                      label={`${fmt(b.taxed)} at ${b.ratePercent}%`}
                      note={
                        b.to === null
                          ? `Above ${fmt(b.from)}`
                          : `Band ${fmt(b.from)} – ${fmt(b.to)}`
                      }
                      value={fmt(b.tax)}
                    />
                  ))
                )}
                <Total label="PAYE" value={fmt(explanation.tax)} />
              </Step>

              {explanation.postTax.length > 0 && (
                <Step title="6 · Deductions after tax">
                  <Items items={explanation.postTax} fmt={fmt} />
                </Step>
              )}

              <Step title="7 · Net pay">
                <Total label="Net pay" value={fmt(explanation.net)} strong />
              </Step>

              <Step title="8 · What the employer adds">
                <Items items={explanation.employerContributions} fmt={fmt} />
                <Total
                  label="Cost to the employer"
                  value={fmt(explanation.employerCost)}
                />
                {explanation.remittances.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Contributions are sent{" "}
                    {explanation.remittances
                      .map((r) => `${fmt(r.amount)} to ${r.name}`)
                      .join(" and ")}
                    .
                  </p>
                )}
              </Step>
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Step({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <li>
      <RuleHeading>{title}</RuleHeading>
      <div className="space-y-1">{children}</div>
    </li>
  )
}

function Line({
  label,
  note,
  value,
}: {
  label: string
  note?: string
  value: string
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="min-w-0">
        {label}
        {note && (
          <span className="block text-xs text-muted-foreground">{note}</span>
        )}
      </span>
      <span className="tabular shrink-0 text-muted-foreground">{value}</span>
    </div>
  )
}

function Total({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div
      className={
        strong
          ? "flex justify-between gap-3 text-base font-semibold"
          : "flex justify-between gap-3 border-t pt-1 font-medium"
      }
    >
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  )
}

function Items({
  items,
  fmt,
}: {
  items: { componentId: string; label: string; amount: number }[]
  fmt: (n: number) => string
}) {
  if (items.length === 0) return <p className="text-muted-foreground">None.</p>
  return (
    <>
      {items.map((i) => (
        <Line
          key={i.componentId + i.label}
          label={i.label}
          value={fmt(i.amount)}
        />
      ))}
    </>
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
              <SelectTrigger
                className="h-9 w-full"
                aria-label="What looks wrong"
              >
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
 * by upload today; what differs is who will own the rules later — and
 * each choice says, right under it, what that actually means to do next.
 */
function CoverageChoicePanel({ country }: { country: string }) {
  const store = useStore()
  const { canChooseCoverage } = usePermissions()
  const decision = store.coverageDecisions.find((d) => d.country === country)
  const submission = store.customPackSubmissions.find(
    (p) => p.country === country
  )
  const chosen: CoverageChoice = decision?.choice ?? "upload"
  const [sendingPack, setSendingPack] = React.useState(false)

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
      actions={
        <Pill tone="neutral">{CALCULATION_MODE_COPY.external.label}</Pill>
      }
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

      {/* What the chosen option actually means to do, right now. */}
      <div className="mt-4 rounded-xl border bg-muted/30 p-3 text-sm">
        {chosen === "upload" && (
          <>
            <p className="font-medium">
              Results are uploaded when you run payroll
            </p>
            <p className="mt-0.5 text-muted-foreground">
              There is nothing to upload here yet — this only sets {country}{" "}
              to be paid by upload. Download the template below, send it to
              your local provider, and upload what comes back from the
              payroll run itself.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2 h-8">
              <Link href="/pay/payroll">
                Go to Payroll
                <ChevronRight className="size-3.5" />
              </Link>
            </Button>
          </>
        )}

        {chosen === "customer_pack" && (
          <>
            {submission ? (
              <>
                <p className="flex items-center gap-1.5 font-medium text-primary">
                  <CheckCircle2 className="size-4" />
                  Sent to Zelos
                </p>
                <p className="mt-1 text-muted-foreground">
                  {fullName(store.employeeById(submission.by))} sent this on{" "}
                  {formatDate(submission.at.slice(0, 10))}:
                </p>
                <p className="mt-1 rounded-lg bg-card p-2 text-foreground">
                  &ldquo;{submission.note}&rdquo;
                </p>
                <p className="mt-1 text-muted-foreground">
                  An implementation specialist will follow up. Results are
                  uploaded until the pack exists.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">
                  Send Zelos what you have
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Nobody types a tax rate into Zelos directly. Describe the
                  rates, bands and filing rules your company keeps for{" "}
                  {country} — or say where to find them — and Zelos builds it
                  as a pack only your company uses.
                </p>
              </>
            )}
            {canChooseCoverage && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-8"
                onClick={() => setSendingPack(true)}
              >
                <Send className="size-3.5" />
                {submission ? "Send an update" : "Send your pack to Zelos"}
              </Button>
            )}
          </>
        )}

        {chosen === "request_coverage" && (
          <>
            <p className="flex items-center gap-1.5 font-medium text-primary">
              <CheckCircle2 className="size-4" />
              Requested
            </p>
            <p className="mt-1 text-muted-foreground">
              {decision &&
                `${fullName(store.employeeById(decision.by))} asked Zelos to cover ${country} on ${formatDate(decision.at.slice(0, 10))}. `}
              Zelos will notify you once the rules are live. Results are
              uploaded until then.
            </p>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-xs text-muted-foreground">
          {!canChooseCoverage && "Only an HR Admin can change this."}
        </p>
        <Button size="sm" variant="outline" className="h-9" onClick={template}>
          <Download className="size-4" />
          Results template
        </Button>
      </div>

      {sendingPack && (
        <SendPackDialog
          country={country}
          existingNote={submission?.note}
          onClose={() => setSendingPack(false)}
        />
      )}
    </Panel>
  )
}

/**
 * The one place a customer describes a country's rules in their own words
 * — Zelos builds the pack from this, nobody types a rate into the product.
 */
function SendPackDialog({
  country,
  existingNote,
  onClose,
}: {
  country: string
  existingNote?: string
  onClose: () => void
}) {
  const store = useStore()
  const [note, setNote] = React.useState(existingNote ?? "")

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send {country}&rsquo;s rules to Zelos</DialogTitle>
          <DialogDescription>
            Describe what your company keeps — tax bands, contribution rates,
            filing deadlines — or say where Zelos can find them. An
            implementation specialist follows up to build this as your pack.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="pack-note" className="mb-1.5 block">
            What you have
          </Label>
          <Textarea
            id="pack-note"
            rows={5}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. PAYE bands and pension rates from our local accountant — happy to share the PDF on a call."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={note.trim() === ""}
            onClick={() => {
              store.submitCustomPack(country, note.trim())
              toast.success("Sent to Zelos")
              onClose()
            }}
          >
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
