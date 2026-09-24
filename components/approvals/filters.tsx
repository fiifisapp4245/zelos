"use client"

import {
  FilterSearch,
  FilterToolbar,
  type FilterField,
  type FilterPatch,
} from "@/components/common/filter-bar"
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
  /** The unfiltered pool, so the menus only offer what is actually there. */
  items: ApprovalItem[]
  search: string
  onSearch: (v: string) => void
}) {
  const store = useStore()

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

  const fields: FilterField[] = [
    {
      kind: "select",
      key: "module",
      label: "Module",
      value: filters.module ?? "all",
      allLabel: "All modules",
      options: MODULES.map((m) => ({ value: m, label: MODULE_LABEL[m] })),
    },
    {
      kind: "select",
      key: "type",
      label: "Request type",
      value: filters.type ?? "all",
      allLabel: "All types",
      options: types.map((t) => ({ value: t, label: TYPE_LABEL[t] })),
    },
    {
      kind: "select",
      key: "requester",
      label: "Requester",
      value: filters.requester ?? "all",
      allLabel: "Anyone",
      options: requesters.map((r) => ({
        value: r,
        label: fullName(store.employeeById(r)),
      })),
    },
    {
      kind: "select",
      key: "unit",
      label: "Department",
      value: filters.unit ?? "all",
      allLabel: "All departments",
      options: units.map((u) => ({ value: u, label: u })),
    },
    { kind: "date", key: "from", label: "From", value: filters.from },
    { kind: "date", key: "to", label: "To", value: filters.to },
    {
      kind: "toggle",
      key: "overdueOnly",
      label: "Overdue only",
      value: Boolean(filters.overdueOnly),
      inline: true,
      tone: "danger",
    },
  ]

  const apply = (patch: FilterPatch) => {
    const next = { ...filters, ...patch } as ApprovalFilters
    // Changing module invalidates a type belonging to the old one.
    if ("module" in patch) next.type = "all"
    onChange(next)
  }

  return (
    <FilterToolbar
      fields={fields}
      onChange={apply}
      onClear={() => {
        onSearch("")
        onClear()
      }}
    >
      <FilterSearch
        value={search}
        onChange={onSearch}
        placeholder="Search by requester or summary"
      />
    </FilterToolbar>
  )
}
