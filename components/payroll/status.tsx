"use client"

import { Check } from "lucide-react"

import { Pill, type Tone } from "@/components/common"
import type { RunStatus } from "@/lib/pay/types"
import { cn } from "@/lib/utils"

/** Every state has a word. A run is too consequential to read by tint. */
export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  upcoming: "Upcoming",
  inputs_open: "Inputs open",
  inputs_locked: "Inputs locked",
  calculated: "Calculated",
  pending_approval: "Waiting on approval",
  approved: "Approved",
  paying: "Paying",
  paid: "Paid",
}

const TONE: Record<RunStatus, Tone> = {
  upcoming: "neutral",
  inputs_open: "info",
  inputs_locked: "info",
  calculated: "info",
  pending_approval: "warning",
  approved: "success",
  paying: "info",
  paid: "success",
}

export function RunStatusPill({ status }: { status: RunStatus }) {
  return <Pill tone={TONE[status]}>{RUN_STATUS_LABEL[status]}</Pill>
}

/** The order a run moves through. Paying and paid close it out. */
export const RUN_STEPS: RunStatus[] = [
  "inputs_open",
  "inputs_locked",
  "calculated",
  "pending_approval",
  "approved",
  "paid",
]

export function stepIndex(status: RunStatus) {
  if (status === "upcoming") return -1
  if (status === "paying") return RUN_STEPS.indexOf("approved")
  return RUN_STEPS.indexOf(status)
}

/**
 * Where a run has got to, as a line of named steps. The current one is
 * marked in words as well as in weight, so the position survives
 * greyscale and a screen reader.
 */
export function RunStepper({
  status,
  className,
}: {
  status: RunStatus
  className?: string
}) {
  const at = stepIndex(status)

  return (
    <ol
      className={cn("flex flex-wrap items-center gap-x-1 gap-y-2", className)}
      aria-label={`Run status: ${RUN_STATUS_LABEL[status]}`}
    >
      {RUN_STEPS.map((step, i) => {
        const state = i < at ? "done" : i === at ? "current" : "todo"
        return (
          <li key={step} className="flex items-center gap-1">
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs",
                state === "current" &&
                  "bg-success-muted font-medium text-primary",
                state === "done" && "text-muted-foreground",
                state === "todo" && "text-muted-foreground/60"
              )}
              aria-current={state === "current" ? "step" : undefined}
            >
              {state === "done" && (
                <Check className="size-3 text-primary" aria-hidden />
              )}
              {RUN_STATUS_LABEL[step]}
              {state === "current" && (
                <span className="sr-only">— current</span>
              )}
            </span>
            {i < RUN_STEPS.length - 1 && (
              <span className="text-muted-foreground/40" aria-hidden>
                ›
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

const MODE_LABEL = {
  native: "Native",
  external: "External",
  contractor: "Contractor",
} as const

export function ModeBadge({
  mode,
}: {
  mode: "native" | "external" | "contractor"
}) {
  return (
    <Pill tone={mode === "native" ? "success" : "neutral"}>
      {MODE_LABEL[mode]}
    </Pill>
  )
}
