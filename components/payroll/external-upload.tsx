"use client"

import * as React from "react"
import { AlertTriangle, Download, Upload } from "lucide-react"
import { toast } from "sonner"

import { Panel, Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useStore } from "@/lib/store"
import {
  EXTERNAL_TEMPLATE_HEADERS,
  validateExternalImport,
  type ImportError,
} from "@/lib/pay/payroll"
import type { Employee } from "@/lib/types"
import type { PayrollRun } from "@/lib/pay/types"
import { fullName } from "@/lib/format"

/** The file a provider fills in, with this period's people already on it. */
export function templateFor(run: PayrollRun, members: Employee[]) {
  return [
    EXTERNAL_TEMPLATE_HEADERS.join(","),
    ...members.map((e) => `${e.id},,,`),
  ].join("\n")
}

function parse(text: string) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
  if (lines.length === 0) return []
  const [header, ...rows] = lines
  const hasHeader = header.toLowerCase().includes("employee")
  return (hasHeader ? rows : lines).map((row) => {
    const [employeeId, gross, deductions, net] = row
      .split(",")
      .map((c) => c.trim())
    return { employeeId, gross, deductions, net }
  })
}

/**
 * Where Zelos does not calculate, it checks.
 *
 * The provider's file is the source of the numbers, so the job here is
 * to refuse the ones that cannot be right — and to say which row and
 * why, rather than rejecting a file and leaving somebody to find it.
 */
export function ExternalUpload({
  run,
  members,
  canEdit,
}: {
  run: PayrollRun
  members: Employee[]
  canEdit: boolean
}) {
  const store = useStore()
  const [text, setText] = React.useState("")
  const [errors, setErrors] = React.useState<ImportError[] | null>(null)

  const template = templateFor(run, members)

  function download() {
    const blob = new Blob([template], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${run.id}-template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function check() {
    const result = validateExternalImport(
      parse(text),
      members.map((e) => e.id)
    )
    setErrors(result.errors)
    if (result.errors.length === 0) {
      store.importExternalResults(run.id, result.valid)
      toast.success(`${result.valid.length} lines uploaded and checked`)
    }
  }

  return (
    <Panel
      title="Upload results"
      description="This pay group is calculated by your local provider. Download the template, send it to them, and upload what comes back."
      actions={
        <Pill tone="neutral">
          {members.length} {members.length === 1 ? "person" : "people"} in this
          period
        </Pill>
      }
    >
      <div className="space-y-4">
        <Button variant="outline" size="sm" className="h-9" onClick={download}>
          <Download className="size-4" />
          Download template
        </Button>

        <div>
          <Label htmlFor="csv" className="mb-1.5 block">
            Paste the returned file
          </Label>
          <Textarea
            id="csv"
            rows={6}
            className="font-mono text-xs"
            value={text}
            disabled={!canEdit}
            onChange={(e) => setText(e.target.value)}
            placeholder={`${EXTERNAL_TEMPLATE_HEADERS.join(",")}\n${members[0]?.id ?? "employee_id"},1150000,287500,862500`}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Gross less deductions has to equal net on every row, and everybody
            in the group has to be on the file.
          </p>
        </div>

        {errors && errors.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-destructive">
            <p className="flex items-center gap-2 border-b border-destructive bg-danger-muted px-3 py-2 text-sm font-medium text-destructive">
              <AlertTriangle className="size-4" aria-hidden />
              {errors.length} {errors.length === 1 ? "row" : "rows"} cannot be
              accepted
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  {["Row", "Employee", "Problem"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:pl-4 last:pr-4"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {errors.map((e, i) => (
                  <tr key={i}>
                    <td className="tabular py-2 pl-4">
                      {e.row === 0 ? "—" : e.row}
                    </td>
                    <td className="px-3">
                      {fullName(store.employeeById(e.employeeId)) !== "—"
                        ? fullName(store.employeeById(e.employeeId))
                        : e.employeeId}
                    </td>
                    <td className="px-3 py-2 pr-4 text-muted-foreground">
                      {e.problem}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canEdit && (
          <Button disabled={text.trim() === ""} onClick={check}>
            <Upload className="size-4" />
            Check and upload
          </Button>
        )}
      </div>
    </Panel>
  )
}
