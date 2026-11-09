"use client"

import * as React from "react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormRow, NativeSelect } from "./form"
import { useStore } from "@/lib/store"
import {
  OFFBOARD_REASON_LABEL,
  TODAY_ISO,
  formatDate,
  fullName,
  ghs,
} from "@/lib/format"
import { visibleEmployees } from "@/lib/selectors"
import {
  accruedLeaveDays,
  defaultLastDay,
  defaultSettlement,
  settlementLines,
  type SettlementInputs,
} from "@/lib/talent/offboarding"
import type { OffboardingCase, OffboardingReason } from "@/lib/types"

const REASONS = Object.keys(OFFBOARD_REASON_LABEL) as OffboardingReason[]

/** Opens an exit. The record moves to Serving notice and a case with its checklist is created. */
export function StartExitDialog({
  onClose,
  employeeId,
  reason: presetReason,
  lastWorkingDay: presetLast,
}: {
  onClose: () => void
  employeeId?: string
  reason?: OffboardingReason
  lastWorkingDay?: string
}) {
  const store = useStore()
  const { viewer, employees, offboarding } = store
  const withCase = new Set(
    offboarding.filter((c) => c.state !== "closed").map((c) => c.employeeId)
  )
  const eligible = visibleEmployees(viewer, employees).filter(
    (e) =>
      ["active", "probation", "on_leave", "suspended", "notice"].includes(
        e.lifecycleState
      ) && !withCase.has(e.id)
  )

  const [who, setWho] = React.useState(employeeId ?? eligible[0]?.id ?? "")
  const [reason, setReason] = React.useState<OffboardingReason>(
    presetReason ?? "resignation"
  )
  const [noticeOn, setNoticeOn] = React.useState(TODAY_ISO)
  const emp = store.employeeById(who)
  const [lastDay, setLastDay] = React.useState(
    presetLast ?? (emp ? defaultLastDay(emp, TODAY_ISO) : TODAY_ISO)
  )
  const [touched, setTouched] = React.useState(false)

  const errors = {
    who: who ? null : "Choose who is leaving.",
    lastDay:
      lastDay < noticeOn
        ? "The last day cannot be before notice was given."
        : null,
  }

  function pick(id: string) {
    setWho(id)
    const e = store.employeeById(id)
    if (e && !presetLast) setLastDay(defaultLastDay(e, noticeOn))
  }

  function save() {
    setTouched(true)
    if (errors.who || errors.lastDay) return
    const created = store.openOffboarding({
      employeeId: who,
      reason,
      noticeGivenOn: noticeOn,
      lastWorkingDay: lastDay,
    })
    if (!created) {
      toast.error("That person already has an open offboarding case.")
      return
    }
    toast.success(
      `Offboarding opened for ${fullName(emp)}. Case ${created.id}.`
    )
    onClose()
  }

  return (
    <FormDialog
      title="Start offboarding"
      description="Opens the clearance checklist. The record moves to Serving notice and payroll continues until the case is closed."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save}>
            Open case
          </Button>
        </>
      }
    >
      {eligible.length === 0 && !employeeId ? (
        <p className="text-sm text-muted-foreground">
          Everyone in your scope already has an open case.
        </p>
      ) : (
        <div className="space-y-4">
          <FormRow
            label="Employee"
            error={touched ? errors.who : null}
            htmlFor="exit-who"
          >
            <NativeSelect
              id="exit-who"
              value={who}
              disabled={!!employeeId}
              onChange={(e) => pick(e.target.value)}
            >
              {employeeId && emp && (
                <option value={emp.id}>
                  {fullName(emp)} — {emp.jobTitle}
                </option>
              )}
              {eligible.map((e) => (
                <option key={e.id} value={e.id}>
                  {fullName(e)} — {e.jobTitle}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          <FormRow label="Reason" htmlFor="exit-reason">
            <NativeSelect
              id="exit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as OffboardingReason)}
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {OFFBOARD_REASON_LABEL[r]}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormRow label="Notice given on" htmlFor="exit-notice">
              <Input
                id="exit-notice"
                type="date"
                value={noticeOn}
                onChange={(e) => {
                  setNoticeOn(e.target.value)
                  if (emp && !presetLast)
                    setLastDay(defaultLastDay(emp, e.target.value))
                }}
              />
            </FormRow>
            <FormRow
              label="Last working day"
              htmlFor="exit-last"
              error={touched ? errors.lastDay : null}
              hint={
                emp
                  ? `${emp.noticePeriodDays}-day notice period in their contract.`
                  : undefined
              }
            >
              <Input
                id="exit-last"
                type="date"
                value={lastDay}
                onChange={(e) => setLastDay(e.target.value)}
              />
            </FormRow>
          </div>
        </div>
      )}
    </FormDialog>
  )
}

export function ExitInterviewDialog({
  c,
  onClose,
}: {
  c: OffboardingCase
  onClose: () => void
}) {
  const store = useStore()
  const [on, setOn] = React.useState(c.exitInterviewOn ?? TODAY_ISO)
  const [notes, setNotes] = React.useState(c.exitNotes ?? "")
  const [touched, setTouched] = React.useState(false)
  const tooShort = notes.trim().length < 10

  function save() {
    setTouched(true)
    if (tooShort) return
    store.updateOffboarding(
      c.id,
      { exitInterviewDone: true, exitInterviewOn: on, exitNotes: notes.trim() },
      "Recorded an exit interview"
    )
    toast.success("Exit interview recorded.")
    onClose()
  }

  return (
    <FormDialog
      title="Exit interview"
      description="Why they are leaving, what went well, and what would have kept them. Kept with HR; not shown to the line manager."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save}>
            Save interview
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormRow label="Held on" htmlFor="ei-on">
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
          error={touched && tooShort ? "Write at least a sentence." : null}
        >
          <Textarea
            id="ei-notes"
            rows={6}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Main reason for leaving, feedback on the team and manager, anything the company should change."
          />
        </FormRow>
      </div>
    </FormDialog>
  )
}

