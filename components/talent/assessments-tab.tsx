"use client"

import * as React from "react"
import {
  ClipboardCheck,
  Clock,
  Copy,
  ExternalLink,
  FileQuestion,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Panel, Pill } from "@/components/common"
import { RowActions } from "@/components/common/row-actions"
import { FilterSearch } from "@/components/common/filter-bar"
import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { NativeSelect } from "./form"
import { QuestionDialog } from "./question-dialog"
import { TestDialog } from "./test-dialog"
import {
  ExtraTimeDialog,
  FlagsSummary,
  ReviewAssessmentDialog,
} from "./review-assessment"
import { copyText } from "./booking-tab"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { formatDateTime } from "@/lib/format"
import {
  QUESTION_KIND_LABEL,
  outcomeOf,
  timeTakenMin,
} from "@/lib/assess/logic"
import type {
  AssessmentTest,
  Question,
  QuestionKind,
  TestInvitation,
} from "@/lib/types"

export function assessUrl(token: string) {
  return `${window.location.origin}/assess/${token}`
}

const STATUS: Record<TestInvitation["status"], string> = {
  invited: "Not started",
  started: "In progress",
  submitted: "Submitted",
  expired: "Expired",
}

export function AssessmentsTab({
  onOpenCandidate,
}: {
  onOpenCandidate: (id: string) => void
}) {
  const store = useStore()
  const isHr = has(store.viewer, "hr_admin")
  const [sub, setSub] = React.useState("results")
  const [q, setQ] = React.useState("")
  const [kind, setKind] = React.useState<QuestionKind | "all">("all")
  const [editQ, setEditQ] = React.useState<Question | "new" | null>(null)
  const [editT, setEditT] = React.useState<AssessmentTest | "new" | null>(null)
  const [review, setReview] = React.useState<string | null>(null)
  const [extra, setExtra] = React.useState<string | null>(null)
  const [del, setDel] = React.useState<
    { kind: "q"; q: Question } | { kind: "t"; t: AssessmentTest } | null
  >(null)

  const needle = q.trim().toLowerCase()
  const questions = store.questionBank.filter(
    (x) =>
      (kind === "all" || x.kind === kind) &&
      (!needle ||
        `${x.prompt} ${x.skill} ${x.level}`.toLowerCase().includes(needle))
  )
  const waiting = store.invitations.filter(
    (i) => i.status === "submitted" && !i.reviewed
  ).length

  return (
    <Tabs value={sub} onValueChange={setSub}>
      <SegmentedTabs
        className="mb-5"
        tabs={[
          { value: "results", label: "Results", count: waiting },
          { value: "tests", label: "Tests" },
          { value: "bank", label: "Question bank" },
        ]}
        emphasise={["results"]}
      />

      <TabsContent value="results">
        <Panel
          title="Invitations and results"
          description="Auto-marked questions score at once. Written answers wait here for a reviewer."
          bodyClassName="p-0"
        >
          {store.invitations.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No assessments sent yet"
              description="Open a candidate and send them a test."
            />
          ) : (
            <ul className="divide-y">
              {store.invitations.map((inv) => {
                const t = store.tests.find((x) => x.id === inv.testId)
                const c = store.candidates.find((x) => x.id === inv.candidateId)
                const o = t ? outcomeOf(inv, t, store.questionBank) : null
                return (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <button
                          type="button"
                          className="font-medium hover:underline"
                          onClick={() => c && onOpenCandidate(c.id)}
                        >
                          {c?.name ?? "Unknown"}
                        </button>
                        <Pill
                          tone={
                            inv.status === "submitted"
                              ? "success"
                              : inv.status === "started"
                                ? "info"
                                : "neutral"
                          }
                        >
                          {STATUS[inv.status]}
                        </Pill>
                        {inv.status === "submitted" && !inv.reviewed && (
                          <Pill tone="warning">Needs review</Pill>
                        )}
                        {inv.reviewed && <Pill tone="success">Reviewed</Pill>}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t?.name} · invited {formatDateTime(inv.invitedOn)}
                        {inv.status === "submitted" &&
                          ` · ${timeTakenMin(inv) ?? "?"} min`}
                      </p>
                      {inv.status !== "invited" && (
                        <div className="mt-1">
                          <FlagsSummary inv={inv} />
                        </div>
                      )}
                    </div>
                    {inv.status === "submitted" && o && (
                      <div className="text-right text-sm">
                        <p className="tabular font-medium">
                          {o.score}/{o.max} · {o.pct}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {o.passed === null
                            ? `${o.pending} to mark`
                            : o.passed
                              ? "Pass"
                              : "Below pass mark"}
                        </p>
                      </div>
                    )}
                    {isHr && inv.status === "submitted" && (
                      <Button
                        size="sm"
                        variant={inv.reviewed ? "outline" : "default"}
                        onClick={() => setReview(inv.id)}
                      >
                        {inv.reviewed ? "View review" : "Review"}
                      </Button>
                    )}
                    {isHr &&
                      (inv.status === "invited" ||
                        inv.status === "started") && (
                        <RowActions
                          label={`Actions for ${c?.name}`}
                          actions={[
                            {
                              label: "Copy link",
                              icon: Copy,
                              onSelect: () =>
                                copyText(assessUrl(inv.token), "Link copied."),
                            },
                            {
                              label: "Open as the candidate",
                              icon: ExternalLink,
                              onSelect: () =>
                                window.open(assessUrl(inv.token), "_blank"),
                            },
                            {
                              label: "Grant extra time",
                              icon: Clock,
                              onSelect: () => setExtra(inv.id),
                            },
                          ]}
                        />
                      )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </TabsContent>

      <TabsContent value="tests">
        <Panel
          title="Tests"
          description="A test is a set of questions with a time limit and a pass mark, used for one role or many."
          bodyClassName="p-0"
          actions={
            isHr && (
              <Button size="sm" onClick={() => setEditT("new")}>
                <Plus className="size-3.5" />
                New test
              </Button>
            )
          }
        >
          {store.tests.length === 0 ? (
            <EmptyState
              icon={FileQuestion}
              title="No tests yet"
              description="Build one from the question bank."
            />
          ) : (
            <ul className="divide-y">
              {store.tests.map((t) => {
                const inBank = store.questionBank.filter((x) =>
                  t.questionIds.includes(x.id)
                )
                const marks = inBank.reduce((s, x) => s + x.marks, 0)
                const sent = store.invitations.filter((i) => i.testId === t.id)
                const done = sent.filter(
                  (i) => i.status === "submitted" && i.reviewed
                )
                const passed = done.filter(
                  (i) => outcomeOf(i, t, store.questionBank).passed
                ).length
                return (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">{t.name}</span>
                        {!t.active && <Pill tone="warning">Closed</Pill>}
                        {t.requiredForOffer && (
                          <Pill tone="info">Needed for offer</Pill>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t.pickCount
                          ? `${t.pickCount} random of ${inBank.length}`
                          : `${inBank.length} questions`}{" "}
                        · {marks} marks · {t.durationMin} min · pass{" "}
                        {t.passMarkPct}% · {sent.length} sent
                        {done.length > 0 &&
                          ` · ${passed} of ${done.length} reviewed passed`}
                      </p>
                    </div>
                    {isHr && (
                      <RowActions
                        label={`Actions for ${t.name}`}
                        actions={[
                          {
                            label: "Edit",
                            icon: Pencil,
                            onSelect: () => setEditT(t),
                          },
                          {
                            label: t.active
                              ? "Close to new invitations"
                              : "Open to invitations",
                            icon: ClipboardCheck,
                            onSelect: () => {
                              store.saveTest({ ...t, active: !t.active })
                              toast.success(t.active ? "Closed." : "Open.")
                            },
                          },
                          {
                            label: "Delete",
                            icon: Trash2,
                            destructive: true,
                            onSelect: () => setDel({ kind: "t", t }),
                          },
                        ]}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </TabsContent>

      <TabsContent value="bank">
        <Panel
          title={`Question bank · ${store.questionBank.length}`}
          description="Shared across the company, tagged by skill and level."
          bodyClassName="p-0"
          actions={
            isHr && (
              <Button size="sm" onClick={() => setEditQ("new")}>
                <Plus className="size-3.5" />
                New question
              </Button>
            )
          }
        >
          <div className="flex flex-wrap gap-2 border-b p-3">
            <div className="min-w-[220px] flex-1">
              <FilterSearch
                value={q}
                onChange={setQ}
                placeholder="Search questions, skills, levels"
              />
            </div>
            <NativeSelect
              aria-label="Type"
              value={kind}
              onChange={(e) => setKind(e.target.value as QuestionKind | "all")}
              className="h-10 w-auto"
            >
              <option value="all">All types</option>
              {(Object.keys(QUESTION_KIND_LABEL) as QuestionKind[]).map((k) => (
                <option key={k} value={k}>
                  {QUESTION_KIND_LABEL[k]}
                </option>
              ))}
            </NativeSelect>
          </div>
          {questions.length === 0 ? (
            <EmptyState icon={Search} title="No questions match" />
          ) : (
            <ul className="divide-y">
              {questions.map((x) => (
                <li
                  key={x.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm">{x.prompt}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {QUESTION_KIND_LABEL[x.kind]} · {x.skill} · {x.level} ·{" "}
                      {x.marks} marks
                      {x.code &&
                        ` · ${x.code.tests.length} tests (${x.code.tests.filter((t) => t.hidden).length} hidden)`}
                    </p>
                  </div>
                  {isHr && (
                    <RowActions
                      label="Question actions"
                      actions={[
                        {
                          label: "Edit",
                          icon: Pencil,
                          onSelect: () => setEditQ(x),
                        },
                        {
                          label: "Delete",
                          icon: Trash2,
                          destructive: true,
                          onSelect: () => setDel({ kind: "q", q: x }),
                        },
                      ]}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </TabsContent>

      {editQ && (
        <QuestionDialog
          existing={editQ === "new" ? undefined : editQ}
          onClose={() => setEditQ(null)}
        />
      )}
      {editT && (
        <TestDialog
          existing={editT === "new" ? undefined : editT}
          onClose={() => setEditT(null)}
        />
      )}
      {review && (
        <ReviewAssessmentDialog
          invId={review}
          onClose={() => setReview(null)}
        />
      )}
      {extra && (
        <ExtraTimeDialog invId={extra} onClose={() => setExtra(null)} />
      )}
      {del && (
        <FormDialog
          title={
            del.kind === "q" ? "Delete this question?" : "Delete this test?"
          }
          description={
            del.kind === "q" ? del.q.prompt.slice(0, 90) : del.t.name
          }
          onClose={() => setDel(null)}
          footer={
            <>
              <Button variant="ghost" size="lg" onClick={() => setDel(null)}>
                Keep it
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => {
                  if (del.kind === "q") store.deleteQuestion(del.q.id)
                  else store.deleteTest(del.t.id)
                  toast.success("Deleted.")
                  setDel(null)
                }}
              >
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            {del.kind === "q"
              ? "Tests stop asking it. Papers already issued keep their results."
              : "Invitations already sent keep working, and their results stay."}
          </p>
        </FormDialog>
      )}
    </Tabs>
  )
}
