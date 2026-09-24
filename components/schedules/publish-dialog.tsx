"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useStore } from "@/lib/store"
import { WARNING_LABEL, countByKind } from "@/lib/schedules/warnings"
import type { RosterWarning, Shift, WarningKind } from "@/lib/schedules/types"
import { fullName } from "@/lib/format"

/**
 * Publishing is the moment a roster becomes a commitment, so it says
 * who it affects and what is still flagged before it happens. Warnings
 * do not block it — they have to be acknowledged, which is a different
 * thing from being fixed.
 */
export function PublishDialog({
  pending,
  warnings,
  onClose,
}: {
  /** The drafts and post-publish edits about to go out. */
  pending: Shift[]
  warnings: RosterWarning[]
  onClose: () => void
}) {
  const store = useStore()
  const [acknowledged, setAcknowledged] = React.useState(false)

  const people = [
    ...new Set(pending.map((s) => s.employeeId).filter(Boolean)),
  ] as string[]
  const open = pending.filter((s) => !s.employeeId).length
  const counts = countByKind(warnings)
  const kinds = (Object.keys(counts) as WarningKind[]).filter(
    (k) => counts[k] > 0
  )
  const blocked = kinds.length > 0 && !acknowledged

  function publish() {
    store.publishShifts(pending.map((s) => s.id))
    toast.success(
      `${pending.length} ${pending.length === 1 ? "change" : "changes"} published to ${people.length} ${people.length === 1 ? "person" : "people"}`
    )
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish schedule</DialogTitle>
          <DialogDescription>
            Everyone on these shifts sees them as their own schedule from the
            moment you publish.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm">
            <strong className="tabular font-semibold">{pending.length}</strong>{" "}
            {pending.length === 1 ? "change" : "changes"} affecting{" "}
            <strong className="tabular font-semibold">{people.length}</strong>{" "}
            {people.length === 1 ? "person" : "people"}
            {open > 0 && (
              <>
                , and {open} open {open === 1 ? "shift" : "shifts"} with nobody
                on {open === 1 ? "it" : "them"}
              </>
            )}
            .
          </p>

          {people.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {people.map((id) => fullName(store.employeeById(id))).join(", ")}
            </p>
          )}

          {kinds.length > 0 && (
            <div className="rounded-xl border border-warning bg-warning-muted p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-warning-foreground">
                <AlertTriangle className="size-4" aria-hidden />
                Unresolved warnings
              </p>
              <ul className="mt-1.5 space-y-0.5 text-sm text-warning-foreground">
                {kinds.map((k) => (
                  <li key={k}>
                    <span className="tabular font-semibold">{counts[k]}</span>{" "}
                    {WARNING_LABEL[k].toLowerCase()}
                  </li>
                ))}
              </ul>
              <label className="mt-3 flex items-start gap-2.5 text-sm text-warning-foreground">
                <Checkbox
                  checked={acknowledged}
                  onCheckedChange={(v) => setAcknowledged(v === true)}
                  className="mt-0.5"
                />
                I have seen these and want to publish anyway.
              </label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={blocked || pending.length === 0} onClick={publish}>
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
