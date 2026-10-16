"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { ToVerify, countryMoney } from "./country-rules"
import { money } from "@/lib/pay/money"
import {
  PRORATION_BLURB,
  PRORATION_LABEL,
  type ProrationMethod,
} from "@/lib/pay/proration"
import {
  packFor,
  paidCountries,
  taxTreatmentText,
  treatmentFor,
} from "@/lib/pay/rule-packs"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
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
import { TODAY_ISO, fullName } from "@/lib/format"

/* ── 1. Pay groups ───────────────────────────────────────────────────── */

const CHANNEL_LABEL: Record<string, string> = {
  bank_transfer: "Bank transfer",
  mobile_money: "Mobile money",
  international_transfer: "International transfer",
}

export function PayGroupsPanel() {
  return (
    <React.Suspense fallback={null}>
      <PayGroupsPanelInner />
    </React.Suspense>
  )
}

/**
 * "Add a country" on the country rules list lands here with `?new=1` so a
 * missing country turns straight into a pay group, rather than a page the
 * person still has to find the button on.
 */
function PayGroupsPanelInner() {
  const store = useStore()
  const router = useRouter()
  const params = useSearchParams()
  const [editing, setEditing] = React.useState<PayGroup | null | undefined>(
    () => (params.get("new") === "1" ? null : undefined)
  )

  React.useEffect(() => {
    if (params.get("new") === "1") router.replace("/settings/pay-groups")
  }, [params, router])

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
                  "Flags a person at",
                  "Part periods",
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
                      <span
                        title={`Anyone whose net pay moves more than ${g.varianceThresholdPercent}% against this group's last run is flagged for the preparer to look at. On GHS 4,000 last month, that is a move of about ${money((4000 * g.varianceThresholdPercent) / 100, g.currency)}.`}
                      >
                        {g.varianceThresholdPercent}% net change
                      </span>
                    </td>
                    <td className="px-4 text-muted-foreground">
                      <span title={PRORATION_BLURB[g.prorationMethod]}>
                        {PRORATION_LABEL[g.prorationMethod]}
                      </span>
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
  prorationMethod: "thirtieths",
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
        className="flex flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[520px]"
      >
        <SheetHeader className="border-b">
          <SheetTitle>{group ? "Edit pay group" : "New pay group"}</SheetTitle>
          <SheetDescription>
            One entity, one country, one currency, one cycle.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
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
                Flag a person when net pay moves by
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
                Compared per person against this group&rsquo;s previous run. At{" "}
                {draft.varianceThresholdPercent}%, somebody who took home GHS
                4,000 last month is flagged if they are now more than{" "}
                {money((4000 * draft.varianceThresholdPercent) / 100, "GHS")}{" "}
                above or below it. It never blocks a run — it asks for a look.
              </p>
            </div>
            <div>
              <Label htmlFor="proration" className="mb-1.5 block">
                Part periods are worked out in
              </Label>
              <Select
                value={draft.prorationMethod}
                onValueChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    prorationMethod: v as ProrationMethod,
                  }))
                }
              >
                <SelectTrigger id="proration" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    ["calendar_days", "working_days", "thirtieths"] as const
                  ).map((m) => (
                    <SelectItem key={m} value={m}>
                      {PRORATION_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                {PRORATION_BLURB[draft.prorationMethod]}
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

  // Only countries somebody is actually paid in. A column per country
  // would grow with every pay group until the table stopped being
  // readable; one country at a time, chosen here, does not.
  const countries = paidCountries(store.payGroups)
  const [country, setCountry] = React.useState(countries[0] ?? "")
  const pack = packFor(store.countryRulePacks, country, TODAY_ISO)
  const fmt = countryMoney(store, country)

  return (
    <div className="space-y-4">
      <Panel
        title="Pay components"
        description="The library every package is built from. How each one is taxed is read from the country rules, not set here."
        bodyClassName="p-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {countries.length > 1 && (
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger
                  className="h-9 w-[150px]"
                  aria-label="Country whose treatment is shown"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button size="sm" className="h-9" onClick={() => setEditing(null)}>
              <Plus className="size-4" />
              New component
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                {[
                  "Component",
                  "Category",
                  "Calculation",
                  "Recurrence",
                  "Tax",
                  "Social security",
                  "",
                ].map((h) => (
                  <th
                    key={h}
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
              {store.payComponents.map((c) => {
                const treatment = treatmentFor(
                  store.countryRulePacks,
                  country,
                  c.id,
                  TODAY_ISO
                )
                const text = treatment
                  ? taxTreatmentText(treatment, c.category, fmt)
                  : null
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
                      {treatment && text ? (
                        <span>
                          {text.label}
                          {text.detail && (
                            <span className="block text-xs text-muted-foreground">
                              {text.detail}
                            </span>
                          )}
                          {treatment.toVerify && (
                            <ToVerify against={treatment.toVerify} />
                          )}
                        </span>
                      ) : (
                        <span className="whitespace-nowrap text-muted-foreground">
                          {pack ? "Not in the pack" : `No rules for ${country}`}
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
                    <td className="sticky-actions py-3 pr-5 pl-2 text-right">
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
        Treatment is read-only, and shown for{" "}
        {country || "the selected country"}. Nobody types a tax rate into Zelos
        — the country rule pack decides what is taxable and what social security
        applies to. A deduction is pre-tax when it comes off pay before tax is
        worked out, and post-tax when it comes out of pay already taxed. The
        same component can be taxed differently in another country, which is why
        this is a switch rather than a column.
      </p>

      {editing !== undefined && (
        <ComponentSheet
          component={editing}
          country={country}
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
  country,
  onClose,
}: {
  component: PayComponent | null
  /** The country chosen on the table, whose treatment is shown. */
  country: string
  onClose: () => void
}) {
  const store = useStore()
  const [draft, setDraft] = React.useState<PayComponent>(
    component ?? BLANK_COMPONENT
  )
  const treatment = treatmentFor(
    store.countryRulePacks,
    country,
    draft.id,
    TODAY_ISO
  )

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[480px]"
      >
        <SheetHeader className="border-b">
          <SheetTitle>
            {component ? "Edit component" : "New component"}
          </SheetTitle>
          <SheetDescription>
            What it is and how it is worked out. How it is taxed comes from the
            country rules.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
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
            <p className="font-medium">Treatment in {country}</p>
            <p className="mt-0.5 text-muted-foreground">
              {treatment
                ? (() => {
                    const text = taxTreatmentText(
                      treatment,
                      draft.category,
                      countryMoney(store, country)
                    )
                    return `${text.label}${text.detail ? ` (${text.detail.toLowerCase()})` : ""} · social security ${treatment.socialSecurity ? "included" : "excluded"}`
                  })()
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
