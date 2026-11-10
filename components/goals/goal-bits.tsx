"use client"

import * as React from "react"
import { AlertTriangle, Target } from "lucide-react"

import { Pill, type Tone } from "@/components/common"
import { useStore } from "@/lib/store"
import { TODAY_ISO, formatDate, fullName } from "@/lib/format"
import {
  CONFIDENCE_LABEL,
  LEVEL_LABEL,
  daysSinceCheckIn,
  healthOf,
  isStale,
  pct,
  progressOf,
} from "@/lib/goals"
import type { Confidence, Goal } from "@/lib/types"
import { cn } from "@/lib/utils"

export const HEALTH_TONE: Record<Confidence, Tone> = {
  on_track: "success",
  at_risk: "warning",
  off_track: "danger",
}

export function ProgressBar({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={pct(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${pct(value)}%` }}
      />
    </div>
  )
}

/** Who a goal belongs to, in the words people use for it. */
export function useOwnerLabel() {
  const store = useStore()
  return (g: Goal) =>
    g.level === "company"
      ? "Company"
      : g.level === "team"
        ? `${g.team} team`
        : fullName(store.employeeById(g.ownerId ?? undefined))
}

export function GoalRow({
  goal,
  onOpen,
}: {
  goal: Goal
  onOpen: (id: string) => void
}) {
  const store = useStore()
  const label = useOwnerLabel()
  const progress = progressOf(goal, store.goals)
  const health = healthOf(goal, store.goals, store.checkIns, TODAY_ISO)
  const stale = isStale(goal, store.checkIns, TODAY_ISO)
  const live = goal.status === "active"

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(goal.id)}
        className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Target className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1 basis-60">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{goal.title}</span>
            {goal.status === "proposed" && (
              <Pill tone="info">Awaiting approval</Pill>
            )}
            {goal.status === "draft" && <Pill tone="warning">Sent back</Pill>}
            {goal.status === "done" && <Pill tone="success">Done</Pill>}
            {goal.status === "cancelled" && (
              <Pill tone="neutral">Cancelled</Pill>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {LEVEL_LABEL[goal.level]} · {label(goal)} · {goal.cycle} · due{" "}
            {formatDate(goal.dueOn)}
          </p>
        </div>
        <div className="w-44 shrink-0">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted-foreground">
              {goal.keyResults.length} key result
              {goal.keyResults.length === 1 ? "" : "s"}
            </span>
            <span className="tabular font-medium">{pct(progress)}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>
        {live ? (
          <span className="flex w-40 shrink-0 flex-col items-end gap-1">
            <Pill tone={HEALTH_TONE[health]}>{CONFIDENCE_LABEL[health]}</Pill>
            {stale && (
              <span className="flex items-center gap-1 text-[11px] text-warning-foreground">
                <AlertTriangle className="size-3" />
                No check-in for{" "}
                {daysSinceCheckIn(goal, store.checkIns, TODAY_ISO)} days
              </span>
            )}
          </span>
        ) : (
          <span className="w-40 shrink-0" />
        )}
      </button>
    </li>
  )
}
