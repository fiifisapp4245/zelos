"use client"

import { Search } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/**
 * The filter pattern from the employee directory, shared so every list in
 * the product filters the same way: a dashed chip per facet that fills in
 * and carries a count once it is doing something.
 */
export function FilterMenu({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  const count = selected.length
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-xs transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            count > 0
              ? "border-primary bg-success-muted font-medium text-primary"
              : "text-muted-foreground hover:border-ring/50 hover:text-foreground"
          )}
        >
          + {label}
          {count > 0 && (
            <span className="tabular rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
              {count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[320px] overflow-y-auto"
      >
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={selected.includes(o.value)}
            onCheckedChange={() => onToggle(o.value)}
            // Keeps the menu open, so several can be picked at once.
            onSelect={(e) => e.preventDefault()}
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** A single-choice chip, for a facet where only one value makes sense. */
export function FilterChoice({
  label,
  value,
  options,
  onChange,
  allLabel = "Any",
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  allLabel?: string
}) {
  const active = value !== "all"
  const current = options.find((o) => o.value === value)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-xs transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            active
              ? "border-primary bg-success-muted font-medium text-primary"
              : "text-muted-foreground hover:border-ring/50 hover:text-foreground"
          )}
        >
          + {label}
          {active && (
            <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
              {current?.label ?? value}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[320px] overflow-y-auto"
      >
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={value === "all"}
          onCheckedChange={() => onChange("all")}
        >
          {allLabel}
        </DropdownMenuCheckboxItem>
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={value === o.value}
            onCheckedChange={() => onChange(o.value)}
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The search row: search, then whatever controls the list needs. */
export function FilterSearchRow({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b p-3">
      <div className="relative min-w-[260px] flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-10 w-full rounded-lg border bg-background pr-3 pl-9 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </div>
      {children}
    </div>
  )
}

/** The chip row beneath it. */
export function FilterChipRow({
  children,
  onClear,
  showClear,
}: {
  children: React.ReactNode
  onClear?: () => void
  showClear?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
      <span className="mr-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        Filters
      </span>
      {children}
      {showClear && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="ml-1 rounded text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
