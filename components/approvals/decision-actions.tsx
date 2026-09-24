"use client"

import * as React from "react"
import { Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { actionWordsFor } from "@/lib/approvals/approval-chains"
import type { ApprovalItem } from "@/lib/approvals/types"

/**
 * The note and the two buttons. A decline always needs a reason — the person
 * on the other end has to know why, and "declined" on its own tells them
 * nothing.
 */
export function DecisionActions({
  item,
  requesterName,
  onDecide,
  size = "sm",
}: {
  item: ApprovalItem
  requesterName: string
  onDecide: (
    action: "approve" | "decline" | "verify" | "reject",
    note?: string
  ) => void
  size?: "sm" | "lg"
}) {
  const [note, setNote] = React.useState("")
  const [refusing, setRefusing] = React.useState(false)
  const words = actionWordsFor(item.type)
  const noteId = `${item.id}-note`

  const positiveLabel = words.positive === "verify" ? "Verify" : "Approve"
  const negativeLabel = words.negative === "reject" ? "Reject" : "Decline"

  return (
    <div>
      <Label htmlFor={noteId} className="mb-1.5 block text-xs font-medium">
        Note to {requesterName}
        {refusing ? (
          <span className="text-destructive"> — required</span>
        ) : (
          <span className="text-muted-foreground"> (optional)</span>
        )}
      </Label>
      <Textarea
        id={noteId}
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={
          refusing
            ? `Why is this being ${words.negative}d?`
            : "Anything they should know."
        }
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size={size}
          onClick={() => onDecide(words.positive, note.trim() || undefined)}
        >
          <Check className="size-4" />
          {positiveLabel}
        </Button>
        <Button
          size={size}
          variant={refusing ? "destructive" : "outline"}
          disabled={refusing && note.trim().length < 3}
          onClick={() => {
            if (!refusing) return setRefusing(true)
            if (note.trim().length < 3) return
            onDecide(words.negative, note.trim())
          }}
        >
          <X className="size-4" />
          {refusing ? `Confirm ${words.negative}` : negativeLabel}
        </Button>
        {refusing && note.trim().length < 3 && (
          <span className="text-xs text-muted-foreground">
            Add a reason first.
          </span>
        )}
      </div>
    </div>
  )
}
