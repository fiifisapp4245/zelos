"use client"

import * as React from "react"
import {
  BarChart3,
  CheckCircle2,
  MessageSquareQuote,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  PageHeader,
  Panel,
  Pill,
  StatCard,
  type Tone,
} from "@/components/common"
import { RowActions } from "@/components/common/row-actions"
import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import {
  BuildDialog,
  ResultsDialog,
  TakeDialog,
} from "@/components/surveys/survey-dialogs"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { TODAY_ISO, formatDate } from "@/lib/format"
import { audienceLabel, audienceMembers } from "@/lib/announcements"
import { canRespond, isOpen } from "@/lib/surveys"
import type { Survey } from "@/lib/types"

const STATUS: Record<Survey["status"], { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  open: { label: "Open", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
}

export default function SurveysPage() {
  const store = useStore()
  const isHr = has(store.viewer, "hr_admin")
  const me = store.employeeById(store.viewer.employeeId)
  const [taking, setTaking] = React.useState<Survey | null>(null)
  const [building, setBuilding] = React.useState<Survey | "new" | null>(null)
  const [results, setResults] = React.useState<Survey | null>(null)
  const [deleting, setDeleting] = React.useState<Survey | null>(null)

  const mine = me
    ? store.surveys
        .filter((s) => s.status !== "draft")
        .map((s) => ({
          s,
          can: canRespond(s, me, store.surveyParticipation, TODAY_ISO),
        }))
        .filter((x) => x.can !== "not_invited")
    : []
  const todo = mine.filter((x) => x.can === "yes")

  return (
    <PageShell
      width="wide"
      crumbs={[{ label: "Workspace", href: "/overview" }, { label: "Surveys" }]}
    >
      <PageHeader
        title="Pulse surveys"
        description="Short, anonymous check-ins. Your answers are never linked to your name, and results are only shown for groups big enough that nobody can be picked out."
        actions={
          isHr && (
            <Button size="lg" onClick={() => setBuilding("new")}>
              <Plus className="size-4" />
              New survey
            </Button>
          )
        }
      />

      {todo.length > 0 && (
        <div className="mb-6 space-y-3">
          {todo.map(({ s }) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-success-muted/30 px-5 py-4"
            >
              <MessageSquareQuote className="size-5 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">
                  {s.questions.length} questions · anonymous
                  {s.closesOn && ` · closes ${formatDate(s.closesOn)}`}
                </p>
              </div>
              <Button onClick={() => setTaking(s)}>Take the survey</Button>
            </div>
          ))}
        </div>
      )}

      {!isHr && (
        <Panel title="Your surveys" bodyClassName="p-0">
          {mine.length === 0 ? (
            <EmptyState
              icon={MessageSquareQuote}
              title="No surveys right now"
              description="When there is one for you, it appears here."
            />
          ) : (
            <ul className="divide-y">
              {mine.map(({ s, can }) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm"
                >
                  <span className="min-w-0 flex-1 font-medium">{s.title}</span>
                  {can === "done" ? (
                    <span className="flex items-center gap-1.5 text-primary">
                      <CheckCircle2 className="size-4" />
                      Answered
                    </span>
                  ) : can === "closed" ? (
                    <Pill tone="neutral">Closed</Pill>
                  ) : (
                    <Button size="sm" onClick={() => setTaking(s)}>
                      Take it
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {isHr && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Open"
              value={store.surveys.filter((s) => isOpen(s, TODAY_ISO)).length}
            />
            <StatCard
              label="Drafts"
              value={store.surveys.filter((s) => s.status === "draft").length}
            />
            <StatCard
              label="Closed"
              value={store.surveys.filter((s) => s.status === "closed").length}
            />
          </div>
          <Panel title="All surveys" bodyClassName="p-0">
            {store.surveys.length === 0 ? (
              <EmptyState
                icon={MessageSquareQuote}
                title="No surveys yet"
                description="Create a short pulse survey to hear how people are doing."
              />
            ) : (
              <ul className="divide-y">
                {store.surveys.map((s) => {
                  const invited = audienceMembers(s, store.employees).length
                  const answered = store.surveyResponses.filter(
                    (r) => r.surveyId === s.id
                  ).length
                  return (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium">{s.title}</span>
                          <Pill tone={STATUS[s.status].tone}>
                            {STATUS[s.status].label}
                          </Pill>
                          <Pill tone="neutral">{audienceLabel(s)}</Pill>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {s.questions.length} questions · {answered} of{" "}
                          {invited} answered
                          {s.closesOn && ` · closes ${formatDate(s.closesOn)}`}
                        </p>
                      </div>
                      {s.status !== "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setResults(s)}
                        >
                          <BarChart3 className="size-3.5" />
                          Results
                        </Button>
                      )}
                      {s.status === "draft" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            store.setSurveyStatus(s.id, "open")
                            toast.success("Opened.")
                          }}
                        >
                          Open it
                        </Button>
                      )}
                      <RowActions
                        label={`Actions for ${s.title}`}
                        actions={[
                          s.status !== "closed" && {
                            label: "Edit",
                            icon: Pencil,
                            onSelect: () => setBuilding(s),
                          },
                          s.status === "open" && {
                            label: "Remind people who have not answered",
                            onSelect: () => {
                              const n = store.remindSurvey(s.id)
                              toast.success(
                                n
                                  ? `Reminder emailed to ${n}. It is in the Outbox.`
                                  : "Everyone has answered."
                              )
                            },
                          },
                          s.status === "open" && {
                            label: "Close the survey",
                            onSelect: () => {
                              store.setSurveyStatus(s.id, "closed")
                              toast.success("Closed. No more answers.")
                            },
                          },
                          s.status === "closed" && {
                            label: "Reopen",
                            onSelect: () => {
                              store.setSurveyStatus(s.id, "open")
                              toast.success("Reopened.")
                            },
                          },
                          answered === 0 && {
                            label: "Delete",
                            icon: Trash2,
                            destructive: true,
                            onSelect: () => setDeleting(s),
                          },
                        ]}
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </>
      )}

      {taking && <TakeDialog survey={taking} onClose={() => setTaking(null)} />}
      {building && (
        <BuildDialog
          existing={building === "new" ? undefined : building}
          onClose={() => setBuilding(null)}
        />
      )}
      {results && (
        <ResultsDialog survey={results} onClose={() => setResults(null)} />
      )}
      {deleting && (
        <FormDialog
          title="Delete this survey?"
          description={deleting.title}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setDeleting(null)}
              >
                Keep it
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => {
                  store.deleteSurvey(deleting.id)
                  toast.success("Deleted.")
                  setDeleting(null)
                }}
              >
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            Only a survey with no answers can be deleted. One with answers is
            closed instead, so the record stays.
          </p>
        </FormDialog>
      )}
    </PageShell>
  )
}
