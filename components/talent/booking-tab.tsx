"use client"

import * as React from "react"
import {
  CalendarClock,
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  UserX,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Panel, Pill, type Tone } from "@/components/common"
import { RowActions } from "@/components/common/row-actions"
import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import {
  AvailabilityDialog,
  BookingPageDialog,
  VIDEO_LABEL,
} from "./booking-dialogs"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { TODAY, fullName } from "@/lib/format"
import { formatSlotDay, formatSlotTime } from "@/lib/booking/slots"
import { INTERVIEW_KIND_LABEL } from "@/lib/talent/recruitment"
import type { Booking, BookingPage } from "@/lib/types"

const DAY = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const STATUS: Record<Booking["status"], { label: string; tone: Tone }> = {
  invited: { label: "Link sent", tone: "info" },
  booked: { label: "Booked", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  no_show: { label: "No-show", tone: "danger" },
  completed: { label: "Done", tone: "neutral" },
}

export function bookingUrl(token: string) {
  return `${window.location.origin}/book/${token}`
}

export async function copyText(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(done)
  } catch {
    toast.error("Could not copy. Select the link and copy it by hand.")
  }
}

export function BookingTab({
  onOpenCandidate,
}: {
  onOpenCandidate: (id: string) => void
}) {
  const store = useStore()
  const isHr = has(store.viewer, "hr_admin")
  const [editing, setEditing] = React.useState<BookingPage | "new" | null>(null)
  const [avail, setAvail] = React.useState<string | null>(null)
  const [removing, setRemoving] = React.useState<BookingPage | null>(null)

  const interviewers = [
    ...new Set(store.bookingPages.flatMap((p) => p.interviewerIds)),
  ]
  const rows = [...store.bookings].sort((a, b) =>
    (a.slotStart ?? "9").localeCompare(b.slotStart ?? "9")
  )

  return (
    <div className="space-y-5">
      <Panel
        title="Booking pages"
        description="Candidates book themselves from a private link. Pick a page for them from their record, or from here."
        bodyClassName="p-0"
        actions={
          isHr && (
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus className="size-3.5" />
              New booking page
            </Button>
          )
        }
      >
        {store.bookingPages.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No booking pages yet"
            description="Create one so candidates can choose their own interview time."
          />
        ) : (
          <ul className="divide-y">
            {store.bookingPages.map((p) => {
              const req = store.requisitions.find(
                (r) => r.id === p.requisitionId
              )
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{p.name}</span>
                      <Pill tone="neutral">{INTERVIEW_KIND_LABEL[p.kind]}</Pill>
                      {!p.active && <Pill tone="warning">Closed</Pill>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.durationMin} min + {p.bufferMin} break · up to{" "}
                      {p.advanceDays} days ahead ·{" "}
                      {req ? req.id : "any requisition"} ·{" "}
                      {p.interviewerIds
                        .map((id) => fullName(store.employeeById(id)))
                        .join(", ")}
                      {p.interviewerIds.length > 1 &&
                        p.assign === "round_robin" &&
                        " (take turns)"}{" "}
                      · {VIDEO_LABEL[p.video].split(" (")[0]}
                    </p>
                  </div>
                  {isHr && (
                    <RowActions
                      label={`Actions for ${p.name}`}
                      actions={[
                        {
                          label: "Edit",
                          icon: Pencil,
                          onSelect: () => setEditing(p),
                        },
                        {
                          label: p.active
                            ? "Close for booking"
                            : "Open for booking",
                          icon: CalendarClock,
                          onSelect: () => {
                            store.saveBookingPage({ ...p, active: !p.active })
                            toast.success(
                              p.active
                                ? "Closed. Existing bookings stand."
                                : "Open for booking."
                            )
                          },
                        },
                        {
                          label: "Delete",
                          icon: Trash2,
                          destructive: true,
                          onSelect: () => setRemoving(p),
                        },
                      ]}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Interviewer availability"
        description="Weekly hours, in the company's time zone. Public holidays and approved leave are taken out automatically."
        bodyClassName="p-0"
      >
        <ul className="divide-y">
          {interviewers.map((id) => {
            const a = store.availability.find((x) => x.employeeId === id)
            return (
              <li
                key={id}
                className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"
              >
                <span className="min-w-0 flex-1 font-medium">
                  {fullName(store.employeeById(id))}
                </span>
                <span className="text-muted-foreground">
                  {a
                    ? `${a.days.map((d) => DAY[d]).join(", ")} · ${a.start}–${a.end}`
                    : "Not set — no slots offered"}
                </span>
                {isHr && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAvail(id)}
                  >
                    Edit
                  </Button>
                )}
              </li>
            )
          })}
          {interviewers.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-muted-foreground">
              Add interviewers to a booking page first.
            </li>
          )}
        </ul>
      </Panel>

      <Panel
        title="Booked interviews"
        description="Everything candidates have booked, moved or cancelled."
        bodyClassName="p-0"
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing booked yet"
            description="Send a booking link from a candidate's record."
          />
        ) : (
          <ul className="divide-y">
            {rows.map((b) => {
              const c = store.candidates.find((x) => x.id === b.candidateId)
              const page = store.bookingPages.find((p) => p.id === b.pageId)
              const st = STATUS[b.status]
              const past = b.slotStart
                ? new Date(b.slotStart).getTime() < TODAY.getTime()
                : false
              return (
                <li
                  key={b.id}
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
                      <span className="text-xs text-muted-foreground">
                        {page?.name}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {b.slotStart
                        ? `${formatSlotDay(b.slotStart, "Africa/Accra")} at ${formatSlotTime(b.slotStart, "Africa/Accra")} · with ${fullName(store.employeeById(b.interviewerId ?? undefined))}`
                        : `Waiting for them to choose · link expires ${b.expiresOn}`}
                    </p>
                  </div>
                  {isHr && (
                    <RowActions
                      label={`Actions for ${c?.name}`}
                      actions={[
                        {
                          label: "Copy booking link",
                          icon: Copy,
                          onSelect: () =>
                            copyText(bookingUrl(b.token), "Link copied."),
                        },
                        {
                          label: "Open their page",
                          icon: ExternalLink,
                          onSelect: () =>
                            window.open(bookingUrl(b.token), "_blank"),
                        },
                        (b.status === "booked" || b.status === "invited") && {
                          label: "Cancel booking",
                          icon: XCircle,
                          destructive: true,
                          onSelect: () => {
                            store.cancelBooking(b.token, "recruiter")
                            toast.success("Cancelled. They have been emailed.")
                          },
                        },
                        b.status === "booked" &&
                          past && {
                            label: "Mark as no-show",
                            icon: UserX,
                            destructive: true,
                            onSelect: () => {
                              store.markNoShow(b.id)
                              toast.success("Recorded as a no-show.")
                            },
                          },
                      ]}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {editing && (
        <BookingPageDialog
          existing={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {avail && (
        <AvailabilityDialog employeeId={avail} onClose={() => setAvail(null)} />
      )}
      {removing && (
        <FormDialog
          title="Delete this booking page?"
          description={removing.name}
          onClose={() => setRemoving(null)}
          footer={
            <>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setRemoving(null)}
              >
                Keep it
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => {
                  store.deleteBookingPage(removing.id)
                  toast.success("Booking page deleted.")
                  setRemoving(null)
                }}
              >
                Delete page
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            Links already sent for this page stop working. Interviews already
            booked stay on the candidates&apos; records.
          </p>
        </FormDialog>
      )}
    </div>
  )
}
