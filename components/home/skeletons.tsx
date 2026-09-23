"use client"

import { cn } from "@/lib/utils"

function Bar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "block rounded bg-muted motion-safe:animate-pulse",
        className
      )}
    />
  )
}

/**
 * Placeholders shaped like the widget they stand in for, so the page does not
 * jump when the data lands.
 */
export function WidgetSkeleton({
  rows = 3,
  weight = "standard",
}: {
  rows?: number
  weight?: "primary" | "standard" | "quiet"
}) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading"
      className={cn(
        "rounded-xl",
        weight === "primary"
          ? "border-2 border-primary/20 bg-card"
          : weight === "quiet"
            ? "border bg-card/60"
            : "border bg-card"
      )}
    >
      <div className="border-b px-5 py-4">
        <Bar className="h-4 w-36" />
      </div>
      <div className="space-y-3 p-5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Bar className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Bar className="h-3.5 w-1/3" />
              <Bar className="h-3 w-2/3" />
            </div>
            <Bar className="h-7 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function HomeSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <WidgetSkeleton rows={4} weight="primary" />
        <WidgetSkeleton rows={3} />
        <WidgetSkeleton rows={1} />
      </div>
      <div className="space-y-5">
        <WidgetSkeleton rows={1} weight="quiet" />
        <WidgetSkeleton rows={2} weight="quiet" />
        <WidgetSkeleton rows={2} weight="quiet" />
      </div>
    </div>
  )
}
