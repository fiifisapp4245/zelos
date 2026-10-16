"use client"

import * as React from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  UsersRound,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Panel, Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import {
  EXTERNAL_TEMPLATE_HEADERS,
  validateExternalImport,
  type ImportRow,
} from "@/lib/pay/payroll"
import { ROLE_LABEL } from "@/lib/rbac"
import type { Employee } from "@/lib/types"
import type { PayrollRun } from "@/lib/pay/types"
import { fullName } from "@/lib/format"
import { cn } from "@/lib/utils"

/** The file a provider fills in, with this period's people already on it. */
export function templateFor(run: PayrollRun, members: Employee[]) {
  return [
    EXTERNAL_TEMPLATE_HEADERS.join(","),
    ...members.map((e) => `${e.id},,,`),
  ].join("\n")
}

function parse(text: string): ImportRow[] {
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

interface PreviewRow {
  key: string
  row: number
  employeeId: string
  name: string
  gross?: string | number
  deductions?: string | number
  net?: string | number
  problem?: string
}

/**
 * Every line the file is checked against, in one table: the ones that
 * matched sit beside the ones that did not, so a problem reads next to
 * the row it is in rather than in a list apart from it.
 */
function buildPreview(
  rows: ImportRow[],
  errors: { row: number; employeeId: string; problem: string }[],
  employeeName: (id: string) => string
): PreviewRow[] {
  const problemByRow = new Map(
    errors.filter((e) => e.row > 0).map((e) => [e.row, e.problem])
  )
  const fileRows: PreviewRow[] = rows.map((r, i) => {
    const row = i + 1
    const id = String(r.employeeId ?? "").trim()
    return {
      key: `row-${row}`,
      row,
      employeeId: id,
      name: id ? employeeName(id) : "—",
      gross: r.gross,
      deductions: r.deductions,
      net: r.net,
      problem: problemByRow.get(row),
    }
  })
  const missing: PreviewRow[] = errors
    .filter((e) => e.row === 0)
    .map((e) => ({
      key: `missing-${e.employeeId}`,
      row: 0,
      employeeId: e.employeeId,
      name: employeeName(e.employeeId),
      problem: e.problem,
    }))
  return [...fileRows, ...missing]
}

/**
 * Where Zelos does not calculate, it checks.
 *
 * The provider's file is the source of the numbers, so the job here is
 * to refuse the ones that cannot be right — and to show every row next
 * to its own verdict, rather than rejecting a file and leaving somebody
 * to find which line it was.
 */
export function ExternalUpload({
  run,
  members,
  isPreparer,
  settled,
}: {
  run: PayrollRun
  members: Employee[]
  isPreparer: boolean
  settled: boolean
}) {
  const store = useStore()
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [rows, setRows] = React.useState<ImportRow[]>([])
  const [dragOver, setDragOver] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const canEdit = isPreparer && !settled

  const employeeName = (id: string) => {
    const name = fullName(store.employeeById(id))
    return name !== "—" ? name : id
  }

  const template = templateFor(run, members)
  const { valid, errors } = validateExternalImport(
    rows,
    members.map((e) => e.id)
  )
  const preview = buildPreview(rows, errors, employeeName)

  function download() {
    const blob = new Blob([template], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${run.id}-template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function loadFile(file: File) {
    const text = await file.text()
    setFileName(file.name)
    setRows(parse(text))
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (!canEdit) return
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }

  function confirm() {
    store.importExternalResults(run.id, valid)
    toast.success(`${valid.length} lines uploaded and checked`)
  }

  return (
    <Panel
      title="Upload results"
      description="This pay group is calculated by your local provider. Download the template, send it to them, and drop what comes back here."
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

        {!canEdit ? (
          <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
            {settled ? (
              <p>This run is already settled, so nothing more is uploaded.</p>
            ) : (
              <>
                <p>
                  Only the Payroll role uploads results. You are viewing as{" "}
                  <strong className="font-medium text-foreground">
                    {ROLE_LABEL[store.activeRole]}
                  </strong>
                  .
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 h-8"
                  onClick={() => store.setActiveRole("payroll")}
                >
                  <UsersRound className="size-3.5" />
                  Switch to Payroll
                </Button>
              </>
            )}
          </div>
        ) : fileName === null ? (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
              dragOver
                ? "border-primary bg-success-muted"
                : "hover:bg-muted/40"
            )}
          >
            <FileSpreadsheet
              className="size-8 text-muted-foreground"
              aria-hidden
            />
            <p className="text-sm font-medium">
              Drag the file your provider returned here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              The template you downloaded, filled in — gross, deductions and
              net for everybody in this period.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) loadFile(file)
                e.target.value = ""
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 px-3 py-2">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <FileSpreadsheet
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="truncate font-medium">{fileName}</span>
                <span className="text-muted-foreground">
                  · {rows.length} {rows.length === 1 ? "line" : "lines"}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => {
                  setFileName(null)
                  setRows([])
                }}
              >
                <X className="size-3.5" />
                Replace file
              </Button>
            </div>

            {errors.length > 0 && (
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="size-4" aria-hidden />
                {errors.length} {errors.length === 1 ? "row" : "rows"} cannot
                be accepted
              </p>
            )}

            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    {["Row", "Employee", "Gross", "Deductions", "Net", ""].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:pl-4 last:pr-4"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.map((p) => (
                    <tr
                      key={p.key}
                      className={p.problem ? "bg-danger-muted/40" : undefined}
                    >
                      <td className="tabular py-2 pl-4 text-muted-foreground">
                        {p.row === 0 ? "—" : p.row}
                      </td>
                      <td className="px-3">{p.name}</td>
                      <td className="tabular px-3">{p.gross ?? "—"}</td>
                      <td className="tabular px-3">{p.deductions ?? "—"}</td>
                      <td className="tabular px-3">{p.net ?? "—"}</td>
                      <td className="px-3 py-2 pr-4">
                        {p.problem ? (
                          <span className="flex items-center gap-1.5 text-xs text-destructive">
                            <AlertTriangle className="size-3.5 shrink-0" />
                            {p.problem}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                            Matches
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <Button disabled={errors.length > 0} onClick={confirm}>
                <Upload className="size-4" />
                Upload {valid.length} {valid.length === 1 ? "line" : "lines"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
