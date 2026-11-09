"use client"

import * as React from "react"
import Link from "next/link"
import { Lock, Star } from "lucide-react"
import { toast } from "sonner"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Initials, Pill } from "@/components/common"
import { ReviewBadge } from "@/components/common/status"
import { FormRow, NativeSelect, ScorePicker } from "./form"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { TODAY_ISO, formatDate, fullName } from "@/lib/format"
import {
  COMPETENCIES,
  OWNER_LABEL,
  RATING_LABEL,
  REVIEW_FLOW,
  averageScore,
  ownerOf,
  toHalf,
} from "@/lib/talent/performance"
import type { PerformanceReview } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ReviewSheet({
  reviewId,
  onClose,
}: {
  reviewId: string | null
  onClose: () => void
}) {
  const store = useStore()
  const r = store.reviews.find((x) => x.id === reviewId)
  if (!r) return null
  return <Body r={r} onClose={onClose} />
}

function Body({ r, onClose }: { r: PerformanceReview; onClose: () => void }) {
  const store = useStore()
  const { viewer } = store
  const emp = store.employeeById(r.employeeId)
  const manager = store.employeeById(r.managerId)
  const isHr = has(viewer, "hr_admin")
  const isEmployee = viewer.employeeId === r.employeeId
  const isManager = viewer.employeeId === r.managerId
  const owner = ownerOf(r.status)
  const stepIndex = REVIEW_FLOW.indexOf(r.status)

  // Until it is shared, what the manager and HR decided is not the employee's to read.
  const hideFromEmployee = isEmployee && !isHr && stepIndex < 4

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[620px]"
      >
        <SheetHeader className="space-y-0 border-b px-5 py-4 text-left">
          <SheetTitle className="sr-only">
            {fullName(emp)} — {r.cycle} review
          </SheetTitle>
          <SheetDescription className="sr-only">
            Performance review for the {r.cycle} cycle
          </SheetDescription>
          <div className="flex items-center gap-3 pr-8">
            {emp && <Initials person={emp} size="lg" />}
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-base font-medium">
                {fullName(emp)}
                <ReviewBadge status={r.status} />
              </p>
              <p className="text-sm text-muted-foreground">
                {emp?.jobTitle} · {r.cycle} · reviewer {fullName(manager)} · due{" "}
                {formatDate(r.dueOn)}
              </p>
            </div>
          </div>
          <ol className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px]">
            {REVIEW_FLOW.slice(1).map((s, i) => {
              const at = i + 1
              return (
                <li key={s} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-muted-foreground/40">›</span>}
                  <span
                    className={cn(
                      at < stepIndex && "text-muted-foreground line-through",
                      at === stepIndex &&
                        "rounded-full bg-success-muted px-2 py-0.5 font-medium text-primary",
                      at > stepIndex && "text-muted-foreground/60"
                    )}
                  >
                    {STEP_NAME[s]}
                  </span>
                </li>
              )
            })}
          </ol>
          {owner && (
            <p className="mt-2 text-xs text-muted-foreground">
              Waiting on {OWNER_LABEL[owner].toLowerCase()}.
            </p>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* What came before, read-only, so each step is done knowing the last. */}
          {stepIndex >= 2 && r.selfSummary && <SelfAssessment r={r} />}
          {stepIndex >= 3 && !hideFromEmployee && r.scores && (
            <ManagerAssessment r={r} />
          )}
          {hideFromEmployee && stepIndex >= 2 && (
            <p className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
              <Lock className="mt-0.5 size-4 shrink-0" />
              Your manager&apos;s review is private until HR shares it with you.
            </p>
          )}

          {r.status === "not_started" && (
            <StartStep r={r} canAct={isHr || isManager} />
          )}
          {r.status === "self_review" && (
            <SelfStep
              r={r}
              isEmployee={isEmployee}
              canSkip={isHr || isManager}
            />
          )}
          {r.status === "manager_review" && (
            <ManagerStep r={r} canAct={isManager} />
          )}
          {r.status === "calibration" && (
            <CalibrationStep r={r} canAct={isHr} />
          )}
          {r.status === "shared" && (
            <AcknowledgeStep r={r} isEmployee={isEmployee} isHr={isHr} />
          )}
          {r.status === "complete" &&
            r.employeeComment &&
            !hideFromEmployee && (
              <section>
                <h3 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Employee reply
                </h3>
                <p className="rounded-lg border bg-muted/30 p-3 text-sm">
                  {r.employeeComment}
                </p>
                {r.acknowledgedOn && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Acknowledged {formatDate(r.acknowledgedOn)}
                  </p>
                )}
              </section>
            )}

          <p className="text-xs text-muted-foreground">
            Looking for informal feedback?{" "}
            <Link href="/performance" className="underline">
              Coaching notes
            </Link>{" "}
            stay private to the manager who wrote them.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

