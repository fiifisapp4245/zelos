"use client"

import * as React from "react"
import Link from "next/link"
import {
  CheckCircle2,
  Circle,
  Download,
  FileText,
  Gavel,
  Lock,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Initials, Pill } from "@/components/common"
import { CaseBadge } from "@/components/common/status"
import {
  AppealDialog,
  AssignInvestigatorDialog,
  DismissDialog,
  HearingDialog,
  HeldDialog,
  OutcomeDialog,
  UploadDialog,
} from "./case-dialogs"
import { useStore } from "@/lib/store"
import { has, isSelf } from "@/lib/rbac"
import {
  CASE_STATE_LABEL,
  LIFECYCLE_TRANSITIONS,
  TODAY_ISO,
  formatDate,
  formatDateTime,
  fullName,
} from "@/lib/format"
import {
  DOC_CATEGORY_LABEL,
  SANCTION_LABEL,
  SEVERITY_LABEL,
  advanceBlockers,
  appealDeadline,
  caseSteps,
  isClosed,
  nextCaseState,
  type CaseStep,
} from "@/lib/talent/disciplinary"
import { fileFor } from "@/lib/talent/case-files"
import { daysBetween } from "@/lib/time"
import type {
  CaseDocumentCategory,
  CaseState,
  DisciplinaryCase,
} from "@/lib/types"
import { cn } from "@/lib/utils"

/** What the accused and their manager may see once a case is closed — nothing from the investigation itself. */
const OPEN_TO_SUBJECT: CaseDocumentCategory[] = [
  "allegation",
  "hearing_notice",
  "minutes",
  "outcome",
  "appeal",
]

type Dlg =
  | { kind: "upload"; category?: CaseDocumentCategory }
  | {
      kind:
        "investigator" | "hearing" | "held" | "outcome" | "dismiss" | "appeal"
    }
  | null

export function CaseSheet({
  caseId,
  onClose,
}: {
  caseId: string | null
  onClose: () => void
}) {
  const store = useStore()
  const c = store.cases.find((x) => x.id === caseId)
  if (!c) return null
  return <Body c={c} onClose={onClose} />
}

const STAGES: CaseState[] = ["open", "investigation", "hearing", "finalised"]

