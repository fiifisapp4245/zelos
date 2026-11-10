"use client"

import * as React from "react"
import { Lock, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormRow, NativeSelect } from "@/components/talent/form"
import { useStore } from "@/lib/store"
import { audienceMembers } from "@/lib/announcements"
import { MIN_GROUP, resultsFor, validateSurvey } from "@/lib/surveys"
import { newId } from "@/lib/ids"
import type { Audience, PulseQuestion, Survey } from "@/lib/types"
import { cn } from "@/lib/utils"

const SCALE_LABEL = [
  "Strongly disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly agree",
]

/** Answering a survey. Nothing sent from here carries the person's name. */
export function TakeDialog({
  survey,
  onClose,
}: {
  survey: Survey
  onClose: () => void
}) {
  const store = useStore()
  const [answers, setAnswers] = React.useState<Record<string, number | string>>(
    {}
  )
  const [error, setError] = React.useState<string | null>(null)
  const scored = survey.questions.filter((q) => q.kind !== "text")
  const left = scored.filter((q) => answers[q.id] === undefined).length

  return (
    <FormDialog
      title={survey.title}
      description={survey.intro}
      width="lg"
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" />
            Anonymous. Your name is not kept with your answers.
          </span>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Not now
          </Button>
          <Button
            size="lg"
            onClick={() => {
              if (left > 0) {
                setError(
                  `Please answer the ${left} scored question${left === 1 ? "" : "s"} left.`
                )
                return
              }
              const r = store.submitSurvey(survey.id, answers)
              if (!r.ok) {
                setError(r.reason)
                return
              }
              toast.success(
                "Thank you. Your answers are in, and nobody can see they are yours."
              )
              onClose()
            }}
          >
            Send my answers
          </Button>
        </>
      }
    >
      <ol className="space-y-6">
        {survey.questions.map((q, i) => (
          <li key={q.id}>
            <p className="mb-2 text-sm font-medium">
              <span className="text-muted-foreground">{i + 1}. </span>
              {q.prompt}
            </p>
            {q.kind === "enps" && (
              <div role="radiogroup" aria-label={q.prompt}>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 11 }, (_, n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={answers[q.id] === n}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: n }))}
                      className={cn(
                        "tabular grid size-9 place-items-center rounded-lg border text-sm focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
                        answers[q.id] === n
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>Not at all likely</span>
                  <span>Extremely likely</span>
                </p>
              </div>
            )}
            {q.kind === "scale" && (
              <div
                role="radiogroup"
                aria-label={q.prompt}
                className="grid grid-cols-5 gap-1.5"
              >
                {SCALE_LABEL.map((l, n) => (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={answers[q.id] === n + 1}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: n + 1 }))}
                    className={cn(
                      "rounded-lg border px-1 py-2 text-xs leading-tight focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
                      answers[q.id] === n + 1
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
            {q.kind === "text" && (
              <Textarea
                aria-label={q.prompt}
                rows={3}
                maxLength={500}
                placeholder="Optional. Please do not include anything that identifies you or someone else."
                value={(answers[q.id] as string | undefined) ?? ""}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                }
              />
            )}
          </li>
        ))}
      </ol>
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
    </FormDialog>
  )
}

