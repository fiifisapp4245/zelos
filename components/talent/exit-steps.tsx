"use client"

import * as React from "react"
import { Lock } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormRow, NativeSelect } from "./form"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { TODAY_ISO, formatDate, fullName, ghs } from "@/lib/format"
import {
  accruedLeaveDays,
  defaultSettlement,
  settlementLines,
  type ExitStepKey,
  type SettlementInputs,
} from "@/lib/talent/offboarding"
import type { OffboardingCase } from "@/lib/types"
import { cn } from "@/lib/utils"

interface StepProps {
  c: OffboardingCase
  /** Called after a step is saved, so the page can move to the next one. */
  onSaved: () => void
}

function useCanAct() {
  return has(useStore().viewer, "hr_admin")
}

function ReadOnly() {
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <Lock className="mt-0.5 size-4 shrink-0" />
      Only HR completes offboarding steps.
    </p>
  )
}

export function AssetsStep({ c, onSaved }: StepProps) {
  const store = useStore()
  const canAct = useCanAct()
  const [item, setItem] = React.useState("")
  const [tag, setTag] = React.useState("")
  const out = c.clearance.assets.filter((a) => !a.returned).length

  function set(index: number, returned: boolean) {
    store.updateOffboarding(
      c.id,
      {
        clearance: {
          ...c.clearance,
          assets: c.clearance.assets.map((a, i) =>
            i === index ? { ...a, returned } : a
          ),
        },
      },
      `Marked ${c.clearance.assets[index].item} ${returned ? "returned" : "outstanding"}`
    )
  }

  function add() {
    if (!item.trim()) return
    store.updateOffboarding(
      c.id,
      {
        clearance: {
          ...c.clearance,
          assets: [
            ...c.clearance.assets,
            {
              item: item.trim(),
              tag: tag.trim() || undefined,
              returned: false,
            },
          ],
        },
      },
      `Added ${item.trim()} to the assets to return`
    )
    setItem("")
    setTag("")
  }

  return (
    <div className="space-y-5">
      <ul className="divide-y rounded-lg border">
        {c.clearance.assets.map((a, i) => (
          <li key={`${a.item}-${i}`}>
            <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={a.returned}
                disabled={!canAct}
                onChange={(e) => set(i, e.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              <span
                className={cn(
                  "flex-1",
                  a.returned && "text-muted-foreground line-through"
                )}
              >
                {a.item}
              </span>
              {a.tag && (
                <span className="font-mono text-xs text-muted-foreground">
                  {a.tag}
                </span>
              )}
            </label>
          </li>
        ))}
      </ul>
      {canAct && (
        <form
          className="grid gap-3 sm:grid-cols-[1fr_180px_auto]"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <Input
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="Add an item, e.g. Company credit card"
            aria-label="Item"
          />
          <Input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Tag or serial (optional)"
            aria-label="Tag or serial"
          />
          <Button type="submit" variant="outline" disabled={!item.trim()}>
            Add item
          </Button>
        </form>
      )}
      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-sm text-muted-foreground">
          {out === 0 ? "Everything is back." : `${out} still out.`}
        </p>
        <Button onClick={onSaved} variant={out === 0 ? "default" : "outline"}>
          {out === 0 ? "Continue" : "Skip for now"}
        </Button>
      </div>
    </div>
  )
}

export function AccessStep({ c, onSaved }: StepProps) {
  const store = useStore()
  const canAct = useCanAct()
  const systems = [
    "Work email",
    "HR system",
    "VPN",
    "Shared drives",
    "Building access",
  ]
  const [checked, setChecked] = React.useState<string[]>(
    c.clearance.access ? systems : []
  )
  const all = checked.length === systems.length
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Confirm each is closed. The step is done when all of them are.
      </p>
      <ul className="divide-y rounded-lg border">
        {systems.map((s) => (
          <li key={s}>
            <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={checked.includes(s)}
                disabled={!canAct}
                onChange={(e) =>
                  setChecked((x) =>
                    e.target.checked ? [...x, s] : x.filter((y) => y !== s)
                  )
                }
                className="size-4 accent-[var(--primary)]"
              />
              {s}
            </label>
          </li>
        ))}
      </ul>
      {canAct ? (
        <div className="flex justify-end border-t pt-4">
          <Button
            disabled={!all && !c.clearance.access}
            onClick={() => {
              if (all !== c.clearance.access) {
                store.updateOffboarding(
                  c.id,
                  { clearance: { ...c.clearance, access: all } },
                  all
                    ? "Marked system access revoked"
                    : "Reopened system access"
                )
                toast.success(
                  all ? "Access marked revoked." : "Access reopened."
                )
              }
              onSaved()
            }}
          >
            {all
              ? "Confirm and continue"
              : c.clearance.access
                ? "Reopen access"
                : "Confirm and continue"}
          </Button>
        </div>
      ) : (
        <ReadOnly />
      )}
    </div>
  )
}

export function HandoverStep({ c, onSaved }: StepProps) {
  const store = useStore()
  const canAct = useCanAct()
  const leaver = store.employeeById(c.employeeId)
  const colleagues = store.employees.filter(
    (e) =>
      e.id !== c.employeeId &&
      ["active", "probation"].includes(e.lifecycleState) &&
      e.department === leaver?.department
  )
  const [to, setTo] = React.useState(c.handoverTo ?? colleagues[0]?.id ?? "")
  if (!canAct) return <ReadOnly />
  return (
    <div className="space-y-5">
      {colleagues.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nobody else in {leaver?.department} to hand over to.
        </p>
      ) : (
        <FormRow
          label="Who takes over their work"
          htmlFor="ho-to"
          hint="Their manager is told, and open work is reassigned to them."
        >
          <NativeSelect
            id="ho-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          >
            {colleagues.map((e) => (
              <option key={e.id} value={e.id}>
                {fullName(e)} — {e.jobTitle}
              </option>
            ))}
          </NativeSelect>
        </FormRow>
      )}
      <div className="flex justify-end border-t pt-4">
        <Button
          disabled={!to}
          onClick={() => {
            store.updateOffboarding(
              c.id,
              { handoverTo: to, clearance: { ...c.clearance, handover: true } },
              "Recorded a handover"
            )
            toast.success(
              `Handover to ${fullName(store.employeeById(to))} recorded.`
            )
            onSaved()
          }}
        >
          Save and continue
        </Button>
      </div>
    </div>
  )
}

