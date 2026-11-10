"use client"

import * as React from "react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormRow } from "./form"
import { useStore } from "@/lib/store"
import { formatDateTime, fullName } from "@/lib/format"
import { needsReview, outcomeOf, timeTakenMin } from "@/lib/assess/logic"
import type { TestInvitation } from "@/lib/types"

const FLAG_LABEL = {
  tab_left: "Left the tab",
  paste: "Pasted text",
  fullscreen_exit: "Left full screen",
} as const

export function FlagsSummary({ inv }: { inv: TestInvitation }) {
  if (inv.flags.length === 0)
    return (
      <span className="text-xs text-muted-foreground">No integrity flags</span>
    )
  const counts = inv.flags.reduce<Record<string, number>>(
    (m, f) => ({ ...m, [f.kind]: (m[f.kind] ?? 0) + 1 }),
    {}
  )
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {Object.entries(counts).map(([k, v]) => (
        <Pill key={k} tone="warning">
          {FLAG_LABEL[k as keyof typeof FLAG_LABEL]} × {v}
        </Pill>
      ))}
    </span>
  )
}

export function ReviewAssessmentDialog({
  invId,
  onClose,
}: {
  invId: string
  onClose: () => void
}) {
  const store = useStore()
  const inv = store.invitations.find((i) => i.id === invId)
  const test = inv && store.tests.find((t) => t.id === inv.testId)
  const cand = inv && store.candidates.find((c) => c.id === inv.candidateId)
  const [marks, setMarks] = React.useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    if (inv)
      for (const id of inv.questionIds) {
        const v = inv.reviewMarks[id] ?? inv.autoMarks[id]
        if (v !== undefined) m[id] = String(v)
      }
    return m
  })
  const [note, setNote] = React.useState(inv?.reviewNote ?? "")
  const [touched, setTouched] = React.useState(false)
  if (!inv || !test) return null

  const paper = inv.questionIds
    .map((id) => store.questionBank.find((q) => q.id === id))
    .filter((q): q is NonNullable<typeof q> => !!q)

  const entered = (id: string) => marks[id] !== undefined && marks[id] !== ""
  const invalid = (id: string) => {
    const q = paper.find((x) => x.id === id)!
    const v = Number(marks[id])
    return entered(id) && (Number.isNaN(v) || v < 0 || v > q.marks)
  }
  const unmarked = paper.filter((q) => needsReview(q) && !entered(q.id))
  const anyInvalid = paper.some((q) => invalid(q.id))

  const reviewMarks: Record<string, number> = {}
  for (const q of paper)
    if (
      entered(q.id) &&
      !invalid(q.id) &&
      Number(marks[q.id]) !== inv.autoMarks[q.id]
    )
      reviewMarks[q.id] = Number(marks[q.id])

  const outcome = outcomeOf(
    { ...inv, reviewMarks, reviewed: unmarked.length === 0 },
    test,
    store.questionBank
  )

  function save(finish: boolean) {
    setTouched(true)
    if (anyInvalid) return
    if (finish && unmarked.length > 0) {
      toast.error(
        `Mark ${unmarked.length} written answer${unmarked.length === 1 ? "" : "s"} first.`
      )
      return
    }
    store.saveReview(inv!.id, reviewMarks, note.trim(), finish)
    toast.success(finish ? "Review signed off." : "Draft saved.")
    if (finish) onClose()
  }

  return (
    <FormDialog
      title={`${cand?.name ?? "Candidate"} — ${test.name}`}
      description={`Submitted ${inv.submittedAt ? formatDateTime(inv.submittedAt) : ""} · ${timeTakenMin(inv) ?? "?"} of ${test.durationMin + inv.extraMinutes} minutes used`}
      width="lg"
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto text-sm">
            <strong className="tabular font-medium">
              {outcome.score}/{outcome.max}
            </strong>{" "}
            <span className="text-muted-foreground">
              · {outcome.pct}%
              {outcome.passed === null
                ? " · not yet called"
                : outcome.passed
                  ? " · pass"
                  : " · below the pass mark"}
            </span>
          </span>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Close
          </Button>
          {!inv.reviewed && (
            <Button variant="outline" size="lg" onClick={() => save(false)}>
              Save draft
            </Button>
          )}
          <Button size="lg" onClick={() => save(true)}>
            {inv.reviewed ? "Update review" : "Sign off"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-lg border p-3 text-sm">
          <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Integrity
          </p>
          <FlagsSummary inv={inv} />
          {inv.flags.length > 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              These are signals to look at, not a verdict. Someone may leave a
              tab for a reason that has nothing to do with the test.
            </p>
          )}
          {inv.extraNote && (
            <p className="mt-2 text-xs text-muted-foreground">
              Extra time granted: {inv.extraNote}
            </p>
          )}
        </div>

        <ol className="space-y-5">
          {paper.map((q, i) => {
            const a = inv.answers[q.id]
            return (
              <li key={q.id} className="space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">{i + 1}. </span>
                  {q.prompt}
                </p>
                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  {(q.kind === "mcq" || q.kind === "multi") && (
                    <ul className="space-y-0.5">
                      {q.options?.map((o, k) => {
                        const chose = a?.choices?.includes(k)
                        const right = q.correct?.includes(k)
                        return (
                          <li
                            key={k}
                            className={
                              right
                                ? "font-medium text-primary"
                                : chose
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                            }
                          >
                            {chose ? "● " : "○ "}
                            {o}
                            {right && " ✓"}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {(q.kind === "short" || q.kind === "long") && (
                    <p className="whitespace-pre-line">
                      {a?.text?.trim() || (
                        <span className="text-muted-foreground">
                          No answer.
                        </span>
                      )}
                    </p>
                  )}
                  {q.kind === "upload" && (
                    <p>
                      {a?.fileName ? (
                        `Attached: ${a.fileName}`
                      ) : (
                        <span className="text-muted-foreground">
                          No file attached.
                        </span>
                      )}
                    </p>
                  )}
                  {q.kind === "code" && (
                    <>
                      <pre className="max-h-48 overflow-auto rounded bg-background p-2 font-mono text-xs">
                        {a?.code ?? "No code."}
                      </pre>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Hidden tests passed:{" "}
                        {a?.total
                          ? `${a.passed ?? 0} of ${a.total}`
                          : "not run"}
                      </p>
                    </>
                  )}
                </div>
                {q.guide && (
                  <p className="text-xs text-muted-foreground">
                    Look for: {q.guide}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <label
                    htmlFor={`mk-${q.id}`}
                    className="text-muted-foreground"
                  >
                    Marks
                  </label>
                  <Input
                    id={`mk-${q.id}`}
                    type="number"
                    step="0.5"
                    min={0}
                    max={q.marks}
                    value={marks[q.id] ?? ""}
                    onChange={(e) =>
                      setMarks((m) => ({ ...m, [q.id]: e.target.value }))
                    }
                    className="h-8 w-20"
                    aria-invalid={invalid(q.id)}
                  />
                  <span className="text-muted-foreground">of {q.marks}</span>
                  {q.id in inv.autoMarks && (
                    <Pill tone="neutral">Auto {inv.autoMarks[q.id]}</Pill>
                  )}
                  {needsReview(q) && !entered(q.id) && (
                    <Pill tone="warning">Needs a mark</Pill>
                  )}
                  {touched && invalid(q.id) && (
                    <span role="alert" className="text-xs text-destructive">
                      0 to {q.marks}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ol>

        <FormRow
          label="Reviewer's note"
          htmlFor="rv-note"
          hint="Kept with the result; the candidate does not see it."
        >
          <Textarea
            id="rv-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </FormRow>
        {inv.reviewerId && (
          <p className="text-xs text-muted-foreground">
            Last saved by {fullName(store.employeeById(inv.reviewerId))}.
          </p>
        )}
      </div>
    </FormDialog>
  )
}

export function ExtraTimeDialog({
  invId,
  onClose,
}: {
  invId: string
  onClose: () => void
}) {
  const store = useStore()
  const [minutes, setMinutes] = React.useState("15")
  const [note, setNote] = React.useState("")
  const [touched, setTouched] = React.useState(false)
  const errors = {
    minutes:
      Number(minutes) >= 1 && Number(minutes) <= 180
        ? null
        : "Between 1 and 180 minutes.",
    note:
      note.trim().length >= 5
        ? null
        : "Say why, so the extra time is on the record.",
  }
  return (
    <FormDialog
      title="Grant extra time"
      description="Added to this candidate's clock only, and recorded with the reason."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={() => {
              setTouched(true)
              if (errors.minutes || errors.note) return
              store.grantExtraTime(invId, Number(minutes), note.trim())
              toast.success(`${minutes} minutes added.`)
              onClose()
            }}
          >
            Grant time
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormRow
          label="Minutes"
          htmlFor="et-min"
          error={touched ? errors.minutes : null}
          className="max-w-[160px]"
        >
          <Input
            id="et-min"
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </FormRow>
        <FormRow
          label="Reason"
          htmlFor="et-note"
          error={touched ? errors.note : null}
        >
          <Textarea
            id="et-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Accessibility adjustment agreed with the candidate."
          />
        </FormRow>
      </div>
    </FormDialog>
  )
}
