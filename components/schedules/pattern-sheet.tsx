"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useStore } from "@/lib/store"
import { weeklyHours } from "@/lib/schedules/derive"
import type { PatternDay, WorkPattern, Weekday } from "@/lib/schedules/types"
import { formatHours } from "@/lib/time"

const DAYS: { weekday: Weekday; label: string }[] = [
  { weekday: 1, label: "Monday" },
  { weekday: 2, label: "Tuesday" },
  { weekday: 3, label: "Wednesday" },
  { weekday: 4, label: "Thursday" },
  { weekday: 5, label: "Friday" },
  { weekday: 6, label: "Saturday" },
  { weekday: 7, label: "Sunday" },
]

const BLANK: WorkPattern = {
  id: "",
  name: "",
  days: [1, 2, 3, 4, 5].map((weekday) => ({
    weekday: weekday as Weekday,
    start: "08:00",
    end: "17:00",
  })),
  breakMinutes: 60,
  breakPaid: false,
  graceMinutes: null,
}

/**
 * Creating or editing a pattern.
 *
 * A day is either worked or it is not, and the hours sit with the day
 * rather than the pattern, because a half-day Saturday is an ordinary
 * thing to need and not an exception to model around.
 */
export function PatternSheet({
  pattern,
  defaultGraceMinutes,
  onClose,
}: {
  /** null creates a new one. */
  pattern: WorkPattern | null
  defaultGraceMinutes: number
  onClose: () => void
}) {
  const store = useStore()
  const [draft, setDraft] = React.useState<WorkPattern>(pattern ?? BLANK)
  const [ownGrace, setOwnGrace] = React.useState(pattern?.graceMinutes !== null)

  const editing = Boolean(pattern?.id)
  const valid = draft.name.trim() !== "" && draft.days.length > 0

  function setDay(weekday: Weekday, patch: Partial<PatternDay> | null) {
    setDraft((d) => {
      if (patch === null)
        return { ...d, days: d.days.filter((x) => x.weekday !== weekday) }
      const existing = d.days.find((x) => x.weekday === weekday)
      const days = existing
        ? d.days.map((x) => (x.weekday === weekday ? { ...x, ...patch } : x))
        : [...d.days, { weekday, start: "08:00", end: "17:00", ...patch }]
      return { ...d, days: days.sort((a, b) => a.weekday - b.weekday) }
    })
  }

  function save() {
    store.savePattern({
      ...draft,
      id: draft.id || `wp-${draft.name.toLowerCase().replace(/\W+/g, "-")}`,
      name: draft.name.trim(),
      graceMinutes: ownGrace
        ? (draft.graceMinutes ?? defaultGraceMinutes)
        : null,
    })
    toast.success(editing ? "Pattern updated" : "Pattern created")
    onClose()
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[560px]"
      >
        <SheetHeader>
          <SheetTitle>{editing ? "Edit pattern" : "New pattern"}</SheetTitle>
          <SheetDescription>
            Everything measured against expectation — lateness, variance,
            overtime — reads these hours.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-4">
          <div>
            <Label htmlFor="pattern-name" className="mb-1.5 block">
              Name
            </Label>
            <Input
              id="pattern-name"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
              placeholder="Standard office"
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Working days</legend>
            <ul className="divide-y rounded-xl border">
              {DAYS.map(({ weekday, label }) => {
                const day = draft.days.find((d) => d.weekday === weekday)
                return (
                  <li
                    key={weekday}
                    className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                  >
                    <label className="flex w-[130px] shrink-0 items-center gap-2.5 text-sm">
                      <Checkbox
                        checked={Boolean(day)}
                        onCheckedChange={(on) =>
                          setDay(weekday, on ? {} : null)
                        }
                        aria-label={label}
                      />
                      {label}
                    </label>
                    {day ? (
                      <span className="flex items-center gap-2">
                        <Input
                          type="time"
                          className="h-9 w-[120px]"
                          value={day.start}
                          aria-label={`${label} start`}
                          onChange={(e) =>
                            setDay(weekday, { start: e.target.value })
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          to
                        </span>
                        <Input
                          type="time"
                          className="h-9 w-[120px]"
                          value={day.end}
                          aria-label={`${label} end`}
                          onChange={(e) =>
                            setDay(weekday, { end: e.target.value })
                          }
                        />
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Not a working day
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="break" className="mb-1.5 block">
                Break
              </Label>
              <Input
                id="break"
                type="number"
                min={0}
                step={15}
                className="h-9"
                value={draft.breakMinutes}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    breakMinutes: Number(e.target.value),
                  }))
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">Minutes</p>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2.5 text-sm">
                <Switch
                  checked={draft.breakPaid}
                  onCheckedChange={(on) =>
                    setDraft((d) => ({ ...d, breakPaid: on }))
                  }
                />
                Break is paid
              </label>
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <label className="flex items-center gap-2.5 text-sm font-medium">
              <Switch checked={ownGrace} onCheckedChange={setOwnGrace} />
              Set a grace period for this pattern
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Otherwise it takes the company figure of {defaultGraceMinutes}{" "}
              minutes from Settings → Time &amp; attendance.
            </p>
            {ownGrace && (
              <Input
                type="number"
                min={0}
                className="mt-2 h-9 w-[120px]"
                aria-label="Grace period in minutes"
                value={draft.graceMinutes ?? defaultGraceMinutes}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    graceMinutes: Number(e.target.value),
                  }))
                }
              />
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            <strong className="tabular font-semibold text-foreground">
              {formatHours(weeklyHours(draft))}
            </strong>{" "}
            a week across {draft.days.length}{" "}
            {draft.days.length === 1 ? "day" : "days"}, net of the break.
          </p>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={save}>
            {editing ? "Save pattern" : "Create pattern"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