const STEP_NAME: Record<string, string> = {
  self_review: "Self review",
  manager_review: "Manager review",
  calibration: "Calibration",
  shared: "Shared",
  complete: "Complete",
}

function Block({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${value} out of 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i < Math.round(value)
              ? "fill-warning text-warning"
              : "text-muted-foreground/30"
          )}
        />
      ))}
      <span className="tabular ml-1 text-xs">{value.toFixed(1)}</span>
    </span>
  )
}

function SelfAssessment({ r }: { r: PerformanceReview }) {
  return (
    <Block title="Self review">
      <div className="space-y-2 rounded-lg border p-3 text-sm">
        <p>{r.selfSummary}</p>
        {r.selfDevelopment && (
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">To develop: </span>
            {r.selfDevelopment}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {r.selfRating !== null && <Stars value={r.selfRating} />}
          {r.selfSubmittedOn && (
            <span>· submitted {formatDate(r.selfSubmittedOn)}</span>
          )}
        </div>
      </div>
    </Block>
  )
}

function ManagerAssessment({ r }: { r: PerformanceReview }) {
  const avg = averageScore(r.scores)
  return (
    <Block title="Manager review">
      <div className="space-y-3 rounded-lg border p-3 text-sm">
        <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {COMPETENCIES.map((c) => (
            <li key={c.id} className="flex justify-between gap-3">
              <span className="text-muted-foreground">{c.label}</span>
              <span className="tabular font-medium">
                {r.scores?.[c.id] ?? "—"}/5
              </span>
            </li>
          ))}
        </ul>
        {r.reviewerComments && <p>{r.reviewerComments}</p>}
        <div className="flex flex-wrap items-center gap-2 border-t pt-2 text-xs text-muted-foreground">
          {r.rating !== null ? (
            <>
              <Stars value={r.rating} />
              <span>{RATING_LABEL[Math.floor(r.rating)]}</span>
            </>
          ) : avg !== null ? (
            <span>Average {avg.toFixed(1)}</span>
          ) : null}
          {r.calibrationNote && (
            <Pill tone="info">
              Adjusted at calibration: {r.calibrationNote}
            </Pill>
          )}
        </div>
      </div>
    </Block>
  )
}

function Waiting({ who }: { who: string }) {
  return (
    <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
      {who}
    </p>
  )
}

function StartStep({ r, canAct }: { r: PerformanceReview; canAct: boolean }) {
  const store = useStore()
  if (!canAct)
    return (
      <Waiting who="HR or the manager starts the review. The employee is then asked for a self review." />
    )
  return (
    <Block title="Start the review">
      <p className="mb-3 text-sm text-muted-foreground">
        Starting asks the employee for a self review first. Nothing the manager
        writes is shown to them until HR shares it.
      </p>
      <Button
        onClick={() => {
          store.updateReview(
            r.id,
            { status: "self_review" },
            "Started a performance review"
          )
          toast.success(
            "Review started. The employee can now write their self review."
          )
        }}
      >
        Start review
      </Button>
    </Block>
  )
}

function SelfStep({
  r,
  isEmployee,
  canSkip,
}: {
  r: PerformanceReview
  isEmployee: boolean
  canSkip: boolean
}) {
  const store = useStore()
  const [summary, setSummary] = React.useState(r.selfSummary ?? "")
  const [dev, setDev] = React.useState(r.selfDevelopment ?? "")
  const [rating, setRating] = React.useState<number | null>(r.selfRating)
  const [touched, setTouched] = React.useState(false)

  const errors = {
    summary:
      summary.trim().length >= 20
        ? null
        : "A few sentences, at least 20 characters.",
    rating: rating === null ? "Rate yourself." : null,
  }

  function submit() {
    setTouched(true)
    if (errors.summary || errors.rating) return
    store.updateReview(
      r.id,
      {
        selfSummary: summary.trim(),
        selfDevelopment: dev.trim() || null,
        selfRating: rating,
        selfSubmittedOn: TODAY_ISO,
        status: "manager_review",
      },
      "Submitted a self review"
    )
    toast.success(
      "Self review submitted. Your manager has been asked to review."
    )
  }

  if (!isEmployee)
    return (
      <Block title="Self review">
        <Waiting who="The employee has not submitted their self review yet." />
        {canSkip && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                store.addNotification({
                  title: "Self review reminder",
                  body: `Your ${r.cycle} self review is due ${formatDate(r.dueOn)}.`,
                  kind: "alert",
                  href: "/performance",
                })
                toast.success("Reminder sent.")
              }}
            >
              Send reminder
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                store.updateReview(
                  r.id,
                  { status: "manager_review" },
                  "Skipped the self review step"
                )
                toast.success("Moved to manager review without a self review.")
              }}
            >
              Skip to manager review
            </Button>
          </div>
        )}
      </Block>
    )

  return (
    <Block title="Your self review">
      <div className="space-y-4">
        <FormRow
          label="What did you deliver this cycle?"
          htmlFor="sr-sum"
          error={touched ? errors.summary : null}
        >
          <Textarea
            id="sr-sum"
            rows={5}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="The work you are proud of, and where you made a difference."
          />
        </FormRow>
        <FormRow label="What do you want to get better at?" htmlFor="sr-dev">
          <Textarea
            id="sr-dev"
            rows={3}
            value={dev}
            onChange={(e) => setDev(e.target.value)}
          />
        </FormRow>
        <FormRow
          label="How would you rate yourself?"
          error={touched ? errors.rating : null}
        >
          <ScorePicker
            label="Self rating"
            value={rating}
            labels={RATING_LABEL}
            onChange={setRating}
          />
        </FormRow>
        <Button onClick={submit}>Submit self review</Button>
      </div>
    </Block>
  )
}

