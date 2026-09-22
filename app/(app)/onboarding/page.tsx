"use client"

import Link from "next/link"
import { CheckCircle2, Circle, Plus, Trash2, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  Panel,
  Pill,
  StatCard,
} from "@/components/common"
import { LifecycleBadge } from "@/components/common/status"
import { Button } from "@/components/ui/button"
import { FormDialog } from "@/components/common/form-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStore } from "@/lib/store"
import { visibleEmployees } from "@/lib/selectors"
import { daysUntil, formatDate, fullName, relativeTime } from "@/lib/format"
import * as React from "react"
import type { OnboardingTask } from "@/lib/types"
import { cn } from "@/lib/utils"

const OWNER_LABEL: Record<OnboardingTask["owner"], string> = {
  hr: "HR",
  manager: "Manager",
  employee: "Employee",
  it: "IT",
}

export default function OnboardingPage() {
  const store = useStore()
  const { viewer, employees, onboardingTasks, documents } = store
  const scope = visibleEmployees(viewer, employees)
  const scopeIds = new Set(scope.map((e) => e.id))

  // Anyone not yet fully settled: pre-hire, on probation, or with open tasks.
  const withTasks = new Set(
    onboardingTasks.filter((t) => !t.done).map((t) => t.employeeId)
  )
  const joiners = scope
    .filter(
      (e) =>
        e.lifecycleState === "pre_hire" ||
        e.lifecycleState === "probation" ||
        withTasks.has(e.id)
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  const tasks = onboardingTasks.filter((t) => scopeIds.has(t.employeeId))
  const open = tasks.filter((t) => !t.done)
  const overdue = open.filter((t) => (daysUntil(t.dueOn) ?? 0) < 0)
  const missingDocs = documents.filter(
    (d) =>
      scopeIds.has(d.employeeId) &&
      (d.status === "missing" || d.status === "pending")
  )

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Talent" },
        { label: "Onboarding" },
      ]}
    >
      <PageHeader
        title="Onboarding"
        description="Everyone between offer accepted and fully settled. Required documents must be on file before a pre-hire record can move to active."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="People onboarding" value={joiners.length} />
        <StatCard
          label="Open tasks"
          value={open.length}
          hint="Across all joiners"
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          hint="Past their due date"
        />
        <StatCard
          label="Documents outstanding"
          value={missingDocs.length}
          hint="Missing or unverified"
        />
      </div>

      {joiners.length === 0 ? (
        <Panel>
          <EmptyState
            icon={UserPlus}
            title="Nobody is onboarding"
            description="New pre-hire records appear here automatically with their checklist."
          />
        </Panel>
      ) : (
        <div className="space-y-5">
          {joiners.map((e) => (
            <JoinerCard key={e.id} employeeId={e.id} />
          ))}
        </div>
      )}
    </PageShell>
  )
}

