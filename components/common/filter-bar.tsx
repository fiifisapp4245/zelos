"use client"

import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { cn } from "@/lib/utils"

export interface FilterOption {
  value: string
  label: string
}

/** One facet. `all` and an empty string both mean "not filtering". */
export type FilterField =
  | {
      kind: "select"
      key: string
      label: string
      value: string
      options: FilterOption[]
      /** The "no filter" entry, e.g. "All modules". */
      allLabel: string
    }
  | {
      kind: "multi"
      key: string
      label: string
      values: string[]
      options: FilterOption[]
    }
  | {
      kind: "date"
      key: string
      label: string
      value?: string
    }
  | {
      kind: "toggle"
      key: string
      label: string
      value: boolean
      /** Shown on the bar rather than inside the popover. */
      inline?: true
      tone?: "danger"
    }

export type FilterPatch = Record<
  string,
  string | string[] | boolean | undefined
>

/** Up to this many facets stay on the bar; more fold into the popover. */
const INLINE_LIMIT = 3

function isActive(f: FilterField) {
  if (f.kind === "select") return f.value !== "all" && f.value !== ""
  if (f.kind === "multi") return f.values.length > 0
  if (f.kind === "date") return Boolean(f.value)
  return f.value
}

/**
 * The one filter control in the product.
 *
 * Facets live behind a single button carrying a count, and whatever is
 * actually on shows as a chip you can take off — so the resting state is
 * one line however many facets a screen has, and the active state says
 * exactly what it is doing without opening anything.
 *
 * A toggle marked `inline` stays on the bar: one click, and usually the
 * one people reach for.
 */
