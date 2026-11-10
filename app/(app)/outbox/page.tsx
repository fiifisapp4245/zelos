"use client"

import * as React from "react"
import {
  Copy,
  Download,
  FileText,
  Mail,
  MailCheck,
  MailX,
  Send,
} from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  PageHeader,
  Panel,
  Pill,
  StatCard,
  type Tone,
} from "@/components/common"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { copyText } from "@/components/talent/booking-tab"
import { downloadText } from "@/components/reports/report-viewer"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { formatDateTime } from "@/lib/format"
import type { EmailKind, EmailMessage } from "@/lib/types"

const KIND_LABEL: Record<EmailKind, string> = {
  booking_invite: "Booking link",
  booking_confirmation: "Booking confirmed",
  booking_reminder: "Reminder",
  booking_cancelled: "Booking cancelled",
  assessment_invite: "Assessment invite",
  assessment_submitted: "Assessment received",
  assessment_reminder: "Assessment reminder",
  manager_alert: "Manager alert",
  report: "Report",
  other: "Other",
}

const STATUS: Record<EmailMessage["status"], { label: string; tone: Tone }> = {
  sent: { label: "Sent", tone: "success" },
  scheduled: { label: "Scheduled", tone: "info" },
  cancelled: { label: "Cancelled", tone: "neutral" },
}

export default function OutboxPage() {
  const store = useStore()
  const [open, setOpen] = React.useState<EmailMessage | null>(null)
  const [tab, setTab] = React.useState("all")
  const isHr = has(store.viewer, "hr_admin")

  const all = store.outbox
  const shown = tab === "all" ? all : all.filter((e) => e.status === tab)
  const sent = all.filter((e) => e.status === "sent").length
  const waiting = all.filter((e) => e.status === "scheduled").length

  return (
    <PageShell
      width="wide"
      crumbs={[{ label: "Workspace", href: "/overview" }, { label: "Outbox" }]}
    >
      <PageHeader
        title="Outbox"
        description="Every email Zelos sends: booking links, confirmations, reminders and assessment invitations. In this prototype nothing leaves the browser, so this is exactly what would have been delivered, links included."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Sent" value={sent} hint="Delivered to the recipient" />
        <StatCard
          label="Scheduled"
          value={waiting}
          hint="Reminders waiting for their time"
        />
        <StatCard
          label="Cancelled"
          value={all.filter((e) => e.status === "cancelled").length}
          hint="Withdrawn before sending"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <SegmentedTabs
          className="mb-5"
          tabs={[
            { value: "all", label: "All", count: all.length },
            { value: "sent", label: "Sent" },
            { value: "scheduled", label: "Scheduled", count: waiting },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
        <TabsContent value={tab}>
          <Panel bodyClassName="p-0">
            {shown.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No emails here"
                description="Send a booking link or an assessment from a candidate's record and it appears here."
              />
            ) : (
              <ul className="divide-y">
                {shown.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      {e.status === "cancelled" ? (
                        <MailX className="size-4" />
                      ) : e.status === "sent" ? (
                        <MailCheck className="size-4" />
                      ) : (
                        <Mail className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="block max-w-full truncate text-left text-sm font-medium hover:underline"
                        onClick={() => setOpen(e)}
                      >
                        {e.subject}
                      </button>
                      <p className="truncate text-xs text-muted-foreground">
                        To {e.toName} · {KIND_LABEL[e.kind]} ·{" "}
                        {e.status === "scheduled"
                          ? `goes out ${formatDateTime(e.sendAt)}`
                          : formatDateTime(e.createdAt)}
                      </p>
                    </div>
                    <Pill tone={STATUS[e.status].tone}>
                      {STATUS[e.status].label}
                    </Pill>
                    {isHr && e.status === "scheduled" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            store.deliverEmail(e.id)
                            toast.success("Sent now.")
                          }}
                        >
                          <Send className="size-3.5" />
                          Send now
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            store.cancelEmail(e.id)
                            toast.success("Cancelled.")
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      {open && (
        <FormDialog
          title={open.subject}
          description={`To ${open.toName} <${open.to}>`}
          width="lg"
          onClose={() => setOpen(null)}
          footer={
            <>
              {open.cta && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => copyText(open.cta!.href, "Link copied.")}
                >
                  <Copy className="size-4" />
                  Copy link
                </Button>
              )}
              <Button size="lg" variant="outline" onClick={() => setOpen(null)}>
                Close
              </Button>
            </>
          }
        >
          <div className="space-y-4 rounded-lg border bg-background p-5 text-sm">
            <p className="whitespace-pre-line">{open.body}</p>
            {open.attachment && (
              <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <FileText className="size-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  {open.attachment.name}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    downloadText(
                      open.attachment!.name,
                      open.attachment!.content,
                      open.attachment!.type
                    )
                  }
                >
                  <Download className="size-3.5" />
                  Download
                </Button>
              </div>
            )}
            {open.cta && (
              <a
                href={open.cta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground"
              >
                {open.cta.label}
              </a>
            )}
          </div>
        </FormDialog>
      )}
    </PageShell>
  )
}