function Body({ c, onClose }: { c: DisciplinaryCase; onClose: () => void }) {
  const store = useStore()
  const { viewer } = store
  const emp = store.employeeById(c.employeeId)
  const isHr = has(viewer, "hr_admin")
  const isRaiser = c.raisedBy === viewer.employeeId
  const closed = isClosed(c)
  const [dlg, setDlg] = React.useState<Dlg>(null)

  const steps = caseSteps(c)
  const blockers = advanceBlockers(c)
  const next = nextCaseState(c.state)
  const canUpload = (isHr || isRaiser) && !closed
  const subject = emp ? isSelf(viewer, emp) : false

  const docs =
    isHr || isRaiser
      ? c.documents
      : c.documents.filter((d) => OPEN_TO_SUBJECT.includes(d.category))

  const stageIndex = c.state === "dismissed" ? -1 : STAGES.indexOf(c.state)
  const deadline = appealDeadline(c)
  const appealOpen =
    closed &&
    c.state === "finalised" &&
    c.sanction !== "no_action" &&
    !c.appeal &&
    deadline !== null &&
    TODAY_ISO <= deadline

  function advance() {
    if (!next || blockers.length > 0) return
    if (next === "finalised") {
      setDlg({ kind: "outcome" })
      return
    }
    store.updateCase(
      c.id,
      { state: next },
      `Moved to ${CASE_STATE_LABEL[next].toLowerCase()}.`
    )
    toast.success(`Case moved to ${CASE_STATE_LABEL[next].toLowerCase()}.`)
  }

  function remove(id: string, name: string) {
    store.updateCase(
      c.id,
      { documents: c.documents.filter((d) => d.id !== id) },
      `Removed ${name}.`
    )
    toast.success(`${name} removed. Logged on the case.`)
  }

  const canSuspend =
    isHr &&
    !closed &&
    !!emp &&
    LIFECYCLE_TRANSITIONS[emp.lifecycleState].includes("suspended")
  const suspended = emp?.lifecycleState === "suspended"

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[680px]"
      >
        <SheetHeader className="space-y-0 border-b px-5 py-4 text-left">
          <SheetTitle className="sr-only">
            {c.id}: {c.title}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Disciplinary case file
          </SheetDescription>
          <div className="pr-8">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-base font-medium">{c.title}</span>
              <CaseBadge state={c.state} />
              <Pill
                tone={
                  c.severity === "gross"
                    ? "danger"
                    : c.severity === "serious"
                      ? "warning"
                      : "neutral"
                }
              >
                {c.severity === "gross" && <ShieldAlert className="size-3" />}
                {SEVERITY_LABEL[c.severity]}
              </Pill>
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {emp && <Initials person={emp} size="xs" />}
              {emp && (
                <Link
                  href={`/employees/${emp.id}`}
                  className="text-foreground hover:underline"
                >
                  {fullName(emp)}
                </Link>
              )}
              <span className="font-mono text-[11px]">{c.id}</span>· raised by{" "}
              {fullName(store.employeeById(c.raisedBy))} on{" "}
              {formatDate(c.raisedOn)}
            </p>
          </div>

          {c.state !== "dismissed" && (
            <ol className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px]">
              {STAGES.map((s, i) => (
                <li key={s} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-muted-foreground/40">›</span>}
                  <span
                    className={cn(
                      i < stageIndex && "text-muted-foreground line-through",
                      i === stageIndex &&
                        "rounded-full bg-success-muted px-2 py-0.5 font-medium text-primary",
                      i > stageIndex && "text-muted-foreground/60"
                    )}
                  >
                    {CASE_STATE_LABEL[s]}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <Section title="The allegation">
            <p className="text-sm">{c.description}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Incident on {formatDate(c.incidentOn)}
              {c.notifiedOn
                ? ` · employee told ${formatDate(c.notifiedOn)}`
                : " · employee not yet told"}
              {c.investigatorId &&
                isHr &&
                ` · investigator ${fullName(store.employeeById(c.investigatorId))}`}
            </p>
          </Section>

          {c.hearing && (isHr || closed || subject) && (
            <Section title="Hearing">
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">
                  {formatDate(c.hearing.scheduledFor)} · {c.hearing.venue}
                </p>
                <p className="text-xs text-muted-foreground">
                  Notice given {formatDate(c.hearing.noticeGivenOn)} · panel{" "}
                  {c.hearing.panelIds
                    .map((id) => fullName(store.employeeById(id)))
                    .join(", ")}
                  {c.hearing.companion &&
                    ` · accompanied by ${c.hearing.companion}`}
                </p>
                {c.hearing.minutes && (
                  <p className="mt-2 border-t pt-2 text-muted-foreground">
                    {c.hearing.minutes}
                  </p>
                )}
              </div>
            </Section>
          )}

          {c.outcome && (
            <Section title="Outcome">
              <div className="rounded-lg border-l-2 border-primary bg-muted/50 px-3 py-2.5 text-sm">
                {c.sanction && (
                  <p className="font-medium">{SANCTION_LABEL[c.sanction]}</p>
                )}
                <p className="text-muted-foreground">{c.outcome}</p>
                {c.closedOn && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Closed {formatDate(c.closedOn)}
                  </p>
                )}
              </div>

              {c.sanction === "dismissal" &&
                isHr &&
                emp &&
                emp.lifecycleState !== "terminated" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      store.changeLifecycle(
                        emp.id,
                        "terminated",
                        `Dismissed: ${c.id}`,
                        TODAY_ISO
                      )
                      store.openOffboarding({
                        employeeId: emp.id,
                        reason: "termination",
                        noticeGivenOn: TODAY_ISO,
                        lastWorkingDay: TODAY_ISO,
                      })
                      store.updateCase(
                        c.id,
                        {},
                        "Employment terminated. Offboarding opened."
                      )
                      toast.success(
                        `${fullName(emp)} terminated. Offboarding case opened.`
                      )
                    }}
                  >
                    Terminate employment and open offboarding
                  </Button>
                )}
              {c.sanction === "dismissal" &&
                emp?.lifecycleState === "terminated" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Employment ended.{" "}
                    <Link href="/offboarding" className="underline">
                      Offboarding
                    </Link>{" "}
                    tracks clearance and final pay.
                  </p>
                )}
            </Section>
          )}

          {(c.appeal || appealOpen) && (
            <Section title="Appeal">
              {c.appeal ? (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="flex flex-wrap items-center gap-2">
                    <Pill
                      tone={
                        c.appeal.decision === "pending"
                          ? "warning"
                          : c.appeal.decision === "upheld"
                            ? "neutral"
                            : "success"
                      }
                    >
                      {c.appeal.decision === "pending"
                        ? "Awaiting decision"
                        : c.appeal.decision === "upheld"
                          ? "Outcome stands"
                          : "Outcome overturned"}
                    </Pill>
                    <span className="text-xs text-muted-foreground">
                      Lodged {formatDate(c.appeal.lodgedOn)}
                    </span>
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    {c.appeal.grounds}
                  </p>
                  {isHr && c.appeal.decision === "pending" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          store.updateCase(
                            c.id,
                            {
                              appeal: {
                                ...c.appeal!,
                                decision: "upheld",
                                decidedOn: TODAY_ISO,
                              },
                            },
                            "Appeal decided: outcome stands."
                          )
                          toast.success("Appeal decided. The outcome stands.")
                        }}
                      >
                        Outcome stands
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          store.updateCase(
                            c.id,
                            {
                              appeal: {
                                ...c.appeal!,
                                decision: "overturned",
                                decidedOn: TODAY_ISO,
                              },
                              sanction: "no_action",
                              outcome: `Overturned on appeal. Previously: ${c.outcome}`,
                            },
                            "Appeal decided: outcome overturned."
                          )
                          toast.success(
                            "Appeal upheld. The sanction is overturned."
                          )
                        }}
                      >
                        Overturn the outcome
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-muted-foreground">
                    Open until {formatDate(deadline!)} (
                    {daysBetween(TODAY_ISO, deadline!)} days left).
                  </span>
                  {(isHr || subject) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDlg({ kind: "appeal" })}
                    >
                      Lodge an appeal
                    </Button>
                  )}
                </div>
              )}
            </Section>
          )}

          {isHr && (
            <Section title="Due process">
              <ChecklistByStage
                c={c}
                steps={steps}
                onDlg={setDlg}
                onNotified={() => {
                  store.updateCase(
                    c.id,
                    { notifiedOn: TODAY_ISO },
                    "Employee notified in writing of the allegation."
                  )
                  toast.success(
                    "Recorded. Upload the allegation letter to keep the file complete."
                  )
                }}
              />

              {!closed && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                  {next && (
                    <Button disabled={blockers.length > 0} onClick={advance}>
                      {next === "investigation" && "Start investigation"}
                      {next === "hearing" && "Move to hearing"}
                      {next === "finalised" && (
                        <>
                          <Gavel className="size-4" />
                          Decide the outcome
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setDlg({ kind: "dismiss" })}
                  >
                    Dismiss — no case to answer
                  </Button>
                  {canSuspend && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        store.changeLifecycle(
                          c.employeeId,
                          "suspended",
                          `Suspended pending ${c.id}`,
                          TODAY_ISO
                        )
                        store.updateCase(
                          c.id,
                          {},
                          "Employee suspended pending the outcome."
                        )
                        toast.success(
                          `${fullName(emp)} suspended. Reviewed every 14 days.`
                        )
                      }}
                    >
                      Suspend pending outcome
                    </Button>
                  )}
                  {suspended && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        store.changeLifecycle(
                          c.employeeId,
                          "active",
                          `Suspension lifted during ${c.id}`,
                          TODAY_ISO
                        )
                        store.updateCase(c.id, {}, "Suspension lifted.")
                        toast.success("Suspension lifted.")
                      }}
                    >
                      Lift suspension
                    </Button>
                  )}
                  {blockers.length > 0 && (
                    <p className="w-full text-xs text-muted-foreground">
                      Before moving on:{" "}
                      {blockers.map((b) => b.label.toLowerCase()).join("; ")}.
                    </p>
                  )}
                </div>
              )}
            </Section>
          )}

          <Section
            title={`Documents (${docs.length})`}
            action={
              canUpload && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setDlg({ kind: "upload" })}
                >
                  <Upload className="size-3" />
                  Upload
                </Button>
              )
            }
          >
            {docs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {canUpload
                  ? "Nothing uploaded yet. Evidence, statements, the report and letters go here."
                  : "No documents are open to you at this stage."}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {docs.map((d) => {
                  const file = fileFor(d.id)
                  return (
                    <li
                      key={d.id}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <FileText className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {DOC_CATEGORY_LABEL[d.category]} ·{" "}
                          {fullName(store.employeeById(d.uploadedBy))} ·{" "}
                          {formatDate(d.uploadedAt)} · {d.sizeKb} KB
                        </p>
                      </div>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Open ${d.name}`}
                        disabled={!file}
                        title={
                          file
                            ? undefined
                            : "The prototype keeps file contents only until the tab reloads."
                        }
                        onClick={() => {
                          if (!file) return
                          const url = URL.createObjectURL(file)
                          window.open(url, "_blank", "noopener")
                          setTimeout(() => URL.revokeObjectURL(url), 60_000)
                        }}
                      >
                        <Download className="size-4" />
                      </Button>
                      {isHr && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Remove ${d.name}`}
                          onClick={() => remove(d.id, d.name)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {!isHr && !isRaiser && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Lock className="mt-0.5 size-3 shrink-0" />
                Investigation material stays with HR. You see what was put to
                you and what was decided.
              </p>
            )}
          </Section>

          {(isHr || isRaiser) && (
            <Section title="History">
              <ol className="space-y-3 border-l pl-4">
                {[...c.events]
                  .sort((a, b) => b.at.localeCompare(a.at))
                  .map((e) => (
                    <li key={e.id} className="relative text-sm">
                      <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-border" />
                      <p>{e.text}</p>
                      <p className="text-xs text-muted-foreground">
                        {fullName(store.employeeById(e.actorId))} ·{" "}
                        {formatDateTime(e.at)}
                      </p>
                    </li>
                  ))}
              </ol>
            </Section>
          )}
        </div>
      </SheetContent>

      {dlg?.kind === "upload" && (
        <UploadDialog
          c={c}
          category={dlg.category}
          onClose={() => setDlg(null)}
        />
      )}
      {dlg?.kind === "investigator" && (
        <AssignInvestigatorDialog c={c} onClose={() => setDlg(null)} />
      )}
      {dlg?.kind === "hearing" && (
        <HearingDialog c={c} onClose={() => setDlg(null)} />
      )}
      {dlg?.kind === "held" && (
        <HeldDialog c={c} onClose={() => setDlg(null)} />
      )}
      {dlg?.kind === "outcome" && (
        <OutcomeDialog c={c} onClose={() => setDlg(null)} />
      )}
      {dlg?.kind === "dismiss" && (
        <DismissDialog c={c} onClose={() => setDlg(null)} />
      )}
      {dlg?.kind === "appeal" && (
        <AppealDialog c={c} onClose={() => setDlg(null)} />
      )}
    </Sheet>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

const STAGE_TITLE: Record<string, string> = {
  open: "1 · Open",
  investigation: "2 · Investigation",
  hearing: "3 · Hearing",
  finalised: "4 · Outcome",
}

/** Each stage's steps, with the action that completes the step beside it. */
function ChecklistByStage({
  c,
  steps,
  onDlg,
  onNotified,
}: {
  c: DisciplinaryCase
  steps: CaseStep[]
  onDlg: (d: Dlg) => void
  onNotified: () => void
}) {
  const stages: CaseState[] = ["open", "investigation", "hearing", "finalised"]
  const current = c.state === "dismissed" ? -1 : stages.indexOf(c.state)

  function actionFor(s: CaseStep): { label: string; run: () => void } | null {
    if (s.done && s.key !== "notice" && s.key !== "held") return null
    switch (s.key) {
      case "notified":
        return { label: "Mark as told", run: onNotified }
      case "investigator":
        return { label: "Assign", run: () => onDlg({ kind: "investigator" }) }
      case "evidence":
        return {
          label: "Upload",
          run: () => onDlg({ kind: "upload", category: "evidence" }),
        }
      case "statement":
        return {
          label: "Upload",
          run: () => onDlg({ kind: "upload", category: "statement" }),
        }
      case "report":
        return {
          label: "Upload",
          run: () => onDlg({ kind: "upload", category: "report" }),
        }
      case "notice":
        if (c.hearing?.held) return null
        return {
          label: c.hearing ? "Reschedule" : "Schedule",
          run: () => onDlg({ kind: "hearing" }),
        }
      case "held":
        return c.hearing && !c.hearing.held
          ? { label: "Record hearing", run: () => onDlg({ kind: "held" }) }
          : null
      case "minutes":
        return c.hearing?.held
          ? { label: "Add minutes", run: () => onDlg({ kind: "held" }) }
          : null
      case "letter":
        return {
          label: "Upload letter",
          run: () => onDlg({ kind: "upload", category: "outcome" }),
        }
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {stages.map((stage, i) => {
        const rows = steps.filter((s) => s.stage === stage)
        const active = i === current
        const future = current >= 0 && i > current
        return (
          <div
            key={stage}
            className={cn(
              "rounded-lg border",
              active && "border-primary/40 bg-success-muted/20",
              future && "opacity-60"
            )}
          >
            <p className="border-b px-3 py-2 text-xs font-medium">
              {STAGE_TITLE[stage]}
              {active && <span className="ml-2 text-primary">current</span>}
            </p>
            <ul className="divide-y">
              {rows.map((s) => {
                const action = !future ? actionFor(s) : null
                // A step further on than the case has reached is not yet actionable.
                const locked = !active && !s.done && stage !== "finalised"
                return (
                  <li
                    key={s.key}
                    className="flex items-start gap-2.5 px-3 py-2.5 text-sm"
                  >
                    {s.done ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={cn(s.done && "text-muted-foreground")}>
                        {s.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.why}</p>
                    </div>
                    {action && !locked && (
                      <Button size="xs" variant="outline" onClick={action.run}>
                        {action.label}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
