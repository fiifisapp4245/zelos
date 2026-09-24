"use client"

import * as React from "react"
import { Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FormDialog } from "@/components/common/form-dialog"

/**
 * Appears only while rows are selected. Declining in bulk takes one reason
 * for the whole batch, which everyone selected will receive.
 */
export function BulkBar({
  count,
  onClear,
  onDecide,
}: {
  count: number
  onClear: () => void
  onDecide: (action: "approve" | "decline", note?: string) => void
}) {
  const [confirming, setConfirming] = React.useState<
    "approve" | "decline" | null
  >(null)
  const [note, setNote] = React.useState("")

  if (count === 0) return null

  const declining = confirming === "decline"

  return (
    <>
      <div
        role="region"
        aria-label="Bulk actions"
        // A centred pill rather than a full-width bar: the bottom-right
        // corner belongs to the persona switcher.
        className="sticky bottom-4 z-20 mx-auto mt-4 flex w-fit max-w-full flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg"
      >
        <p className="text-sm">
          <strong className="tabular font-semibold">{count}</strong> selected
        </p>
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
        <span className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setConfirming("approve")}>
            <Check className="size-4" />
            Approve selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirming("decline")}
          >
            <X className="size-4" />
            Decline selected
          </Button>
        </span>
      </div>

      {confirming && (
        <FormDialog
          title={`${declining ? "Decline" : "Approve"} ${count} request${count === 1 ? "" : "s"}?`}
          description={
            declining
              ? "One reason is sent to everyone in the selection."
              : "Each one is recorded separately against your name."
          }
          onClose={() => {
            setConfirming(null)
            setNote("")
          }}
          footer={
            <>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  setConfirming(null)
                  setNote("")
                }}
              >
                Cancel
              </Button>
              <Button
                size="lg"
                variant={declining ? "destructive" : "default"}
                disabled={declining && note.trim().length < 3}
                onClick={() => {
                  onDecide(confirming, note.trim() || undefined)
                  setConfirming(null)
                  setNote("")
                }}
              >
                {declining ? `Decline ${count}` : `Approve ${count}`}
              </Button>
            </>
          }
        >
          {declining ? (
            <>
              <Label
                htmlFor="bulk-note"
                className="mb-1.5 block text-sm font-medium"
              >
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="bulk-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why are these being declined? Everyone selected will see this."
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              This cannot be undone one by one — each request moves to its next
              step, or completes.
            </p>
          )}
        </FormDialog>
      )}
    </>
  )
}
