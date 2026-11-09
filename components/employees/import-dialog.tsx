"use client"

import * as React from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { FilePicker } from "@/components/common/file-picker"
import { downloadText } from "@/components/reports/report-viewer"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import {
  employeeFromRow,
  templateCsv,
  validateImport,
  type ImportResult,
} from "@/lib/employees-import"

/** Bulk-creates pre-hire records from a CSV, showing every problem before anything is saved. */
export function ImportEmployeesDialog({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const [files, setFiles] = React.useState<File[]>([])
  const [result, setResult] = React.useState<ImportResult | null>(null)

  async function pick(f: File[]) {
    setFiles(f)
    if (!f[0]) return setResult(null)
    const text = await f[0].text()
    setResult(
      validateImport(text, {
        departments: store.departments,
        branches: store.branches,
        existing: store.employees,
      })
    )
  }

  const good = result?.rows.filter((r) => r.errors.length === 0) ?? []
  const bad = result?.rows.filter((r) => r.errors.length > 0) ?? []

  function run() {
    const taken = new Set(store.employees.map((e) => e.id))
    good.forEach((r) => store.addEmployee(employeeFromRow(r, taken)))
    toast.success(
      `${good.length} pre-hire record${good.length === 1 ? "" : "s"} created.${bad.length ? ` ${bad.length} skipped.` : ""}`
    )
    onClose()
  }

  return (
    <FormDialog
      title="Import employees"
      description="Creates pre-hire records. Nothing is saved until you have seen what will happen to every row."
      width="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" disabled={good.length === 0} onClick={run}>
            Import {good.length || ""}
            {bad.length > 0 && ` (skip ${bad.length})`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Use the Zelos template.</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadText("zelos-employee-import-template.csv", templateCsv())
            }
          >
            <Download className="size-3.5" />
            Download template
          </Button>
        </div>
        <FilePicker
          files={files}
          onChange={pick}
          multiple={false}
          extensions={["csv"]}
        />
        {result?.fileError && (
          <p role="alert" className="text-sm text-destructive">
            {result.fileError}
          </p>
        )}
        {result && !result.fileError && (
          <div className="space-y-3">
            <p className="text-sm">
              <strong className="font-medium">{good.length}</strong> ready ·{" "}
              <strong className="font-medium">{bad.length}</strong> with
              problems
            </p>
            {bad.length > 0 && (
              <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3 text-sm">
                {bad.map((r) => (
                  <li key={r.line}>
                    <p className="font-medium">
                      Row {r.line}: {r.values["First name"]}{" "}
                      {r.values["Last name"]}
                    </p>
                    <ul className="ml-4 list-disc text-xs text-destructive">
                      {r.errors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </FormDialog>
  )
}
