"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormRow, NativeSelect } from "./form"
import { newId } from "@/lib/ids"
import { useStore } from "@/lib/store"
import { QUESTION_KIND_LABEL } from "@/lib/assess/logic"
import type { Question, QuestionKind, TestCase } from "@/lib/types"

const KINDS = Object.keys(QUESTION_KIND_LABEL) as QuestionKind[]

interface CaseDraft {
  args: string
  expected: string
  hidden: boolean
}

const asJson = (v: unknown) => JSON.stringify(v)

export function QuestionDialog({
  existing,
  onClose,
}: {
  existing?: Question
  onClose: () => void
}) {
  const store = useStore()
  const [kind, setKind] = React.useState<QuestionKind>(existing?.kind ?? "mcq")
  const [prompt, setPrompt] = React.useState(existing?.prompt ?? "")
  const [skill, setSkill] = React.useState(existing?.skill ?? "")
  const [level, setLevel] = React.useState<Question["level"]>(
    existing?.level ?? "mid"
  )
  const [marks, setMarks] = React.useState(String(existing?.marks ?? 2))
  const [options, setOptions] = React.useState<string[]>(
    existing?.options ?? ["", ""]
  )
  const [correct, setCorrect] = React.useState<number[]>(
    existing?.correct ?? []
  )
  const [guide, setGuide] = React.useState(existing?.guide ?? "")
  const [fn, setFn] = React.useState(existing?.code?.fn ?? "solve")
  const [starter, setStarter] = React.useState(
    existing?.code?.starter ??
      "function solve(input) {\n  // your code here\n}\n"
  )
  const [cases, setCases] = React.useState<CaseDraft[]>(
    existing?.code?.tests.map((t) => ({
      args: asJson(t.args),
      expected: asJson(t.expected),
      hidden: t.hidden,
    })) ?? [{ args: "[1]", expected: "1", hidden: false }]
  )
  const [touched, setTouched] = React.useState(false)

  const choice = kind === "mcq" || kind === "multi"
  const parsed = cases.map((c) => {
    try {
      const args = JSON.parse(c.args)
      const expected = JSON.parse(c.expected)
      return Array.isArray(args)
        ? { ok: true as const, args, expected }
        : {
            ok: false as const,
            why: "Arguments must be a JSON array, e.g. [1, 2].",
          }
    } catch {
      return {
        ok: false as const,
        why: "Arguments and expected must be valid JSON.",
      }
    }
  })

  const errors = {
    prompt:
      prompt.trim().length >= 10
        ? null
        : "Write the question (at least 10 characters).",
    skill: skill.trim() ? null : "Tag it with a skill.",
    marks:
      Number(marks) > 0 && Number(marks) <= 100
        ? null
        : "Marks between 1 and 100.",
    options: !choice
      ? null
      : options.filter((o) => o.trim()).length < 2
        ? "Give at least two options."
        : null,
    correct: !choice
      ? null
      : correct.filter((i) => options[i]?.trim()).length === 0
        ? "Mark the right answer."
        : kind === "mcq" && correct.length !== 1
          ? "Choose exactly one right answer."
          : null,
    fn:
      kind !== "code"
        ? null
        : /^[A-Za-z_$][\w$]*$/.test(fn)
          ? null
          : "A valid function name.",
    cases:
      kind !== "code"
        ? null
        : cases.length === 0
          ? "Add at least one test."
          : (parsed.find((p) => !p.ok && "why" in p)?.why ??
            (cases.some((c) => c.hidden)
              ? null
              : "Add at least one hidden test: it decides the score.")),
  }
  const bad = Object.values(errors).some(Boolean)

  function save() {
    setTouched(true)
    if (bad) {
      toast.error("Fix the highlighted fields.")
      return
    }
    const cleanOptions = options.map((o) => o.trim())
    // Dropping a blank option shifts the others, so the right answers move with them.
    const keep = cleanOptions.map((o, i) => (o ? i : -1)).filter((i) => i >= 0)
    const q: Question = {
      id: existing?.id ?? newId("q"),
      kind,
      prompt: prompt.trim(),
      skill: skill.trim(),
      level,
      marks: Number(marks),
      ...(choice
        ? {
            options: keep.map((i) => cleanOptions[i]),
            correct: correct
              .filter((i) => keep.includes(i))
              .map((i) => keep.indexOf(i)),
          }
        : {}),
      ...(kind === "short" || kind === "long" || kind === "upload"
        ? { guide: guide.trim() || undefined }
        : {}),
      ...(kind === "code"
        ? {
            code: {
              language: "javascript" as const,
              fn,
              starter,
              tests: parsed.map((p, i): TestCase => {
                const ok = p as { args: unknown[]; expected: unknown }
                return {
                  args: ok.args,
                  expected: ok.expected,
                  hidden: cases[i].hidden,
                }
              }),
            },
          }
        : {}),
    }
    store.saveQuestion(q)
    toast.success(
      existing ? "Question updated." : "Question added to the bank."
    )
    onClose()
  }

  const show = (k: keyof typeof errors) => (touched ? errors[k] : null)

  return (
    <FormDialog
      title={existing ? "Edit question" : "New question"}
      description="Questions live in a shared bank, so any test can use them."
      width="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save}>
            {existing ? "Save question" : "Add to bank"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormRow label="Type" htmlFor="qd-kind">
            <NativeSelect
              id="qd-kind"
              value={kind}
              disabled={!!existing}
              onChange={(e) => setKind(e.target.value as QuestionKind)}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {QUESTION_KIND_LABEL[k]}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          <FormRow label="Skill" htmlFor="qd-skill" error={show("skill")}>
            <Input
              id="qd-skill"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="e.g. SQL"
            />
          </FormRow>
          <FormRow label="Level" htmlFor="qd-level">
            <NativeSelect
              id="qd-level"
              value={level}
              onChange={(e) => setLevel(e.target.value as Question["level"])}
            >
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
            </NativeSelect>
          </FormRow>
        </div>
        <FormRow label="Question" htmlFor="qd-prompt" error={show("prompt")}>
          <Textarea
            id="qd-prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </FormRow>
        <FormRow
          label="Marks"
          htmlFor="qd-marks"
          error={show("marks")}
          className="max-w-[140px]"
        >
          <Input
            id="qd-marks"
            type="number"
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
          />
        </FormRow>

        {choice && (
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">
              Options{" "}
              <span className="font-normal text-muted-foreground">
                — tick the right {kind === "mcq" ? "one" : "ones"}
              </span>
            </legend>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type={kind === "mcq" ? "radio" : "checkbox"}
                  name="qd-correct"
                  aria-label={`Option ${i + 1} is correct`}
                  className="size-4 accent-[var(--primary)]"
                  checked={correct.includes(i)}
                  onChange={(e) =>
                    setCorrect((c) =>
                      kind === "mcq"
                        ? [i]
                        : e.target.checked
                          ? [...c, i]
                          : c.filter((x) => x !== i)
                    )
                  }
                />
                <Input
                  value={o}
                  aria-label={`Option ${i + 1}`}
                  onChange={(e) =>
                    setOptions((x) =>
                      x.map((y, j) => (j === i ? e.target.value : y))
                    )
                  }
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove option ${i + 1}`}
                  disabled={options.length <= 2}
                  onClick={() => {
                    setOptions((x) => x.filter((_, j) => j !== i))
                    setCorrect((c) =>
                      c.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x))
                    )
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setOptions((x) => [...x, ""])}
            >
              <Plus className="size-3.5" />
              Add option
            </Button>
            {touched && (errors.options || errors.correct) && (
              <p role="alert" className="text-xs text-destructive">
                {errors.options ?? errors.correct}
              </p>
            )}
          </fieldset>
        )}

        {(kind === "short" || kind === "long" || kind === "upload") && (
          <FormRow
            label="Marking guide"
            htmlFor="qd-guide"
            hint="What a reviewer should look for. Candidates never see it."
          >
            <Textarea
              id="qd-guide"
              rows={3}
              value={guide}
              onChange={(e) => setGuide(e.target.value)}
            />
          </FormRow>
        )}

        {kind === "code" && (
          <div className="space-y-4">
            <FormRow
              label="Function name"
              htmlFor="qd-fn"
              error={show("fn")}
              className="max-w-xs"
              hint="The tests call this function. JavaScript only for now."
            >
              <Input
                id="qd-fn"
                value={fn}
                onChange={(e) => setFn(e.target.value)}
                className="font-mono"
              />
            </FormRow>
            <FormRow label="Starter code" htmlFor="qd-starter">
              <Textarea
                id="qd-starter"
                rows={5}
                value={starter}
                onChange={(e) => setStarter(e.target.value)}
                className="font-mono text-xs"
              />
            </FormRow>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">Tests</legend>
              <p className="text-xs text-muted-foreground">
                Arguments are a JSON array. Visible tests can be run by the
                candidate; hidden ones decide the score.
              </p>
              {cases.map((c, i) => (
                <div
                  key={i}
                  className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_auto_auto]"
                >
                  <Input
                    aria-label={`Test ${i + 1} arguments`}
                    value={c.args}
                    className="font-mono text-xs"
                    placeholder="[1, 2]"
                    onChange={(e) =>
                      setCases((x) =>
                        x.map((y, j) =>
                          j === i ? { ...y, args: e.target.value } : y
                        )
                      )
                    }
                  />
                  <Input
                    aria-label={`Test ${i + 1} expected`}
                    value={c.expected}
                    className="font-mono text-xs"
                    placeholder="3"
                    onChange={(e) =>
                      setCases((x) =>
                        x.map((y, j) =>
                          j === i ? { ...y, expected: e.target.value } : y
                        )
                      )
                    }
                  />
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--primary)]"
                      checked={c.hidden}
                      onChange={(e) =>
                        setCases((x) =>
                          x.map((y, j) =>
                            j === i ? { ...y, hidden: e.target.checked } : y
                          )
                        )
                      }
                    />
                    Hidden
                  </label>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove test ${i + 1}`}
                    onClick={() => setCases((x) => x.filter((_, j) => j !== i))}
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
                  setCases((x) => [
                    ...x,
                    { args: "[]", expected: "null", hidden: true },
                  ])
                }
              >
                <Plus className="size-3.5" />
                Add test
              </Button>
              {touched && errors.cases && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.cases}
                </p>
              )}
            </fieldset>
          </div>
        )}
      </div>
    </FormDialog>
  )
}
