"use client"

import * as React from "react"
import Link from "next/link"
import {
  Briefcase,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Plus,
  Star,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/common"
import { RequisitionBadge } from "@/components/common/status"
import { RowActions } from "@/components/common/row-actions"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import type { Candidate, CandidateStage } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function RecruitmentPage() {
  const store = useStore()
  const { viewer, requisitions, candidates } = store

  // A hiring manager sees their own reqs; HR sees the whole board.
  const scope = has(viewer, "hr_admin")
    ? requisitions
    : requisitions.filter((r) => r.hiringManagerId === viewer.employeeId)
  const scopeIds = new Set(scope.map((r) => r.id))
  const pool = candidates.filter((c) => scopeIds.has(c.requisitionId))

  const open = scope.filter((r) => r.status === "open")
  const openings = open.reduce((s, r) => s + r.openings, 0)
  const inPipeline = pool.filter(
    (c) => !["hired", "rejected"].includes(c.stage)
  ).length
  const offers = pool.filter((c) => c.stage === "offer").length

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
          has(viewer, "hr_admin") && (
            <Button
              size="lg"
              onClick={() => toast("Opens the requisition form.")}
            >
              <Plus className="size-4" />
              New requisition
            </Button>
          )
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
        <StatCard
          label="Monthly budget committed"
          value={ghs(
            open.reduce((s, r) => s + r.budgetMonthly * r.openings, 0),
            { compact: true }
          )}
          hint="If all openings fill"
        />
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList className="mb-5 h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0">
          {[
            ["pipeline", "Pipeline"],
            ["requisitions", "Requisitions"],
          ].map(([v, l]) => (
            <TabsTrigger
              key={v}
              value={v}
              className="flex-none rounded-none border-0 border-b-2 border-transparent px-3.5 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              {l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="pipeline">
          {pool.length === 0 ? (
            <Panel>
              <EmptyState
                icon={UserPlus}
                title="No candidates in your requisitions"
              />
            </Panel>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {PIPELINE_STAGES.map((stage) => (
                <StageColumn key={stage} stage={stage} candidates={pool} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requisitions">
          <Panel bodyClassName="p-0">
            {scope.length === 0 ? (
              <EmptyState icon={Briefcase} title="No requisitions" />
            ) : (
              <ul className="divide-y">
                {scope.map((r) => {
                  const applicants = candidates.filter(
                    (c) => c.requisitionId === r.id
                  )
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
                      <div className="text-right text-xs">
                        <p className="text-muted-foreground">Target start</p>
                        <p className="tabular font-medium">
                          {formatDate(r.targetStartDate)}
                        </p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-muted-foreground">Openings</p>
                        <p className="tabular font-medium">{r.openings}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-muted-foreground">Applicants</p>
                        <p className="tabular font-medium">
                          {applicants.length}
                        </p>
                      </div>
                      {has(viewer, "hr_admin") && (
                        <div className="text-right text-xs">
                          <p className="text-muted-foreground">Budget / mo</p>
                          <p className="tabular font-medium">
                            {ghs(r.budgetMonthly, { compact: true })}
                          </p>
                        </div>
                      )}
                      <RowActions
                        label={`Actions for ${r.title}`}
                        actions={[
                          r.status !== "open" && {
                            label: "Open requisition",
                            icon: PlayCircle,
                            onSelect: () => {
                              store.updateRequisition(r.id, { status: "open" })
                              toast.success(`${r.title} is now open.`)
                            },
                          },
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
                          r.status !== "filled" && {
                            label: "Mark filled",
                            icon: CheckCircle2,
                            onSelect: () => {
                              store.updateRequisition(r.id, {
                                status: "filled",
                              })
                              toast.success(`${r.title} marked filled.`)
                            },
                          },
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
    </PageShell>
  )
}

function StageColumn({
  stage,
  candidates,
}: {
  stage: CandidateStage
  candidates: Candidate[]
}) {
  const store = useStore()
  const rows = candidates.filter((c) => c.stage === stage)

  function advance(c: Candidate) {
    const i = PIPELINE_STAGES.indexOf(c.stage)
    const next = PIPELINE_STAGES[i + 1]
    if (!next) return
    store.moveCandidate(c.id, next)
    if (next === "hired") {
      toast.success(
        `${c.name} marked hired — create their pre-hire record next.`
      )
    } else {
      toast.success(`${c.name} moved to ${STAGE_LABEL[next]}.`)
    }
  }

  return (
    <div className="w-[230px] shrink-0 self-start rounded-xl bg-card">
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
        {rows.map((c) => (
          <li key={c.id} className="rounded-lg bg-muted/40 p-2.5">
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
                  {c.source}
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
            {stage !== "hired" && (
              <Button
                variant="outline"
                size="xs"
                className="mt-2 w-full"
                onClick={() => advance(c)}
              >
                Advance
              </Button>
            )}
            {stage === "hired" && (
              <Button
                variant="outline"
                size="xs"
                className="mt-2 w-full"
                asChild
              >
                <Link href="/employees/new">Create record</Link>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