export function HandoverDialog({
  c,
  onClose,
}: {
  c: OffboardingCase
  onClose: () => void
}) {
  const store = useStore()
  const leaver = store.employeeById(c.employeeId)
  const colleagues = store.employees.filter(
    (e) =>
      e.id !== c.employeeId &&
      ["active", "probation"].includes(e.lifecycleState) &&
      e.department === leaver?.department
  )
  const [to, setTo] = React.useState(c.handoverTo ?? colleagues[0]?.id ?? "")

  function save() {
    if (!to) return
    store.updateOffboarding(
      c.id,
      { handoverTo: to, clearance: { ...c.clearance, handover: true } },
      "Recorded a handover"
    )
    toast.success(`Handover to ${fullName(store.employeeById(to))} recorded.`)
    onClose()
  }

  return (
    <FormDialog
      title="Handover"
      description="Who picks up the work and the relationships. Their manager is told."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" disabled={!to} onClick={save}>
            Mark handover complete
          </Button>
        </>
      }
    >
      {colleagues.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nobody else in {leaver?.department} to hand over to.
        </p>
      ) : (
        <FormRow label="Handing over to" htmlFor="ho-to">
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
    </FormDialog>
  )
}

export function SettlementDialog({
  c,
  onClose,
}: {
  c: OffboardingCase
  onClose: () => void
}) {
  const store = useStore()
  const emp = store.employeeById(c.employeeId)
  const balance = store.leaveBalances.find((b) => b.employeeId === c.employeeId)
  const [v, setV] = React.useState<SettlementInputs>(
    c.settlement ?? defaultSettlement(c, balance)
  )
  if (!emp) return null
  const { lines, total } = settlementLines(emp, v)
  const owed = accruedLeaveDays(balance)

  function num(key: keyof SettlementInputs, raw: string) {
    setV((x) => ({ ...x, [key]: Math.max(0, Number(raw) || 0) }))
  }

  function save() {
    if (!emp) return
    store.updateOffboarding(
      c.id,
      {
        settlement: v,
        finalSettlement: total,
        clearance: { ...c.clearance, finance: true },
      },
      "Calculated the final settlement"
    )
    toast.success(`Final settlement of ${ghs(total)} calculated.`)
    onClose()
  }

  return (
    <FormDialog
      title="Final settlement"
      description="Gross, before PAYE and SSNIT. Payroll applies the statutory deductions when it runs the final pay."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save}>
            Save settlement
          </Button>
        </>
      }
    >
      <div className="space-y-4">
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
              value={v.salaryDays}
              onChange={(e) => num("salaryDays", e.target.value)}
            />
          </FormRow>
          <FormRow
            label="Leave days to pay"
            htmlFor="st-leave"
            hint={`${owed} accrued.`}
          >
            <Input
              id="st-leave"
              type="number"
              min={0}
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
              value={v.noticeInLieuDays}
              onChange={(e) => num("noticeInLieuDays", e.target.value)}
            />
          </FormRow>
        </div>
        <FormRow
          label="Recoveries (GHS)"
          htmlFor="st-ded"
          hint="Loans or unreturned property recovered from the final pay."
        >
          <Input
            id="st-ded"
            type="number"
            min={0}
            value={v.deductions}
            onChange={(e) => num("deductions", e.target.value)}
          />
        </FormRow>
        <FormRow label="Note for payroll" htmlFor="st-note">
          <Textarea
            id="st-note"
            rows={2}
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
      </div>
    </FormDialog>
  )
}

export function CloseDialog({
  c,
  onClose,
}: {
  c: OffboardingCase
  onClose: () => void
}) {
  const store = useStore()
  const emp = store.employeeById(c.employeeId)
  const end =
    c.reason === "retirement"
      ? "Retired"
      : c.reason === "resignation" || c.reason === "mutual"
        ? "Resigned"
        : "Terminated"
  return (
    <FormDialog
      title="Complete offboarding"
      description={`${fullName(emp)} moves to ${end}. This cannot be undone.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Not yet
          </Button>
          <Button
            size="lg"
            onClick={() => {
              store.closeOffboarding(c.id)
              toast.success(
                `${fullName(emp)} is now ${end.toLowerCase()}. Case closed.`
              )
              onClose()
            }}
          >
            Close case and mark {end.toLowerCase()}
          </Button>
        </>
      }
    >
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li>Self-service access and the employee directory entry end.</li>
        <li>
          They drop off headcount and are not included in the next payroll run
          beyond the final pay.
        </li>
        <li>
          The record, documents and audit trail stay for the statutory retention
          period.
        </li>
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Last working day {formatDate(c.lastWorkingDay)}
        {c.sentToPayrollOn &&
          `; final pay sent to payroll ${formatDate(c.sentToPayrollOn)}`}
        . This is logged with your name.
      </p>
    </FormDialog>
  )
}
