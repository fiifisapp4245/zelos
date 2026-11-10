"use client"

import * as React from "react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormRow, NativeSelect } from "./form"
import { useStore } from "@/lib/store"
import { QUESTION_KIND_LABEL } from "@/lib/assess/logic"
import type { AssessmentTest } from "@/lib/types"

export function TestDialog({
  existing,
  onClose,
}: {
  existing?: AssessmentTest
  onClose: () => void
}) {
  const store = useStore()
  const bank = store.questionBank
  const [name, setName] = React.useState(existing?.name ?? "")
  const [req, setReq] = React.useState(existing?.requisitionId ?? "")
  const [ids, setIds] = React.useState<string[]>(existing?.questionIds ?? [])
  const [random, setRandom] = React.useState(existing?.pickCount != null)
  const [pick, setPick] = React.useState(String(existing?.pickCount ?? 5))
  const [shuffle, setShuffle] = React.useState(existing?.shuffle ?? false)
  const [duration, setDuration] = React.useState(
    String(existing?.durationMin ?? 60)
  )
  const [pass, setPass] = React.useState(String(existing?.passMarkPct ?? 60))
  const [windowDays, setWindowDays] = React.useState(
    String(existing?.windowDays ?? 5)
  )
  const [needed, setNeeded] = React.useState(existing?.requiredForOffer ?? true)
  const [active, setActive] = React.useState(existing?.active ?? true)
  const [query, setQuery] = React.useState("")
  const [touched, setTouched] = React.useState(false)

  const n = Number
  const errors = {
    name: name.trim() ? null : "Name the test.",
    ids: ids.length > 0 ? null : "Choose at least one question.",
    pick: !random
      ? null
      : n(pick) >= 1 && n(pick) <= ids.length
        ? null
        : `Between 1 and the ${ids.length} chosen.`,
    duration:
      n(duration) >= 5 && n(duration) <= 480
        ? null
        : "Between 5 and 480 minutes.",
    pass: n(pass) >= 1 && n(pass) <= 100 ? null : "Between 1 and 100.",
    window:
      n(windowDays) >= 1 && n(windowDays) <= 60
        ? null
        : "Between 1 and 60 days.",
  }
  const bad = Object.values(errors).some(Boolean)
  const q = query.trim().toLowerCase()
  const shown = bank.filter(
    (x) => !q || `${x.prompt} ${x.skill} ${x.level}`.toLowerCase().includes(q)
  )
  const total = bank
    .filter((x) => ids.includes(x.id))
    .reduce((s, x) => s + x.marks, 0)
  const hasWritten = bank.some(
    (x) => ids.includes(x.id) && ["short", "long", "upload"].includes(x.kind)
  )

  function save() {
    setTouched(true)
    if (bad) {
      toast.error("Fix the highlighted fields.")
      return
    }
    store.saveTest({
      id: existing?.id ?? `test-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      requisitionId: req || null,
      questionIds: ids,
      pickCount: random ? n(pick) : null,
      shuffle: shuffle || random,
      durationMin: n(duration),
      passMarkPct: n(pass),
      windowDays: n(windowDays),
      requiredForOffer: needed,
      active,
    })
    toast.success(existing ? "Test updated." : "Test created.")
    onClose()
  }

  const show = (k: keyof typeof errors) => (touched ? errors[k] : null)

  return (
    <FormDialog
      title={existing ? "Edit test" : "New test"}
      description="Built from the question bank. Each candidate gets one attempt, against a clock the server keeps."
      width="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save}>
            {existing ? "Save test" : "Create test"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Name" htmlFor="td-name" error={show("name")}>
            <Input
              id="td-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormRow>
          <FormRow label="For requisition" htmlFor="td-req">
            <NativeSelect
              id="td-req"
              value={req}
              onChange={(e) => setReq(e.target.value)}
            >
              <option value="">Any requisition</option>
              {store.requisitions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} — {r.id}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          <FormRow
            label="Time limit (minutes)"
            htmlFor="td-dur"
            error={show("duration")}
          >
            <Input
              id="td-dur"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </FormRow>
          <FormRow label="Pass mark (%)" htmlFor="td-pass" error={show("pass")}>
            <Input
              id="td-pass"
              type="number"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </FormRow>
          <FormRow
            label="Open to start for (days)"
            htmlFor="td-win"
            error={show("window")}
          >
            <Input
              id="td-win"
              type="number"
              value={windowDays}
              onChange={(e) => setWindowDays(e.target.value)}
            />
          </FormRow>
        </div>

        <fieldset>
          <legend className="mb-1.5 flex w-full items-center justify-between text-sm font-medium">
            <span>
              Questions{" "}
              <span className="font-normal text-muted-foreground">
                · {ids.length} chosen · {total} marks
              </span>
            </span>
          </legend>
          <Input
            aria-label="Search the bank"
            placeholder="Search the bank"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2"
          />
          <ul className="max-h-56 divide-y overflow-y-auto rounded-lg border">
            {shown.map((x) => (
              <li key={x.id}>
                <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm hover:bg-muted/50">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                    checked={ids.includes(x.id)}
                    onChange={(e) =>
                      setIds((c) =>
                        e.target.checked
                          ? [...c, x.id]
                          : c.filter((y) => y !== x.id)
                      )
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2">{x.prompt}</span>
                    <span className="text-xs text-muted-foreground">
                      {QUESTION_KIND_LABEL[x.kind]} · {x.skill} · {x.level} ·{" "}
                      {x.marks} marks
                    </span>
                  </span>
                </label>
              </li>
            ))}
            {shown.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                Nothing matches.
              </li>
            )}
          </ul>
          {touched && errors.ids && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {errors.ids}
            </p>
          )}
        </fieldset>

        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--primary)]"
              checked={random}
              onChange={(e) => setRandom(e.target.checked)}
            />
            <span>
              Give each candidate a random selection from these
              <span className="block text-xs text-muted-foreground">
                So no two candidates sit the same paper.
              </span>
            </span>
          </label>
          {random && (
            <FormRow
              label="How many each"
              htmlFor="td-pick"
              error={show("pick")}
              className="max-w-[160px]"
            >
              <Input
                id="td-pick"
                type="number"
                value={pick}
                onChange={(e) => setPick(e.target.value)}
              />
            </FormRow>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--primary)]"
              checked={shuffle || random}
              disabled={random}
              onChange={(e) => setShuffle(e.target.checked)}
            />
            Shuffle the order
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--primary)]"
              checked={needed}
              onChange={(e) => setNeeded(e.target.checked)}
            />
            <span>
              A reviewed result is needed before an offer
              <span className="block text-xs text-muted-foreground">
                Moving a candidate to Offer waits until this test is marked and
                signed off.
                {needed && hasWritten
                  ? ""
                  : needed
                    ? " Auto-marked tests still need a sign-off."
                    : ""}
              </span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--primary)]"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Open for new invitations
          </label>
        </div>
      </div>
    </FormDialog>
  )
}
