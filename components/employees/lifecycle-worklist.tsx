"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlarmClock,
  CalendarClock,
  CheckCircle2,
  FileWarning,
  LogIn,
  LogOut,
  PauseCircle,
  UserRoundCheck,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import {
  EmptyState,
  Initials,
  Pill,
  Th,
  type ListView,
} from "@/components/common"
import { LifecycleBadge } from "@/components/common/status"
import { RowActions } from "@/components/common/row-actions"
import { Button } from "@/components/ui/button"
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

type Decide = (employeeId: string, to: LifecycleState) => void

/**
 * The actionable half of the lifecycle. Every outcome goes through the same
 * audited dialog as a manual change, so nothing shortcuts the reason field.
 */
export function LifecycleWorklist({
  tasks,
  view = "grid",
  showPerson = true,
  emptyTitle = "Nothing waiting on a decision",
  emptyDescription = "Probation confirmations, returns from leave and exits appear here as they fall due.",
}: {
  tasks: LifecycleTask[]
  view?: ListView
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

  const decide: Decide = (employeeId, to) => setPending({ employeeId, to })

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
      {view === "table" ? (
        <TaskTable
          tasks={tasks}
          mayAct={mayAct}
          showPerson={showPerson}
          decide={decide}
        />
      ) : (
        <TaskCards
          tasks={tasks}
          mayAct={mayAct}
          showPerson={showPerson}
          decide={decide}
        />
      )}

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

/**
 * The primary outcome stays a button; everything else hides behind the
 * ellipsis, which is how the rest of the app signals "there is more here".
 */
function TaskActions({
  task,
  mayAct,
  decide,
}: {
  task: LifecycleTask
  mayAct: boolean
  decide: Decide
}) {
  if (!mayAct) {
    return (
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        HR decides this one
      </span>
    )
  }
  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        onClick={() => decide(task.employee.id, task.primary.to)}
      >
        {task.primary.label}
      </Button>
      <RowActions
        label={`Other outcomes for ${fullName(task.employee)}`}
        actions={[
          ...task.alternatives.map((a) => ({
            label: a.label,
            onSelect: () => decide(task.employee.id, a.to),
            destructive: a.to === "terminated",
          })),
          {
            label: "Open record",
            href: `/employees/${task.employee.id}`,
          },
        ]}
      />
    </div>
  )
}

function TaskCards({
  tasks,
  mayAct,
  showPerson,
  decide,
}: {
  tasks: LifecycleTask[]
  mayAct: boolean
  showPerson: boolean
  decide: Decide
}) {
  return (
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
              <p className="mt-0.5 text-xs text-muted-foreground">{t.detail}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.employee.jobTitle} · {t.employee.department} · due{" "}
                {formatDate(t.dueDate)}
              </p>
            </div>

            <div className="shrink-0">
              <TaskActions task={t} mayAct={mayAct} decide={decide} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function TaskTable({
  tasks,
  mayAct,
  showPerson,
  decide,
}: {
  tasks: LifecycleTask[]
  mayAct: boolean
  showPerson: boolean
  decide: Decide
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            {showPerson && <Th className="pl-5">Employee</Th>}
            <Th className={showPerson ? undefined : "pl-5"}>Decision</Th>
            <Th>State</Th>
            <Th>Due</Th>
            <Th className="pr-5 text-right">Action</Th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tasks.map((t) => {
            const d = due(t.daysLeft)
            return (
              <tr key={t.id} className="transition-colors hover:bg-muted/30">
                {showPerson && (
                  <td className="py-3 pr-3 pl-5">
                    <Link
                      href={`/employees/${t.employee.id}`}
                      className="flex min-w-0 items-center gap-2.5 hover:underline"
                    >
                      <Initials person={t.employee} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {fullName(t.employee)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t.employee.jobTitle} · {t.employee.department}
                        </span>
                      </span>
                    </Link>
                  </td>
                )}
                <td className={cn("py-3 pr-3", showPerson ? "" : "pl-5")}>
                  <span className="block font-medium">{t.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {lifecycleActionLabel(t.kind)}
                  </span>
                </td>
                <td className="py-3 pr-3">
                  <LifecycleBadge state={t.employee.lifecycleState} />
                </td>
                <td className="py-3 pr-3">
                  <Pill tone={d.tone}>{d.text}</Pill>
                  <span className="mt-1 block text-xs whitespace-nowrap text-muted-foreground">
                    {formatDate(t.dueDate)}
                  </span>
                </td>
                <td className="py-3 pr-5">
                  <div className="flex justify-end">
                    <TaskActions task={t} mayAct={mayAct} decide={decide} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
