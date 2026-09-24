"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, Initials, PageHeader, Panel } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Amount, RevealProvider, RevealToggle } from "@/components/pay/money"
import { usePay } from "@/components/pay/use-pay"
import { useStore } from "@/lib/store"
import {
  applyChange,
  employerCost,
  nextPeriodStart,
  periodFor,
  prorate,
} from "@/lib/pay/derive"
import { percent, totalPerCurrency } from "@/lib/pay/money"
import type { ChangeDefinition } from "@/lib/pay/types"
import { TODAY_ISO, formatDate, fullName } from "@/lib/format"
import { cn } from "@/lib/utils"

const STEPS = ["Select employees", "Define change", "Review"] as const

export default function ChangePayPage() {
  return (
    <React.Suspense fallback={null}>
      <ChangePay />
    </React.Suspense>
  )
}

function ChangePay() {
  const router = useRouter()
  const params = useSearchParams()
  const store = useStore()
  const { rows, groups } = usePay()

  const preselected = (params.get("employees") ?? "").split(",").filter(Boolean)

  const [step, setStep] = React.useState(preselected.length > 0 ? 1 : 0)
  const [selected, setSelected] = React.useState<string[]>(preselected)
  const [type, setType] = React.useState<ChangeDefinition["type"]>("percent")
  const [value, setValue] = React.useState("5")
  const [componentId, setComponentId] = React.useState("base")
  const [reason, setReason] = React.useState("")
  const [revealed, setRevealed] = React.useState(false)

  // The default is the first day of the next period, because a change
  // dated inside one has to be prorated and nobody wants that by accident.
  const firstGroup =
    groups.find(
      (g) =>
        g.id ===
        rows.find((r) => selected.includes(r.employee.id))?.version?.payGroupId
    ) ?? groups[0]
  const [effectiveFrom, setEffectiveFrom] = React.useState(() =>
    firstGroup ? nextPeriodStart(firstGroup, TODAY_ISO) : TODAY_ISO
  )

  const definition: ChangeDefinition = {
    type,
    value: Number(value) || 0,
    ...(componentId === "base" ? {} : { componentId }),
  }

  const proposed = applyChange(
    definition,
    selected,
    store.compensationVersions,
    TODAY_ISO
  )

  const midPeriod = proposed.some((row) => {
    if (!row.current) return false
    const group = groups.find((g) => g.id === row.current!.payGroupId)
    if (!group) return false
    return prorate(
      row.currentAmount,
      row.newAmount,
      effectiveFrom,
      periodFor(group, effectiveFrom)
    ).midPeriod
  })

  const costDelta = totalPerCurrency(
    proposed
      .filter((r) => r.current && r.currency)
      .map((r) => {
        const pack =
          store.countryRulePacks.find(
            (p) => p.country === r.current!.workCountry
          ) ?? null
        const before = employerCost(r.current!, pack, store.payComponents)
        const after = employerCost(
          { ...r.current!, baseAmount: r.newAmount },
          pack,
          store.payComponents
        )
        return {
          amount: after.monthly.total - before.monthly.total,
          currency: r.currency!,
        }
      })
  )

  const canContinue =
    step === 0
      ? selected.length > 0
      : step === 1
        ? Number(value) !== 0 && reason.trim().length > 4
        : true

  function submit() {
    const request = store.proposeCompensationChange({
      kind: selected.length > 1 ? "bulk" : "individual",
      employeeIds: selected,
      definition,
      effectiveFrom,
      reason: reason.trim(),
    })
    toast.success(
      `${request.id} sent for approval · ${selected.length} ${selected.length === 1 ? "person" : "people"}`
    )
    router.push("/pay/compensation?tab=changes")
  }

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Pay" },
        { label: "Compensation", href: "/pay/compensation" },
        { label: "Change pay" },
      ]}
    >
      <PageHeader
        title="Change pay"
        description="Nothing is written until this is approved. Approval creates a new version for each person; it never edits the one they are on."
        actions={
          <Button variant="outline" size="lg" asChild>
            <Link href="/pay/compensation">Cancel</Link>
          </Button>
        }
      />

      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Progress">
        {STEPS.map((label, i) => {
          const state = i === step ? "current" : i < step ? "done" : "todo"
          return (
            <li key={label} className="flex-1">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                aria-current={state === "current" ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  state === "current" && "border-primary bg-success-muted",
                  state === "done" && "bg-card hover:bg-muted/50",
                  state === "todo" && "bg-card text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                    state === "todo"
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {state === "done" ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "truncate",
                    state === "current" && "font-medium text-primary"
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <RevealProvider revealed={revealed}>
        {step === 0 && (
          <Panel
            title="Who is this for?"
            description="Everyone you can propose a change for."
            bodyClassName="p-0"
          >
            {rows.length === 0 ? (
              <EmptyState
                icon={Check}
                title="Nobody in your scope"
                description="You can propose changes for your own reports; HR can propose for anyone."
              />
            ) : (
              <ul className="divide-y">
                {rows.map(({ employee, version }) => (
                  <li key={employee.id}>
                    <label className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-3 hover:bg-muted/30">
                      <Checkbox
                        checked={selected.includes(employee.id)}
                        onCheckedChange={(v) =>
                          setSelected((s) =>
                            v === true
                              ? [...s, employee.id]
                              : s.filter((x) => x !== employee.id)
                          )
                        }
                        aria-label={`Include ${fullName(employee)}`}
                      />
                      <Initials person={employee} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {fullName(employee)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {employee.jobTitle} · {employee.department}
                        </span>
                      </span>
                      {version && (
                        <Amount
                          value={version.baseAmount}
                          currency={version.currency}
                          className="text-sm"
                        />
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {step === 1 && (
          <Panel title="What is changing?" bodyClassName="px-5 py-4">
            <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block">Type of change</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as ChangeDefinition["type"])}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="fixed_increase">
                      Fixed increase
                    </SelectItem>
                    <SelectItem value="new_amount">New amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="value" className="mb-1.5 block">
                  {type === "percent" ? "Percentage" : "Amount"}
                </Label>
                <Input
                  id="value"
                  type="number"
                  className="h-9"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
                {type !== "percent" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    In each person&apos;s own currency.
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-1.5 block">Applies to</Label>
                <Select value={componentId} onValueChange={setComponentId}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Base pay</SelectItem>
                    {store.payComponents
                      .filter((c) => c.recurrence === "recurring")
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="effective" className="mb-1.5 block">
                  Effective from
                </Label>
                <Input
                  id="effective"
                  type="date"
                  className="h-9"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
                {midPeriod && (
                  <p className="mt-1 text-xs text-warning-foreground">
                    This lands inside a pay period, so that period pays both
                    rates by calendar day.
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="reason" className="mb-1.5 block">
                  Reason
                </Label>
                <Textarea
                  id="reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="The case for the change. The approver reads this, and it stays on each version."
                />
              </div>
            </div>
          </Panel>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Panel
              title="Review"
              description={`Effective ${formatDate(effectiveFrom)} · ${selected.length} ${selected.length === 1 ? "person" : "people"}`}
              bodyClassName="p-0"
              actions={
                <RevealToggle revealed={revealed} onChange={setRevealed} />
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      {[
                        "Employee",
                        "Now",
                        "After",
                        "Change",
                        "This period",
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
                    {proposed.map((row) => {
                      const person = store.employeeById(row.employeeId)
                      if (!row.current || !row.currency)
                        return (
                          <tr key={row.employeeId}>
                            <td className="py-2.5 pl-5">{fullName(person)}</td>
                            <td
                              colSpan={4}
                              className="px-4 text-muted-foreground"
                            >
                              {row.blocked}
                            </td>
                          </tr>
                        )
                      const group = groups.find(
                        (g) => g.id === row.current!.payGroupId
                      )
                      const split = group
                        ? prorate(
                            row.currentAmount,
                            row.newAmount,
                            effectiveFrom,
                            periodFor(group, effectiveFrom)
                          )
                        : null
                      return (
                        <tr key={row.employeeId}>
                          <td className="py-2.5 pl-5">
                            <span className="flex items-center gap-2.5">
                              {person && <Initials person={person} size="xs" />}
                              <span className="truncate font-medium">
                                {fullName(person)}
                              </span>
                            </span>
                          </td>
                          <td className="px-4">
                            <Amount
                              value={row.currentAmount}
                              currency={row.currency}
                            />
                          </td>
                          <td className="px-4 font-medium">
                            <Amount
                              value={row.newAmount}
                              currency={row.currency}
                            />
                          </td>
                          <td className="tabular px-4 text-primary">
                            {percent(row.deltaPercent)}
                          </td>
                          <td className="px-4 py-2.5 pr-5 text-xs text-muted-foreground">
                            {split?.midPeriod
                              ? `${split.daysOnOld}d at the old rate, ${split.daysOnNew}d at the new`
                              : "Full period at the new rate"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel
              title="Cost impact"
              description="Employer cost, grouped per currency. Currencies are never added together."
              bodyClassName="p-0"
            >
              <ul className="divide-y">
                {costDelta.map((t) => (
                  <li
                    key={t.currency}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
                  >
                    <span className="text-muted-foreground">{t.currency}</span>
                    <span>
                      <Amount value={t.amount} currency={t.currency} signed /> a
                      month ·{" "}
                      <Amount
                        value={t.amount * 12}
                        currency={t.currency}
                        signed
                      />{" "}
                      a year
                    </span>
                  </li>
                ))}
                {costDelta.length === 0 && (
                  <li className="px-5 py-3 text-sm text-muted-foreground">
                    Nothing to cost yet.
                  </li>
                )}
              </ul>
            </Panel>
          </div>
        )}
      </RevealProvider>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          size="lg"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        {step < 2 ? (
          <Button
            size="lg"
            disabled={!canContinue}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button size="lg" onClick={submit}>
            Submit for approval
          </Button>
        )}
      </div>
    </PageShell>
  )
}
