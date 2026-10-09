"use client"

import * as React from "react"
import { AlertTriangle, Globe, Plus } from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Panel, Pill } from "@/components/common"
import { RowActions } from "@/components/common/row-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { CountryLabel } from "./money"
import { money } from "@/lib/pay/money"
import {
  bandThresholds,
  coveredCountries,
  differences,
  versionsFor,
} from "@/lib/pay/rule-packs"
import { useStore } from "@/lib/store"
import {
  CALCULATION_MODE_COPY,
  FREQUENCY_LABEL,
  calculationModeFor,
} from "@/lib/pay/derive"
import { ROLE_LABEL } from "@/lib/rbac"
import type {
  ComponentCategory,
  PayComponent,
  PayFrequency,
  PayGroup,
} from "@/lib/pay/types"
import type { PermissionRole } from "@/lib/types"
import { formatDate, fullName } from "@/lib/format"

/* ── 1. Pay groups ───────────────────────────────────────────────────── */

const CHANNEL_LABEL: Record<string, string> = {
  bank_transfer: "Bank transfer",
  mobile_money: "Mobile money",
  international_transfer: "International transfer",
}

export function PayGroupsPanel() {
  const store = useStore()
  const [editing, setEditing] = React.useState<PayGroup | null | undefined>(
    undefined
  )

  return (
    <div className="space-y-4">
      <Panel
        title="Pay groups"
        description="A pay group is one entity, one country, one currency and one cycle. People are paid through exactly one of them."
        bodyClassName="p-0"
        actions={
          <Button size="sm" className="h-9" onClick={() => setEditing(null)}>
            <Plus className="size-4" />
            New pay group
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                {[
                  "Pay group",
                  "Entity",
                  "Country",
                  "Currency",
                  "Cycle",
                  "Pay day",
                  "Variance",
                  "Calculation",
                  "",
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
              {store.payGroups.map((g) => {
                const entity = store.legalEntities.find(
                  (e) => e.id === g.entityId
                )
                const copy = CALCULATION_MODE_COPY[g.calculationMode]
                return (
                  <tr
                    key={g.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="py-3 pl-5 font-medium">{g.name}</td>
                    <td className="px-4 text-muted-foreground">
                      {entity?.name ?? "—"}
                    </td>
                    <td className="px-4">
                      {g.country === "—" ? (
                        <span className="text-muted-foreground">Various</span>
                      ) : (
                        <CountryLabel country={g.country} />
                      )}
                    </td>
                    <td className="px-4">{g.currency}</td>
                    <td className="px-4 text-muted-foreground">
                      {FREQUENCY_LABEL[g.frequency]}
                    </td>
                    <td className="px-4 text-muted-foreground">
                      {g.payDayRule}
                    </td>
                    <td className="tabular px-4 text-muted-foreground">
                      {g.varianceThresholdPercent}%
                    </td>
                    <td className="px-4">
                      <span className="block">
                        <Pill
                          tone={
                            g.calculationMode === "native"
                              ? "success"
                              : "neutral"
                          }
                        >
                          {copy.label}
                        </Pill>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {copy.explains}
                      </span>
                    </td>
                    <td className="py-3 pr-5 text-right">
                      <RowActions
                        label={`Actions for ${g.name}`}
                        actions={[
                          {
                            label: "Edit pay group",
                            onSelect: () => setEditing(g),
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
      </Panel>

      <p className="text-xs text-muted-foreground">
        How a group calculates is worked out from its country, not chosen: a
        country Zelos holds rules for is calculated here, and one it does not is
        calculated by your local provider and uploaded.
      </p>

      {editing !== undefined && (
        <PayGroupSheet group={editing} onClose={() => setEditing(undefined)} />
      )}
    </div>
  )
}

const BLANK_GROUP: PayGroup = {
  id: "",
  name: "",
  entityId: "ent-gh",
  country: "Ghana",
  currency: "GHS",
  frequency: "monthly",
  payDayRule: "Last working day of the month",
  paymentChannels: ["bank_transfer"],
  varianceThresholdPercent: 10,
  calculationMode: "native",
}

function PayGroupSheet({
  group,
  onClose,
}: {
  group: PayGroup | null
  onClose: () => void
}) {
  const store = useStore()
  const [draft, setDraft] = React.useState<PayGroup>(group ?? BLANK_GROUP)

  const entity = store.legalEntities.find((e) => e.id === draft.entityId)
  const country = draft.contractorGroup
    ? draft.country
    : (entity?.country ?? draft.country)
  const mode = calculationModeFor(
    country,
    Boolean(draft.contractorGroup),
    store.countryRulePacks
  )
  const copy = CALCULATION_MODE_COPY[mode]

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[520px]"
      >
        <SheetHeader>
          <SheetTitle>{group ? "Edit pay group" : "New pay group"}</SheetTitle>
          <SheetDescription>
            One entity, one country, one currency, one cycle.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div>
            <Label htmlFor="group-name" className="mb-1.5 block">
              Name
            </Label>
            <Input
              id="group-name"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
              placeholder="Ghana monthly"
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Legal entity</Label>
            <Select
              value={draft.entityId}
              onValueChange={(v) => {
                const chosen = store.legalEntities.find((e) => e.id === v)
                setDraft((d) => ({
                  ...d,
                  entityId: v,
                  country: chosen?.country ?? d.country,
                  currency: chosen?.currency ?? d.currency,
                }))
              }}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {store.legalEntities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} · {e.country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">Cycle</Label>
              <Select
                value={draft.frequency}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, frequency: v as PayFrequency }))
                }
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FREQUENCY_LABEL) as PayFrequency[]).map((f) => (
                    <SelectItem key={f} value={f}>
                      {FREQUENCY_LABEL[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="variance" className="mb-1.5 block">
                Variance threshold
              </Label>
              <Input
                id="variance"
                type="number"
                min={0}
                className="h-9"
                value={draft.varianceThresholdPercent}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    varianceThresholdPercent: Number(e.target.value),
                  }))
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Percent movement that asks the preparer to explain itself.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="payday" className="mb-1.5 block">
              Pay day rule
            </Label>
            <Input
              id="payday"
              value={draft.payDayRule}
              onChange={(e) =>
                setDraft((d) => ({ ...d, payDayRule: e.target.value }))
              }
            />
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">
              Payment channels
            </legend>
            <div className="space-y-1.5">
              {Object.keys(CHANNEL_LABEL).map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={draft.paymentChannels.includes(
                      c as PayGroup["paymentChannels"][number]
                    )}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        paymentChannels: e.target.checked
                          ? [
                              ...d.paymentChannels,
                              c as PayGroup["paymentChannels"][number],
                            ]
                          : d.paymentChannels.filter((x) => x !== c),
                      }))
                    }
                  />
                  {CHANNEL_LABEL[c]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-sm font-medium">Calculation · {copy.label}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {copy.explains} This follows from the country and cannot be set by
              hand.
            </p>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={draft.name.trim() === ""}
            onClick={() => {
              store.savePayGroup({
                ...draft,
                id:
                  draft.id ||
                  `pg-${draft.name.toLowerCase().replace(/\W+/g, "-")}`,
                country,
                calculationMode: mode,
              })
              toast.success(group ? "Pay group updated" : "Pay group created")
              onClose()
            }}
          >
            {group ? "Save" : "Create"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/* ── 2. Pay components ───────────────────────────────────────────────── */

const CATEGORY_LABEL: Record<ComponentCategory, string> = {
  earning: "Earning",
  allowance: "Allowance",
  benefit_in_kind: "Benefit in kind",
  deduction: "Deduction",
  employer_contribution: "Employer contribution",
}

export function PayComponentsPanel() {
  const store = useStore()
  const [editing, setEditing] = React.useState<PayComponent | null | undefined>(
    undefined
  )
  const pack = store.countryRulePacks[0] ?? null

  return (
    <div className="space-y-4">
      <Panel
        title="Pay components"
        description="The library every package is built from. How each one is taxed is read from the country rules, not set here."
        bodyClassName="p-0"
        actions={
          <Button size="sm" className="h-9" onClick={() => setEditing(null)}>
            <Plus className="size-4" />
            New component
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                {[
                  "Component",
                  "Category",
                  "Calculation",
                  "Recurrence",
                  pack ? `${pack.country}: taxable` : "Taxable",
                  pack ? `${pack.country}: social security` : "Social security",
                  "",
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
              {store.payComponents.map((c) => {
                const treatment = pack?.componentTreatments[c.id]
                return (
                  <tr
                    key={c.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="py-3 pl-5 font-medium">{c.name}</td>
                    <td className="px-4 text-muted-foreground">
                      {CATEGORY_LABEL[c.category]}
                    </td>
                    <td className="px-4 text-muted-foreground">
                      {c.calculation === "fixed"
                        ? "Fixed amount"
                        : "Percent of base"}
                    </td>
                    <td className="px-4 text-muted-foreground">
                      {c.recurrence === "recurring" ? "Recurring" : "One-off"}
                    </td>
                    <td className="px-4">
                      {treatment ? (
                        <span>
                          {treatment.taxable ? "Taxable" : "Not taxable"}
                          {treatment.cap !== undefined && (
                            <span className="block text-xs text-muted-foreground">
                              up to {treatment.cap} per period
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Not in the pack
                        </span>
                      )}
                    </td>
                    <td className="px-4 text-muted-foreground">
                      {treatment
                        ? treatment.socialSecurity
                          ? "Included"
                          : "Excluded"
                        : "—"}
                    </td>
                    <td className="py-3 pr-5 text-right">
                      <RowActions
                        label={`Actions for ${c.name}`}
                        actions={[
                          {
                            label: "Edit component",
                            onSelect: () => setEditing(c),
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
      </Panel>

      <p className="text-xs text-muted-foreground">
        Treatment is read-only. Nobody types a tax rate into Zelos — the country
        rule pack decides what is taxable and what social security applies to.
      </p>

      {editing !== undefined && (
        <ComponentSheet
          component={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  )
}

const BLANK_COMPONENT: PayComponent = {
  id: "",
  name: "",
  category: "allowance",
  calculation: "fixed",
  recurrence: "recurring",
}

function ComponentSheet({
  component,
  onClose,
}: {
  component: PayComponent | null
  onClose: () => void
}) {
  const store = useStore()
  const [draft, setDraft] = React.useState<PayComponent>(
    component ?? BLANK_COMPONENT
  )
  const treatment = store.countryRulePacks[0]?.componentTreatments[draft.id]

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[480px]"
      >
        <SheetHeader>
          <SheetTitle>
            {component ? "Edit component" : "New component"}
          </SheetTitle>
          <SheetDescription>
            What it is and how it is worked out. How it is taxed comes from the
            country rules.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div>
            <Label htmlFor="component-name" className="mb-1.5 block">
              Name
            </Label>
            <Input
              id="component-name"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
              placeholder="Transport allowance"
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Category</Label>
            <Select
              value={draft.category}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, category: v as ComponentCategory }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORY_LABEL) as ComponentCategory[]).map(
                  (c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">Calculation</Label>
              <Select
                value={draft.calculation}
                onValueChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    calculation: v as PayComponent["calculation"],
                  }))
                }
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                  <SelectItem value="percent_of_base">
                    Percent of base
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Recurrence</Label>
              <Select
                value={draft.recurrence}
                onValueChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    recurrence: v as PayComponent["recurrence"],
                  }))
                }
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring">Recurring</SelectItem>
                  <SelectItem value="one_off">One-off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Country treatment</p>
            <p className="mt-0.5 text-muted-foreground">
              {treatment
                ? `${treatment.taxable ? "Taxable" : "Not taxable"} · social security ${treatment.socialSecurity ? "included" : "excluded"}${treatment.cap !== undefined ? ` · capped at ${treatment.cap}` : ""}`
                : "A new component is treated once the country rule pack covers it. Treatment is never entered by hand."}
            </p>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={draft.name.trim() === ""}
            onClick={() => {
              store.savePayComponent({
                ...draft,
                id:
                  draft.id ||
                  `pc-${draft.name.toLowerCase().replace(/\W+/g, "-")}`,
              })
              toast.success(component ? "Component updated" : "Component added")
              onClose()
            }}
          >
            {component ? "Save" : "Add"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/* ── 3. Country rules ────────────────────────────────────────────────── */

export function CountryRulesPanel() {
  const store = useStore()
  const covered = coveredCountries(store.countryRulePacks)
  const used = [
    ...new Set(store.payGroups.map((g) => g.country).filter((c) => c !== "—")),
  ]

  return (
    <div className="space-y-4">
      {covered.map((country) => (
        <CountryPack key={country} country={country} />
      ))}

      {used
        .filter((c) => !covered.includes(c))
        .map((country) => (
          <Panel key={country} bodyClassName="px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <Globe className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  <CountryLabel country={country} />
                </p>
                <p className="text-sm text-muted-foreground">
                  No rule pack. Pay for this country is calculated by your local
                  provider and the results uploaded.
                </p>
              </div>
              <Pill tone="neutral">Uploaded results</Pill>
            </div>
          </Panel>
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
}: {
  label: string
  note?: string
  value: string
}) {
  return (
    <li className="flex justify-between gap-3">
      <span className="min-w-0">
        {label}
        {note && (
          <span className="block text-xs text-muted-foreground">{note}</span>
        )}
      </span>
      <span className="tabular shrink-0 text-muted-foreground">{value}</span>
    </li>
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
  const [versionId, setVersionId] = React.useState(versions[0]?.version ?? "")
  const pack = versions.find((v) => v.version === versionId) ?? versions[0]
  if (!pack) return null

  const current = versions[0]?.version === pack.version
  const previous = versions[versions.indexOf(pack) + 1] ?? null
  const changes = previous ? differences(previous, pack) : []

  // Thresholds rather than widths, which is what a person checking their
  // own tax actually wants to see.
  const bands = bandThresholds(pack)

  const caps = Object.entries(pack.componentTreatments).filter(
    ([, t]) => t.cap !== undefined
  )

  return (
    <Panel
      title={<CountryLabel country={pack.country} />}
      description={`Version ${pack.version} · in force from ${formatDate(pack.effectiveFrom)}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={current ? "success" : "neutral"}>
            {current ? "Calculated by Zelos" : "Past version"}
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
                    {v.version === versions[0].version ? " (current)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <RuleHeading>Employee contributions</RuleHeading>
          <ul className="space-y-1 text-sm">
            {pack.employeeContributionRules.map((r) => (
              <Row
                key={r.id}
                label={r.name}
                note={`Remitted to ${r.remittedTo}`}
                value={`${r.percentOfBase}% of base`}
              />
            ))}
            {pack.employeeContributionRules.length === 0 && (
              <li className="text-sm text-muted-foreground">None.</li>
            )}
          </ul>
        </div>

        <div>
          <RuleHeading>Employer contributions</RuleHeading>
          <ul className="space-y-1 text-sm">
            {pack.employerContributionRules.map((r) => (
              <Row
                key={r.id}
                label={r.name}
                note={`Remitted to ${r.remittedTo}`}
                value={`${r.percentOfBase}% of base`}
              />
            ))}
          </ul>
        </div>

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
                        ? `Above ${money(b.from, "GHS")}`
                        : `${money(b.from, "GHS")} – ${money(b.to, "GHS")}`}
                    </td>
                    <td className="tabular py-1.5 pr-4 text-muted-foreground">
                      {b.to === null
                        ? "The rest"
                        : money(b.to - b.from, "GHS")}
                    </td>
                    <td className="tabular py-1.5 pr-4">{b.ratePercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            The first {money(bands[0]?.to ?? 0, "GHS")} is taxed at nothing.
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
                  label={store.payComponents.find((c) => c.id === id)?.name ?? id}
                  note={
                    t.taxable
                      ? "Taxed on anything above the cap"
                      : "Outside taxable pay up to the cap"
                  }
                  value={`${money(t.cap!, "GHS")} per period`}
                />
              ))}
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

      <p className="mt-5 border-t pt-3 text-xs text-muted-foreground">
        Nothing on this page can be edited. These are the country&rsquo;s rules,
        and they change when the pack is updated.
      </p>
    </Panel>
  )
}


/* ── 4. Approvals ────────────────────────────────────────────────────── */

const ROLES: PermissionRole[] = [
  "hr_admin",
  "payroll",
  "head_of_department",
  "line_manager",
]

export function PayApprovalsPanel() {
  const store = useStore()
  const settings = store.approvalSettings

  const holders = (role: string) =>
    store.employees.filter((e) =>
      role === "hr_admin"
        ? e.id === "fiifi"
        : role === "payroll"
          ? e.id === "maame"
          : e.department !== ""
    )

  // Preparer and approver must be different people, or nobody is
  // checking the run. Same role means the same person here.
  const sameRole = settings.payrollPreparerRole === settings.payrollApproverRole
  const preparer = holders(settings.payrollPreparerRole)[0]
  const approver = holders(settings.payrollApproverRole)[0]
  const samePerson = Boolean(
    preparer && approver && preparer.id === approver.id
  )
  const blocked = sameRole || samePerson

  return (
    <div className="space-y-4">
      {blocked && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive bg-danger-muted px-4 py-3">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden
          />
          <div className="min-w-0 text-sm text-destructive">
            <p className="font-medium">Payroll cannot run</p>
            <p className="mt-0.5">
              The preparer and the approver resolve to the same person
              {preparer ? ` (${fullName(preparer)})` : ""}. Somebody other than
              the person who prepared a run has to approve it, so pick different
              roles or name a delegate.
            </p>
          </div>
        </div>
      )}

      <Panel
        title="Who approves what"
        description="Separation of duties. Nobody approves their own work, and nobody approves a change to their own pay."
      >
        <div className="grid max-w-2xl gap-4">
          <RolePicker
            label="Compensation approver"
            hint="Decides pay changes proposed by managers and HR."
            value={settings.compensationApproverRole}
            onChange={(v) =>
              store.saveApprovalSettings({ compensationApproverRole: v })
            }
          />
          <RolePicker
            label="Payroll preparer"
            hint="Builds the run and explains anything above the variance threshold."
            value={settings.payrollPreparerRole}
            onChange={(v) =>
              store.saveApprovalSettings({ payrollPreparerRole: v })
            }
          />
          <RolePicker
            label="Payroll approver"
            hint="Signs the run off before anyone is paid."
            value={settings.payrollApproverRole}
            onChange={(v) =>
              store.saveApprovalSettings({ payrollApproverRole: v })
            }
          />

          <div>
            <Label className="mb-1.5 block">Delegate</Label>
            <Select
              value={settings.delegateUserId ?? "none"}
              onValueChange={(v) =>
                store.saveApprovalSettings({
                  delegateUserId: v === "none" ? null : v,
                })
              }
            >
              <SelectTrigger className="h-9 w-full max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nobody</SelectItem>
                {store.employees
                  .filter((e) => e.lifecycleState === "active")
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {fullName(e)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Acts for the approver while they are away. The record still shows
              who actually decided.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  )
}

function RolePicker({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-full max-w-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {ROLE_LABEL[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

/** Shown where a pay settings area has nothing configured yet. */
export function PayEmpty({ label }: { label: string }) {
  return (
    <Panel bodyClassName="p-0">
      <EmptyState
        icon={Globe}
        title={`No ${label} configured`}
        description="Whatever is set here applies to every pay group that uses it."
      />
    </Panel>
  )
}