export function InterviewStep({ c, onSaved }: StepProps) {
  const store = useStore()
  const canAct = useCanAct()
  const [on, setOn] = React.useState(c.exitInterviewOn ?? TODAY_ISO)
  const [notes, setNotes] = React.useState(c.exitNotes ?? "")
  const [touched, setTouched] = React.useState(false)
  const short = notes.trim().length < 10
  if (!canAct) return <ReadOnly />
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Why they are leaving, what went well, and what would have kept them.
        Kept with HR; not shown to the line manager.
      </p>
      <FormRow label="Held on" htmlFor="ei-on" className="max-w-xs">
        <Input
          id="ei-on"
          type="date"
          value={on}
          onChange={(e) => setOn(e.target.value)}
        />
      </FormRow>
      <FormRow
        label="Notes"
        htmlFor="ei-notes"
        error={touched && short ? "Write at least a sentence." : null}
      >
        <Textarea
          id="ei-notes"
          rows={7}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Main reason for leaving, feedback on the team and manager, anything the company should change."
        />
      </FormRow>
      <div className="flex justify-end border-t pt-4">
        <Button
          onClick={() => {
            setTouched(true)
            if (short) return
            store.updateOffboarding(
              c.id,
              {
                exitInterviewDone: true,
                exitInterviewOn: on,
                exitNotes: notes.trim(),
              },
              "Recorded an exit interview"
            )
            toast.success("Exit interview recorded.")
            onSaved()
          }}
        >
          Save and continue
        </Button>
      </div>
    </div>
  )
}

