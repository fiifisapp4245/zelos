"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  BadgeCheck,
  Eye,
  Lock,
  NotebookPen,
  Rocket,
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
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { LaunchCycleDialog } from "@/components/talent/cycle-dialog"
import { NativeSelect } from "@/components/talent/form"
import { ReviewSheet } from "@/components/talent/review-sheet"
import { useStore } from "@/lib/store"
import {
  MIN_AGGREGATION_GROUP,
  canShowAggregate,
  canViewCoachingNote,
  has,
} from "@/lib/rbac"
import { directReports, visibleEmployees } from "@/lib/selectors"
import {
  TODAY_ISO,
  formatDate,
  formatDateTime,
  fullName,
  relativeTime,
} from "@/lib/format"
import {
  OWNER_LABEL,
  REVIEW_FLOW,
  STEP_ACTION,
  isOverdue,
  isWaitingOn,
  ownerOf,
  ratingBuckets,
} from "@/lib/talent/performance"
import { REVIEW_STATUS_LABEL } from "@/lib/format"
import type { CoachingNote, ReviewStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function PerformancePage() {
  const store = useStore()
  const { viewer, employees, reviews, coachingNotes } = store
  const isHr = has(viewer, "hr_admin")
  const scope = visibleEmployees(viewer, employees)
  const scopeIds = new Set(scope.map((e) => e.id))

  const [noteFor, setNoteFor] = React.useState<string | null>(null)
  const [escalating, setEscalating] = React.useState<CoachingNote | null>(null)
  const [openReview, setOpenReview] = React.useState<string | null>(null)
  const [launching, setLaunching] = React.useState(false)
  const [tab, setTab] = React.useState("reviews")
  const [justLaunched, setJustLaunched] = React.useState<{
    cycle: string
    count: number
  } | null>(null)
  const [cycle, setCycle] = React.useState("all")
  const [status, setStatus] = React.useState<ReviewStatus | "all" | "mine">(
    "all"
  )

  const visibleReviews = reviews.filter((r) => scopeIds.has(r.employeeId))
  const cycles = [...new Set(visibleReviews.map((r) => r.cycle))]
  const waiting = visibleReviews.filter((r) => isWaitingOn(viewer, r))
  const overdue = visibleReviews.filter((r) => isOverdue(r, TODAY_ISO))
  const complete = visibleReviews.filter((r) => r.status === "complete")
  const rated = visibleReviews.filter(
    (r) => r.rating !== null && ["shared", "complete"].includes(r.status)
  )
  const avg =
    rated.length > 0
      ? (rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length).toFixed(
          1
        )
      : "—"

  const list = visibleReviews
    .filter((r) => cycle === "all" || r.cycle === cycle)
    .filter((r) =>
      status === "all"
        ? true
        : status === "mine"
          ? isWaitingOn(viewer, r)
          : r.status === status
    )

  const myNotes = coachingNotes.filter((n) => canViewCoachingNote(viewer, n))
  const canWriteNotes = directReports(viewer, employees).length > 0

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
        description="Each review runs self review, manager review, calibration, then shared. What a manager writes stays hidden from the employee until HR shares it. Coaching notes stay private until escalated."
        actions={
          isHr && (
            <Button size="lg" onClick={() => setLaunching(true)}>
              <Rocket className="size-4" />
              Launch a cycle
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Waiting on you"
          value={waiting.length}
          hint="Reviews that need your step"
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          hint="Past their due date"
        />
        <StatCard
          label="Complete"
          value={complete.length}
          hint="Acknowledged by the employee"
        />
        <StatCard
          label="Average rating"
          value={canShowAggregate(rated.length) ? avg : "—"}
          hint={
            canShowAggregate(rated.length)
              ? `Across ${rated.length} shared reviews`
              : `Hidden — needs ${MIN_AGGREGATION_GROUP}+ shared reviews`
          }
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <SegmentedTabs
          className="mb-5"
          tabs={[
            { value: "reviews", label: "Reviews", count: waiting.length },
            ...(isHr ? [{ value: "cycle", label: "Cycle progress" }] : []),
            {
              value: "notes",
              label: "Coaching notes",
              count: myNotes.filter((n) => !n.escalated).length,
            },
          ]}
          emphasise={["reviews"]}
        />

        <TabsContent value="reviews">
          <Panel
            bodyClassName="p-0"
            actions={
              <div className="flex flex-wrap gap-2">
                <NativeSelect
                  aria-label="Cycle"
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value)}
                  className="h-9 w-auto"
                >
                  <option value="all">All cycles</option>
                  {cycles.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </NativeSelect>
                <NativeSelect
                  aria-label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                  className="h-9 w-auto"
                >
                  <option value="all">All statuses</option>
                  <option value="mine">Waiting on me</option>
                  {REVIEW_FLOW.map((s) => (
                    <option key={s} value={s}>
                      {REVIEW_STATUS_LABEL[s]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            }
            title="Reviews"
            description="Open one to do your step, or to see where it has got to."
          >
            {list.length === 0 ? (
              <EmptyState
                icon={BadgeCheck}
                title="No reviews match"
                description="Try a different cycle or status."
              />
            ) : (
              <ul className="divide-y">
                {list.map((r) => {
                  const emp = store.employeeById(r.employeeId)
                  const manager = store.employeeById(r.managerId)
                  const mine = isWaitingOn(viewer, r)
                  const late = isOverdue(r, TODAY_ISO)
                  const owner = ownerOf(r.status)
                  // The employee does not see the rating until it is shared.
                  const showRating =
                    r.rating !== null &&
                    (viewer.employeeId !== r.employeeId ||
                      ["shared", "complete"].includes(r.status) ||
                      isHr)
                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                    >
                      {emp && <Initials person={emp} size="md" />}
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setOpenReview(r.id)}
                            className="text-sm font-medium hover:underline"
                          >
                            {fullName(emp)}
                          </button>
                          <Pill tone="neutral">{r.cycle}</Pill>
                          {mine && <Pill tone="info">Your turn</Pill>}
                          {late && <Pill tone="danger">Overdue</Pill>}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Reviewer {fullName(manager)} · due{" "}
                          {formatDate(r.dueOn)}
                          {owner &&
                            ` · waiting on ${OWNER_LABEL[owner].toLowerCase()}`}
                          {r.sharedOn && ` · shared ${formatDate(r.sharedOn)}`}
                        </p>
                      </div>
                      {showRating && r.rating !== null && (
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
                      <Button
                        size="sm"
                        variant={mine ? "default" : "outline"}
                        onClick={() => setOpenReview(r.id)}
                      >
                        {mine ? STEP_ACTION[r.status] : "Open"}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </TabsContent>

        {isHr && (
          <TabsContent value="cycle">
            <CycleProgress
              reviews={visibleReviews}
              cycle={cycle === "all" ? (cycles[0] ?? "") : cycle}
              cycles={cycles}
              onCycle={setCycle}
              onOpen={setOpenReview}
              banner={justLaunched}
              onDismissBanner={() => setJustLaunched(null)}
            />
          </TabsContent>
        )}

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
                  disabled={!canWriteNotes}
                  title={
                    canWriteNotes ? undefined : "You have no direct reports"
                  }
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

      <ReviewSheet reviewId={openReview} onClose={() => setOpenReview(null)} />
      {launching && (
        <LaunchCycleDialog
          onClose={() => setLaunching(false)}
          onLaunched={(name, count) => {
            // Land where the result is, not on a list that looks unchanged.
            setCycle(name)
            setJustLaunched({ cycle: name, count })
            setTab("cycle")
          }}
        />
      )}
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

/**
 * Where every review in a cycle has got to, and who each one is waiting on —
 * the view HR chases from. Ratings are shown only once enough exist that no
 * single person can be picked out.
 */
function CycleProgress({
  reviews,
  cycle,
  cycles,
  onCycle,
  onOpen,
  banner,
  onDismissBanner,
}: {
  reviews: ReturnType<typeof useStore>["reviews"]
  cycle: string
  cycles: string[]
  onCycle: (c: string) => void
  onOpen: (id: string) => void
  banner: { cycle: string; count: number } | null
  onDismissBanner: () => void
}) {
  const store = useStore()
  const inCycle = reviews.filter((r) => r.cycle === cycle)
  const byStatus = REVIEW_FLOW.map((s) => ({
    status: s,
    rows: inCycle.filter((r) => r.status === s),
  }))
  const late = inCycle.filter((r) => isOverdue(r, TODAY_ISO))
  const done = inCycle.filter((r) => r.status === "complete").length
  const shared = inCycle.filter(
    (r) => r.rating !== null && ["shared", "complete"].includes(r.status)
  )
  const buckets = ratingBuckets(shared)
  const top = Math.max(1, ...buckets.map((b) => b.count))

  const open = inCycle
    .filter((r) => r.status !== "complete")
    .sort(
      (a, b) =>
        Number(isOverdue(b, TODAY_ISO)) - Number(isOverdue(a, TODAY_ISO)) ||
        a.dueOn.localeCompare(b.dueOn)
    )

  function remindOne(r: (typeof open)[number], quiet = false) {
    const owner = ownerOf(r.status)
    const who =
      owner === "employee"
        ? store.employeeById(r.employeeId)
        : store.employeeById(r.managerId)
    store.addNotification({
      title: `${cycle} review reminder`,
      body: `${fullName(store.employeeById(r.employeeId))}'s review is waiting on ${
        owner ? OWNER_LABEL[owner].toLowerCase() : "someone"
      }${who ? ` (${fullName(who)})` : ""}, due ${formatDate(r.dueOn)}.`,
      kind: "alert",
      href: "/performance",
    })
    store.updateReview(
      r.id,
      { lastReminderOn: TODAY_ISO },
      "Sent a performance review reminder"
    )
    if (!quiet)
      toast.success(`Reminder sent to ${who ? fullName(who) : "them"}.`)
  }

  function remindOverdue() {
    late.forEach((r) => remindOne(r, true))
    toast.success(`Reminders sent for ${late.length} overdue reviews.`)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      {banner && banner.cycle === cycle && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-success-muted/40 px-4 py-3 text-sm lg:col-span-2">
          <span className="min-w-0 flex-1">
            <strong className="font-medium">{banner.cycle} is live.</strong>{" "}
            {banner.count} reviews opened, and each person has been asked for a
            self review. Chase anyone below as the due date nears.
          </span>
          <Button size="sm" variant="ghost" onClick={onDismissBanner}>
            Dismiss
          </Button>
        </div>
      )}
      <Panel
        title="Progress"
        description={
          cycle
            ? `${done} of ${inCycle.length} complete in ${cycle}.`
            : "No cycle yet. Launch one to begin."
        }
        actions={
          cycles.length > 1 && (
            <NativeSelect
              aria-label="Cycle"
              value={cycle}
              onChange={(e) => onCycle(e.target.value)}
              className="h-9 w-auto"
            >
              {cycles.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
          )
        }
      >
        <ul className="space-y-3">
          {byStatus.map(({ status, rows }) => (
            <li key={status}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span>
                  {REVIEW_STATUS_LABEL[status]}
                  {ownerOf(status) && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {OWNER_LABEL[ownerOf(status)!].toLowerCase()}
                    </span>
                  )}
                </span>
                <span className="tabular text-muted-foreground">
                  {rows.length}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${inCycle.length ? (rows.length / inCycle.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
        {late.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4 text-sm">
            <span className="flex-1 text-muted-foreground">
              {late.length} overdue.
            </span>
            <Button size="sm" variant="outline" onClick={remindOverdue}>
              Send reminders
            </Button>
          </div>
        )}
      </Panel>

      <Panel
        title="Rating distribution"
        description="Shared reviews only. Withheld while the group is small enough to identify someone."
      >
        {canShowAggregate(shared.length) ? (
          <ul className="space-y-2.5">
            {buckets.map((b) => (
              <li key={b.rating} className="flex items-center gap-3 text-sm">
                <span className="tabular w-4 text-muted-foreground">
                  {b.rating}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(b.count / top) * 100}%` }}
                  />
                </div>
                <span className="tabular w-5 text-right text-muted-foreground">
                  {b.count}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" />
            {shared.length} shared so far. The distribution appears at{" "}
            {MIN_AGGREGATION_GROUP}.
          </p>
        )}
      </Panel>

      <Panel
        className="lg:col-span-2"
        title="Still open"
        description="Overdue first. Open one to see where it is stuck."
        bodyClassName="p-0"
      >
        {open.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Everything in this cycle is complete.
          </p>
        ) : (
          <ul className="divide-y">
            {open.map((r) => {
              const emp = store.employeeById(r.employeeId)
              const owner = ownerOf(r.status)
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3"
                >
                  {emp && <Initials person={emp} size="sm" />}
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{fullName(emp)}</span>
                      <ReviewBadge status={r.status} />
                      {isOverdue(r, TODAY_ISO) && (
                        <Pill tone="danger">Overdue</Pill>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Waiting on{" "}
                      {owner ? OWNER_LABEL[owner].toLowerCase() : "—"} · due{" "}
                      {formatDate(r.dueOn)}
                      {r.lastReminderOn &&
                        ` · reminded ${formatDate(r.lastReminderOn)}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => remindOne(r)}
                  >
                    Remind
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onOpen(r.id)}
                  >
                    Open
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}