function ManagerStep({ r, canAct }: { r: PerformanceReview; canAct: boolean }) {
  const store = useStore()
  const [scores, setScores] = React.useState<Record<string, number>>(
    r.scores ?? {}
  )
  const [comments, setComments] = React.useState(r.reviewerComments ?? "")
  const [touched, setTouched] = React.useState(false)
  const avg = averageScore(scores)
  const complete = COMPETENCIES.every((c) => scores[c.id])

  if (!canAct)
    return (
      <Waiting
        who={`Waiting on ${fullName(store.employeeById(r.managerId))} to complete the review.`}
      />
    )

  function save(submit: boolean) {
    setTouched(true)
    if (submit && (!complete || comments.trim().length < 20)) {
      toast.error("Score every competency and write your comments.")
      return
    }
    store.updateReview(
      r.id,
      submit
        ? {
            scores,
            reviewerComments: comments.trim(),
            rating: toHalf(avg ?? 3),
            status: "calibration",
          }
        : {
            scores: Object.keys(scores).length ? scores : null,
            reviewerComments: comments.trim() || null,
          },
      submit ? "Submitted a manager review" : undefined
    )
    toast.success(
      submit
        ? "Review submitted for calibration. The employee cannot see it yet."
        : "Draft saved."
    )
  }

  return (
    <Block title="Your review">
      <div className="space-y-4">
        <ul className="space-y-3">
          {COMPETENCIES.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.hint}</p>
              </div>
              <ScorePicker
                label={c.label}
                value={scores[c.id] ?? null}
                labels={RATING_LABEL}
                onChange={(n) => setScores((s) => ({ ...s, [c.id]: n }))}
              />
            </li>
          ))}
        </ul>
        {touched && !complete && (
          <p role="alert" className="text-xs text-destructive">
            Score every competency.
          </p>
        )}
        <FormRow
          label="Comments"
          htmlFor="mr-com"
          hint="Specific examples. This is what the employee reads once shared."
          error={
            touched && comments.trim().length < 20
              ? "At least 20 characters."
              : null
          }
        >
          <Textarea
            id="mr-com"
            rows={5}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </FormRow>
        {avg !== null && (
          <p className="text-sm text-muted-foreground">
            Average {avg.toFixed(1)} → suggested rating{" "}
            <strong className="font-medium text-foreground">
              {toHalf(avg).toFixed(1)}
            </strong>
            . HR may adjust it at calibration.
          </p>
        )}
        <div className="flex gap-2">
          <Button onClick={() => save(true)}>Submit for calibration</Button>
          <Button variant="outline" onClick={() => save(false)}>
            Save draft
          </Button>
        </div>
      </div>
    </Block>
  )
}