export function SettlementStep({ c, onSaved }: StepProps) {
  const store = useStore()
  const canAct = useCanAct()
  const money = canAct || has(store.viewer, "payroll")
  const emp = store.employeeById(c.employeeId)
  const balance = store.leaveBalances.find((b) => b.employeeId === c.employeeId)
  const [v, setV] = React.useState<SettlementInputs>(
    c.settlement ?? defaultSettlement(c, balance)
  )
  if (!emp) return null
  if (!money)
    return (
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Lock className="mt-0.5 size-4 shrink-0" />
        Settlement figures are visible to HR and Payroll only.
      </p>
    )
  const { lines, total } = settlementLines(emp, v)
  const num = (k: keyof SettlementInputs, raw: string) =>
    setV((x) => ({ ...x, [k]: Math.max(0, Number(raw) || 0) }))

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Gross, before PAYE and SSNIT. Payroll applies the statutory deductions
        when it runs the final pay.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormRow
          label="Days worked, unpaid"
          htmlFor="st-days"
          hint="This month, to the last day."
        >
          <Input
            id="st-days"
            type="number"
            min={0}
            disabled={!canAct}
            value={v.salaryDays}
            onChange={(e) => num("salaryDays", e.target.value)}
          />
        </FormRow>
        <FormRow
          label="Leave days to pay"
          htmlFor="st-leave"
          hint={`${accruedLeaveDays(balance)} accrued.`}
        >
          <Input
            id="st-leave"
            type="number"
            min={0}
            disabled={!canAct}
            value={v.leaveDays}
            onChange={(e) => num("leaveDays", e.target.value)}
          />
        </FormRow>
        <FormRow
          label="Notice in lieu (days)"
          htmlFor="st-notice"
          hint={`Of ${emp.noticePeriodDays}.`}
        >
          <Input
            id="st-notice"
            type="number"
            min={0}
            disabled={!canAct}
            value={v.noticeInLieuDays}
            onChange={(e) => num("noticeInLieuDays", e.target.value)}
          />
        </FormRow>
      </div>
      <FormRow
        label="Recoveries (GHS)"
        htmlFor="st-ded"
        hint="Loans or unreturned property recovered from the final pay."
        className="max-w-xs"
      >
        <Input
          id="st-ded"
          type="number"
          min={0}
          disabled={!canAct}
          value={v.deductions}
          onChange={(e) => num("deductions", e.target.value)}
        />
      </FormRow>
      <FormRow label="Note for payroll" htmlFor="st-note">
        <Textarea
          id="st-note"
          rows={2}
          disabled={!canAct}
          value={v.note}
          onChange={(e) => setV((x) => ({ ...x, note: e.target.value }))}
        />
      </FormRow>
      <dl className="space-y-1.5 rounded-lg border bg-muted/30 p-4 text-sm">
        {lines.map((l) => (
          <div key={l.label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">
              {l.label}
              {l.days !== undefined && ` · ${l.days} d`}
            </dt>
            <dd className="tabular">{ghs(l.amount)}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2 font-medium">
          <dt>Gross settlement</dt>
          <dd className="tabular">{ghs(total)}</dd>
        </div>
      </dl>
      {canAct && (
        <div className="flex justify-end border-t pt-4">
          <Button
            onClick={() => {
              store.updateOffboarding(
                c.id,
                {
                  settlement: v,
                  finalSettlement: total,
                  clearance: { ...c.clearance, finance: true },
                },
                "Calculated the final settlement"
              )
              toast.success(`Final settlement of ${ghs(total)} saved.`)
              onSaved()
            }}
          >
            Save and continue
          </Button>
        </div>
      )}
    </div>
  )
}

export function PayrollStep({ c, onSaved }: StepProps) {
  const store = useStore()
  const canAct = useCanAct()
  const emp = store.employeeById(c.employeeId)
  if (c.sentToPayrollOn)
    return (
      <div className="space-y-4">
        <p className="text-sm">
          With payroll since <strong>{formatDate(c.sentToPayrollOn)}</strong>.
          PAYE and SSNIT are applied in the final run.
        </p>
        <div className="flex justify-end border-t pt-4">
          <Button onClick={onSaved}>Continue</Button>
        </div>
      </div>
    )
  if (c.finalSettlement === null)
    return (
      <p className="text-sm text-muted-foreground">
        Calculate the settlement first, then it can go to payroll.
      </p>
    )
  if (!canAct) return <ReadOnly />
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Sends a final settlement of{" "}
        <strong className="text-foreground">{ghs(c.finalSettlement)}</strong>{" "}
        for {fullName(emp)} to Payroll, who are notified.
      </p>
      <div className="flex justify-end border-t pt-4">
        <Button
          onClick={() => {
            store.updateOffboarding(
              c.id,
              { sentToPayrollOn: TODAY_ISO },
              "Sent final settlement to payroll"
            )
            store.addNotification({
              title: `Final pay for ${fullName(emp)}`,
              body: `${c.id}: settlement of ${ghs(c.finalSettlement ?? 0)} is ready for the final run.`,
              kind: "approval",
              href: "/pay/payroll",
            })
            toast.success("Sent to payroll. They have been notified.")
            onSaved()
          }}
        >
          Send to payroll
        </Button>
      </div>
    </div>
  )
}

export const STEP_PANEL: Record<ExitStepKey, React.ComponentType<StepProps>> = {
  assets: AssetsStep,
  access: AccessStep,
  handover: HandoverStep,
  exit_interview: InterviewStep,
  settlement: SettlementStep,
  payroll: PayrollStep,
}
