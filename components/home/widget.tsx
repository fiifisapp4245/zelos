"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

/**
 * Not every widget deserves the same voice. The queue you came here for is
 * "primary"; ambient context in the rail is "quiet". Styling them all as
 * identical cards is what makes a dashboard unreadable.
 */
export type WidgetWeight = "primary" | "standard" | "quiet"

const WEIGHT: Record<WidgetWeight, string> = {
  primary: "rounded-xl border-2 border-primary/20 bg-card",
  standard: "rounded-xl border bg-card",
  quiet: "rounded-xl border bg-card/60",
}

export function Widget({
  id,
  title,
  count,
  description,
  weight = "standard",
  actions,
  footer,
  children,
  className,
  bodyClassName,
  fills,
}: {
  id?: string
  title: string
  /** Rendered beside the heading, for "6" waiting. */
  count?: number
  description?: string
  weight?: WidgetWeight
  actions?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  /**
   * Lets the widget absorb the leftover height in its column and scroll
   * inside itself. That is what keeps the left and right columns finishing
   * level instead of one running past the other. A number is a share: the
   * queue takes twice the slack of the list under it, because it is the one
   * you came for.
   */
  fills?: boolean | number
}) {
  const headingId = `${id ?? title.replace(/\s+/g, "-").toLowerCase()}-heading`

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        WEIGHT[weight],
        "scroll-mt-20",
        fills && "flex min-h-0 flex-col",
        className
      )}
      style={
        fills
          ? { flexGrow: typeof fills === "number" ? fills : 1, flexBasis: 0 }
          : undefined
      }
    >
      <header
        className={cn(
          "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-5",
          weight === "quiet" ? "py-3" : "py-4"
        )}
      >
        <h2
          id={headingId}
          className={cn(
            "min-w-0 font-semibold",
            weight === "quiet" ? "text-[13px]" : "text-sm"
          )}
        >
          {title}
          {count !== undefined && count > 0 && (
            <span className="tabular ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
              {count}
            </span>
          )}
        </h2>
        {actions && (
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        )}
        {description && (
          <p className="w-full text-xs text-muted-foreground">{description}</p>
        )}
      </header>

      <div
        className={cn(
          bodyClassName ?? (weight === "quiet" ? "p-4" : "p-5"),
          fills && "min-h-0 flex-1 overflow-y-auto overscroll-contain"
        )}
      >
        {children}
      </div>

      {footer && (
        <div className="shrink-0 border-t px-5 py-3 text-sm">{footer}</div>
      )}
    </section>
  )
}

/** The "View all (n)" link every queue ends with. */
export function ViewAll({ href, count }: { href: string; count: number }) {
  return (
    <Link
      href={href}
      className="rounded text-sm font-medium text-primary transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      View all ({count})
    </Link>
  )
}

/** Quiet, centred copy for a widget with nothing in it. */
export function WidgetEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
  )
}
