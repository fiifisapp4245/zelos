"use client"

import * as React from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/** One label-and-control row, so every form in Talent lines up the same way. */
export function FormRow({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
}: {
  label: string
  hint?: React.ReactNode
  error?: string | null
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export const SELECT_CLASS =
  "h-10 w-full max-w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-60"

export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return <select {...props} className={cn(SELECT_CLASS, className)} />
}

/** A 1–5 picker that reads as buttons, with the meaning of each point on hover. */
export function ScorePicker({
  value,
  onChange,
  labels,
  disabled,
  label,
}: {
  value: number | null
  onChange: (n: number) => void
  labels?: Record<number, string>
  disabled?: boolean
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={labels?.[n] ? `${n} — ${labels[n]}` : String(n)}
          title={labels?.[n]}
          disabled={disabled}
          onClick={() => onChange(n)}
          className={cn(
            "tabular grid size-9 place-items-center rounded-lg border text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
            value === n
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-background hover:bg-muted"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
