"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormRow, NativeSelect } from "@/components/talent/form"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { TODAY_ISO, fullName } from "@/lib/format"
import { isOnStrength, wholeTeam } from "@/lib/selectors"
import { newId } from "@/lib/ids"
import {
  LEVEL_LABEL,
  creatableLevels,
  cyclesOf,
  parentChoices,
  validateGoal,
} from "@/lib/goals"
import type { Goal, KeyResult } from "@/lib/types"

const blankKr = (): KeyResult => ({
  id: newId("k"),
  title: "",
  kind: "number",
  start: 0,
  target: 10,
  current: 0,
  unit: "",
})

export function GoalDialog({
  existing,
  presetOwner,
  onClose,
  onSaved,
}: {
  existing?: Goal
  presetOwner?: string
  onClose: () => void
  onSaved?: (g: Goal) => void
}) {
  const store = useStore()
  const { viewer, employees } = store
  const ctx = { viewer, employees }
  const levels = creatableLevels(ctx)
  const isHr = has(viewer, "hr_admin")

  const owners = isHr
    ? employees.filter(isOnStrength)
    : [
        employees.find((e) => e.id === viewer.employeeId)!,
        ...wholeTeam(viewer, employees),
      ].filter(Boolean)
  const depts = isHr
    ? store.departments.filter((d) => !d.archived).map((d) => d.name)
    : [employees.find((e) => e.id === viewer.employeeId)?.department].filter(
        (d): d is string => !!d
      )
  const cycles = cyclesOf(
    store.goals,
    store.reviews.map((r) => r.cycle)
  )

  const [level, setLevel] = React.useState<Goal["level"]>(
    existing?.level ?? "individual"
  )
  const [title, setTitle] = React.useState(existing?.title ?? "")
  const [description, setDescription] = React.useState(
    existing?.description ?? ""
  )
  const [ownerId, setOwnerId] = React.useState(
    existing?.ownerId ?? presetOwner ?? viewer.employeeId
  )
  const [team, setTeam] = React.useState(existing?.team ?? depts[0] ?? "")
  const [parentId, setParentId] = React.useState(existing?.parentId ?? "")
  const [cycle, setCycle] = React.useState(
    existing?.cycle ?? cycles[0] ?? "H2 2026"
  )
  const [startOn, setStartOn] = React.useState(existing?.startOn ?? TODAY_ISO)
  const [dueOn, setDueOn] = React.useState(existing?.dueOn ?? "2026-12-31")
  const [krs, setKrs] = React.useState<KeyResult[]>(
    existing?.keyResults ?? [blankKr()]
  )
  const [touched, setTouched] = React.useState(false)

  const draft = {
    title,
    startOn,
    dueOn,
    level,
    ownerId: level === "individual" ? ownerId : null,
    team: level === "team" ? team : null,
    keyResults: krs,
  }
  const errors = validateGoal(draft)
  const parents = parentChoices(level, existing?.id, store.goals)

  function setKr(i: number, patch: Partial<KeyResult>) {
    setKrs((x) =>
      x.map((k, j) => {
        if (j !== i) return k
        const next = { ...k, ...patch }
        if (patch.kind === "yes_no")
          return { ...next, start: 0, target: 1, current: 0, unit: "" }
        // A new key result sits at its starting point until someone checks in.
        if (!existing && patch.start !== undefined) next.current = patch.start
        return next
      })
    )
  }

  function save() {
    setTouched(true)
    if (Object.keys(errors).length) {
      toast.error("Fix the highlighted fields.")
      return
    }
    const saved = store.saveGoal({
      id: existing?.id ?? newId("g"),
      title: title.trim(),
      description: description.trim(),
      level,
      ownerId: draft.ownerId,
      team: draft.team,
      parentId: parentId || null,
      cycle,
      startOn,
      dueOn,
      keyResults: krs.map((k) => ({
        ...k,
        title: k.title.trim(),
        unit: k.unit.trim(),
      })),
    })
    toast.success(
      existing
        ? "Goal updated."
        : saved.status === "proposed"
          ? "Goal proposed. Your manager will review it."
          : "Goal created."
    )
    onSaved?.(saved)
    onClose()
  }

  const show = (k: string) => (touched ? errors[k] : null)

  return (
    <FormDialog
      title={existing ? "Edit goal" : "New goal"}
      description="An objective, and the key results that show whether you got there."
      width="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save}>
            {existing ? "Save changes" : "Create goal"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormRow label="Level" htmlFor="gd-level">
            <NativeSelect
              id="gd-level"
              value={level}
              disabled={!!existing}
              onChange={(e) => {
                setLevel(e.target.value as Goal["level"])
                setParentId("")
              }}
            >
              {levels.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABEL[l]}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          {level === "individual" && (
            <FormRow
              label="Whose goal"
              htmlFor="gd-owner"
              error={show("owner")}
            >
              <NativeSelect
                id="gd-owner"
                value={ownerId}
                disabled={!!existing}
                onChange={(e) => setOwnerId(e.target.value)}
              >
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id === viewer.employeeId ? "Me" : fullName(o)}
                  </option>
                ))}
              </NativeSelect>
            </FormRow>
          )}
          {level === "team" && (
            <FormRow label="Team" htmlFor="gd-team" error={show("team")}>
              <NativeSelect
                id="gd-team"
                value={team}
                disabled={!!existing}
                onChange={(e) => setTeam(e.target.value)}
              >
                {depts.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </NativeSelect>
            </FormRow>
          )}
          <FormRow label="Cycle" htmlFor="gd-cycle">
            <NativeSelect
              id="gd-cycle"
              value={cycle}
              onChange={(e) => setCycle(e.target.value)}
            >
              {cycles.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
          </FormRow>
        </div>

        <FormRow label="Objective" htmlFor="gd-title" error={show("title")}>
          <Input
            id="gd-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you want to achieve?"
          />
        </FormRow>
        <FormRow label="Why it matters (optional)" htmlFor="gd-desc">
          <Textarea
            id="gd-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormRow>

        <div className="grid gap-4 sm:grid-cols-3">
          {level !== "company" && (
            <FormRow
              label="Supports"
              htmlFor="gd-parent"
              hint="The goal this feeds into."
              className="sm:col-span-1"
            >
              <NativeSelect
                id="gd-parent"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">Nothing in particular</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {LEVEL_LABEL[p.level]}: {p.title}
                  </option>
                ))}
              </NativeSelect>
            </FormRow>
          )}
          <FormRow label="Starts" htmlFor="gd-start" error={show("dates")}>
            <Input
              id="gd-start"
              type="date"
              value={startOn}
              onChange={(e) => setStartOn(e.target.value)}
            />
          </FormRow>
          <FormRow label="Due" htmlFor="gd-due">
            <Input
              id="gd-due"
              type="date"
              min={TODAY_ISO}
              value={dueOn}
              onChange={(e) => setDueOn(e.target.value)}
            />
          </FormRow>
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-sm font-medium">Key results</legend>
          {krs.map((k, i) => (
            <div key={k.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex gap-2">
                <Input
                  aria-label={`Key result ${i + 1}`}
                  placeholder="How will you know? e.g. Customers migrated"
                  value={k.title}
                  onChange={(e) => setKr(i, { title: e.target.value })}
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove key result ${i + 1}`}
                  disabled={krs.length <= 1}
                  onClick={() => setKrs((x) => x.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-[130px_1fr_1fr_1fr]">
                <NativeSelect
                  aria-label="Kind"
                  value={k.kind}
                  onChange={(e) =>
                    setKr(i, { kind: e.target.value as KeyResult["kind"] })
                  }
                >
                  <option value="number">A number</option>
                  <option value="percent">A percentage</option>
                  <option value="yes_no">Done or not</option>
                </NativeSelect>
                {k.kind !== "yes_no" ? (
                  <>
                    <Input
                      aria-label="From"
                      type="number"
                      step="any"
                      value={k.start}
                      onChange={(e) =>
                        setKr(i, { start: Number(e.target.value) })
                      }
                    />
                    <Input
                      aria-label="To"
                      type="number"
                      step="any"
                      value={k.target}
                      onChange={(e) =>
                        setKr(i, { target: Number(e.target.value) })
                      }
                    />
                    <Input
                      aria-label="Unit"
                      placeholder="Unit, e.g. customers"
                      value={k.unit}
                      onChange={(e) => setKr(i, { unit: e.target.value })}
                    />
                  </>
                ) : (
                  <p className="self-center text-xs text-muted-foreground sm:col-span-3">
                    Counts as 0% until it is done, then 100%.
                  </p>
                )}
              </div>
              {k.kind !== "yes_no" && (
                <p className="text-xs text-muted-foreground">
                  From {k.start} to {k.target}. A number can go down: from 30 to
                  10 is a reduction.
                </p>
              )}
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setKrs((x) => [...x, blankKr()])}
          >
            <Plus className="size-3.5" />
            Add key result
          </Button>
          {show("keyResults") && (
            <p role="alert" className="text-xs text-destructive">
              {show("keyResults")}
            </p>
          )}
        </fieldset>
      </div>
    </FormDialog>
  )
}
