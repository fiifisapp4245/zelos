"use client"

import * as React from "react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormRow, NativeSelect } from "@/components/talent/form"
import { useStore } from "@/lib/store"
import { formatDate, fullName } from "@/lib/format"
import { isOnStrength } from "@/lib/selectors"
import { KIND_LABEL, nextTag, validateAsset } from "@/lib/assets"
import type { Asset, AssetKind } from "@/lib/types"

const PREFIX: Record<AssetKind, string> = {
  laptop: "ZEL-LT-",
  phone: "ZEL-PH-",
  sim: "ZEL-SIM-",
  card: "AC-",
  vehicle: "ZEL-VH-",
  other: "ZEL-",
}

export function AssetDialog({
  existing,
  onClose,
}: {
  existing?: Asset
  onClose: () => void
}) {
  const store = useStore()
  const [kind, setKind] = React.useState<AssetKind>(existing?.kind ?? "laptop")
  const [tag, setTag] = React.useState(
    existing?.tag ?? nextTag(store.assets, PREFIX[existing?.kind ?? "laptop"])
  )
  const [name, setName] = React.useState(existing?.name ?? "")
  const [serial, setSerial] = React.useState(existing?.serial ?? "")
  const [touched, setTouched] = React.useState(false)
  const errors = validateAsset({ tag, name }, store.assets, existing?.id)

  return (
    <FormDialog
      title={existing ? `Edit ${existing.tag}` : "Add an asset"}
      description="Goes into stock, ready to be assigned to someone."
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
              if (existing)
                store.updateAsset(existing.id, {
                  kind,
                  tag: tag.trim(),
                  name: name.trim(),
                  serial: serial.trim(),
                })
              else store.addAsset({ kind, tag, name, serial })
              toast.success(
                existing ? "Saved." : `${tag.trim()} added to stock.`
              )
              onClose()
            }}
          >
            {existing ? "Save changes" : "Add to stock"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Type" htmlFor="as-kind">
            <NativeSelect
              id="as-kind"
              value={kind}
              onChange={(e) => {
                const k = e.target.value as AssetKind
                setKind(k)
                if (!existing) setTag(nextTag(store.assets, PREFIX[k]))
              }}
            >
              {(Object.keys(KIND_LABEL) as AssetKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          <FormRow
            label="Tag"
            htmlFor="as-tag"
            error={touched ? errors.tag : null}
            hint="The label stuck on it."
          >
            <Input
              id="as-tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="font-mono"
            />
          </FormRow>
        </div>
        <FormRow
          label="Name"
          htmlFor="as-name"
          error={touched ? errors.name : null}
        >
          <Input
            id="as-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dell Latitude 5440"
          />
        </FormRow>
        <FormRow label="Serial number (optional)" htmlFor="as-serial">
          <Input
            id="as-serial"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            className="font-mono"
          />
        </FormRow>
      </div>
    </FormDialog>
  )
}

export function AssignDialog({
  asset,
  onClose,
}: {
  asset: Asset
  onClose: () => void
}) {
  const store = useStore()
  const people = store.employees.filter(
    (e) => isOnStrength(e) || e.lifecycleState === "pre_hire"
  )
  const [who, setWho] = React.useState("")
  const [touched, setTouched] = React.useState(false)
  return (
    <FormDialog
      title={`Assign ${asset.tag}`}
      description={asset.name}
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
              if (!who) return
              store.assignAsset(asset.id, who)
              toast.success(`Assigned to ${fullName(store.employeeById(who))}.`)
              onClose()
            }}
          >
            Assign
          </Button>
        </>
      }
    >
      <FormRow
        label="Give it to"
        htmlFor="asg-who"
        error={touched && !who ? "Choose who is getting it." : null}
      >
        <NativeSelect
          id="asg-who"
          value={who}
          onChange={(e) => setWho(e.target.value)}
        >
          <option value="">Choose…</option>
          {people.map((e) => (
            <option key={e.id} value={e.id}>
              {fullName(e)} — {e.jobTitle}
            </option>
          ))}
        </NativeSelect>
      </FormRow>
    </FormDialog>
  )
}

export function ReturnDialog({
  asset,
  onClose,
}: {
  asset: Asset
  onClose: () => void
}) {
  const store = useStore()
  const [condition, setCondition] = React.useState<"good" | "repair">("good")
  return (
    <FormDialog
      title={`Take back ${asset.tag}`}
      description={`From ${fullName(store.employeeById(asset.assignedTo ?? undefined))}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={() => {
              store.returnAsset(asset.id, condition)
              toast.success(
                condition === "good"
                  ? "Back in stock."
                  : "Taken back and marked for repair."
              )
              onClose()
            }}
          >
            Take back
          </Button>
        </>
      }
    >
      <FormRow label="Condition" htmlFor="ret-cond">
        <NativeSelect
          id="ret-cond"
          value={condition}
          onChange={(e) => setCondition(e.target.value as "good" | "repair")}
        >
          <option value="good">Good, ready to reissue</option>
          <option value="repair">Needs repair</option>
        </NativeSelect>
      </FormRow>
    </FormDialog>
  )
}

export function NoteDialog({
  asset,
  kind,
  onClose,
}: {
  asset: Asset
  kind: "lost" | "retire"
  onClose: () => void
}) {
  const store = useStore()
  const [note, setNote] = React.useState("")
  const [touched, setTouched] = React.useState(false)
  return (
    <FormDialog
      title={kind === "lost" ? `Mark ${asset.tag} lost` : `Retire ${asset.tag}`}
      description={asset.name}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="destructive"
            onClick={() => {
              setTouched(true)
              if (note.trim().length < 3) return
              if (kind === "lost") store.markAssetLost(asset.id, note.trim())
              else store.retireAsset(asset.id, note.trim())
              toast.success(kind === "lost" ? "Marked lost." : "Retired.")
              onClose()
            }}
          >
            {kind === "lost" ? "Mark lost" : "Retire"}
          </Button>
        </>
      }
    >
      <FormRow
        label="What happened"
        htmlFor="nt-note"
        error={
          touched && note.trim().length < 3
            ? "A few words, for the record."
            : null
        }
      >
        <Textarea
          id="nt-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </FormRow>
    </FormDialog>
  )
}

export function AssetHistoryDialog({
  asset,
  onClose,
}: {
  asset: Asset
  onClose: () => void
}) {
  return (
    <FormDialog
      title={`${asset.tag} — history`}
      description={`${asset.name}${asset.serial ? ` · ${asset.serial}` : ""}`}
      onClose={onClose}
      footer={
        <Button size="lg" variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <ol className="space-y-2 border-l pl-4 text-sm">
        {[...asset.history].reverse().map((h, i) => (
          <li key={i}>
            <p>{h.text}</p>
            <p className="text-xs text-muted-foreground">{formatDate(h.at)}</p>
          </li>
        ))}
      </ol>
    </FormDialog>
  )
}
