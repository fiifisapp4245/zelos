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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pill } from "@/components/common"
import { shiftState } from "./shift-chip"
import { useStore } from "@/lib/store"
import { shiftHours } from "@/lib/schedules/derive"
import type { Shift } from "@/lib/schedules/types"
import { SHIFT_POSITIONS } from "@/lib/data/schedules"
import { addDays, formatHours } from "@/lib/time"
import { formatDate, formatDateTime, fullName } from "@/lib/format"
import type { Employee } from "@/lib/types"

/**
 * One shift, made or changed.
 *
 * Cancelling a published shift does not remove it. Somebody was told to
 * work it, so it stays on the roster struck through, with the reason
 * attached and the trail underneath.
 */
export function ShiftSheet({
  shift,
  scope,
  branch,
  canEdit,
  onClose,
}: {
  shift: Shift
  scope: Employee[]
  branch: string
  canEdit: boolean
  onClose: () => void
}) {
  const store = useStore()
  const existing = store.shifts.find((s) => s.id === shift.id)
  const [draft, setDraft] = React.useState<Shift>(shift)
  const [reason, setReason] = React.useState("")
  const [repeat, setRepeat] = React.useState(false)
  const [until, setUntil] = React.useState(addDays(shift.date, 28))
  const [cancelling, setCancelling] = React.useState(false)

  const trail = store.shiftChanges
    .filter((c) => c.shiftId === shift.id)
    .sort((a, b) => b.at.localeCompare(a.at))

  const editing = Boolean(existing)
  const needsReason = editing && existing?.state === "published"
  const valid =
    draft.start < draft.end && (!needsReason || reason.trim().length > 3)

  function save() {
    store.saveShift(draft, reason.trim() || undefined)

    if (repeat && !editing) {
      // Weekly until the date given, as drafts — the same commitment
      // made several times over still has to be published once.
      for (let d = addDays(draft.date, 7); d <= until; d = addDays(d, 7)) {
        store.saveShift({ ...draft, id: "", date: d }, "Repeats weekly")
      }
    }

    toast.success(editing ? "Shift updated" : "Shift added as a draft")
    onClose()
  }

  function cancel() {
    store.cancelShift(shift.id, reason.trim())
    toast.success(
      existing?.state === "published"
        ? "Shift cancelled and recorded"
        : "Draft removed"
    )
    onClose()
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[560px]"
      >
        <SheetHeader>
          <SheetTitle>
            {editing ? "Shift" : "New shift"} · {formatDate(draft.date)}
          </SheetTitle>
          <SheetDescription>
            {branch}
            {editing && existing && (
              <>
                {" · "}
                {shiftState(existing).toLowerCase()}
                {existing.publishedAt &&
                  `, published ${formatDateTime(existing.publishedAt)}`}
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div>
            <Label className="mb-1.5 block">Who</Label>
            <Select
              value={draft.employeeId ?? "open"}
              onValueChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  employeeId: v === "open" ? null : v,
                  department:
                    scope.find((e) => e.id === v)?.department ?? d.department,
                }))
              }
              disabled={!canEdit}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open — nobody yet</SelectItem>
                {scope.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {fullName(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="shift-date" className="mb-1.5 block">
                Date
              </Label>
              <Input
                id="shift-date"
                type="date"
                className="h-9"
                value={draft.date}
                disabled={!canEdit}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="shift-start" className="mb-1.5 block">
                Start
              </Label>
              <Input
                id="shift-start"
                type="time"
                className="h-9"
                value={draft.start}
                disabled={!canEdit}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, start: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="shift-end" className="mb-1.5 block">
                End
              </Label>
              <Input
                id="shift-end"
                type="time"
                className="h-9"
                value={draft.end}
                disabled={!canEdit}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, end: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="shift-break" className="mb-1.5 block">
                Break (minutes)
              </Label>
              <Input
                id="shift-break"
                type="number"
                min={0}
                step={15}
                className="h-9"
                value={draft.breakMinutes}
                disabled={!canEdit}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    breakMinutes: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Position</Label>
              <Select
                value={draft.position}
                onValueChange={(v) => setDraft((d) => ({ ...d, position: v }))}
                disabled={!canEdit}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_POSITIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            <strong className="tabular font-semibold text-foreground">
              {formatHours(shiftHours(draft))}
            </strong>{" "}
            after the break.
          </p>

          <div>
            <Label htmlFor="shift-note" className="mb-1.5 block">
              Note
            </Label>
            <Textarea
              id="shift-note"
              rows={2}
              value={draft.note ?? ""}
              disabled={!canEdit}
              onChange={(e) =>
                setDraft((d) => ({ ...d, note: e.target.value }))
              }
              placeholder="Anything the person needs to know before the shift."
            />
          </div>

          {!editing && (
            <div className="rounded-xl border p-3">
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <Switch checked={repeat} onCheckedChange={setRepeat} />
                Repeat weekly
              </label>
              {repeat && (
                <div className="mt-2 flex items-center gap-2">
                  <Label htmlFor="until" className="text-xs">
                    Until
                  </Label>
                  <Input
                    id="until"
                    type="date"
                    className="h-9 w-[170px]"
                    value={until}
                    onChange={(e) => setUntil(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {(needsReason || cancelling) && (
            <div>
              <Label htmlFor="shift-reason" className="mb-1.5 block">
                Reason
              </Label>
              <Textarea
                id="shift-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="This goes on the record, because somebody has already been told."
              />
            </div>
          )}

          {trail.length > 0 && (
            <section>
              <h3 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                History
              </h3>
              <ol className="space-y-2 border-l pl-3">
                {trail.map((c) => (
                  <li key={c.id} className="text-xs">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Pill tone="neutral">{c.action}</Pill>
                      <span className="font-medium">{c.summary}</span>
                    </span>
                    <span className="block text-muted-foreground">
                      {fullName(store.employeeById(c.by))} ·{" "}
                      {formatDateTime(c.at)}
                      {c.reason && ` · “${c.reason}”`}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {canEdit && (
          <SheetFooter>
            {editing && (
              <Button
                variant="outline"
                className="mr-auto text-destructive"
                disabled={cancelling && reason.trim().length <= 3}
                onClick={() => (cancelling ? cancel() : setCancelling(true))}
              >
                {cancelling ? "Confirm cancellation" : "Cancel shift"}
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button disabled={!valid} onClick={save}>
              {editing ? "Save changes" : "Add shift"}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
