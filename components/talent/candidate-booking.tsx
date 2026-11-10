"use client"

import * as React from "react"
import { Copy, ExternalLink, Send } from "lucide-react"
import { toast } from "sonner"

import { Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "./form"
import { bookingUrl, copyText } from "./booking-tab"
import { useStore } from "@/lib/store"
import { fullName } from "@/lib/format"
import { formatSlotDay, formatSlotTime } from "@/lib/booking/slots"
import type { Candidate } from "@/lib/types"

/** Sends a candidate a private link to book their own interview, and shows where each one stands. */
export function CandidateBooking({ c }: { c: Candidate }) {
  const store = useStore()
  const pages = store.bookingPages.filter(
    (p) => p.active && (!p.requisitionId || p.requisitionId === c.requisitionId)
  )
  const mine = store.bookings.filter((b) => b.candidateId === c.id)
  const [pageId, setPageId] = React.useState(
    (pages.find((p) => p.requisitionId === c.requisitionId) ?? pages[0])?.id ??
      ""
  )
  const closed = c.stage === "rejected" || c.stage === "hired"

  return (
    <div className="mb-3 space-y-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-sm font-medium">Let them choose a time</p>
      {pages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No booking page is open for this role. Create one under Recruitment →
          Booking.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            aria-label="Booking page"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            className="h-9 w-auto min-w-[220px] flex-1"
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
          <Button
            size="sm"
            disabled={closed || !pageId}
            onClick={() => {
              const r = store.sendBookingLink(c.id, pageId)
              if (r.ok)
                toast.success(
                  `Booking link emailed to ${c.name}. It is in the Outbox.`
                )
              else toast.error(r.reason)
            }}
          >
            <Send className="size-3.5" />
            Send booking link
          </Button>
        </div>
      )}

      {mine.length > 0 && (
        <ul className="space-y-2">
          {mine.map((b) => {
            const page = store.bookingPages.find((p) => p.id === b.pageId)
            return (
              <li
                key={b.id}
                className="rounded-lg border bg-background p-2.5 text-sm"
              >
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{page?.name ?? "Booking"}</span>
                  <Pill
                    tone={
                      b.status === "booked"
                        ? "success"
                        : b.status === "invited"
                          ? "info"
                          : b.status === "no_show"
                            ? "danger"
                            : "neutral"
                    }
                  >
                    {b.status === "invited"
                      ? "Waiting for them to choose"
                      : b.status === "booked"
                        ? "Booked"
                        : b.status === "no_show"
                          ? "No-show"
                          : b.status === "cancelled"
                            ? "Cancelled"
                            : "Done"}
                  </Pill>
                </p>
                {b.slotStart && b.status !== "cancelled" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatSlotDay(b.slotStart, "Africa/Accra")} at{" "}
                    {formatSlotTime(b.slotStart, "Africa/Accra")} ·{" "}
                    {fullName(store.employeeById(b.interviewerId ?? undefined))}
                    {b.link && (
                      <>
                        {" "}
                        ·{" "}
                        <a
                          className="underline"
                          href={b.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Join link
                        </a>
                      </>
                    )}
                  </p>
                )}
                {(b.status === "booked" || b.status === "invited") && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        copyText(bookingUrl(b.token), "Link copied.")
                      }
                    >
                      <Copy className="size-3" />
                      Copy link
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => window.open(bookingUrl(b.token), "_blank")}
                    >
                      <ExternalLink className="size-3" />
                      Open as the candidate
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        store.cancelBooking(b.token, "recruiter")
                        toast.success("Cancelled. They have been emailed.")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
