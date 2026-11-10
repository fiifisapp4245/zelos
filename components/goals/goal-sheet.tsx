"use client"

import * as React from "react"
import { Bell, Check, Pencil, Trash2, X } from "lucide-react"
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
import { FormRow, NativeSelect } from "@/components/talent/form"
import { GoalDialog } from "./goal-dialog"
import { HEALTH_TONE, ProgressBar, useOwnerLabel } from "./goal-bits"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { TODAY_ISO, formatDate, fullName } from "@/lib/format"
import {
  CONFIDENCE_LABEL,
  LEVEL_LABEL,
  ancestors,
  canApproveGoal,
  canEditGoal,
  healthOf,
  isStale,
  krProgress,
  pct,
  progressOf,
  validateCheckIn,
} from "@/lib/goals"
import type { Confidence, Goal, KeyResult } from "@/lib/types"

export function GoalSheet({
  goalId,
  onClose,
}: {
  goalId: string | null
  onClose: () => void
}) {
  const store = useStore()
  const g = store.goals.find((x) => x.id === goalId)
  if (!g) return null
  return <Body g={g} onClose={onClose} />
}

const fmt = (k: KeyResult, v: number) =>
  k.kind === "yes_no"
    ? v >= 1
      ? "Done"
      : "Not yet"
    : `${v}${k.kind === "percent" ? "%" : k.unit ? ` ${k.unit}` : ""}`

function Body({ g, onClose }: { g: Goal; onClose: () => void }) {
  const store = useStore()
  const { viewer } = store
  const label = useOwnerLabel()
  const ctx = { viewer, employees: store.employees }
  const progress = progressOf(g, store.goals)
  const health = healthOf(g, store.goals, store.checkIns, TODAY_ISO)
  const canEdit = canEditGoal(g, ctx)
  const canApprove = canApproveGoal(g, ctx)
  const history = store.checkIns.filter((c) => c.goalId === g.id)
  const children = store.goals.filter((c) => c.parentId === g.id)
  const chain = ancestors(g, store.goals)
  const isOwner = g.ownerId === viewer.employeeId
  // Whoever can edit a goal can report on it; a manager can too, on their report's behalf.
  const canCheckIn = g.status === "active" && canEdit
  const canNudge =
    g.status === "active" &&
    canEdit &&
    !isOwner &&
    isStale(g, store.checkIns, TODAY_ISO)
  const hr = has(viewer, "hr_admin")

  const [editing, setEditing] = React.useState(false)
  const [sendingBack, setSendingBack] = React.useState(false)
  const [note, setNote] = React.useState("")

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[620px]"
      >
        <SheetHeader className="space-y-1 border-b px-5 py-4 text-left">
          <SheetTitle className="pr-8 text-base">{g.title}</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2 text-xs">
            {LEVEL_LABEL[g.level]} · {label(g)} · {g.cycle} ·{" "}
            {formatDate(g.startOn)} to {formatDate(g.dueOn)}
            {g.status === "active" && (
              <Pill tone={HEALTH_TONE[health]}>{CONFIDENCE_LABEL[health]}</Pill>
            )}
            {g.status === "proposed" && (
              <Pill tone="info">Awaiting approval</Pill>
            )}
            {g.status === "draft" && <Pill tone="warning">Sent back</Pill>}
            {g.status === "done" && <Pill tone="success">Done</Pill>}
            {g.status === "cancelled" && <Pill tone="neutral">Cancelled</Pill>}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {g.returnNote && (
            <div
              role="status"
              className="rounded-lg border border-warning/40 bg-warning-muted p-3 text-sm"
            >
              <p className="font-medium">Sent back for changes</p>
              <p className="mt-0.5 text-muted-foreground">{g.returnNote}</p>
            </div>
          )}

          {g.description && (
            <p className="text-sm text-muted-foreground">{g.description}</p>
          )}

          {chain.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Supports {chain.map((a) => a.title).join(" → ")}
            </p>
          )}

          <section aria-label="Progress">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-medium">Overall</span>
              <span className="tabular font-semibold">{pct(progress)}%</span>
            </div>
            <ProgressBar value={progress} />
            {g.keyResults.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {g.keyResults.map((k) => (
                  <li key={k.id}>
                    <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm">
                      <span>{k.title}</span>
                      <span className="tabular text-xs text-muted-foreground">
                        {k.kind === "yes_no"
                          ? fmt(k, k.current)
                          : `${fmt(k, k.current)} of ${fmt(k, k.target)}`}
                      </span>
                    </div>
                    <ProgressBar value={krProgress(k)} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                No key results of its own. Its progress is the average of the{" "}
                {children.length} goal{children.length === 1 ? "" : "s"} that
                support it.
              </p>
            )}
          </section>

          {children.length > 0 && (
            <section aria-label="Supported by">
              <h3 className="mb-2 text-sm font-medium">Supported by</h3>
              <ul className="divide-y rounded-lg border text-sm">
                {children.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <span className="min-w-0 truncate">{c.title}</span>
                    <span className="tabular shrink-0 text-xs text-muted-foreground">
                      {label(c)} · {pct(progressOf(c, store.goals))}%
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {canCheckIn && <CheckInForm goal={g} />}

          <section aria-label="Check-ins">
            <h3 className="mb-2 text-sm font-medium">Check-ins</h3>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No check-ins yet.</p>
            ) : (
              <ol className="space-y-3">
                {history.map((c) => (
                  <li key={c.id} className="rounded-lg border p-3 text-sm">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {fullName(store.employeeById(c.by))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(c.at.slice(0, 10))}
                      </span>
                      <Pill tone={HEALTH_TONE[c.confidence]}>
                        {CONFIDENCE_LABEL[c.confidence]}
                      </Pill>
                    </p>
                    {c.note && (
                      <p className="mt-1.5 text-muted-foreground">{c.note}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t px-5 py-3">
          {sendingBack ? (
            <div className="flex w-full flex-col gap-2">
              <Textarea
                aria-label="What needs to change"
                rows={2}
                placeholder="What needs to change?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setSendingBack(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (note.trim().length < 5)
                      return toast.error("Say what needs to change.")
                    store.setGoalStatus(g.id, "draft", note.trim())
                    toast.success("Sent back to the owner.")
                    onClose()
                  }}
                >
                  Send back
                </Button>
              </div>
            </div>
          ) : (
            <>
              {canApprove && (
                <>
                  <Button
                    onClick={() => {
                      store.setGoalStatus(g.id, "active")
                      toast.success("Goal approved.")
                    }}
                  >
                    <Check className="size-4" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSendingBack(true)}
                  >
                    Send back
                  </Button>
                </>
              )}
              {g.status === "draft" && canEdit && (
                <Button
                  onClick={() => {
                    store.setGoalStatus(g.id, "proposed")
                    toast.success("Sent for approval.")
                  }}
                >
                  Resubmit
                </Button>
              )}
              {canNudge && (
                <Button
                  variant="outline"
                  onClick={() => {
                    store.nudgeCheckIn(g.id)
                    toast.success("Reminder emailed. It is in the Outbox.")
                  }}
                >
                  <Bell className="size-4" />
                  Ask for a check-in
                </Button>
              )}
              <span className="flex-1" />
              {g.status === "active" && canEdit && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      store.setGoalStatus(g.id, "done")
                      toast.success("Marked done.")
                    }}
                  >
                    Mark done
                  </Button>
                  {(hr || !isOwner || g.level !== "individual") && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        store.setGoalStatus(g.id, "cancelled")
                        toast.success("Goal cancelled.")
                      }}
                    >
                      <X className="size-4" />
                      Cancel goal
                    </Button>
                  )}
                </>
              )}
              {(g.status === "draft" || g.status === "proposed") &&
                canEdit &&
                history.length === 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      store.deleteGoal(g.id)
                      toast.success("Goal deleted.")
                      onClose()
                    }}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                )}
              {canEdit && g.status !== "done" && g.status !== "cancelled" && (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="size-4" />
                  Edit
                </Button>
              )}
            </>
          )}
        </footer>
      </SheetContent>
      {editing && <GoalDialog existing={g} onClose={() => setEditing(false)} />}
    </Sheet>
  )
}

