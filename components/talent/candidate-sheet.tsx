"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Undo2,
  UserCheck,
  XCircle,
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Pill } from "@/components/common"
import { StageBadge } from "@/components/common/status"
import { FormRow, NativeSelect, ScorePicker } from "./form"
import { CandidateBooking } from "./candidate-booking"
import { CandidateAssessment } from "./candidate-assessment"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { STAGE_LABEL, TODAY_ISO, formatDate, fullName, ghs } from "@/lib/format"
import {
  INTERVIEW_KIND_LABEL,
  REJECTION_REASONS,
  advanceBlocker,
  averageInterviewScore,
  nextStage,
} from "@/lib/talent/recruitment"
import { isOnStrength } from "@/lib/selectors"
import type { Candidate, Interview, InterviewKind } from "@/lib/types"
import { Initials } from "@/components/common"

const SCORE_LABEL: Record<number, string> = {
  1: "Poor",
  2: "Below the bar",
  3: "Meets the bar",
  4: "Strong",
  5: "Exceptional",
}

export function CandidateSheet({
  candidateId,
  onClose,
}: {
  candidateId: string | null
  onClose: () => void
}) {
  const store = useStore()
  const c = store.candidates.find((x) => x.id === candidateId)
  if (!c) return null
  return <SheetBody c={c} onClose={onClose} />
}

