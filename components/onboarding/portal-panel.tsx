"use client"

import * as React from "react"
import { Copy, ExternalLink, FileText, History, Send } from "lucide-react"
import { toast } from "sonner"

import { Pill, type Tone } from "@/components/common"
import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { copyText } from "@/components/talent/booking-tab"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { TODAY_ISO, formatDate, formatDateTime } from "@/lib/format"
import {
  SECTIONS,
  SECTION_TITLE,
  completion,
  maskTail,
  validateAll,
  type Ctx,
} from "@/lib/portal"
import type { PortalReview, PortalSection, PreHirePortal } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS: Record<PreHirePortal["status"], { label: string; tone: Tone }> = {
  invited: { label: "Invited", tone: "info" },
  in_progress: { label: "In progress", tone: "info" },
  submitted: { label: "Needs review", tone: "warning" },
  changes_requested: { label: "Sent back", tone: "warning" },
  approved: { label: "Accepted", tone: "success" },
}

const portalUrl = (token: string) =>
  `${window.location.origin}/welcome/${token}`

/** Where a new hire is in filling in their own details, with what HR can do about it. */
export function PortalRow({ employeeId }: { employeeId: string }) {
  const store = useStore()
  const [reviewing, setReviewing] = React.useState(false)
  const [trail, setTrail] = React.useState(false)
  const isHr = has(store.viewer, "hr_admin")
  const employee = store.employeeById(employeeId)
  const portal = store.portals.find((p) => p.employeeId === employeeId)
  if (!isHr || !employee) return null

  const ctx: Ctx = {
    today: TODAY_ISO,
    takenCards: store.employees
      .filter((e) => e.id !== employeeId && e.ghanaCard)
      .map((e) => e.ghanaCard),
    fullName: `${employee.firstName} ${employee.lastName}`,
  }
  const live = portal && portal.status !== "approved"
  const progress = portal ? completion(portal.data, ctx) : null

  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-muted/20 px-5 py-3 text-sm">
      <FileText className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-medium">Their own details</span>
          {portal ? (
            <Pill tone={STATUS[portal.status].tone}>
              {STATUS[portal.status].label}
            </Pill>
          ) : (
            <Pill tone="neutral">Not invited</Pill>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {!portal &&
            "Personal, identity, pension, pay and emergency details, filled in by the new hire."}
          {portal &&
            (portal.status === "invited" || portal.status === "in_progress") &&
            `${progress!.done} of ${progress!.total} sections complete · link works until ${formatDate(portal.expiresOn)}`}
          {portal?.status === "submitted" &&
            portal.submittedOn &&
            `Submitted ${formatDate(portal.submittedOn)}. Nothing is on their record until you accept it.`}
          {portal?.status === "changes_requested" &&
            "Waiting for them to fix what you flagged."}
          {portal?.status === "approved" &&
            "Checked and added to their record."}
        </p>
      </div>
      {!portal && (
        <Button
          size="sm"
          onClick={() => {
            const r = store.invitePortal(employeeId)
            if (r.ok)
              toast.success(
                `Invitation emailed to ${employee.firstName}. It is in the Outbox.`
              )
            else toast.error(r.reason)
          }}
        >
          <Send className="size-3.5" />
          Send invitation
        </Button>
      )}
      {portal?.status === "submitted" && (
        <Button size="sm" onClick={() => setReviewing(true)}>
          Review details
        </Button>
      )}
      {live && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => copyText(portalUrl(portal.token), "Link copied.")}
          >
            <Copy className="size-3.5" />
            Copy link
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(portalUrl(portal.token), "_blank")}
          >
            <ExternalLink className="size-3.5" />
            Open as them
          </Button>
          {portal.status !== "submitted" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                store.resendPortal(portal.id)
                toast.success("Sent again.")
              }}
            >
              Resend
            </Button>
          )}
        </>
      )}
      {portal && (
        <Button size="sm" variant="ghost" onClick={() => setTrail(true)}>
          <History className="size-3.5" />
          History
        </Button>
      )}
      {reviewing && portal && (
        <ReviewDialog
          portal={portal}
          ctx={ctx}
          onClose={() => setReviewing(false)}
        />
      )}
      {trail && portal && (
        <FormDialog
          title="History"
          description={`${employee.firstName} ${employee.lastName}'s details portal`}
          onClose={() => setTrail(false)}
          footer={
            <Button size="lg" variant="outline" onClick={() => setTrail(false)}>
              Close
            </Button>
          }
        >
          <ol className="space-y-2 border-l pl-4 text-sm">
            {portal.history.map((h, i) => (
              <li key={i}>
                <p>{h.text}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(h.at)}
                </p>
              </li>
            ))}
          </ol>
        </FormDialog>
      )}
    </div>
  )
}

