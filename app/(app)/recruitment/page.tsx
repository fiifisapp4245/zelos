"use client"

import * as React from "react"
import Link from "next/link"
import {
  Briefcase,
  CheckCircle2,
  Pencil,
  PauseCircle,
  PlayCircle,
  Plus,
  Star,
  UserPlus,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  PageHeader,
  Panel,
  Pill,
  StatCard,
} from "@/components/common"
import { RequisitionBadge } from "@/components/common/status"
import { RowActions } from "@/components/common/row-actions"
import { Button } from "@/components/ui/button"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { CandidateSheet } from "@/components/talent/candidate-sheet"
import {
  AddCandidateDialog,
  RequisitionDialog,
} from "@/components/talent/recruitment-dialogs"
import { NativeSelect } from "@/components/talent/form"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import {
  EMPLOYMENT_TYPE_LABEL,
  PIPELINE_STAGES,
  STAGE_LABEL,
  formatDate,
  fullName,
  ghs,
  relativeTime,
} from "@/lib/format"
import {
  advanceBlocker,
  daysToFill,
  funnel,
  nextStage,
} from "@/lib/talent/recruitment"
import type { Candidate, CandidateStage, Requisition } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function RecruitmentPage() {
  const store = useStore()
  const { viewer, requisitions, candidates } = store
  const isHr = has(viewer, "hr_admin")

  const [tab, setTab] = React.useState("pipeline")
  const [reqFilter, setReqFilter] = React.useState("all")
  const [openCandidate, setOpenCandidate] = React.useState<string | null>(null)
  const [editing, setEditing] = React.useState<Requisition | "new" | null>(null)
  const [adding, setAdding] = React.useState<string | "any" | null>(null)

  // A hiring manager sees their own reqs; HR sees the whole board.
  const scope = isHr
    ? requisitions
    : requisitions.filter((r) => r.hiringManagerId === viewer.employeeId)
  const scopeIds = new Set(scope.map((r) => r.id))
  const pool = candidates.filter((c) => scopeIds.has(c.requisitionId))
  const shown =
    reqFilter === "all"
      ? pool
      : pool.filter((c) => c.requisitionId === reqFilter)

  const open = scope.filter((r) => r.status === "open")
  const openings = open.reduce((s, r) => s + r.openings, 0)
  const inPipeline = pool.filter(
    (c) => !["hired", "rejected"].includes(c.stage)
  ).length
  const offers = pool.filter((c) => c.stage === "offer").length
  const rejected = shown.filter((c) => c.stage === "rejected")
  const rows = funnel(shown)

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Talent" },
        { label: "Recruitment" },
      ]}
    >
      <PageHeader
        title="Recruitment"
        description="Requisitions and candidate pipeline. A hired candidate becomes a pre-hire employee record — the same record that carries through to retirement."
        actions={
          <>
            {scope.some((r) => ["open", "on_hold"].includes(r.status)) && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setAdding("any")}
              >
                <UserPlus className="size-4" />
                Add candidate
              </Button>
            )}
            {isHr && (
              <Button size="lg" onClick={() => setEditing("new")}>
                <Plus className="size-4" />
                New requisition
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open requisitions"
          value={open.length}
          hint={`${openings} openings`}
        />
        <StatCard
          label="In pipeline"
          value={inPipeline}
          hint="Active candidates"
        />
        <StatCard label="At offer" value={offers} hint="Awaiting acceptance" />
        {isHr ? (
          <StatCard
            label="Monthly budget committed"
            value={ghs(
              open.reduce((s, r) => s + r.budgetMonthly * r.openings, 0),
              { compact: true }
            )}
            hint="If all openings fill"
          />
        ) : (
          <StatCard
            label="Hired"
            value={pool.filter((c) => c.stage === "hired").length}
            hint="From your requisitions"
          />
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <SegmentedTabs
            tabs={[
              { value: "pipeline", label: "Pipeline" },
              { value: "requisitions", label: "Requisitions" },
            ]}
          />
          {tab === "pipeline" && scope.length > 0 && (
            <NativeSelect
              aria-label="Filter by requisition"
              value={reqFilter}
              onChange={(e) => setReqFilter(e.target.value)}
              className="h-9 w-auto min-w-[220px]"
            >
              <option value="all">All requisitions</option>
              {scope.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} — {r.id}
                </option>
              ))}
            </NativeSelect>
          )}
        </div>

        <TabsContent value="pipeline">
          {shown.length === 0 ? (
            <Panel>
              <EmptyState
                icon={UserPlus}
                title="No candidates yet"
                description="Add a candidate to an open requisition to start the pipeline."
              />
            </Panel>
          ) : (
            <div className="space-y-5">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {PIPELINE_STAGES.map((stage) => (
                  <StageColumn
                    key={stage}
                    stage={stage}
                    candidates={shown}
                    onOpen={setOpenCandidate}
                  />
                ))}
              </div>

              <Panel
                title="Where candidates are"
                description="Everyone still in the process or hired, by the furthest stage they reached."
              >
                <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((r, i) => {
                    const first = rows[0].reached || 1
                    return (
                      <li key={r.stage}>
                        <div className="mb-1 flex items-baseline justify-between text-sm">
                          <span>{STAGE_LABEL[r.stage]}</span>
                          <span className="tabular text-muted-foreground">
                            {r.reached}
                            {i > 0 && rows[i - 1].reached > 0 && (
                              <>
                                {" "}
                                ·{" "}
                                {Math.round(
                                  (r.reached / rows[i - 1].reached) * 100
                                )}
                                %
                              </>
                            )}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${(r.reached / first) * 100}%` }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </Panel>

              {rejected.length > 0 && (
                <Panel
                  title={`Rejected (${rejected.length})`}
                  description="Kept with the reason, so a decision can be explained later."
                  bodyClassName="p-0"
                >
                  <ul className="divide-y">
                    {rejected.map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenCandidate(c.id)}
                          className="font-medium hover:underline"
                        >
                          {c.name}
                        </button>
                        <span className="text-muted-foreground">
                          {
                            requisitions.find((r) => r.id === c.requisitionId)
                              ?.title
                          }
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {c.rejectedReason}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requisitions">
          <Panel bodyClassName="p-0">
            {scope.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No requisitions"
                description={
                  isHr
                    ? "Create one to start hiring."
                    : "Requisitions you are hiring manager for appear here."
                }
              />
            ) : (
              <ul className="divide-y">
                {scope.map((r) => {
                  const applicants = candidates.filter(
                    (c) => c.requisitionId === r.id
                  )
                  const hired = applicants.filter(
                    (c) => c.stage === "hired"
                  ).length
                  const fill = daysToFill(r, candidates)
                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-4 px-5 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{r.title}</span>
                          <RequisitionBadge status={r.status} />
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {r.id}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {r.department} · {r.branch} ·{" "}
                          {EMPLOYMENT_TYPE_LABEL[r.employmentType]} · hiring
                          manager{" "}
                          {fullName(store.employeeById(r.hiringManagerId))}
                        </p>
                      </div>
                      <Stat
                        label="Target start"
                        value={formatDate(r.targetStartDate)}
                      />
                      <Stat
                        label="Filled"
                        value={`${hired}/${r.openings}`}
                        hint={fill !== null ? `${fill} days open` : undefined}
                      />
                      <Stat
                        label="Applicants"
                        value={String(applicants.length)}
                      />
                      {isHr && (
                        <Stat
                          label="Budget / mo"
                          value={ghs(r.budgetMonthly, { compact: true })}
                        />
                      )}
                      <RowActions
                        label={`Actions for ${r.title}`}
                        actions={[
                          {
                            label: "View pipeline",
                            icon: Users,
                            onSelect: () => {
                              setReqFilter(r.id)
                              setTab("pipeline")
                            },
                          },
                          ["open", "on_hold"].includes(r.status) && {
                            label: "Add candidate",
                            icon: UserPlus,
                            onSelect: () => setAdding(r.id),
                          },
                          isHr && {
                            label: "Edit",
                            icon: Pencil,
                            onSelect: () => setEditing(r),
                          },
                          isHr &&
                            r.status !== "open" &&
                            r.status !== "filled" &&
                            r.status !== "closed" && {
                              label: "Open requisition",
                              icon: PlayCircle,
                              onSelect: () => {
                                store.updateRequisition(r.id, {
                                  status: "open",
                                })
                                toast.success(`${r.title} is now open.`)
                              },
                            },
                          isHr &&
                            (r.status === "closed" ||
                              r.status === "filled") && {
                              label: "Reopen",
                              icon: PlayCircle,
                              onSelect: () => {
                                store.updateRequisition(r.id, {
                                  status: "open",
                                })
                                toast.success(`${r.title} reopened.`)
                              },
                            },
                          isHr &&
                            r.status === "open" && {
                              label: "Put on hold",
                              icon: PauseCircle,
                              onSelect: () => {
                                store.updateRequisition(r.id, {
                                  status: "on_hold",
                                })
                                toast.success(`${r.title} put on hold.`)
                              },
                            },
                          isHr &&
                            r.status !== "filled" &&
                            r.status !== "closed" && {
                              label: "Mark filled",
                              icon: CheckCircle2,
                              onSelect: () => {
                                store.updateRequisition(r.id, {
                                  status: "filled",
                                })
                                toast.success(`${r.title} marked filled.`)
                              },
                            },
                          isHr &&
                            r.status !== "closed" && {
                              label: "Close requisition",
                              icon: Briefcase,
                              destructive: true,
                              onSelect: () => {
                                store.updateRequisition(r.id, {
                                  status: "closed",
                                })
                                toast.success(`${r.title} closed.`)
                              },
                            },
                        ]}
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      <CandidateSheet
        candidateId={openCandidate}
        onClose={() => setOpenCandidate(null)}
      />
      {editing && (
        <RequisitionDialog
          existing={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {adding && (
        <AddCandidateDialog
          requisitionId={adding === "any" ? undefined : adding}
          onClose={() => setAdding(null)}
        />
      )}
    </PageShell>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="text-right text-xs">
      <p className="text-muted-foreground">{label}</p>
      <p className="tabular font-medium">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function StageColumn({
  stage,
  candidates,
  onOpen,
}: {
  stage: CandidateStage
  candidates: Candidate[]
  onOpen: (id: string) => void
}) {
  const store = useStore()
  const rows = candidates.filter((c) => c.stage === stage)

  function advance(c: Candidate) {
    const next = nextStage(c.stage)
    if (!next) return
    const blocker = advanceBlocker(c)
    if (blocker) {
      toast.error(blocker)
      onOpen(c.id)
      return
    }
    if (next === "hired") {
      if (store.hireCandidate(c.id))
        toast.success(
          `${c.name} hired. Pre-hire record and onboarding tasks created.`
        )
      return
    }
    store.moveCandidate(c.id, next)
    toast.success(`${c.name} moved to ${STAGE_LABEL[next]}.`)
  }

  return (
    <div className="w-[240px] shrink-0 self-start rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <p className="text-sm font-medium">{STAGE_LABEL[stage]}</p>
        <span className="tabular rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
          {rows.length}
        </span>
      </div>
      <ul className="space-y-2 p-2">
        {rows.length === 0 && (
          <li className="px-1 py-4 text-center text-xs text-muted-foreground">
            Empty
          </li>
        )}
        {rows.map((c) => {
          const blocker = advanceBlocker(c)
          const req = store.requisitions.find((r) => r.id === c.requisitionId)
          return (
            <li key={c.id} className="rounded-lg border p-2.5">
              <button
                type="button"
                onClick={() => onOpen(c.id)}
                className="block w-full rounded text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Open ${c.name}`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white",
                      c.avatarTone
                    )}
                  >
                    {c.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {req?.title ?? c.source}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className="flex items-center gap-0.5"
                    aria-label={`${c.rating} of 5`}
                  >
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "size-3",
                          i < c.rating
                            ? "fill-warning text-warning"
                            : "text-muted-foreground/30"
                        )}
                      />
                    ))}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {relativeTime(c.appliedOn)}
                  </span>
                </div>
                {c.stage === "offer" && c.offer && (
                  <Pill
                    tone={c.offer.status === "accepted" ? "success" : "info"}
                    className="mt-2"
                  >
                    Offer {c.offer.status === "sent" ? "out" : c.offer.status}
                  </Pill>
                )}
                {c.stage === "interview" &&
                  c.interviews.some((i) => i.score === null) && (
                    <Pill tone="warning" className="mt-2">
                      Feedback due
                    </Pill>
                  )}
              </button>
              {stage !== "hired" ? (
                <Button
                  variant="outline"
                  size="xs"
                  className="mt-2 w-full"
                  title={blocker ?? undefined}
                  onClick={() => advance(c)}
                >
                  {nextStage(stage) === "hired" ? "Hire" : "Advance"}
                </Button>
              ) : c.employeeId ? (
                <Button
                  variant="outline"
                  size="xs"
                  className="mt-2 w-full"
                  asChild
                >
                  <Link href={`/employees/${c.employeeId}`}>Open record</Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="xs"
                  className="mt-2 w-full"
                  onClick={() => {
                    if (store.hireCandidate(c.id))
                      toast.success("Pre-hire record created.")
                  }}
                >
                  Create record
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
