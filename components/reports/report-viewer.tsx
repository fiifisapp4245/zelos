"use client"

import * as React from "react"
import { Download, Lock, Save } from "lucide-react"
import { toast } from "sonner"

import { Panel } from "@/components/common"
import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormRow, NativeSelect } from "@/components/talent/form"
import { useStore } from "@/lib/store"
import { MIN_AGGREGATION_GROUP } from "@/lib/rbac"
import { TODAY_ISO } from "@/lib/format"
import {
  displayCell,
  runReport,
  toCsv,
  type ReportData,
  type ReportDef,
} from "@/lib/reports"
import { parseRecipients } from "@/lib/report-schedule"
import type { SavedReport } from "@/lib/types"
import { cn } from "@/lib/utils"

export function downloadText(
  filename: string,
  text: string,
  type = "text/csv"
) {
  // The BOM makes Excel read the file as UTF-8 rather than guessing.
  const blob = new Blob(["﻿", text], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function csvName(title: string) {
  return `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-${TODAY_ISO}.csv`
}

export function ReportViewer({
  def,
  data,
  options,
  onOptions,
}: {
  def: ReportDef
  data: ReportData
  options: Record<string, string>
  onOptions: (o: Record<string, string>) => void
}) {
  const store = useStore()
  const [saving, setSaving] = React.useState(false)
  const result = React.useMemo(
    () =>
      runReport(
        def.id,
        data,
        { viewer: store.viewer, today: TODAY_ISO },
        options
      ),
    [def.id, data, store.viewer, options]
  )
  if (!result) return null

  const barKey = result.bar?.value
  const max = barKey
    ? Math.max(1, ...result.rows.map((r) => Number(r[barKey]) || 0))
    : 1

  function exportCsv() {
    if (!result) return
    downloadText(csvName(def.title), toCsv(result, def.title, TODAY_ISO))
    toast.success(`${def.title} exported.`)
  }

  return (
    <Panel
      title={def.title}
      description={def.description}
      actions={
        <>
          <Button size="sm" variant="outline" onClick={() => setSaving(true)}>
            <Save className="size-3.5" />
            Save
          </Button>
          <Button
            size="sm"
            onClick={exportCsv}
            disabled={result.rows.length === 0}
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </>
      }
      className="min-w-0"
      bodyClassName="p-0"
    >
      {def.options.length > 0 && (
        <div className="flex flex-wrap gap-4 border-b px-5 py-3">
          {def.options.map((o) => (
            <label key={o.key} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{o.label}</span>
              <NativeSelect
                value={options[o.key] ?? o.default}
                onChange={(e) =>
                  onOptions({ ...options, [o.key]: e.target.value })
                }
                className="h-9 w-auto"
              >
                {o.choices.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
          ))}
        </div>
      )}

      <div className="flex flex-wrap border-b sm:divide-x">
        {result.summary.map((s) => (
          <div key={s.label} className="min-w-[160px] flex-1 px-5 py-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="tabular mt-1 text-xl font-semibold tracking-tight">
              {s.value}
            </p>
            {s.hint && (
              <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p>
            )}
          </div>
        ))}
      </div>

      {result.rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          {result.withheld > 0
            ? `Every group here is smaller than ${MIN_AGGREGATION_GROUP} people, so nothing can be shown without pointing to someone.`
            : "Nothing to report for this selection."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                {result.columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={cn(
                      "px-5 py-2.5 font-medium",
                      c.format && c.format !== "text" && "text-right"
                    )}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {result.rows.map((r, ri) => (
                <tr key={ri}>
                  {result.columns.map((c, ci) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-5 py-2.5",
                        c.format && c.format !== "text" && "tabular text-right"
                      )}
                    >
                      {ci === 0 && barKey ? (
                        <div>
                          <span>{displayCell(r[c.key], c.format)}</span>
                          <div className="mt-1 h-1 max-w-[220px] overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${((Number(r[barKey]) || 0) / max) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        displayCell(r[c.key], c.format)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(result.withheld > 0 || result.notes.length > 0) && (
        <div className="space-y-1.5 border-t px-5 py-3 text-xs text-muted-foreground">
          {result.withheld > 0 && (
            <p className="flex items-start gap-1.5">
              <Lock className="mt-0.5 size-3 shrink-0" />
              {result.withheld} group{result.withheld === 1 ? "" : "s"}{" "}
              withheld: fewer than {MIN_AGGREGATION_GROUP} people, so a figure
              could point to one person.
            </p>
          )}
          {result.notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      )}

      {saving && (
        <SaveDialog
          def={def}
          options={options}
          onClose={() => setSaving(false)}
        />
      )}
    </Panel>
  )
}

/** Saves a report, or edits how a saved one is delivered. */
export function SaveDialog({
  def,
  options,
  existing,
  onClose,
}: {
  def: ReportDef
  options: Record<string, string>
  existing?: SavedReport
  onClose: () => void
}) {
  const store = useStore()
  const me = store.employeeById(store.viewer.employeeId)
  const [name, setName] = React.useState(existing?.name ?? def.title)
  const [schedule, setSchedule] = React.useState<SavedReport["schedule"]>(
    existing?.schedule ?? "none"
  )
  const [to, setTo] = React.useState(
    (existing?.recipients ?? (me ? [me.email] : [])).join(", ")
  )
  const [touched, setTouched] = React.useState(false)
  const { ok: recipients, bad } = parseRecipients(to)
  const dup = store.savedReports.some(
    (r) =>
      r.id !== existing?.id &&
      r.name.trim().toLowerCase() === name.trim().toLowerCase()
  )
  const error = !name.trim()
    ? "Give the report a name."
    : dup
      ? "You already have a saved report with that name."
      : null
  const toError =
    bad.length > 0
      ? `${bad[0]} is not an email address.`
      : schedule !== "none" && recipients.length === 0
        ? "Add who it should be emailed to."
        : null

  return (
    <FormDialog
      title={existing ? "Edit saved report" : "Save this report"}
      description="Keeps the report with the choices you made. A repeating report is emailed as a CSV when it comes due."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={() => {
              setTouched(true)
              if (error || toError) return
              if (existing) {
                store.updateSavedReport(existing.id, {
                  name: name.trim(),
                  schedule,
                  recipients,
                })
                toast.success("Saved.")
              } else {
                store.saveReport({
                  reportId: def.id,
                  options,
                  name: name.trim(),
                  schedule,
                  recipients,
                })
                toast.success(`Saved as “${name.trim()}”.`)
              }
              onClose()
            }}
          >
            {existing ? "Save changes" : "Save report"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormRow label="Name" htmlFor="sv-name" error={touched ? error : null}>
          <Input
            id="sv-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormRow>
        <FormRow label="Repeat" htmlFor="sv-sched">
          <NativeSelect
            id="sv-sched"
            value={schedule}
            onChange={(e) =>
              setSchedule(e.target.value as SavedReport["schedule"])
            }
          >
            <option value="none">Do not repeat</option>
            <option value="weekly">Every week</option>
            <option value="monthly">Every month</option>
          </NativeSelect>
        </FormRow>
        <FormRow
          label="Email to"
          htmlFor="sv-to"
          error={touched ? toError : null}
          hint="One or more addresses, separated by commas. The file contains only what you can see."
        >
          <Input
            id="sv-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </FormRow>
      </div>
    </FormDialog>
  )
}
