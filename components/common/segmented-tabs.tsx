"use client"

import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export interface SegmentedTab {
  value: string
  label: string
  /** Rendered as a pill beside the label. Omit, or pass 0, to hide it. */
  count?: number
  /** Overrides the count pill entirely — a lock icon, say. */
  adornment?: React.ReactNode
}

/**
 * The one tab control in the product.
 *
 * Every set of tabs uses this, so switching view looks the same on the
 * employee record as it does on Approvals. It renders Radix's list and
 * triggers, so it keeps the tablist and tab roles, arrow-key navigation and
 * the active state for free — the styling is all that is ours.
 *
 * It must sit inside a <Tabs> root, which owns the value.
 */
export function SegmentedTabs({
  tabs,
  className,
  emphasise,
}: {
  tabs: SegmentedTab[]
  className?: string
  /**
   * Tab values whose count should read as urgent rather than neutral, for
   * a queue with something overdue in it.
   */
  emphasise?: string[]
}) {
  return (
    <TabsList
      className={cn(
        // The primitive pins the list to h-8 and the trigger to the list's
        // height, both behind variants that a plain h-auto will not beat.
        "h-auto w-fit max-w-full flex-wrap justify-start gap-1 rounded-xl border bg-card p-1 group-data-horizontal/tabs:h-auto",
        className
      )}
    >
      {tabs.map((t) => {
        const urgent = emphasise?.includes(t.value)
        return (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className={cn(
              "h-auto flex-none gap-2 rounded-lg border-0 px-3.5 py-2 text-sm",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
              "data-active:bg-success-muted data-active:font-medium data-active:text-primary",
              // Flat, as the originals were. The primitive raises the active
              // tab with shadow-sm behind a variant selector, which a plain
              // shadow-none does not outrank — this matches its specificity.
              "group-data-[variant=default]/tabs-list:data-active:shadow-none",
              "after:hidden"
            )}
          >
            {t.label}
            {t.adornment}
            {!t.adornment && t.count !== undefined && (
              <span
                className={cn(
                  "tabular rounded-full px-1.5 text-xs",
                  urgent
                    ? "bg-destructive/15 text-destructive"
                    : "bg-muted text-muted-foreground",
                  // Tints with the tab when that tab is the active one.
                  !urgent &&
                    "[[data-active]_&]:bg-primary/15 [[data-active]_&]:text-primary"
                )}
              >
                {t.count}
              </span>
            )}
          </TabsTrigger>
        )
      })}
    </TabsList>
  )
}
