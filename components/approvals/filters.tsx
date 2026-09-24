"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  APPROVAL_CHAINS,
  MODULE_LABEL,
  TYPE_LABEL,
} from "@/lib/approvals/approval-chains"
import type { ApprovalFilters } from "@/lib/approvals/selectors"
import type {
  ApprovalItem,
  ApprovalModule,
  ApprovalType,
} from "@/lib/approvals/types"
import { fullName } from "@/lib/format"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const MODULES = Object.keys(MODULE_LABEL) as ApprovalModule[]
const TYPES = Object.keys(APPROVAL_CHAINS) as ApprovalType[]

export function hasAnyFilter(f: ApprovalFilters) {
  return Boolean(
    (f.module && f.module !== "all") ||
    (f.type && f.type !== "all") ||
    (f.requester && f.requester !== "all") ||
    (f.unit && f.unit !== "all") ||
    f.from ||
    f.to ||
    f.overdueOnly
  )
}

/** Everything here is mirrored into the query string by the page. */
export function ApprovalFiltersBar({
  filters,
  onChange,
  onClear,
  items,
}: {
  filters: ApprovalFilters
  onChange: (next: ApprovalFilters) => void
  onClear: () => void
  /** The unfiltered pool, so the pickers only offer what is actually there. */
  items: ApprovalItem[]
}) {
  const store = useStore()
  const set = (patch: Partial<ApprovalFilters>) =>
    onChange({ ...filters, ...patch })

  const requesters = [...new Set(items.map((i) => i.requester))]
  const units = [
    ...new Set(
      items
        .map((i) => store.employeeById(i.subject)?.department)
        .filter(Boolean) as string[]
    ),
  ].sort()

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card px-4 py-3">
      <Picker
        label="Module"
        value={filters.module ?? "all"}
        onChange={(v) => set({ module: v as ApprovalModule | "all" })}
        options={[
          { value: "all", label: "All modules" },
          ...MODULES.map((m) => ({ value: m, label: MODULE_LABEL[m] })),
        ]}
      />
      <Picker
        label="Type"
        value={filters.type ?? "all"}
        onChange={(v) => set({ type: v as ApprovalType | "all" })}
        options={[
          { value: "all", label: "All types" },
          ...TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] })),
        ]}
      />
      <Picker
        label="Requester"
        value={filters.requester ?? "all"}
        onChange={(v) => set({ requester: v })}
        options={[
          { value: "all", label: "Anyone" },
          ...requesters.map((r) => ({
            value: r,
            label: fullName(store.employeeById(r)),
          })),
        ]}
      />
      <Picker
        label="Department"
        value={filters.unit ?? "all"}
        onChange={(v) => set({ unit: v })}
        options={[
          { value: "all", label: "All departments" },
          ...units.map((u) => ({ value: u, label: u })),
        ]}
      />

      <div>
        <Label htmlFor="from" className="mb-1.5 block text-xs font-medium">
          Submitted from
        </Label>
        <Input
          id="from"
          type="date"
          className="h-9 w-[150px]"
          value={filters.from ?? ""}
          onChange={(e) => set({ from: e.target.value || undefined })}
        />
      </div>
      <div>
        <Label htmlFor="to" className="mb-1.5 block text-xs font-medium">
          to
        </Label>
        <Input
          id="to"
          type="date"
          className="h-9 w-[150px]"
          value={filters.to ?? ""}
          onChange={(e) => set({ to: e.target.value || undefined })}
        />
      </div>

      <button
        type="button"
        aria-pressed={Boolean(filters.overdueOnly)}
        onClick={() => set({ overdueOnly: !filters.overdueOnly })}
        className={cn(
          "h-9 rounded-lg border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          filters.overdueOnly
            ? "border-destructive bg-danger-muted font-medium text-destructive"
            : "hover:bg-muted"
        )}
      >
        Overdue only
      </button>

      {hasAnyFilter(filters) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  )
}

function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