function ReviewDialog({
  portal,
  ctx,
  onClose,
}: {
  portal: PreHirePortal
  ctx: Ctx
  onClose: () => void
}) {
  const store = useStore()
  const e = store.employeeById(portal.employeeId)!
  const d = portal.data
  const [reveal, setReveal] = React.useState(false)
  const [decision, setDecision] = React.useState<
    Partial<Record<PortalSection, PortalReview>>
  >({})
  const [error, setError] = React.useState<string | null>(null)
  const problems = validateAll(d, ctx)
  const num = (v: string) => (reveal ? v : maskTail(v, 4))

  const rows: Record<PortalSection, [string, string][]> = {
    personal: [
      ["Date of birth", formatDate(d.dateOfBirth)],
      [
        "Gender",
        d.gender ? d.gender[0].toUpperCase() + d.gender.slice(1) : "—",
      ],
      ["Nationality", d.nationality],
      ["Phone", d.phone],
      ["Personal email", d.personalEmail],
      ["Address", d.residentialAddress],
      ["GPS", d.gpsAddress || "—"],
    ],
    identity: [
      ["Ghana Card", num(d.ghanaCard)],
      ["Uploads", d.idDocuments.map((u) => u.name).join(", ") || "None"],
    ],
    statutory: [
      ["SSNIT", num(d.ssnitNumber)],
      ["TIN", num(d.tin)],
      ["Tier 2", d.tier2Provider],
      ["Tier 3", d.tier3Provider || "None"],
    ],
    pay:
      d.paymentMethod === "bank"
        ? [
            ["Method", "Bank account"],
            ["Bank", d.bankName],
            ["Account", num(d.bankAccount)],
            ["Name on account", d.accountName],
          ]
        : [
            ["Method", "Mobile money"],
            ["Network", d.momoProvider],
            ["Number", num(d.momoNumber)],
          ],
    emergency: [
      ["Name", d.emergencyName],
      ["Relationship", d.emergencyRelationship],
      ["Phone", d.emergencyPhone],
      ["Email", d.emergencyEmail || "—"],
    ],
  }

  const sendBack = SECTIONS.filter(
    (s) => decision[s.key]?.status === "changes"
  ).length
  const decided = SECTIONS.every((s) => decision[s.key])

  function set(k: PortalSection, v: PortalReview) {
    setDecision((x) => ({ ...x, [k]: v }))
  }

  return (
    <FormDialog
      title={`${e.firstName} ${e.lastName}: details to review`}
      description="Accept each section, or send it back with a note. Accepting everything writes it to their record."
      width="lg"
      onClose={onClose}
      footer={
        <>
          <Button
            variant="ghost"
            size="lg"
            className="mr-auto"
            onClick={() =>
              setDecision(
                Object.fromEntries(
                  SECTIONS.map((s) => [s.key, { status: "ok", note: "" }])
                )
              )
            }
          >
            Accept every section
          </Button>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Close
          </Button>
          <Button
            size="lg"
            disabled={!decided}
            onClick={() => {
              const r = store.reviewPortal(portal.id, decision)
              if (!r.ok) {
                setError(r.reason)
                return
              }
              toast.success(
                r.approved
                  ? "Accepted. Their record is updated and their identity documents are waiting to be verified."
                  : "Sent back. They have been emailed what to fix."
              )
              onClose()
            }}
          >
            {!decided
              ? "Decide on every section"
              : sendBack === 0
                ? "Accept and update record"
                : `Send back ${sendBack} section${sendBack === 1 ? "" : "s"}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={reveal}
            onChange={(ev) => setReveal(ev.target.checked)}
          />
          Show full ID and account numbers
        </label>
        {SECTIONS.map((s) => {
          const errs = Object.values(problems[s.key])
          const dec = decision[s.key]
          return (
            <section key={s.key} className="rounded-lg border">
              <header className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
                <h3 className="flex-1 text-sm font-medium">{s.title}</h3>
                {(["ok", "changes"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() =>
                      set(s.key, { status: st, note: dec?.note ?? "" })
                    }
                    aria-pressed={dec?.status === st}
                    className={cn(
                      "rounded-lg border px-3 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      dec?.status === st
                        ? st === "ok"
                          ? "border-primary bg-success-muted font-medium text-primary"
                          : "border-warning bg-warning-muted font-medium"
                        : "hover:bg-muted"
                    )}
                  >
                    {st === "ok" ? "Accept" : "Send back"}
                  </button>
                ))}
              </header>
              <dl className="divide-y text-sm">
                {rows[s.key].map(([k, v]) => (
                  <div key={k} className="flex gap-3 px-4 py-2">
                    <dt className="w-36 shrink-0 text-muted-foreground">{k}</dt>
                    <dd className="min-w-0 flex-1 break-words first-letter:uppercase">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
              {errs.length > 0 && (
                <p
                  role="alert"
                  className="border-t px-4 py-2 text-xs text-destructive"
                >
                  {errs.join(" ")}
                </p>
              )}
              {dec?.status === "changes" && (
                <div className="border-t p-3">
                  <Textarea
                    aria-label={`What needs fixing in ${SECTION_TITLE[s.key]}`}
                    rows={2}
                    placeholder="Tell them what to fix."
                    value={dec.note}
                    onChange={(ev) =>
                      set(s.key, { status: "changes", note: ev.target.value })
                    }
                  />
                </div>
              )}
            </section>
          )
        })}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </FormDialog>
  )
}
