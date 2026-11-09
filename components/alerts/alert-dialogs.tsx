"use client"

import * as React from "react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormRow } from "@/components/talent/form"
import { useStore } from "@/lib/store"
import { TODAY_ISO, fullName } from "@/lib/format"
import { DEFAULT_ALERT_SETTINGS, LEAD_LIMITS, validLead } from "@/lib/alerts"
import type { Alert, AlertKind } from "@/lib/types"

export const KIND_LABEL: Record<AlertKind, string> = {
  contract_expiry: "Contract expiry",
  probation_end: "Probation ending",
  document_expiry: "Document expiring",
  retirement: "Retirement age",
}

export function AlertSettingsDialog({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const kinds = Object.keys(KIND_LABEL) as AlertKind[]
  const [lead, setLead] = React.useState<Record<AlertKind, string>>(
    Object.fromEntries(
      kinds.map((k) => [k, String(store.alertSettings.leadDays[k])])
    ) as Record<AlertKind, string>
  )
  const [touched, setTouched] = React.useState(false)
  const bad = kinds.filter((k) => !validLead(Number(lead[k])))

  return (
    <FormDialog
      title="Alert settings"
      description="How many days ahead each alert starts appearing. Alerts further out stay hidden until they come within range."
      onClose={onClose}
      footer={
        <>
          <Button
            variant="ghost"
            size="lg"
            className="mr-auto"
            onClick={() =>
              setLead(
                Object.fromEntries(
                  kinds.map((k) => [
                    k,
                    String(DEFAULT_ALERT_SETTINGS.leadDays[k]),
                  ])
                ) as Record<AlertKind, string>
              )
            }
          >
            Reset to defaults
          </Button>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={() => {
              setTouched(true)
              if (bad.length) return
              store.setAlertSettings({
                leadDays: Object.fromEntries(
                  kinds.map((k) => [k, Number(lead[k])])
                ) as Record<AlertKind, number>,
              })
              toast.success("Alert settings saved.")
              onClose()
            }}
          >
            Save settings
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {kinds.map((k) => (
          <FormRow
            key={k}
            label={KIND_LABEL[k]}
            htmlFor={`al-${k}`}
            hint="Days before the date."
            error={
              touched && bad.includes(k)
                ? `Between ${LEAD_LIMITS.min} and ${LEAD_LIMITS.max} whole days.`
                : null
            }
          >
            <Input
              id={`al-${k}`}
              type="number"
              min={LEAD_LIMITS.min}
              max={LEAD_LIMITS.max}
              value={lead[k]}
              onChange={(e) => setLead((x) => ({ ...x, [k]: e.target.value }))}
              className="max-w-[160px]"
            />
          </FormRow>
        ))}
      </div>
    </FormDialog>
  )
}

/** Tells each affected line manager what is coming up on their team. */
export function EmailManagersDialog({
  alerts,
  onClose,
}: {
  alerts: Alert[]
  onClose: () => void
}) {
  const store = useStore()
  const byManager = new Map<string, Alert[]>()
  for (const a of alerts) {
    const e = store.employeeById(a.employeeId)
    const m = e?.managerId
    if (!m) continue
    byManager.set(m, [...(byManager.get(m) ?? []), a])
  }
  const managers = [...byManager.entries()]
  const [note, setNote] = React.useState(
    "These dates are coming up on your team. Please tell HR how you want to handle each one."
  )

  return (
    <FormDialog
      title="Email line managers"
      description="Each manager gets one message listing only their own people."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            disabled={managers.length === 0}
            onClick={() => {
              managers.forEach(([id, list]) => {
                store.addNotification({
                  title: `${list.length} compliance date${list.length === 1 ? "" : "s"} on your team`,
                  body: `${note} (${list
                    .map(
                      (a) =>
                        `${fullName(store.employeeById(a.employeeId))}: ${KIND_LABEL[a.kind].toLowerCase()}`
                    )
                    .join("; ")})`,
                  kind: "alert",
                  href: "/alerts",
                })
                void id
              })
              store.setAlertSettings({ lastEmailedOn: TODAY_ISO })
              toast.success(
                `Sent to ${managers.length} line manager${managers.length === 1 ? "" : "s"}.`
              )
              onClose()
            }}
          >
            Send to {managers.length}
          </Button>
        </>
      }
    >
      {managers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          None of the open alerts belongs to someone with a line manager.
        </p>
      ) : (
        <div className="space-y-4">
          <FormRow label="Message" htmlFor="em-note">
            <Textarea
              id="em-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormRow>
          <ul className="divide-y rounded-lg border text-sm">
            {managers.map(([id, list]) => (
              <li key={id} className="px-4 py-3">
                <p className="font-medium">
                  {fullName(store.employeeById(id))}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {list.length} alert{list.length === 1 ? "" : "s"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {list
                    .map(
                      (a) =>
                        `${fullName(store.employeeById(a.employeeId))} (${KIND_LABEL[a.kind].toLowerCase()})`
                    )
                    .join(", ")}
                </p>
              </li>
            ))}
          </ul>
          {store.alertSettings.lastEmailedOn && (
            <p className="text-xs text-muted-foreground">
              Last sent {store.alertSettings.lastEmailedOn}.
            </p>
          )}
        </div>
      )}
    </FormDialog>
  )
}
