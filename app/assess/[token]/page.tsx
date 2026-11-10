"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { CheckCircle2, Clock, Maximize, Play, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { runInSandbox } from "@/components/assess/run-code"
import { useStore } from "@/lib/store"
import {
  QUESTION_KIND_LABEL,
  canStart,
  formatClock,
  remainingMs,
  type CaseResult,
} from "@/lib/assess/logic"
import type { AnswerValue, Question } from "@/lib/types"
import { cn } from "@/lib/utils"

function Shell({
  company,
  children,
  wide,
}: {
  company: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className={cn("mx-auto", wide ? "max-w-5xl" : "max-w-2xl")}>
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            {company.slice(0, 1).toUpperCase()}
          </span>
          <span className="text-sm font-medium">{company}</span>
        </div>
        {children}
      </div>
    </main>
  )
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border p-8 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}

export default function AssessmentPage() {
  const { token } = useParams<{ token: string }>()
  const store = useStore()
  const [consent, setConsent] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  // Read once on arrival: whether the window is still open is judged against this moment.
  const [arrived] = React.useState(() => Date.now())

  const company = store.company.tradingName || store.company.legalName
  const inv = store.invitations.find((i) => i.token === token)
  const test = inv && store.tests.find((t) => t.id === inv.testId)
  const candidate =
    inv && store.candidates.find((c) => c.id === inv.candidateId)
  const req =
    candidate &&
    store.requisitions.find((r) => r.id === candidate.requisitionId)

  if (!store.ready)
    return (
      <Shell company={company}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Shell>
    )
  if (!inv || !test || !candidate)
    return (
      <Shell company={company}>
        <Message
          title="This link cannot be used"
          body="This assessment link is not valid."
        />
      </Shell>
    )
  if (inv.status === "submitted")
    return (
      <Shell company={company}>
        <div className="rounded-xl border p-8 text-center">
          <CheckCircle2 className="mx-auto size-8 text-primary" />
          <h1 className="mt-3 text-lg font-semibold">
            Thank you, {candidate.name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your answers to “{test.name}” were submitted. The team will be in
            touch about next steps. You can close this page.
          </p>
        </div>
      </Shell>
    )
  if (inv.status === "invited" && !canStart(inv, arrived))
    return (
      <Shell company={company}>
        <Message
          title="This invitation has expired"
          body="The window to start this assessment has closed. Please contact the recruiter."
        />
      </Shell>
    )

  if (inv.status === "invited")
    return (
      <Shell company={company}>
        <div className="rounded-xl border p-6">
          <p className="text-xs text-muted-foreground">{company}</p>
          <h1 className="mt-1 text-xl font-semibold">{test.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            For {req?.title ?? "your application"}
          </p>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Questions</dt>
              <dd className="font-medium">{inv.questionIds.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Time limit</dt>
              <dd className="font-medium">
                {test.durationMin + inv.extraMinutes} minutes
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Attempts</dt>
              <dd className="font-medium">One</dd>
            </div>
          </dl>

          <ul className="mt-5 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              The clock starts when you press Start. It cannot be paused, and
              refreshing the page does not add time.
            </li>
            <li>
              Your answers save as you go, so a lost connection loses nothing.
              The test submits itself when time runs out.
            </li>
            <li>
              Coding questions need a laptop. You can run your code against
              sample tests before you submit.
            </li>
            <li>
              We record if you leave this tab, paste a large block of text, or
              leave full screen. A reviewer sees this as a signal, not a
              verdict.
            </li>
          </ul>

          <label className="mt-5 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--primary)]"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I understand how this is timed and what is recorded, and I agree to
            take it on my own.
          </label>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            className="mt-5"
            size="lg"
            disabled={!consent}
            onClick={() => {
              const r = store.startTest(token)
              if (!r.ok) setError(r.reason)
            }}
          >
            <Play className="size-4" />
            Start the test
          </Button>
        </div>
      </Shell>
    )

  return <Taking token={token} company={company} />
}

/* ── Taking the test ─────────────────────────────────────────────────────── */

function Taking({ token, company }: { token: string; company: string }) {
  const store = useStore()
  const inv = store.invitations.find((i) => i.token === token)!
  const test = store.tests.find((t) => t.id === inv.testId)!
  const paper = inv.questionIds
    .map((id) => store.questionBank.find((q) => q.id === id))
    .filter((q): q is Question => !!q)

  const [answers, setAnswers] = React.useState<Record<string, AnswerValue>>(
    inv.answers
  )
  const [idx, setIdx] = React.useState(0)
  const [now, setNow] = React.useState(() => Date.now())
  const [saved, setSaved] = React.useState<"saved" | "saving" | "late">("saved")
  const [confirming, setConfirming] = React.useState(false)
  const [runs, setRuns] = React.useState<
    Record<
      string,
      { results: CaseResult[]; timedOut: boolean; running: boolean }
    >
  >({})
  const [submitting, setSubmitting] = React.useState(false)
  const answersRef = React.useRef(answers)
  const dirty = React.useRef<Set<string>>(new Set())
  const done = React.useRef(false)
  const lastRun = React.useRef<Record<string, string>>({})

  const remaining = remainingMs(inv.deadline, now)
  const q = paper[idx]

  /* Keeps the clock honest: it counts down to the stored deadline, never from a local timer. */
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  const flush = React.useCallback(() => {
    if (dirty.current.size === 0) return true
    const batch: Record<string, AnswerValue> = {}
    dirty.current.forEach((id) => (batch[id] = answersRef.current[id]))
    const ok = store.saveAnswers(token, batch)
    if (ok) {
      dirty.current.clear()
      setSaved("saved")
    } else setSaved("late")
    return ok
  }, [store, token])

  /* Autosave shortly after the last change. */
  React.useEffect(() => {
    if (dirty.current.size === 0) return
    setSaved("saving")
    const t = setTimeout(flush, 700)
    return () => clearTimeout(t)
  }, [answers, flush])

  function setAnswer(id: string, patch: Partial<AnswerValue>) {
    setAnswers((a) => {
      const next = { ...a, [id]: { ...a[id], ...patch } }
      answersRef.current = next
      return next
    })
    dirty.current.add(id)
  }

  /* Hidden tests run on their own a moment after the code stops changing, so a result is on file before time is up. */
  React.useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    for (const c of paper.filter((x) => x.kind === "code" && x.code)) {
      const code = answers[c.id]?.code
      if (!code || lastRun.current[c.id] === code) continue
      timers.push(
        setTimeout(async () => {
          lastRun.current[c.id] = code
          const r = await runInSandbox(code, c.code!.fn, c.code!.tests)
          if (done.current) return
          const hidden = r.results.filter((x) => x.hidden)
          setAnswer(c.id, {
            passed: hidden.filter((x) => x.passed).length,
            total: hidden.length,
          })
          setRuns((m) => ({ ...m, [c.id]: { ...r, running: false } }))
        }, 1200)
      )
    }
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers])

  const submit = React.useCallback(
    (final: boolean) => {
      if (done.current) return
      done.current = true
      setSubmitting(true)
      flush()
      store.submitTest(token)
      void final
    },
    [flush, store, token]
  )

  /* Time up: whatever is on the page is saved, then handed in. */
  React.useEffect(() => {
    if (inv.deadline && remaining <= 0 && !done.current) submit(true)
  }, [remaining, inv.deadline, submit])

  /* Integrity signals, shown to the reviewer. */
  React.useEffect(() => {
    const onVis = () => {
      if (document.hidden && !done.current)
        store.logFlag(token, { kind: "tab_left" })
    }
    const onFs = () => {
      if (!document.fullscreenElement && !done.current && fsUsed.current)
        store.logFlag(token, { kind: "fullscreen_exit" })
    }
    const fsUsed = { current: false }
    ;(window as unknown as { __zelosFs?: typeof fsUsed }).__zelosFs = fsUsed
    document.addEventListener("visibilitychange", onVis)
    document.addEventListener("fullscreenchange", onFs)
    return () => {
      document.removeEventListener("visibilitychange", onVis)
      document.removeEventListener("fullscreenchange", onFs)
    }
  }, [store, token])

  function onPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text")
    if (text.length >= 80)
      store.logFlag(token, {
        kind: "paste",
        detail: `${text.length} characters`,
      })
  }

  async function runSample(c: Question) {
    const code = answers[c.id]?.code ?? c.code!.starter
    setRuns((m) => ({
      ...m,
      [c.id]: { results: [], timedOut: false, running: true },
    }))
    const r = await runInSandbox(
      code,
      c.code!.fn,
      c.code!.tests.filter((t) => !t.hidden)
    )
    setRuns((m) => ({ ...m, [c.id]: { ...r, running: false } }))
  }

  if (submitting)
    return (
      <Shell company={company}>
        <p className="text-sm text-muted-foreground">Submitting…</p>
      </Shell>
    )

  const answered = (id: string) => {
    const a = answers[id]
    if (!a) return false
    return !!(
      a.text?.trim() ||
      a.choices?.length ||
      a.fileName ||
      (a.code && a.code.trim())
    )
  }
  const low = remaining <= 5 * 60_000

  return (
    <Shell company={company} wide>
      <div className="sticky top-0 z-10 -mx-4 mb-5 flex flex-wrap items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{test.name}</p>
          <p className="text-xs text-muted-foreground">
            Question {idx + 1} of {paper.length} ·{" "}
            {saved === "saved"
              ? "All answers saved"
              : saved === "saving"
                ? "Saving…"
                : "Time is up: answers are no longer accepted"}
          </p>
        </div>
        <span
          role="timer"
          aria-live="off"
          className={cn(
            "tabular flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold",
            low && "border-destructive text-destructive"
          )}
        >
          <Clock className="size-4" />
          {formatClock(remaining)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const w = window as unknown as { __zelosFs?: { current: boolean } }
            if (w.__zelosFs) w.__zelosFs.current = true
            void document.documentElement.requestFullscreen?.()
          }}
        >
          <Maximize className="size-3.5" />
          Full screen
        </Button>
        <Button size="sm" onClick={() => setConfirming(true)}>
          Submit
        </Button>
      </div>

      {confirming && (
        <div
          role="alertdialog"
          aria-label="Submit the test"
          className="mb-5 rounded-xl border p-4 text-sm"
        >
          <p className="font-medium">Hand in your answers?</p>
          <p className="mt-1 text-muted-foreground">
            {paper.filter((p) => !answered(p.id)).length === 0
              ? "Every question has an answer."
              : `${paper.filter((p) => !answered(p.id)).length} question(s) are still unanswered.`}{" "}
            You cannot come back to it.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => submit(false)}>
              Yes, submit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirming(false)}
            >
              Keep working
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[180px_1fr]">
        <nav aria-label="Questions">
          <ol className="flex flex-wrap gap-1.5 md:flex-col">
            {paper.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-current={i === idx ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    i === idx
                      ? "border-primary bg-success-muted font-medium text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="tabular">{i + 1}</span>
                  {answered(p.id) && (
                    <CheckCircle2 className="ml-auto size-3.5 text-primary" />
                  )}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {q && (
          <section className="min-w-0" onPaste={onPaste}>
            <p className="text-xs text-muted-foreground">
              {QUESTION_KIND_LABEL[q.kind]} · {q.marks} mark
              {q.marks === 1 ? "" : "s"}
            </p>
            <h2 className="mt-1 text-base font-medium whitespace-pre-line">
              {q.prompt}
            </h2>

            <div className="mt-4">
              {(q.kind === "mcq" || q.kind === "multi") && (
                <fieldset className="space-y-2">
                  <legend className="sr-only">{q.prompt}</legend>
                  {q.kind === "multi" && (
                    <p className="text-xs text-muted-foreground">
                      Choose all that apply.
                    </p>
                  )}
                  {q.options?.map((o, i) => {
                    const chosen = answers[q.id]?.choices?.includes(i) ?? false
                    return (
                      <label
                        key={i}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm",
                          chosen && "border-primary bg-success-muted/50"
                        )}
                      >
                        <input
                          type={q.kind === "mcq" ? "radio" : "checkbox"}
                          name={q.id}
                          className="size-4 accent-[var(--primary)]"
                          checked={chosen}
                          onChange={(e) => {
                            const cur = answers[q.id]?.choices ?? []
                            setAnswer(q.id, {
                              choices:
                                q.kind === "mcq"
                                  ? [i]
                                  : e.target.checked
                                    ? [...cur, i]
                                    : cur.filter((x) => x !== i),
                            })
                          }}
                        />
                        {o}
                      </label>
                    )
                  })}
                </fieldset>
              )}

              {(q.kind === "short" || q.kind === "long") && (
                <Textarea
                  aria-label="Your answer"
                  rows={q.kind === "short" ? 5 : 12}
                  value={answers[q.id]?.text ?? ""}
                  onChange={(e) => setAnswer(q.id, { text: e.target.value })}
                />
              )}

              {q.kind === "upload" && (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm">
                  <Upload className="size-5 text-muted-foreground" />
                  {answers[q.id]?.fileName ? (
                    <span className="font-medium">
                      {answers[q.id]?.fileName}
                    </span>
                  ) : (
                    <span>Choose a file</span>
                  )}
                  <input
                    type="file"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) setAnswer(q.id, { fileName: f.name })
                    }}
                  />
                </label>
              )}

              {q.kind === "code" && q.code && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      JavaScript · define{" "}
                      <code className="font-mono">{q.code.fn}</code>
                    </span>
                    <span>
                      {q.code.tests.filter((t) => !t.hidden).length} sample
                      tests · {q.code.tests.filter((t) => t.hidden).length}{" "}
                      hidden
                    </span>
                  </div>
                  <Textarea
                    aria-label="Code editor"
                    spellCheck={false}
                    rows={14}
                    className="font-mono text-[13px] leading-relaxed"
                    value={answers[q.id]?.code ?? q.code.starter}
                    onChange={(e) => setAnswer(q.id, { code: e.target.value })}
                    onKeyDown={(e) => {
                      // Tab indents, as an editor would, rather than leaving the box.
                      if (e.key === "Tab" && !e.shiftKey) {
                        e.preventDefault()
                        const el = e.currentTarget
                        const s = el.selectionStart
                        const v = el.value
                        const next =
                          v.slice(0, s) + "  " + v.slice(el.selectionEnd)
                        setAnswer(q.id, { code: next })
                        requestAnimationFrame(
                          () => (el.selectionStart = el.selectionEnd = s + 2)
                        )
                      }
                    }}
                  />
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runSample(q)}
                      disabled={runs[q.id]?.running}
                    >
                      <Play className="size-3.5" />
                      {runs[q.id]?.running ? "Running…" : "Run sample tests"}
                    </Button>
                    {answers[q.id]?.total ? (
                      <span className="text-xs text-muted-foreground">
                        Hidden tests are checked automatically as you type.
                      </span>
                    ) : null}
                  </div>
                  {runs[q.id] && !runs[q.id].running && (
                    <ul
                      className="space-y-1.5 text-sm"
                      aria-label="Test results"
                    >
                      {runs[q.id].results
                        .filter((r) => !r.hidden)
                        .map((r, i) => (
                          <li
                            key={i}
                            className={cn(
                              "rounded-lg border px-3 py-2",
                              r.passed
                                ? "border-primary/40"
                                : "border-destructive/40"
                            )}
                          >
                            <p className="font-medium">
                              Sample {i + 1}: {r.passed ? "passed" : "failed"}
                            </p>
                            {!r.passed && (
                              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                expected {r.expected} · got {r.got}
                              </p>
                            )}
                          </li>
                        ))}
                      {runs[q.id].timedOut && (
                        <li className="text-xs text-destructive">
                          Your code ran for too long and was stopped.
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <Button
                variant="outline"
                disabled={idx === 0}
                onClick={() => setIdx(idx - 1)}
              >
                Previous
              </Button>
              {idx < paper.length - 1 ? (
                <Button onClick={() => setIdx(idx + 1)}>Next</Button>
              ) : (
                <Button onClick={() => setConfirming(true)}>
                  Review and submit
                </Button>
              )}
            </div>
          </section>
        )}
      </div>
    </Shell>
  )
}