function CheckInForm({ goal }: { goal: Goal }) {
  const store = useStore()
  const [values, setValues] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(goal.keyResults.map((k) => [k.id, k.current]))
  )
  const [confidence, setConfidence] = React.useState<Confidence | "">("")
  const [note, setNote] = React.useState("")
  const [touched, setTouched] = React.useState(false)
  const errors = validateCheckIn(goal, values, note, confidence)

  function submit() {
    setTouched(true)
    if (Object.keys(errors).length)
      return toast.error("Fix the highlighted fields.")
    store.addCheckIn(goal.id, {
      values,
      confidence: confidence as Confidence,
      note,
    })
    toast.success("Check-in recorded.")
    setNote("")
    setConfidence("")
    setTouched(false)
  }

  return (
    <section
      aria-label="New check-in"
      className="space-y-3 rounded-lg border bg-muted/30 p-4"
    >
      <h3 className="text-sm font-medium">Check in</h3>
      {goal.keyResults.map((k) => (
        <FormRow
          key={k.id}
          label={k.title}
          htmlFor={`ci-${k.id}`}
          error={touched ? errors[k.id] : null}
        >
          {k.kind === "yes_no" ? (
            <NativeSelect
              id={`ci-${k.id}`}
              value={values[k.id]}
              onChange={(e) =>
                setValues((v) => ({ ...v, [k.id]: Number(e.target.value) }))
              }
            >
              <option value={0}>Not yet</option>
              <option value={1}>Done</option>
            </NativeSelect>
          ) : (
            <Input
              id={`ci-${k.id}`}
              type="number"
              step="any"
              value={Number.isNaN(values[k.id]) ? "" : values[k.id]}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  [k.id]: e.target.value === "" ? NaN : Number(e.target.value),
                }))
              }
            />
          )}
        </FormRow>
      ))}
      <FormRow
        label="How confident are you?"
        htmlFor="ci-conf"
        error={touched ? errors.confidence : null}
      >
        <NativeSelect
          id="ci-conf"
          value={confidence}
          onChange={(e) => setConfidence(e.target.value as Confidence)}
        >
          <option value="">Choose…</option>
          {(Object.keys(CONFIDENCE_LABEL) as Confidence[]).map((c) => (
            <option key={c} value={c}>
              {CONFIDENCE_LABEL[c]}
            </option>
          ))}
        </NativeSelect>
      </FormRow>
      <FormRow
        label="What happened?"
        htmlFor="ci-note"
        error={touched ? errors.note : null}
      >
        <Textarea
          id="ci-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </FormRow>
      <Button onClick={submit}>Record check-in</Button>
    </section>
  )
}
