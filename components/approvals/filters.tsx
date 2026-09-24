"use client"

import {
  FilterChipRow,
  FilterChoice,
  FilterSearchRow,
} from "@/components/common/filter-bar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  APPROVAL_CHAINS,
  APPROVAL_MODULE,
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
const ALL_TYPES = Object.keys(APPROVAL_CHAINS) as ApprovalType[]

export function hasAnyFilter(f: ApprovalFilters) {
  return activeCount(f) > 0
}

function activeCount(f: ApprovalFilters) {
  return [
    f.module && f.module !== "all",
    f.type && f.type !== "all",
    f.requester && f.requester !== "all",
    f.unit && f.unit !== "all",
    f.from,
    f.to,
    f.overdueOnly,
  ].filter(Boolean).length
}

/**
 * The same filter bar the employee directory uses: search on top, a dashed
 * chip per facet beneath that fills in and names its value once set.
 */
export function ApprovalFiltersBar({
  filters,
  onChange,
  onClear,
  items,
  search,
  onSearch,
}: {
  filters: ApprovalFilters
  onChange: (next: ApprovalFilters) => void
  onClear: () => void
  /** The unfiltered pool, so the chips only offer what is actually there. */
  items: ApprovalItem[]
  search: string
  onSearch: (v: string) => void
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

  // Twenty-six types is a menu nobody reads. Once a module is chosen, only
  // its own types are offered.
  const types =
    filters.module && filters.module !== "all"
      ? ALL_TYPES.filter((t) => APPROVAL_MODULE[t] === filters.module)
      : ALL_TYPES

  return (
    <div className="rounded-xl border bg-card">
      <FilterSearchRow
        value={search}
        onChange={onSearch}
        placeholder="Search by requester or summary"
      >
        <button
          type="button"
          aria-pressed={Boolean(filters.overdueOnly)}
          onClick={() => set({ overdueOnly: !filters.overdueOnly })}
          className={cn(
            "h-10 rounded-lg border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            filters.overdueOnly
              ? "border-destructive bg-danger-muted font-medium text-destructive"
              : "hover:bg-muted"
          )}
        >
          Overdue only
        </button>
      </FilterSearchRow>

      <FilterChipRow
        showClear={activeCount(filters) > 0 || search !== ""}
        onClear={() => {
          onSearch("")
          onClear()
        }}
      >
        <FilterChoice
          label="Module"
          value={filters.module ?? "all"}
          // Changing module invalidates a type from the old one.
          onChange={(v) =>
            set({ module: v as ApprovalModule | "all", type: "all" })
          }
          options={MODULES.map((m) => ({ value: m, label: MODULE_LABEL[m] }))}
          allLabel="All modules"
        />
        <FilterChoice
          label="Type"
          value={filters.type ?? "all"}
          onChange={(v) => set({ type: v as ApprovalType | "all" })}
          options={types.map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
          allLabel="All types"
        />
        <FilterChoice
          label="Requester"
          value={filters.requester ?? "all"}
          onChange={(v) => set({ requester: v })}
          options={requesters.map((r) => ({
            value: r,
            label: fullName(store.employeeById(r)),
          }))}
          allLabel="Anyone"
        />
        <FilterChoice
          label="Department"
          value={filters.unit ?? "all"}
          onChange={(v) => set({ unit: v })}
          options={units.map((u) => ({ value: u, label: u }))}
          allLabel="All departments"
        />

        <span className="ml-auto flex items-center gap-2">
          <Label htmlFor="from" className="text-xs text-muted-foreground">
            Submitted
          </Label>
          <Input
            id="from"
            type="date"
            aria-label="Submitted from"
            className="h-8 w-[140px]"
            value={filters.from ?? ""}
            onChange={(e) => set({ from: e.target.value || undefined })}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="Submitted to"
            className="h-8 w-[140px]"
            value={filters.to ?? ""}
            onChange={(e) => set({ to: e.target.value || undefined })}
          />
        </span>
      </FilterChipRow>
    </div>
  )
}
