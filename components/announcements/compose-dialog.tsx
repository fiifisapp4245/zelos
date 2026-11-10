"use client"

import * as React from "react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormRow, NativeSelect } from "@/components/talent/form"
import { useStore } from "@/lib/store"
import { audienceMembers, validateAnnouncement } from "@/lib/announcements"
import type { Announcement, Audience } from "@/lib/types"

export function ComposeDialog({
  existing,
  onClose,
}: {
  existing?: Announcement
  onClose: () => void
}) {
  const store = useStore()
  const depts = store.departments.filter((d) => !d.archived).map((d) => d.name)
  const branches = store.branches.filter((b) => !b.archived).map((b) => b.name)
  const [title, setTitle] = React.useState(existing?.title ?? "")
  const [body, setBody] = React.useState(existing?.body ?? "")
  const [kind, setKind] = React.useState<Audience["kind"]>(
    existing?.audience.kind ?? "all"
  )
  const [value, setValue] = React.useState(existing?.audience.value ?? "")
  const [ack, setAck] = React.useState(existing?.requiresAck ?? false)
  const [pinned, setPinned] = React.useState(existing?.pinned ?? false)
  const [touched, setTouched] = React.useState(false)

  const audience: Audience = { kind, value: kind === "all" ? "" : value }
  const errors = validateAnnouncement({ title, body, audience }, (k, v) =>
    (k === "department" ? depts : branches).includes(v)
  )
  const reach = audienceMembers({ audience }, store.employees).length
  const options = kind === "department" ? depts : branches

  return (
    <FormDialog
      title={existing ? "Edit announcement" : "New announcement"}
      description="Everyone in the audience sees it in their feed. A policy has to be confirmed by each person."
      width="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={() => {
              setTouched(true)
              if (Object.keys(errors).length) return
              if (existing) {
                store.updateAnnouncement(existing.id, {
                  title: title.trim(),
                  body: body.trim(),
                  audience,
                  requiresAck: ack,
                  pinned,
                })
                toast.success("Announcement updated.")
              } else {
                store.postAnnouncement({
                  title: title.trim(),
                  body: body.trim(),
                  audience,
                  requiresAck: ack,
                  pinned,
                })
                toast.success(
                  `Posted to ${reach} ${reach === 1 ? "person" : "people"}.`
                )
              }
              onClose()
            }}
          >
            {existing ? "Save changes" : `Post to ${reach}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormRow
          label="Title"
          htmlFor="an-title"
          error={touched ? errors.title : null}
        >
          <Input
            id="an-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </FormRow>
        <FormRow
          label="Message"
          htmlFor="an-body"
          error={touched ? errors.body : null}
        >
          <Textarea
            id="an-body"
            rows={7}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </FormRow>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Who is it for" htmlFor="an-kind">
            <NativeSelect
              id="an-kind"
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
              htmlFor="an-val"
              error={touched ? errors.audience : null}
            >
              <NativeSelect
                id="an-val"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              >
                <option value="">Choose…</option>
                {options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </NativeSelect>
            </FormRow>
          )}
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--primary)]"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />
          <span>
            This is a policy: each person must confirm they have read and
            understood it
            <span className="block text-xs text-muted-foreground">
              Their confirmation is recorded with the date, and you can see who
              has not given it.
            </span>
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
          />
          Pin to the top
        </label>
      </div>
    </FormDialog>
  )
}
