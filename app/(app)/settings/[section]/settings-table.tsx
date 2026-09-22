"use client"

import * as React from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Panel, Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useStore } from "@/lib/store"
import {
  TABLE_SPECS,
  type ColumnSpec,
  type TableRow,
  type TableSpec,
} from "@/lib/data/settings-tables"
import { cn } from "@/lib/utils"

/**
 * One editable settings table, rendered entirely from its spec: the columns,
 * the add/edit form and the delete confirmation all come from the same place.
 */
export function SettingsTable({ tableId }: { tableId: string }) {
  const store = useStore()
  const spec = TABLE_SPECS[tableId]
  const rows = store.tables[tableId] ?? []

  const [editing, setEditing] = React.useState<TableRow | "new" | null>(null)
  const [deleting, setDeleting] = React.useState<TableRow | null>(null)

  if (!spec) return null

  const canAdd = spec.canAdd !== false
  const canDelete = spec.canDelete !== false
  const shown = spec.columns.filter((c) => !c.formOnly)

  return (
    <Panel
      title={spec.title}
      description={spec.description}
      bodyClassName="p-0"
      actions={
        canAdd && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="size-3.5" />
            {spec.addLabel ?? "Add row"}
          </Button>
        )
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="Nothing configured yet"
          description={`Add the first entry to ${spec.title.toLowerCase()}.`}
          action={
            canAdd && (
              <Button variant="outline" onClick={() => setEditing("new")}>
                {spec.addLabel ?? "Add row"}
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                {shown.map((c, i) => (
                  <th
                    key={c.key}
                    className={cn(
                      "px-3 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
                      i === 0 && "pl-5"
                    )}
                  >
                    {c.label}
                  </th>
                ))}
                <th className="w-24 py-2.5 pr-5 text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="group transition-colors hover:bg-muted/30">
                  {shown.map((c, i) => (
                    <td
                      key={c.key}
                      className={cn("px-3 py-2.5 align-top", i === 0 && "pl-5 font-medium")}
                    >
                      <CellValue column={c} value={row[c.key]} />
                    </td>
                  ))}
                  <td className="py-2.5 pr-5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(row)}
                        aria-label={`Edit ${row[spec.labelKey]}`}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleting(row)}
                          aria-label={`Delete ${row[spec.labelKey]}`}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {spec.footnote && (
        <p className="border-t px-5 py-3 text-xs text-muted-foreground">{spec.footnote}</p>
      )}

      {editing && (
        <RowSheet
          spec={spec}
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <DeleteDialog spec={spec} row={deleting} onClose={() => setDeleting(null)} />
      )}
    </Panel>
  )
}

function CellValue({
  column,
  value,
}: {
  column: ColumnSpec
  value: string | number | boolean | undefined
}) {
  if (column.type === "toggle") {
    return value ? <Pill tone="success">Yes</Pill> : <Pill tone="neutral">No</Pill>
  }
  const text = String(value ?? "—")
  const tone = column.tone?.[text]
  if (tone) return <Pill tone={tone}>{text}</Pill>
  return <span className={cn(column.mono && "font-mono text-xs")}>{text}</span>
}

/** Mounted only while open, so the form seeds fresh each time. */
function RowSheet({
  spec,
  row,
  onClose,
}: {
  spec: TableSpec
  row: TableRow | null
  onClose: () => void
}) {
  const store = useStore()
  const isNew = row === null

  const [values, setValues] = React.useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(
      spec.columns.map((c) => [
        c.key,
        row
          ? c.type === "toggle"
            ? Boolean(row[c.key])
            : String(row[c.key] ?? "")
          : c.type === "toggle"
            ? false
            : c.type === "select"
              ? (c.options?.[0] ?? "")
              : "",
      ])
    )
  )

  function set(key: string, v: string | boolean) {
    setValues((s) => ({ ...s, [key]: v }))
  }

  function save() {
    const missing = spec.columns.find(
      (c) => c.required && !String(values[c.key] ?? "").trim()
    )
    if (missing) {
      toast.error(`${missing.label} is required.`)
      return
    }

    const payload = Object.fromEntries(
      spec.columns.map((c) => [
        c.key,
        c.type === "toggle"
          ? Boolean(values[c.key])
          : c.type === "number"
            ? Number(values[c.key]) || 0
            : String(values[c.key] ?? "").trim(),
      ])
    )

    const name = String(payload[spec.labelKey] ?? "Row")
    if (isNew) {
      store.addTableRow(spec.id, payload as Omit<TableRow, "id">)
      toast.success(`${name} added. Recorded in the audit log.`)
    } else {
      store.updateTableRow(spec.id, row.id, payload as Partial<TableRow>)
      toast.success(`${name} updated. Recorded in the audit log.`)
    }
    onClose()
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex w-full flex-col sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>
            {isNew ? (spec.addLabel ?? "Add row") : `Edit ${row[spec.labelKey]}`}
          </SheetTitle>
          <SheetDescription>
            {spec.title}. Every change is written to the audit log against your name.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          {spec.columns.map((c) => (
            <div key={c.key}>
              {c.type === "toggle" ? (
                <div className="flex items-center justify-between gap-6 rounded-lg border px-3.5 py-3">
                  <Label htmlFor={c.key} className="text-sm">
                    {c.label}
                  </Label>
                  <Switch
                    id={c.key}
                    checked={Boolean(values[c.key])}
                    onCheckedChange={(v) => set(c.key, v)}
                  />
                </div>
              ) : (
                <>
                  <Label htmlFor={c.key} className="mb-1.5 block text-sm">
                    {c.label}
                    {c.required && <span className="ml-0.5 text-destructive">*</span>}
                  </Label>
                  {c.type === "select" ? (
                    <select
                      id={c.key}
                      value={String(values[c.key] ?? "")}
                      onChange={(e) => set(c.key, e.target.value)}
                      className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
                    >
                      {c.options?.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={c.key}
                      type={c.type === "number" ? "number" : "text"}
                      value={String(values[c.key] ?? "")}
                      onChange={(e) => set(c.key, e.target.value)}
                      className="h-10"
                    />
                  )}
                </>
              )}
              {c.hint && <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>}
            </div>
          ))}
        </div>

        <SheetFooter>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save}>
            {isNew ? "Add" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function DeleteDialog({
  spec,
  row,
  onClose,
}: {
  spec: TableSpec
  row: TableRow
  onClose: () => void
}) {
  const store = useStore()
  const name = String(row[spec.labelKey] ?? "this row")

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Remove {name}?</DialogTitle>
          <DialogDescription>
            It will be taken out of {spec.title.toLowerCase()}. The removal is written to
            the audit log, so the change stays traceable.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="lg"
            onClick={() => {
              store.deleteTableRow(spec.id, row.id)
              toast.success(`${name} removed.`)
              onClose()
            }}
          >
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
