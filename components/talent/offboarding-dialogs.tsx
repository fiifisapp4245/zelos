"use client"

import * as React from "react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormRow, NativeSelect } from "./form"
import { useStore } from "@/lib/store"
import {
  OFFBOARD_REASON_LABEL,
  TODAY_ISO,
  formatDate,
  fullName,
} from "@/lib/format"
import { visibleEmployees } from "@/lib/selectors"
import { defaultLastDay } from "@/lib/talent/offboarding"
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
