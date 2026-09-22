"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlarmClock,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  FileWarning,
  LogIn,
  LogOut,
  PauseCircle,
  UserRoundCheck,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { EmptyState, Initials, Pill } from "@/components/common"
import { LifecycleBadge } from "@/components/common/status"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChangeStatusDialog } from "./change-status-dialog"
import { useStore } from "@/lib/store"
import { canChangeLifecycle } from "@/lib/rbac"
import { formatDate, fullName } from "@/lib/format"
import {
  lifecycleActionLabel,
  type LifecycleTask,
} from "@/lib/lifecycle-actions"
import type { LifecycleState } from "@/lib/types"
import { cn } from "@/lib/utils"

const ICON: Record<LifecycleTask["kind"], LucideIcon> = {
  probation_due: UserRoundCheck,
  start_due: LogIn,
  notice_elapsed: LogOut,
  leave_ended: CalendarClock,
  suspension_review: PauseCircle,
  retirement_due: AlarmClock,
  contract_ending: FileWarning,
}

/** How late, or how soon, the decision is. */
function due(daysLeft: number) {
  if (daysLeft < 0)
    return {
      tone: "danger" as const,
      text: `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} overdue`,
    }
  if (daysLeft === 0) return { tone: "warning" as const, text: "Due today" }
  return {
    tone: "warning" as const,
    text: `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
  }
}

/**
 * The actionable half of the lifecycle. Every outcome goes through the same
 * audited dialog as a manual change, so nothing shortcuts the reason field.
 */
export function LifecycleWorklist({
  tasks,
  showPerson = true,
  emptyTitle = "Nothing waiting on a decision",
  emptyDescription = "Probation confirmations, returns from leave and exits appear here as they fall due.",
}: {
  tasks: LifecycleTask[]
  showPerson?: boolean
  emptyTitle?: string
  emptyDescription?: string
}) {
  const { viewer } = useStore()
  const mayAct = canChangeLifecycle(viewer)
  const [pending, setPending] = React.useState<{
    employeeId: string
    to: LifecycleState
  } | null>(null)

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <>
      <ul className="divide-y">
        {tasks.map((t) => {
          const Icon = ICON[t.kind]
          const d = due(t.daysLeft)
          return (
            <li
              key={t.id}
              className="flex flex-wrap items-start gap-3.5 px-5 py-4"
            >
              <span
                className={cn(
                  "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full",
                  d.tone === "danger"
                    ? "bg-danger-muted text-destructive"
                    : "bg-warning-muted text-warning-foreground"
                )}
              >
                <Icon className="size-4" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {showPerson && (
                    <Link
                      href={`/employees/${t.employee.id}`}
                      className="flex items-center gap-2 text-sm font-medium hover:underline"
                    >
                      <Initials person={t.employee} size="sm" />
                      {fullName(t.employee)}
                    </Link>
                  )}
                  <Pill tone="neutral">{lifecycleActionLabel(t.kind)}</Pill>
                  <Pill tone={d.tone}>{d.text}</Pill>
                  <LifecycleBadge state={t.employee.lifecycleState} />
                </div>
                <p className="mt-1.5 text-sm font-medium">{t.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.detail}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.employee.jobTitle} · {t.employee.department} · due{" "}
                  {formatDate(t.dueDate)}
                </p>
              </div>

              {mayAct ? (
                <div className="flex shrink-0 items-center">
                  <Button
                    size="sm"
                    className={cn(
                      t.alternatives.length > 0 && "rounded-r-none"
                    )}
                    onClick={() =>
                      setPending({
                        employeeId: t.employee.id,
                        to: t.primary.to,
                      })
                    }
                  >
                    {t.primary.label}
                  </Button>
                  {t.alternatives.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          aria-label="Other outcomes"
                          className="rounded-l-none border-l border-primary-foreground/25 px-2"
                        >
                          <ChevronDown className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {t.alternatives.map((a) => (
                          <DropdownMenuItem
                            key={a.to}
                            onSelect={() =>
                              setPending({
                                employeeId: t.employee.id,
                                to: a.to,
                              })
                            }
                          >
                            {a.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">
                  HR decides this one
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {pending && (
        <ChangeStatusDialog
          employeeId={pending.employeeId}
          presetTarget={pending.to}
          open
          onOpenChange={(v) => !v && setPending(null)}
        />
      )}
    </>
  )
}
