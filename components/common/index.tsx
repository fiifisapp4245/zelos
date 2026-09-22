"use client"

import * as React from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { initials } from "@/lib/format"
import type { Employee } from "@/lib/types"

export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  meta?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {meta && <div className="mt-2">{meta}</div>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}

export type Tone =
  "neutral" | "success" | "warning" | "danger" | "info" | "primary"

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-neutral-muted text-muted-foreground",
  success: "bg-success-muted text-primary",
  warning: "bg-warning-muted text-warning-foreground",
  danger: "bg-danger-muted text-destructive",
  info: "bg-info-muted text-info",
  primary: "bg-primary text-primary-foreground",
}

export function Pill({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: React.ReactNode
  tone?: Tone
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function Initials({
  person,
  size = "md",
  className,
}: {
  person:
    | Employee
    | { firstName: string; lastName: string; avatarTone?: string }
    | string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
}) {
  const sizes = {
    xs: "size-6 text-[10px]",
    sm: "size-7 text-[11px]",
    md: "size-9 text-xs",
    lg: "size-12 text-sm",
    xl: "size-20 text-2xl",
  }
  const tone =
    typeof person === "string"
      ? "bg-muted-foreground"
      : (person.avatarTone ?? "bg-muted-foreground")
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-white",
        sizes[size],
        tone,
        className
      )}
    >
      {initials(person)}
    </span>
  )
}

/**
 * Metric cards are deliberately uniform — one white surface, one text colour.
 * Severity is carried by the hint line and by the lists underneath, not by
 * tinting the tiles, so a row of them reads as one set rather than a traffic light.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: LucideIcon
  href?: string
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {Icon && <Icon className="ml-auto size-4 text-muted-foreground/60" />}
      </div>
      <p className="tabular mt-2 text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </>
  )

  const cls = cn(
    "rounded-xl border bg-card p-4 transition-colors",
    href && "hover:border-ring/50"
  )

  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  )
}

export function Field({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium break-words">{value ?? "—"}</dd>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-sm font-medium">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/**
 * Shown wherever a role is deliberately denied a field, so the prototype makes
 * the permission boundary visible instead of silently hiding data.
 */
export function Restricted({
  children = "Restricted",
  reason,
}: {
  children?: React.ReactNode
  reason?: string
}) {
  return (
    <span
      title={reason}
      className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
    >
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" aria-hidden>
        <rect
          x="5"
          y="11"
          width="14"
          height="9"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M8 11V8a4 4 0 1 1 8 0v3"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
      {children}
    </span>
  )
}

export function SectionGrid({
  children,
  cols = 2,
  className,
}: {
  children: React.ReactNode
  cols?: 2 | 3 | 4
  className?: string
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-5",
        cols === 2 && "sm:grid-cols-2",
        cols === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        cols === 4 && "sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </dl>
  )
}