export function FilterToolbar({
  fields,
  onChange,
  onClear,
  className,
  children,
}: {
  fields: FilterField[]
  onChange: (patch: FilterPatch) => void
  onClear: () => void
  className?: string
  /** Anything else for the bar, such as a search box. */
  children?: React.ReactNode
}) {
  const toggles = fields.filter((f) => f.kind === "toggle" && f.inline)
  const facets = fields.filter((f) => !(f.kind === "toggle" && f.inline))
  const active = fields.filter(isActive)

  // Three or fewer and each facet gets its own dropdown on the bar, where
  // it can be read and set in one click. Past that the bar would be a wall
  // of controls, so they fold into the Filters button and say what they
  // are doing through chips instead.
  const condensed = facets.length > INLINE_LIMIT

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}

      {condensed ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <SlidersHorizontal className="size-4" />
              Filters
              {active.length > 0 && (
                <span className="tabular ml-0.5 rounded-full bg-primary/15 px-1.5 text-xs font-medium text-primary">
                  {active.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[300px] space-y-3 p-4">
            {facets.map((f) => (
              <Field key={f.key} field={f} onChange={onChange} />
            ))}
          </PopoverContent>
        </Popover>
      ) : (
        facets.map((f) => (
          <InlineField key={f.key} field={f} onChange={onChange} />
        ))
      )}

      {toggles.map((f) =>
        f.kind === "toggle" ? (
          <button
            key={f.key}
            type="button"
            aria-pressed={f.value}
            onClick={() => onChange({ [f.key]: !f.value })}
            className={cn(
              "h-9 rounded-lg border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              f.value
                ? f.tone === "danger"
                  ? "border-destructive bg-danger-muted font-medium text-destructive"
                  : "border-primary bg-success-muted font-medium text-primary"
                : "bg-card hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ) : null
      )}

      {/* Chips exist to surface what the popover is hiding. An inline
          dropdown already shows its own value, so it needs none. */}
      {condensed && active.flatMap((f) => chipsFor(f, onChange))}

      {active.length > 0 && (
        <Button variant="ghost" size="sm" className="h-9" onClick={onClear}>
          Clear all
        </Button>
      )}
    </div>
  )
}

/** One facet as its own control on the bar. */
function InlineField({
  field,
  onChange,
}: {
  field: FilterField
  onChange: (p: FilterPatch) => void
}) {
  if (field.kind === "select") {
    return (
      <Select
        value={field.value}
        onValueChange={(v) => onChange({ [field.key]: v })}
      >
        <SelectTrigger
          aria-label={field.label}
          className={cn(
            "h-9 w-auto min-w-[150px]",
            isActive(field) && "border-primary text-primary"
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{field.allLabel}</SelectItem>
          {field.options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (field.kind === "multi") {
    const n = field.values.length
    const label =
      n === 0
        ? field.label
        : n === 1
          ? (field.options.find((o) => o.value === field.values[0])?.label ??
            field.values[0])
          : `${field.label}: ${n}`

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 justify-between gap-2 font-normal",
              n > 0 && "border-primary font-medium text-primary"
            )}
          >
            {label}
            <ChevronDown className="size-4 opacity-60" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-[320px] w-[240px] overflow-y-auto"
        >
          <DropdownMenuLabel>{field.label}</DropdownMenuLabel>
          {field.options.map((o) => (
            <DropdownMenuCheckboxItem
              key={o.value}
              checked={field.values.includes(o.value)}
              // Radix closes on select; a multi-select should not.
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={(on) =>
                onChange({
                  [field.key]: on
                    ? [...field.values, o.value]
                    : field.values.filter((x) => x !== o.value),
                })
              }
            >
              {o.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (field.kind === "date") {
    return (
      <Input
        type="date"
        aria-label={field.label}
        className={cn(
          "h-9 w-[150px]",
          field.value && "border-primary text-primary"
        )}
        value={field.value ?? ""}
        onChange={(e) => onChange({ [field.key]: e.target.value || undefined })}
      />
    )
  }

  return <Field field={field} onChange={onChange} />
}

/** The search box for a filter bar, so every screen's reads the same. */
export function FilterSearch({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative min-w-[200px] flex-1 sm:max-w-[320px]",
        className
      )}
    >
      <Search
        className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 pl-9"
      />
    </div>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove filter: ${label}`}
      className="flex h-9 items-center gap-1.5 rounded-lg border border-primary bg-success-muted px-3 text-sm text-primary transition-colors hover:bg-success-muted/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {label}
      <X className="size-3.5" aria-hidden />
    </button>
  )
}

function chipsFor(f: FilterField, onChange: (p: FilterPatch) => void) {
  if (f.kind === "select") {
    const label = f.options.find((o) => o.value === f.value)?.label ?? f.value
    return [
      <Chip
        key={f.key}
        label={label}
        onRemove={() => onChange({ [f.key]: "all" })}
      />,
    ]
  }
  if (f.kind === "multi") {
    return f.values.map((v) => (
      <Chip
        key={`${f.key}:${v}`}
        label={f.options.find((o) => o.value === v)?.label ?? v}
        onRemove={() => onChange({ [f.key]: f.values.filter((x) => x !== v) })}
      />
    ))
  }
  if (f.kind === "date") {
    return [
      <Chip
        key={f.key}
        label={`${f.label} ${f.value}`}
        onRemove={() => onChange({ [f.key]: undefined })}
      />,
    ]
  }
  // An inline toggle already reads as on; a second chip would repeat it.
  return []
}

function Field({
  field,
  onChange,
}: {
  field: FilterField
  onChange: (p: FilterPatch) => void
}) {
  if (field.kind === "select") {
    return (
      <div>
        <Label className="mb-1.5 block text-xs font-medium">
          {field.label}
        </Label>
        <Select
          value={field.value}
          onValueChange={(v) => onChange({ [field.key]: v })}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{field.allLabel}</SelectItem>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (field.kind === "multi") {
    return (
      <fieldset>
        <legend className="mb-1.5 text-xs font-medium">{field.label}</legend>
        <div className="max-h-[160px] space-y-1 overflow-y-auto">
          {field.options.map((o) => {
            const on = field.values.includes(o.value)
            return (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    onChange({
                      [field.key]: on
                        ? field.values.filter((x) => x !== o.value)
                        : [...field.values, o.value],
                    })
                  }
                  className="size-4 accent-primary"
                />
                {o.label}
              </label>
            )
          })}
        </div>
      </fieldset>
    )
  }

  if (field.kind === "date") {
    return (
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-10 shrink-0">{field.label}</span>
        <Input
          type="date"
          className="h-9 min-w-0 flex-1"
          value={field.value ?? ""}
          onChange={(e) =>
            onChange({ [field.key]: e.target.value || undefined })
          }
        />
      </label>
    )
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={field.value}
        onChange={() => onChange({ [field.key]: !field.value })}
        className="size-4 accent-primary"
      />
      {field.label}
    </label>
  )
}
