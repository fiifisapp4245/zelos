"use client"

import { AlertTriangle } from "lucide-react"

import { shiftHours } from "@/lib/schedules/derive"
import type { Shift } from "@/lib/schedules/types"
import { formatHours } from "@/lib/time"
import { cn } from "@/lib/utils"

/**
 * The state of a shift in words as well as in colour.
 *
 * "Changed" matters most: the person was told one thing and the roster
 * now says another, which is exactly the case a tint alone would lose.
 */
export function shiftState(shift: Shift) {
  if (shift.cancelled) return "Cancelled"
  if (shift.state === "draft") return "Draft"
  if (shift.changedSincePublish) return "Changed"
  return "Published"
}

const TONE: Record<string, string> = {
  Published: "border-primary/30 bg-success-muted text-foreground",
  Draft: "border-dashed border-muted-foreground/50 bg-card text-foreground",
  Changed: "border-warning bg-warning-muted text-warning-foreground",
  Cancelled:
    "border-muted-foreground/30 bg-muted text-muted-foreground line-through",
}

export function ShiftChip({
  shift,
  warned,
  className,
}: {
  shift: Shift
  /** Something about this shift is flagged in the warnings bar. */
  warned?: boolean
  className?: string
}) {
  const state = shiftState(shift)
  return (
    <span
      className={cn(
        "block w-full rounded-lg border px-2 py-1.5 text-left text-xs",
        TONE[state],
        className
      )}
    >
      <span className="tabular flex items-center gap-1 font-medium">
        {shift.start}–{shift.end}
        {warned && (
          <AlertTriangle
            className="size-3 shrink-0 text-warning-foreground"
            aria-hidden
          />
        )}
      </span>
      <span className="block truncate text-muted-foreground">
        {shift.position}
      </span>
      <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
        <span className="rounded bg-card/70 px-1 font-medium">{state}</span>
        <span className="tabular">{formatHours(shiftHours(shift))}</span>
      </span>
    </span>
  )
}

/** What a shift reads as to a screen reader, in one sentence. */
export function shiftLabel(shift: Shift) {
  return `${shift.start} to ${shift.end}, ${shift.position}, ${shift.breakMinutes} minute break, ${shiftState(shift).toLowerCase()}`
}
