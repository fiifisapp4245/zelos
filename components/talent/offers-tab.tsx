"use client"

import * as React from "react"
import {
  Copy,
  ExternalLink,
  FileSignature,
  History,
  Pencil,
  Plus,
  Send,
  Trash2,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Panel, Pill } from "@/components/common"
import { RowActions } from "@/components/common/row-actions"
import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import {
  SIGN_STATUS,
  TemplateDialog,
  TrailDialog,
  signUrl,
} from "./offer-dialogs"
import { copyText } from "./booking-tab"
import { useStore } from "@/lib/store"
import { formatDate, ghs } from "@/lib/format"
import type { OfferSignature, OfferTemplate } from "@/lib/types"

export function OffersTab({
  onOpenCandidate,
}: {
  onOpenCandidate: (id: string) => void
}) {
  const store = useStore()
  const [tpl, setTpl] = React.useState<OfferTemplate | "new" | null>(null)
  const [del, setDel] = React.useState<OfferTemplate | null>(null)
  const [trail, setTrail] = React.useState<OfferSignature | null>(null)

  return (
    <div className="space-y-5">
      <Panel
        title="Offers out for signature"
        description="Letters sent to be signed online, and where each one stands."
        bodyClassName="p-0"
      >
        {store.offerSignatures.length === 0 ? (
          <EmptyState
            icon={FileSignature}
            title="No letters sent yet"
            description="Open a candidate at the offer stage, set the salary and start date, and prepare the letter."
          />
        ) : (
          <ul className="divide-y">
            {store.offerSignatures.map((sig) => {
              const c = store.candidates.find((x) => x.id === sig.candidateId)
              const req = store.requisitions.find(
                (r) => r.id === c?.requisitionId
              )
              const live = sig.status === "sent" || sig.status === "viewed"
              const st = SIGN_STATUS[sig.status]
              return (
                <li
                  key={sig.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <button
                        type="button"
                        className="font-medium hover:underline"
                        onClick={() => c && onOpenCandidate(c.id)}
                      >
                        {c?.name ?? "Unknown"}
                      </button>
                      <Pill tone={st.tone}>{st.label}</Pill>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {req?.title} · {ghs(sig.salaryMonthly)} a month · starts{" "}
                      {formatDate(sig.startDate)}
                      {live && ` · sign by ${formatDate(sig.expiresOn)}`}
                      {sig.status === "signed" &&
                        sig.signedOn &&
                        ` · signed ${formatDate(sig.signedOn)}`}
                    </p>
                  </div>
                  <RowActions
                    label={`Actions for ${c?.name}`}
                    actions={[
                      {
                        label: "View record",
                        icon: History,
                        onSelect: () => setTrail(sig),
                      },
                      live && {
                        label: "Copy signing link",
                        icon: Copy,
                        onSelect: () =>
                          copyText(signUrl(sig.token), "Signing link copied."),
                      },
                      (live || sig.status === "signed") && {
                        label:
                          sig.status === "signed"
                            ? "Open signed copy"
                            : "Open as the candidate",
                        icon: ExternalLink,
                        onSelect: () =>
                          window.open(signUrl(sig.token), "_blank"),
                      },
                      live && {
                        label: "Resend",
                        icon: Send,
                        onSelect: () => {
                          store.resendOffer(sig.id)
                          toast.success("Sent again, with a fresh deadline.")
                        },
                      },
                      live && {
                        label: "Withdraw",
                        icon: XCircle,
                        destructive: true,
                        onSelect: () => {
                          store.withdrawOffer(sig.id)
                          toast.success("Withdrawn. The link no longer works.")
                        },
                      },
                    ]}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Letter templates"
        description="The wording of an offer, with placeholders filled in when it is sent. Editing one never changes a letter already sent."
        bodyClassName="p-0"
        actions={
          <Button size="sm" onClick={() => setTpl("new")}>
            <Plus className="size-3.5" />
            New template
          </Button>
        }
      >
        {store.offerTemplates.length === 0 ? (
          <EmptyState
            icon={FileSignature}
            title="No templates"
            description="Create one so offers can be sent."
          />
        ) : (
          <ul className="divide-y">
            {store.offerTemplates.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-3 px-5 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {t.body.replace(/\s+/g, " ")}
                  </p>
                </div>
                <RowActions
                  label={`Actions for ${t.name}`}
                  actions={[
                    { label: "Edit", icon: Pencil, onSelect: () => setTpl(t) },
                    {
                      label: "Delete",
                      icon: Trash2,
                      destructive: true,
                      onSelect: () => setDel(t),
                    },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {tpl && (
        <TemplateDialog
          existing={tpl === "new" ? undefined : tpl}
          onClose={() => setTpl(null)}
        />
      )}
      {trail && <TrailDialog sig={trail} onClose={() => setTrail(null)} />}
      {del && (
        <FormDialog
          title="Delete this template?"
          description={del.name}
          onClose={() => setDel(null)}
          footer={
            <>
              <Button variant="ghost" size="lg" onClick={() => setDel(null)}>
                Keep it
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => {
                  store.deleteOfferTemplate(del.id)
                  toast.success("Template deleted.")
                  setDel(null)
                }}
              >
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            Letters already sent keep their own copy of the text and are not
            affected.
          </p>
        </FormDialog>
      )}
    </div>
  )
}