function JoinerCard({ employeeId }: { employeeId: string }) {
  const store = useStore()
  const [adding, setAdding] = React.useState(false)
  const employee = store.employeeById(employeeId)!
  const tasks = store.onboardingTasks.filter((t) => t.employeeId === employeeId)
  const docs = store.documents.filter((d) => d.employeeId === employeeId)
  const done = tasks.filter((t) => t.done).length
  const percent =
    tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 100
  const startsIn = daysUntil(employee.startDate)
  const blockers = docs.filter((d) => d.status === "missing")

  return (
    <Panel bodyClassName="p-0">
      <div className="flex flex-wrap items-center gap-4 border-b px-5 py-4">
        <Initials person={employee} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <Link
              href={`/employees/${employee.id}`}
              className="font-medium hover:underline"
            >
              {fullName(employee)}
            </Link>
            <LifecycleBadge state={employee.lifecycleState} />
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {employee.jobTitle} · {employee.department} · starts{" "}
            {formatDate(employee.startDate)}{" "}
            {startsIn !== null && startsIn > 0 && (
              <span className="text-foreground">
                ({relativeTime(employee.startDate)})
              </span>
            )}
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="size-3.5" />
          Add task
        </Button>

        <div className="min-w-[160px]">
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Checklist</span>
            <span className="tabular font-medium">
              {done}/{tasks.length}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                percent === 100 ? "bg-primary" : "bg-warning"
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {blockers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-danger-muted px-5 py-2.5 text-sm">
          <span className="font-medium text-destructive">Blocked:</span>
          <span className="text-muted-foreground">
            {blockers.map((b) => b.name).join(", ")} still missing — required
            before this record can go active.
          </span>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="px-5 py-4 text-sm text-muted-foreground">
          No checklist items.
        </div>
      ) : (
        <ul className="divide-y">
          {tasks.map((t) => {
            const late = !t.done && (daysUntil(t.dueOn) ?? 0) < 0
            return (
              <li key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                <button
                  type="button"
                  onClick={() => store.toggleOnboardingTask(t.id)}
                  aria-label={
                    t.done ? `Reopen ${t.title}` : `Complete ${t.title}`
                  }
                  className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                >
                  {t.done ? (
                    <CheckCircle2 className="size-5 text-primary" />
                  ) : (
                    <Circle className="size-5" />
                  )}
                </button>
                <span
                  className={cn(
                    "min-w-0 flex-1 text-sm",
                    t.done && "text-muted-foreground line-through"
                  )}
                >
                  {t.title}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${t.title}`}
                  onClick={() => {
                    store.deleteOnboardingTask(t.id)
                    toast.success("Task removed.")
                  }}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
                <Pill tone="neutral">{OWNER_LABEL[t.owner]}</Pill>
                <span
                  className={cn(
                    "tabular w-28 shrink-0 text-right text-xs",
                    late
                      ? "font-medium text-destructive"
                      : "text-muted-foreground"
                  )}
                >
                  {late ? "overdue " : "due "}
                  {formatDate(t.dueOn)}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {adding && (
        <AddTaskDialog
          employeeId={employeeId}
          onClose={() => setAdding(false)}
        />
      )}
    </Panel>
  )
}

/** Mounted only while open, so the form seeds fresh each time. */
function AddTaskDialog({
  employeeId,
  onClose,
}: {
  employeeId: string
  onClose: () => void
}) {
  const store = useStore()
  const [title, setTitle] = React.useState("")
  const [owner, setOwner] = React.useState<OnboardingTask["owner"]>("hr")
  const [category, setCategory] =
    React.useState<OnboardingTask["category"]>("paperwork")
  const [dueOn, setDueOn] = React.useState("")

  function save() {
    if (title.trim().length < 3) {
      toast.error("Give the task a title.")
      return
    }
    store.addOnboardingTask({
      id: `ot-${Math.random().toString(36).slice(2, 8)}`,
      employeeId,
      title: title.trim(),
      owner,
      category,
      dueOn: dueOn || "2026-10-05",
      done: false,
    })
    toast.success("Task added to the checklist.")
    onClose()
  }

  return (
    <FormDialog
      onClose={onClose}
      title="Add onboarding task"
      description="Checklist items block the move from pre-hire to active until they are done."
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save}>
            Add task
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="task-title" className="mb-1.5 block text-sm">
            Task
          </Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue laptop and access badge"
            className="h-10"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="task-owner" className="mb-1.5 block text-sm">
              Owner
            </Label>
            <select
              id="task-owner"
              value={owner}
              onChange={(e) =>
                setOwner(e.target.value as OnboardingTask["owner"])
              }
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              {(["hr", "manager", "employee", "it"] as const).map((o) => (
                <option key={o} value={o}>
                  {OWNER_LABEL[o]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="task-category" className="mb-1.5 block text-sm">
              Category
            </Label>
            <select
              id="task-category"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as OnboardingTask["category"])
              }
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm capitalize outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              {(
                ["paperwork", "access", "orientation", "compliance"] as const
              ).map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="task-due" className="mb-1.5 block text-sm">
            Due on
          </Label>
          <Input
            id="task-due"
            type="date"
            value={dueOn}
            onChange={(e) => setDueOn(e.target.value)}
            className="h-10"
          />
        </div>
      </div>
    </FormDialog>
  )
}