export function BuildDialog({
  existing,
  onClose,
}: {
  existing?: Survey
  onClose: () => void
}) {
  const store = useStore()
  const depts = store.departments.filter((d) => !d.archived).map((d) => d.name)
  const branches = store.branches.filter((b) => !b.archived).map((b) => b.name)
  const [title, setTitle] = React.useState(existing?.title ?? "")
  const [intro, setIntro] = React.useState(
    existing?.intro ??
      "A few minutes, anonymous. We read the results together and share what we will change."
  )
  const [qs, setQs] = React.useState<PulseQuestion[]>(
    existing?.questions ?? [
      {
        id: newId("q"),
        kind: "enps",
        prompt: "How likely are you to recommend working here to a friend?",
      },
    ]
  )
  const [kind, setKind] = React.useState<Audience["kind"]>(
    existing?.audience.kind ?? "all"
  )
  const [value, setValue] = React.useState(existing?.audience.value ?? "")
  const [closes, setCloses] = React.useState(existing?.closesOn ?? "")
  const [touched, setTouched] = React.useState(false)

  const audience: Audience = { kind, value: kind === "all" ? "" : value }
  const errors = validateSurvey({ title, questions: qs, audience }, (k, v) =>
    (k === "department" ? depts : branches).includes(v)
  )
  const reach = audienceMembers({ audience }, store.employees).length

  function save(open: boolean) {
    setTouched(true)
    if (Object.keys(errors).length) return
    const sv: Survey = {
      id: existing?.id ?? newId("sv"),
      title: title.trim(),
      intro: intro.trim(),
      questions: qs.map((q) => ({ ...q, prompt: q.prompt.trim() })),
      audience,
      status: open ? "open" : (existing?.status ?? "draft"),
      createdBy: existing?.createdBy ?? store.viewer.employeeId,
      createdOn: existing?.createdOn ?? "",
      closesOn: closes || null,
    }
    store.saveSurvey(sv)
    if (open && existing?.status !== "open")
      store.setSurveyStatus(sv.id, "open")
    toast.success(
      open
        ? `Opened to ${reach} ${reach === 1 ? "person" : "people"}.`
        : "Saved as a draft."
    )
    onClose()
  }

  return (
    <FormDialog
      title={existing ? "Edit survey" : "New pulse survey"}
      description="Short, anonymous and repeatable. Results are only shown for groups of five or more."
      width="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" size="lg" onClick={() => save(false)}>
            Save draft
          </Button>
          <Button size="lg" onClick={() => save(true)}>
            Open to {reach}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormRow
          label="Title"
          htmlFor="sv-title"
          error={touched ? errors.title : null}
        >
          <Input
            id="sv-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Q4 pulse"
          />
        </FormRow>
        <FormRow label="What people see first" htmlFor="sv-intro">
          <Textarea
            id="sv-intro"
            rows={2}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
          />
        </FormRow>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormRow label="Who" htmlFor="sv-kind">
            <NativeSelect
              id="sv-kind"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as Audience["kind"])
                setValue("")
              }}
            >
              <option value="all">Everyone</option>
              <option value="department">A department</option>
              <option value="branch">An office</option>
            </NativeSelect>
          </FormRow>
          {kind !== "all" && (
            <FormRow
              label={kind === "department" ? "Department" : "Office"}
              htmlFor="sv-val"
              error={touched ? errors.audience : null}
            >
              <NativeSelect
                id="sv-val"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              >
                <option value="">Choose…</option>
                {(kind === "department" ? depts : branches).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </NativeSelect>
            </FormRow>
          )}
          <FormRow label="Closes (optional)" htmlFor="sv-close">
            <Input
              id="sv-close"
              type="date"
              value={closes}
              onChange={(e) => setCloses(e.target.value)}
            />
          </FormRow>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">Questions</legend>
          {qs.map((q, i) => (
            <div
              key={q.id}
              className="grid items-center gap-2 sm:grid-cols-[150px_1fr_auto]"
            >
              <NativeSelect
                aria-label={`Question ${i + 1} type`}
                value={q.kind}
                onChange={(e) =>
                  setQs((x) =>
                    x.map((y, j) =>
                      j === i
                        ? {
                            ...y,
                            kind: e.target.value as PulseQuestion["kind"],
                          }
                        : y
                    )
                  )
                }
              >
                <option value="enps">Would recommend (0–10)</option>
                <option value="scale">Agree (1–5)</option>
                <option value="text">Free text</option>
              </NativeSelect>
              <Input
                aria-label={`Question ${i + 1}`}
                value={q.prompt}
                onChange={(e) =>
                  setQs((x) =>
                    x.map((y, j) =>
                      j === i ? { ...y, prompt: e.target.value } : y
                    )
                  )
                }
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove question ${i + 1}`}
                onClick={() => setQs((x) => x.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setQs((x) => [
                ...x,
                { id: newId("q"), kind: "scale", prompt: "" },
              ])
            }
          >
            <Plus className="size-3.5" />
            Add question
          </Button>
          {touched && errors.questions && (
            <p role="alert" className="text-xs text-destructive">
              {errors.questions}
            </p>
          )}
        </fieldset>
      </div>
    </FormDialog>
  )
}

export function ResultsDialog({
  survey,
  onClose,
}: {
  survey: Survey
  onClose: () => void
}) {
  const store = useStore()
  const invited = audienceMembers(survey, store.employees).length
  const r = resultsFor(survey, store.surveyResponses, invited)
  const rate = invited ? Math.round((r.responses / invited) * 100) : 0

  return (
    <FormDialog
      title={`${survey.title}: results`}
      description={`${r.responses} of ${invited} answered (${rate}%).`}
      width="lg"
      onClose={onClose}
      footer={
        <Button size="lg" variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {!r.shown ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm">
          <Lock className="mx-auto mb-2 size-5 text-muted-foreground" />
          <p className="font-medium">Results are held back for now</p>
          <p className="mt-1 text-muted-foreground">
            With fewer than {MIN_GROUP} answers, any figure could point at one
            person. Results appear once {MIN_GROUP} people have answered.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <ul className="space-y-4">
            {r.questions
              .filter((q) => q.kind !== "text")
              .map((q) => (
                <li key={q.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span>{q.prompt}</span>
                    <span className="tabular font-semibold">
                      {q.kind === "enps"
                        ? `eNPS ${q.value! > 0 ? "+" : ""}${q.value}`
                        : `${q.value} / 5`}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width:
                          q.kind === "enps"
                            ? `${(((q.value ?? 0) + 100) / 200) * 100}%`
                            : `${((q.value ?? 0) / 5) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
          </ul>

          <div>
            <h3 className="mb-2 text-sm font-medium">By team</h3>
            {r.departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No team has {MIN_GROUP} or more answers, so none is shown on its
                own.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-1.5 font-medium">Team</th>
                    <th className="py-1.5 text-right font-medium">Answers</th>
                    <th className="py-1.5 text-right font-medium">eNPS</th>
                    <th className="py-1.5 text-right font-medium">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {r.departments.map((d) => (
                    <tr key={d.department}>
                      <td className="py-1.5">{d.department}</td>
                      <td className="tabular py-1.5 text-right">{d.n}</td>
                      <td className="tabular py-1.5 text-right">
                        {d.enps ?? "—"}
                      </td>
                      <td className="tabular py-1.5 text-right">
                        {d.score ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {r.withheldDepartments > 0 && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Lock className="mt-0.5 size-3 shrink-0" />
                {r.withheldDepartments} team
                {r.withheldDepartments === 1 ? "" : "s"} held back: fewer than{" "}
                {MIN_GROUP} answers.
              </p>
            )}
          </div>

          {r.questions
            .filter((q) => q.kind === "text" && (q.comments?.length ?? 0) > 0)
            .map((q) => (
              <div key={q.id}>
                <h3 className="mb-2 text-sm font-medium">{q.prompt}</h3>
                <ul className="space-y-1.5">
                  {q.comments!.map((c, i) => (
                    <li
                      key={i}
                      className="rounded-lg border-l-2 bg-muted/40 px-3 py-2 text-sm"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  Comments are shown with no name and no team.
                </p>
              </div>
            ))}
        </div>
      )}
    </FormDialog>
  )
}