function SheetBody({ c, onClose }: { c: Candidate; onClose: () => void }) {
  const store = useStore()
  const { viewer } = store
  const isHr = has(viewer, "hr_admin")
  const req = store.requisitions.find((r) => r.id === c.requisitionId)
  const next = nextStage(c.stage)
  const blocker =
    c.stage === "rejected"
      ? null
      : advanceBlocker(c, {
          tests: store.tests,
          invitations: store.invitations,
        })
  const avg = averageInterviewScore(c)
  const [notes, setNotes] = React.useState(c.notes)
  const [rejecting, setRejecting] = React.useState(false)
  const [reason, setReason] = React.useState(REJECTION_REASONS[0])

  function advance() {
    if (!next) return
    if (blocker) {
      toast.error(blocker)
      return
    }
    if (next === "hired") {
      const emp = store.hireCandidate(c.id)
      if (emp)
        toast.success(
          `${c.name} hired. A pre-hire record and onboarding tasks were created.`
        )
      return
    }
    store.moveCandidate(c.id, next)
    toast.success(`${c.name} moved to ${STAGE_LABEL[next]}.`)
  }

  function reject() {
    store.updateCandidate(c.id, { stage: "rejected", rejectedReason: reason })
    toast.success(`${c.name} rejected. The reason is on file.`)
    setRejecting(false)
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[600px]"
      >
        <SheetHeader className="space-y-0 border-b px-5 py-4 text-left">
          <SheetTitle className="sr-only">{c.name}</SheetTitle>
          <SheetDescription className="sr-only">
            Candidate for {req?.title}
          </SheetDescription>
          <div className="flex items-center gap-3 pr-8">
            <Initials
              person={{
                firstName: c.name.split(" ")[0],
                lastName: c.name.split(" ").slice(-1)[0],
                avatarTone: c.avatarTone,
              }}
              size="lg"
            />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-base font-medium">
                {c.name}
                <StageBadge stage={c.stage} />
              </p>
              <p className="text-sm text-muted-foreground">
                {req?.title} · {req?.id}
              </p>
              <p className="text-xs text-muted-foreground">
                {c.email} · {c.phone} · via {c.source} · applied{" "}
                {formatDate(c.appliedOn)}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {c.stage === "rejected" && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Rejected</p>
              <p className="text-muted-foreground">{c.rejectedReason}</p>
              {isHr && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    store.updateCandidate(c.id, {
                      stage: "screening",
                      rejectedReason: null,
                      offer: null,
                    })
                    toast.success(`${c.name} is back in screening.`)
                  }}
                >
                  <Undo2 className="size-3.5" />
                  Reopen application
                </Button>
              )}
            </div>
          )}

          {c.stage !== "rejected" && (
            <section>
              <div className="flex flex-wrap items-center gap-2">
                {next && (
                  <Button onClick={advance} disabled={!!blocker}>
                    Move to {STAGE_LABEL[next]}
                    <ArrowRight className="size-4" />
                  </Button>
                )}
                {c.stage !== "hired" && !rejecting && (
                  <Button variant="outline" onClick={() => setRejecting(true)}>
                    <XCircle className="size-4" />
                    Reject
                  </Button>
                )}
              </div>
              {blocker && next && (
                <p className="mt-2 text-xs text-muted-foreground">{blocker}</p>
              )}
              {rejecting && (
                <div className="mt-3 space-y-3 rounded-lg border p-3">
                  <FormRow label="Reason" htmlFor="rj-reason">
                    <NativeSelect
                      id="rj-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    >
                      {REJECTION_REASONS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </NativeSelect>
                  </FormRow>
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={reject}>
                      Confirm rejection
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRejecting(false)}
                    >
                      Keep in process
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {c.stage === "hired" && (
            <section className="rounded-lg border bg-success-muted/40 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <UserCheck className="size-4 text-primary" />
                Hired
              </p>
              {c.employeeId ? (
                <p className="mt-1 text-muted-foreground">
                  Pre-hire record created.{" "}
                  <Link
                    href={`/employees/${c.employeeId}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    Open the record
                  </Link>{" "}
                  or{" "}
                  <Link
                    href="/onboarding"
                    className="font-medium text-foreground hover:underline"
                  >
                    start onboarding
                  </Link>
                  .
                </p>
              ) : (
                isHr && (
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      const emp = store.hireCandidate(c.id)
                      if (emp) toast.success("Pre-hire record created.")
                    }}
                  >
                    Create pre-hire record
                  </Button>
                )
              )}
            </section>
          )}

          <section>
            <h3 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Recruiter rating
            </h3>
            <ScorePicker
              label="Recruiter rating"
              value={c.rating}
              labels={SCORE_LABEL}
              onChange={(n) => store.updateCandidate(c.id, { rating: n })}
            />
          </section>

          <Interviews c={c} avg={avg} />

          <CandidateAssessment c={c} />

          {isHr &&
            c.stage !== "rejected" &&
            ["offer", "hired"].includes(c.stage) && <OfferSection c={c} />}
          {!isHr && ["offer", "hired"].includes(c.stage) && (
            <p className="text-sm text-muted-foreground">
              Offers are prepared and sent by HR.
            </p>
          )}

          <section>
            <h3 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Notes
            </h3>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Working notes. Not shared with the candidate."
              aria-label="Notes"
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={notes === c.notes}
              onClick={() => {
                store.updateCandidate(c.id, { notes })
                toast.success("Notes saved.")
              }}
            >
              Save notes
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Interviews({ c, avg }: { c: Candidate; avg: number | null }) {
  const store = useStore()
  const req = store.requisitions.find((r) => r.id === c.requisitionId)
  const panel = store.employees.filter(isOnStrength)
  const [adding, setAdding] = React.useState(false)
  const [kind, setKind] = React.useState<InterviewKind>("phone")
  const [when, setWhen] = React.useState("")
  const [who, setWho] = React.useState(
    req?.hiringManagerId ?? panel[0]?.id ?? ""
  )
  const [scoring, setScoring] = React.useState<string | null>(null)

  function schedule() {
    if (!when) {
      toast.error("Choose a date for the interview.")
      return
    }
    const iv: Interview = {
      id: `iv-${Math.random().toString(36).slice(2, 7)}`,
      kind,
      scheduledFor: when,
      interviewerId: who,
      score: null,
      feedback: null,
    }
    store.updateCandidate(c.id, { interviews: [...c.interviews, iv] })
    toast.success(
      `${INTERVIEW_KIND_LABEL[kind]} scheduled for ${formatDate(when)}.`
    )
    setAdding(false)
    setWhen("")
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Interviews
          {avg !== null && ` · average ${avg.toFixed(1)}/5`}
        </h3>
        {!adding && c.stage !== "rejected" && c.stage !== "hired" && (
          <Button size="xs" variant="outline" onClick={() => setAdding(true)}>
            <Calendar className="size-3" />
            Schedule
          </Button>
        )}
      </div>

      {c.stage !== "rejected" && c.stage !== "hired" && (
        <CandidateBooking c={c} />
      )}

      {adding && (
        <div className="mb-3 space-y-3 rounded-lg border p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <FormRow label="Type" htmlFor="iv-kind">
              <NativeSelect
                id="iv-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as InterviewKind)}
              >
                {(Object.keys(INTERVIEW_KIND_LABEL) as InterviewKind[]).map(
                  (k) => (
                    <option key={k} value={k}>
                      {INTERVIEW_KIND_LABEL[k]}
                    </option>
                  )
                )}
              </NativeSelect>
            </FormRow>
            <FormRow label="Date" htmlFor="iv-date">
              <Input
                id="iv-date"
                type="date"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </FormRow>
            <FormRow label="Interviewer" htmlFor="iv-who">
              <NativeSelect
                id="iv-who"
                value={who}
                onChange={(e) => setWho(e.target.value)}
              >
                {panel.map((p) => (
                  <option key={p.id} value={p.id}>
                    {fullName(p)}
                  </option>
                ))}
              </NativeSelect>
            </FormRow>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={schedule}>
              Schedule interview
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {c.interviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          None yet. Feedback from at least one interview is needed before the
          assessment stage.
        </p>
      ) : (
        <ul className="space-y-2">
          {c.interviews.map((iv) => (
            <li key={iv.id} className="rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {INTERVIEW_KIND_LABEL[iv.kind]}
                </span>
                <span className="text-muted-foreground">
                  {iv.startsAt
                    ? `${formatDate(iv.scheduledFor)}, ${new Date(iv.startsAt).toISOString().slice(11, 16)} UTC`
                    : formatDate(iv.scheduledFor)}{" "}
                  · {fullName(store.employeeById(iv.interviewerId))}
                </span>
                {iv.status === "cancelled" && (
                  <Pill tone="neutral">Cancelled</Pill>
                )}
                {iv.status === "no_show" && <Pill tone="danger">No-show</Pill>}
                {iv.link && iv.status !== "cancelled" && (
                  <a
                    href={iv.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline"
                  >
                    Join
                  </a>
                )}
                {iv.score !== null ? (
                  <Pill tone="success">
                    <CheckCircle2 className="size-3" />
                    {iv.score}/5
                  </Pill>
                ) : iv.scheduledFor < TODAY_ISO ? (
                  <Pill tone="warning">Feedback due</Pill>
                ) : (
                  <Pill tone="info">Upcoming</Pill>
                )}
              </div>
              {iv.feedback && (
                <p className="mt-1.5 text-muted-foreground">{iv.feedback}</p>
              )}
              {iv.score === null && scoring !== iv.id && (
                <Button
                  size="xs"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setScoring(iv.id)}
                >
                  Record feedback
                </Button>
              )}
              {scoring === iv.id && (
                <FeedbackForm
                  onCancel={() => setScoring(null)}
                  onSave={(score, feedback) => {
                    store.updateCandidate(c.id, {
                      interviews: c.interviews.map((x) =>
                        x.id === iv.id ? { ...x, score, feedback } : x
                      ),
                    })
                    toast.success("Feedback recorded.")
                    setScoring(null)
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function FeedbackForm({
  onSave,
  onCancel,
}: {
  onSave: (score: number, feedback: string) => void
  onCancel: () => void
}) {
  const [score, setScore] = React.useState<number | null>(null)
  const [text, setText] = React.useState("")
  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      <FormRow label="Score">
        <ScorePicker
          label="Interview score"
          value={score}
          labels={SCORE_LABEL}
          onChange={setScore}
        />
      </FormRow>
      <FormRow label="Feedback" htmlFor="iv-fb">
        <Textarea
          id="iv-fb"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What you saw, and whether you would hire them."
        />
      </FormRow>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={score === null || text.trim().length < 5}
          onClick={() => onSave(score!, text.trim())}
        >
          Save feedback
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function OfferSection({ c }: { c: Candidate }) {
  const store = useStore()
  const req = store.requisitions.find((r) => r.id === c.requisitionId)
  const o = c.offer
  const [salary, setSalary] = React.useState(
    String(o?.salaryMonthly ?? req?.budgetMonthly ?? "")
  )
  const [start, setStart] = React.useState(
    o?.startDate ?? req?.targetStartDate ?? ""
  )
  const editable = !o || o.status === "draft"
  const overBudget = req && Number(salary) > req.budgetMonthly

  function send() {
    if (!(Number(salary) > 0) || !start) {
      toast.error("Enter a salary and a start date.")
      return
    }
    store.updateCandidate(c.id, {
      offer: {
        salaryMonthly: Number(salary),
        startDate: start,
        status: "sent",
        sentOn: TODAY_ISO,
        decidedOn: null,
      },
    })
    toast.success(`Offer sent to ${c.name}.`)
  }

  return (
    <section>
      <h3 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        Offer
      </h3>
      {editable ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormRow
              label="Monthly salary (GHS)"
              htmlFor="of-sal"
              hint={
                req ? `Budget ${ghs(req.budgetMonthly)} per hire.` : undefined
              }
              error={overBudget ? "Above the requisition budget." : null}
            >
              <Input
                id="of-sal"
                type="number"
                min={0}
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            </FormRow>
            <FormRow label="Start date" htmlFor="of-start">
              <Input
                id="of-start"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </FormRow>
          </div>
          <Button size="sm" onClick={send}>
            Send offer
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border p-3 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <span className="tabular font-medium">{ghs(o!.salaryMonthly)}</span>
            <span className="text-muted-foreground">
              a month · starts {formatDate(o!.startDate)}
            </span>
            <Pill
              tone={
                o!.status === "accepted"
                  ? "success"
                  : o!.status === "declined"
                    ? "danger"
                    : "info"
              }
            >
              {o!.status === "sent"
                ? "Awaiting reply"
                : o!.status[0].toUpperCase() + o!.status.slice(1)}
            </Pill>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sent {formatDate(o!.sentOn!)}
            {o!.decidedOn && ` · answered ${formatDate(o!.decidedOn)}`}
          </p>
          {o!.status === "sent" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  store.updateCandidate(c.id, {
                    offer: { ...o!, status: "accepted", decidedOn: TODAY_ISO },
                  })
                  toast.success("Offer accepted. They can now be hired.")
                }}
              >
                Record acceptance
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  store.updateCandidate(c.id, {
                    offer: { ...o!, status: "declined", decidedOn: TODAY_ISO },
                    stage: "rejected",
                    rejectedReason: "Offer declined",
                  })
                  toast.success("Recorded as declined.")
                }}
              >
                Record decline
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