function CalibrationStep({
  r,
  canAct,
}: {
  r: PerformanceReview
  canAct: boolean
}) {
  const store = useStore()
  const suggested = r.rating ?? toHalf(averageScore(r.scores) ?? 3)
  const [rating, setRating] = React.useState(String(suggested))
  const [note, setNote] = React.useState(r.calibrationNote ?? "")
  const changed = Number(rating) !== suggested
  const needsNote = changed && note.trim().length < 10

  if (!canAct)
    return (
      <Waiting who="HR is calibrating ratings across the company before they are shared." />
    )

  function share() {
    if (needsNote) {
      toast.error("Say why the rating moved, so the employee can be told.")
      return
    }
    store.updateReview(
      r.id,
      {
        rating: Number(rating),
        calibrationNote: changed ? note.trim() : null,
        status: "shared",
        sharedOn: TODAY_ISO,
      },
      "Calibrated and shared a performance review"
    )
    toast.success("Shared with the employee.")
  }

  return (
    <Block title="Calibration">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Check the rating against the rest of the company, then share it.
          Moving a rating needs a reason.
        </p>
        <FormRow
          label="Final rating"
          htmlFor="cal-r"
          hint={`Manager's rating ${suggested.toFixed(1)}.`}
        >
          <NativeSelect
            id="cal-r"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          >
            {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((n) => (
              <option key={n} value={n}>
                {n.toFixed(1)} — {RATING_LABEL[Math.round(n)]}
              </option>
            ))}
          </NativeSelect>
        </FormRow>
        {changed && (
          <FormRow
            label="Why the rating moved"
            htmlFor="cal-n"
            error={needsNote ? "At least 10 characters." : null}
          >
            <Textarea
              id="cal-n"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormRow>
        )}
        <div className="flex gap-2">
          <Button onClick={share}>Share with employee</Button>
          <Button
            variant="outline"
            onClick={() => {
              store.updateReview(
                r.id,
                { status: "manager_review" },
                "Returned a review to the manager"
              )
              toast.success("Sent back to the manager.")
            }}
          >
            Return to manager
          </Button>
        </div>
      </div>
    </Block>
  )
}

function AcknowledgeStep({
  r,
  isEmployee,
  isHr,
}: {
  r: PerformanceReview
  isEmployee: boolean
  isHr: boolean
}) {
  const store = useStore()
  const [comment, setComment] = React.useState("")
  if (isEmployee)
    return (
      <Block title="Your response">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Acknowledging means you have read it, not that you agree. You can
            add your own comment.
          </p>
          <Textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            aria-label="Your comment"
            placeholder="Optional."
          />
          <Button
            onClick={() => {
              store.updateReview(
                r.id,
                {
                  status: "complete",
                  employeeComment: comment.trim() || null,
                  acknowledgedOn: TODAY_ISO,
                },
                "Acknowledged a performance review"
              )
              toast.success("Acknowledged. The review is complete.")
            }}
          >
            Acknowledge review
          </Button>
        </div>
      </Block>
    )
  return (
    <Block title="Waiting for the employee">
      <Waiting who="Shared with the employee. The review completes when they acknowledge it." />
      {isHr && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => {
            store.updateReview(
              r.id,
              { status: "complete" },
              "Closed a review without acknowledgement"
            )
            toast.success("Review closed.")
          }}
        >
          Close without acknowledgement
        </Button>
      )}
    </Block>
  )
}
