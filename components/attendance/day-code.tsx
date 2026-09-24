"use client"

import type { DayCode } from "@/lib/attendance/types"
import { cn } from "@/lib/utils"

/**
 * Every code carries its letter and its name. Colour is a second signal
 * and never the only one, so the register stays readable in greyscale and
 * to anyone who cannot separate the tints.
 */
export const DAY_CODE_LABEL: Record<DayCode, string> = {
  P: "Present",
  R: "Remote",
  L: "Late",
  N: "No record",
  V: "On leave",
  H: "Public holiday",
  "-": "Not a working day",
}

export const DAY_CODE_HINT: Record<DayCode, string> = {
  P: "Clocked in on site within the grace period",
  R: "Captured from outside a branch",
  L: "Clocked in after the scheduled start plus grace",
  N: "Nothing captured, and no leave on file",
  V: "Covered by approved leave",
  H: "Public holiday",
  "-": "Outside this person's work pattern",
}

const TONE: Record<DayCode, string> = {
  P: "bg-success-muted text-primary",
  R: "bg-info-muted text-info",
  L: "bg-warning-muted text-warning-foreground",
  N: "bg-danger-muted text-destructive",
  V: "bg-neutral-muted text-muted-foreground",
  H: "bg-muted text-muted-foreground",
  "-": "text-muted-foreground/50",
}

/** The letter in a register cell. */
export function DayCodeCell({
  code,
  className,
}: {
  code: DayCode
  className?: string
}) {
  return (
    <span
      className={cn(
        "grid size-7 place-items-center rounded-md text-xs font-semibold",
        TONE[code],
        className
      )}
    >
      {code === "-" ? "·" : code}
    </span>
  )
}

/** The letter and its name, for places with room for both. */
export function DayCodeBadge({ code }: { code: DayCode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        TONE[code]
      )}
    >
      <span className="font-semibold">{code === "-" ? "·" : code}</span>
      {DAY_CODE_LABEL[code]}
    </span>
  )
}

const ORDER: DayCode[] = ["P", "R", "L", "N", "V", "H", "-"]

export function DayCodeLegend({ className }: { className?: string }) {
  return (
    <ul
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}
    >
      {ORDER.map((code) => (
        <li key={code} className="flex items-center gap-1.5 text-xs">
          <DayCodeCell code={code} className="size-5 text-[10px]" />
          <span className="text-muted-foreground">{DAY_CODE_LABEL[code]}</span>
        </li>
      ))}
    </ul>
  )
}
