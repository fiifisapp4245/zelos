"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  BadgeCheck,
  Eye,
  Lock,
  NotebookPen,
  Star,
} from "lucide-react"
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
import { ReviewBadge } from "@/components/common/status"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStore } from "@/lib/store"
import {
  MIN_AGGREGATION_GROUP,
  canShowAggregate,
  canViewCoachingNote,
  has,
} from "@/lib/rbac"
import { directReports, visibleEmployees } from "@/lib/selectors"
import {
  formatDate,
  formatDateTime,
  fullName,
  relativeTime,
} from "@/lib/format"
import type { CoachingNote } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function PerformancePage() {
  const store = useStore()
  const { viewer, employees, reviews, coachingNotes } = store
  const scope = visibleEmployees(viewer, employees)
  const scopeIds = new Set(scope.map((e) => e.id))

  const [noteFor, setNoteFor] = React.useState<string | null>(null)
  const [escalating, setEscalating] = React.useState<CoachingNote | null>(null)

  const visibleReviews = reviews.filter((r) => scopeIds.has(r.employeeId))
  const mineToDo = visibleReviews.filter(
    (r) => r.managerId === viewer.employeeId && r.status !== "complete"
  )
  const complete = visibleReviews.filter((r) => r.status === "complete")
  const rated = complete.filter((r) => r.rating !== null)
  const avg =
    rated.length > 0
      ? (rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length).toFixed(
          1
        )
      : "—"

  const myNotes = coachingNotes.filter((n) => canViewCoachingNote(viewer, n))
  const unescalated = myNotes.filter((n) => !n.escalated)

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Talent" },
        { label: "Performance" },
      ]}
    >
      <PageHeader
        title="Performance"
        description="Official reviews are on the record. Coaching notes stay private to the manager who wrote them until they are deliberately escalated."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Reviews you own"
          value={mineToDo.length}
          hint="Open in the current cycle"
        />
        <StatCard
          label="Complete"
          value={complete.length}
          hint="Shared with the employee"
        />
        <StatCard
          label="Average rating"
          value={canShowAggregate(rated.length) ? avg : "—"}
          hint={
            canShowAggregate(rated.length)
              ? `Across ${rated.length} reviews`
              : `Hidden — needs ${MIN_AGGREGATION_GROUP}+ reviews`
          }
        />
        <StatCard
          label="Your private notes"
          value={unescalated.length}
          hint="Not visible to anyone else"
        />
      </div>

      <Tabs defaultValue="reviews">
        <TabsList
          variant="line"
          className="mb-5 h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0"
        >
          {[
            ["reviews", "Review cycle"],
            ["notes", "Coaching notes"],
          ].map(([v, l]) => (
            <TabsTrigger
              key={v}
              value={v}
              className="flex-none rounded-none border-0 px-3.5 py-2.5 text-sm after:bottom-0 data-active:font-medium data-active:text-primary data-active:after:bg-primary"
            >
              {l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="reviews">
          <Panel bodyClassName="p-0">
            {visibleReviews.length === 0 ? (
              <EmptyState icon={BadgeCheck} title="No reviews in your scope" />
            ) : (
              <ul className="divide-y">
                {visibleReviews.map((r) => {
                  const emp = store.employeeById(r.employeeId)
                  const manager = store.employeeById(r.managerId)
                  const isMine = r.managerId === viewer.employeeId
                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                    >
                      {emp && <Initials person={emp} size="md" />}
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/employees/${r.employeeId}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {fullName(emp)}
                          </Link>
                          <Pill tone="neutral">{r.cycle}</Pill>
                          {isMine && <Pill tone="info">You own this</Pill>}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Reviewer {fullName(manager)} · due{" "}
                          {formatDate(r.dueOn)}
                          {r.sharedOn && ` · shared ${formatDate(r.sharedOn)}`}
                        </p>
                      </div>
                      {r.rating !== null && (
                        <span
                          className="flex items-center gap-0.5"
                          aria-label={`${r.rating} out of 5`}
                        >
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "size-3.5",
                                i < Math.round(r.rating!)
                                  ? "fill-warning text-warning"
                                  : "text-muted-foreground/30"
                              )}
                            />
                          ))}
                          <span className="tabular ml-1 text-xs">
                            {r.rating.toFixed(1)}
                          </span>
                        </span>
                      )}
                      <ReviewBadge status={r.status} />
                      {isMine && r.status !== "complete" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toast("Opens the review form for this cycle.")
                          }
                        >
                          Continue
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="notes">
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Panel
              title="Coaching notes"
              description="Private to you by default. Escalating one makes it part of the official record and visible to HR."
              bodyClassName="p-0"
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNoteFor("new")}
                >
                  <NotebookPen className="size-3.5" />
                  Write a note
                </Button>
              }
            >
              {myNotes.length === 0 ? (
                <EmptyState
                  icon={Lock}
                  title="No notes visible to you"
                  description="Coaching notes belong to their author. You see only the ones you wrote, plus any that have been escalated — if you are HR."
                />
              ) : (
                <ul className="divide-y">
                  {myNotes.map((n) => {
                    const about = store.employeeById(n.employeeId)
                    const mine = n.authorId === viewer.employeeId
                    return (
                      <li key={n.id} className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {about && <Initials person={about} size="xs" />}
                          <Link
                            href={`/employees/${n.employeeId}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {fullName(about)}
                          </Link>
                          {n.escalated ? (
                            <Pill tone="warning">
                              <ArrowUpRight className="size-3" />
                              Escalated
                            </Pill>
                          ) : (
                            <Pill tone="neutral">
                              <Lock className="size-3" />
                              Private
                            </Pill>
                          )}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {relativeTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm">{n.body}</p>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {fullName(store.employeeById(n.authorId))} ·{" "}
                          {formatDateTime(n.createdAt)}
                          {n.escalatedAt &&
                            ` · escalated ${formatDateTime(n.escalatedAt)}`}
                        </p>
                        {mine && !n.escalated && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3"
                            onClick={() => setEscalating(n)}
                          >
                            <ArrowUpRight className="size-3.5" />
                            Escalate to official record
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>

            <div className="space-y-5">
              <Panel title="How visibility works">
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-2.5">
                    <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>
                      <strong className="font-medium">Private note.</strong>{" "}
                      <span className="text-muted-foreground">
                        Only its author can read it. Not HR, not the Owner, not
                        the employee.
                      </span>
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
                    <span>
                      <strong className="font-medium">Escalated note.</strong>{" "}
                      <span className="text-muted-foreground">
                        Joins the official record. HR can read it, and it can
                        support a disciplinary process.
                      </span>
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <Eye className="mt-0.5 size-4 shrink-0 text-info" />
                    <span>
                      <strong className="font-medium">Official review.</strong>{" "}
                      <span className="text-muted-foreground">
                        Visible to the employee, HR and authorised leadership
                        once shared.
                      </span>
                    </span>
                  </li>
                </ul>
                <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                  Escalation is a one-way door. Notes are written for a private
                  audience, which is what keeps them candid.
                </p>
              </Panel>

              {has(viewer, "hr_admin") && <EscalationSignal />}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {noteFor !== null && (
        <WriteNoteDialog open onOpenChange={() => setNoteFor(null)} />
      )}
      <EscalateDialog note={escalating} onClose={() => setEscalating(null)} />
    </PageShell>
  )
}

/**
 * Surfaces the *volume* of unescalated notes per manager, never their content —
 * an early-warning signal for escalation reluctance that respects the privacy
 * boundary (system map §9, item 9).
 */
function EscalationSignal() {
  const store = useStore()
  const { coachingNotes, employees } = store

  const byManager = new Map<string, { total: number; escalated: number }>()
  coachingNotes.forEach((n) => {
    const row = byManager.get(n.authorId) ?? { total: 0, escalated: 0 }
    row.total += 1
    if (n.escalated) row.escalated += 1
    byManager.set(n.authorId, row)
  })

  const rows = [...byManager.entries()]
    .map(([id, v]) => ({ manager: employees.find((e) => e.id === id), ...v }))
    .filter((r) => r.manager)
    .sort((a, b) => b.total - a.total)

  return (
    <Panel
      title="Escalation signal"
      description="Counts only. HR sees how many notes exist and how many were escalated — never what any note says."
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes written yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.manager!.id} className="flex items-center gap-3">
              <Initials person={r.manager!} size="xs" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {fullName(r.manager)}
              </span>
              <span className="tabular text-xs text-muted-foreground">
                {r.escalated}/{r.total} escalated
              </span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-warning"
                  style={{ width: `${(r.escalated / r.total) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function WriteNoteDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const store = useStore()
  const { viewer, employees } = store
  const reports = directReports(viewer, employees)
  // Radix unmounts dialog content on close, so these reset without an effect.
  const [about, setAbout] = React.useState(reports[0]?.id ?? "")
  const [body, setBody] = React.useState("")

  function save() {
    if (!about || body.trim().length < 10) {
      toast.error("Pick a person and write at least a sentence.")
      return
    }
    store.addCoachingNote({
      id: `cn-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: about,
      authorId: viewer.employeeId,
      body: body.trim(),
      createdAt: new Date().toISOString(),
      escalated: false,
      escalatedAt: null,
    })
    toast.success("Note saved. Only you can read it.")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write a coaching note</DialogTitle>
          <DialogDescription>
            Private to you. Nobody else — including HR and the Owner — can read
            it unless you escalate it.
          </DialogDescription>
        </DialogHeader>

        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You have no direct reports to write notes about.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-sm font-medium">About</Label>
              <select
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {fullName(r)} — {r.jobTitle}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label
                htmlFor="body"
                className="mb-1.5 block text-sm font-medium"
              >
                Note
              </Label>
              <Textarea
                id="body"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What happened, what you observed, and what you agreed."
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="lg" disabled={reports.length === 0} onClick={save}>
            Save privately
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EscalateDialog({
  note,
  onClose,
}: {
  note: CoachingNote | null
  onClose: () => void
}) {
  const store = useStore()
  if (!note) return null
  const about = store.employeeById(note.employeeId)

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escalate this note?</DialogTitle>
          <DialogDescription>
            It becomes part of {fullName(about)}&apos;s official record,
            readable by HR, and can support a formal process. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <blockquote className="rounded-lg border-l-2 border-warning bg-warning-muted/50 px-4 py-3 text-sm">
          {note.body}
        </blockquote>

        <p className="text-xs text-muted-foreground">
          Written {formatDateTime(note.createdAt)}. Escalating is logged with
          your name and a timestamp.
        </p>

        <DialogFooter>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Keep it private
          </Button>
          <Button
            size="lg"
            onClick={() => {
              store.escalateNote(note.id)
              toast.success("Escalated. HR can now see this note.")
              onClose()
            }}
          >
            <ArrowUpRight className="size-4" />
            Escalate to record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
