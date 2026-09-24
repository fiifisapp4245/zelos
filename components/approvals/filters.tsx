"use client"

import { SlidersHorizontal, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { formatDate, fullName } from "@/lib/format"
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
 * Seven controls sitting open wrapped onto two rows and pushed the queue
 * down the page. They live behind one button now, and whatever is actually
 * on shows as a chip you can take off — so the resting state is one line and
 * the active state says exactly what it is doing.
 *
 * Overdue stays outside the popover: it is one click, and it is the filter
 * people reach for most.
 */
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

  const count = activeCount(filters)

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

  const chips: {
    key: string
    label: string
    clear: Partial<ApprovalFilters>
  }[] = []
  if (filters.module && filters.module !== "all")
    chips.push({
      key: "module",
      label: MODULE_LABEL[filters.module],
      clear: { module: "all", type: "all" },
    })
  if (filters.type && filters.type !== "all")
    chips.push({
      key: "type",
      label: TYPE_LABEL[filters.type],
      clear: { type: "all" },
    })
  if (filters.requester && filters.requester !== "all")
    chips.push({
      key: "requester",
      label: fullName(store.employeeById(filters.requester)),
      clear: { requester: "all" },
    })
  if (filters.unit && filters.unit !== "all")
    chips.push({ key: "unit", label: filters.unit, clear: { unit: "all" } })
  if (filters.from)
    chips.push({
      key: "from",
      label: `From ${formatDate(filters.from)}`,
      clear: { from: undefined },
    })
  if (filters.to)
    chips.push({
      key: "to",
      label: `To ${formatDate(filters.to)}`,
      clear: { to: undefined },
    })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <SlidersHorizontal className="size-4" />
            Filters
            {count > 0 && (
              <span className="tabular ml-0.5 rounded-full bg-primary/15 px-1.5 text-xs font-medium text-primary">
                {count}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[300px] space-y-3 p-4">
          <Picker
            label="Module"
            value={filters.module ?? "all"}
            // Changing module invalidates a type from the old one.
            onChange={(v) =>
              set({ module: v as ApprovalModule | "all", type: "all" })
            }
            options={[
              { value: "all", label: "All modules" },
              ...MODULES.map((m) => ({ value: m, label: MODULE_LABEL[m] })),
            ]}
          />
          <Picker
            label="Request type"
            value={filters.type ?? "all"}
            onChange={(v) => set({ type: v as ApprovalType | "all" })}
            options={[
              { value: "all", label: "All types" },
              ...types.map((t) => ({ value: t, label: TYPE_LABEL[t] })),
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

          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-xs font-medium">Submitted</legend>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-10 shrink-0">From</span>
              <Input
                type="date"
                className="h-9 min-w-0 flex-1"
                value={filters.from ?? ""}
                onChange={(e) => set({ from: e.target.value || undefined })}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-10 shrink-0">To</span>
              <Input
                type="date"
                className="h-9 min-w-0 flex-1"
                value={filters.to ?? ""}
                onChange={(e) => set({ to: e.target.value || undefined })}
              />
            </label>
          </fieldset>
        </PopoverContent>
      </Popover>

      <button
        type="button"
        aria-pressed={Boolean(filters.overdueOnly)}
        onClick={() => set({ overdueOnly: !filters.overdueOnly })}
        className={cn(
          "h-9 rounded-lg border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          filters.overdueOnly
            ? "border-destructive bg-danger-muted font-medium text-destructive"
            : "bg-card hover:bg-muted"
        )}
      >
        Overdue only
      </button>

      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => set(c.clear)}
          aria-label={`Remove filter: ${c.label}`}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-primary bg-success-muted px-3 text-sm text-primary transition-colors hover:bg-success-muted/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {c.label}
          <X className="size-3.5" />
        </button>
      ))}

      {count > 0 && (
        <Button variant="ghost" size="sm" className="h-9" onClick={onClear}>
          Clear all
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
        <SelectTrigger className="h-9 w-full">
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
