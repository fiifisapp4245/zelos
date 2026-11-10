"use client"

import * as React from "react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormRow, NativeSelect } from "./form"
import { useStore } from "@/lib/store"
import { TODAY_ISO, formatDateTime } from "@/lib/format"
import { addDays } from "@/lib/time"
import {
  PLACEHOLDERS,
  offerProblem,
  renderLetter,
  sha256Hex,
  unknownPlaceholders,
} from "@/lib/offers"
import { newId } from "@/lib/ids"
import type { OfferSignature, OfferTemplate } from "@/lib/types"

export const SIGN_STATUS: Record<
  OfferSignature["status"],
  { label: string; tone: "info" | "success" | "danger" | "neutral" | "warning" }
> = {
  sent: { label: "Sent, not opened", tone: "info" },
  viewed: { label: "Opened", tone: "warning" },
  signed: { label: "Signed", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
}

export function signUrl(token: string) {
  return `${window.location.origin}/sign/${token}`
}

/** Shows the letter as it will be sent, then sends it to be signed online. */
export function OfferLetterDialog({
  candidateId,
  onClose,
}: {
  candidateId: string
  onClose: () => void
}) {
  const store = useStore()
  const c = store.candidates.find((x) => x.id === candidateId)
  const req = c && store.requisitions.find((r) => r.id === c.requisitionId)
  const [templateId, setTemplateId] = React.useState(
    store.offerTemplates[0]?.id ?? ""
  )
  const [sending, setSending] = React.useState(false)
  const template = store.offerTemplates.find((t) => t.id === templateId)

  const letter = React.useMemo(() => {
    if (!c?.offer || !req || !template) return null
    const ctx = {
      candidate: c,
      req,
      manager: store.employeeById(req.hiringManagerId),
      company: store.company.tradingName || store.company.legalName,
      salaryMonthly: c.offer.salaryMonthly,
      startDate: c.offer.startDate,
      today: TODAY_ISO,
      expiresOn: addDays(TODAY_ISO, 7),
    }
    return {
      text: renderLetter(template, ctx),
      problem: offerProblem(ctx, template.body),
    }
  }, [c, req, template, store])

  if (!c || !req) return null

  async function send() {
    if (!letter || letter.problem || !c) return
    setSending(true)
    const letterHash = await sha256Hex(letter.text)
    const r = store.sendOfferForSignature({
      candidateId: c.id,
      templateId: templateId || null,
      letter: letter.text,
      letterHash,
    })
    setSending(false)
    if (!r.ok) {
      toast.error(r.reason)
      return
    }
    toast.success(`Offer sent to ${c.name} to sign. It is in the Outbox.`)
    onClose()
  }

  return (
    <FormDialog
      title="Send offer for signature"
      description={`${c.name} gets a private link to read and sign this letter online. The letter you see here is exactly what they sign.`}
      width="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            disabled={!letter || !!letter.problem || sending}
            onClick={send}
          >
            {sending ? "Sending…" : "Send for signature"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {store.offerTemplates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            There is no offer template. Create one under Recruitment → Offers.
          </p>
        ) : (
          <FormRow label="Template" htmlFor="ol-tpl">
            <NativeSelect
              id="ol-tpl"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {store.offerTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
        )}
        {letter?.problem && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-danger-muted/40 px-3 py-2 text-sm"
          >
            {letter.problem}
          </p>
        )}
        {letter && (
          <article className="max-h-[48vh] overflow-y-auto rounded-lg border bg-background p-5">
            <pre className="font-serif text-sm leading-relaxed whitespace-pre-wrap">
              {letter.text}
            </pre>
          </article>
        )}
      </div>
    </FormDialog>
  )
}

export function TemplateDialog({
  existing,
  onClose,
}: {
  existing?: OfferTemplate
  onClose: () => void
}) {
  const store = useStore()
  const [name, setName] = React.useState(existing?.name ?? "")
  const [body, setBody] = React.useState(existing?.body ?? "")
  const [touched, setTouched] = React.useState(false)
  const unknown = unknownPlaceholders(body)
  const errors = {
    name: name.trim() ? null : "Name the template.",
    body:
      body.trim().length < 40
        ? "Write the letter."
        : unknown.length
          ? `{{${unknown[0]}}} is not something Zelos can fill.`
          : !/\{\{\s*candidate_name\s*\}\}/.test(body)
            ? "Address the letter with {{candidate_name}}."
            : null,
  }
  return (
    <FormDialog
      title={existing ? "Edit template" : "New offer template"}
      description="Plain text. Placeholders are filled from the candidate and the role when a letter is sent."
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
              if (errors.name || errors.body) return
              store.saveOfferTemplate({
                id: existing?.id ?? newId("ot"),
                name: name.trim(),
                body,
              })
              toast.success(
                "Template saved. Letters already sent are not changed."
              )
              onClose()
            }}
          >
            Save template
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormRow
          label="Name"
          htmlFor="tp-name"
          error={touched ? errors.name : null}
        >
          <Input
            id="tp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormRow>
        <FormRow
          label="Letter"
          htmlFor="tp-body"
          error={touched ? errors.body : null}
        >
          <Textarea
            id="tp-body"
            rows={14}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="font-mono text-xs"
          />
        </FormRow>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Placeholders you can use
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setBody((b) => `${b}{{${p}}}`)}
                className="rounded-md border px-2 py-0.5 font-mono text-[11px] hover:bg-muted"
              >
                {`{{${p}}}`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </FormDialog>
  )
}

/** Every step a letter went through: sent, opened, signed or not. */
export function TrailDialog({
  sig,
  onClose,
}: {
  sig: OfferSignature
  onClose: () => void
}) {
  const store = useStore()
  const c = store.candidates.find((x) => x.id === sig.candidateId)
  return (
    <FormDialog
      title={`Offer to ${c?.name ?? "candidate"}`}
      description={SIGN_STATUS[sig.status].label}
      width="lg"
      onClose={onClose}
      footer={
        <Button size="lg" variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-5">
        <ol className="space-y-2 border-l pl-4 text-sm">
          {sig.trail.map((t, i) => (
            <li key={i}>
              <p>{t.text}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(t.at)}
              </p>
            </li>
          ))}
        </ol>
        {sig.declinedReason && (
          <p className="text-sm">
            <Pill tone="danger">Declined</Pill>{" "}
            <span className="text-muted-foreground">{sig.declinedReason}</span>
          </p>
        )}
        <details className="rounded-lg border">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium">
            The letter as sent
          </summary>
          <pre className="border-t px-4 py-3 font-serif text-sm leading-relaxed whitespace-pre-wrap">
            {sig.letter}
          </pre>
        </details>
        <p className="font-mono text-[11px] break-all text-muted-foreground">
          SHA-256 {sig.letterHash}
        </p>
      </div>
    </FormDialog>
  )
}
