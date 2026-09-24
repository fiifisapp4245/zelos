"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Initials, Pill } from "@/components/common"
import { RequestBadge } from "@/components/common/status"
import { useStore } from "@/lib/store"
import { leaveLink } from "@/lib/leave/links"
import {
  LEAVE_TYPE_LABEL,
  formatDate,
  formatDateTime,
  fullName,
} from "@/lib/format"
import type { LeaveRequest } from "@/lib/types"

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b py-2.5 last:border-0">
      <dt className="w-[130px] shrink-0 text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm">{children}</dd>
    </div>
  )
}

/**
 * A leave request, read-only.
 *
 * Everything that changes it happens in the Leave module, so this shows
 * what it says and hands over rather than offering a second way to
 * decide it.
 */
export function LeaveDetailSheet({
  request,
  onClose,
}: {
  request: LeaveRequest | null
  onClose: () => void
}) {
  const store = useStore()
  if (!request) return null

  const person = store.employeeById(request.employeeId)
  const manager = store.employeeById(person?.managerId)
  const dotted = store.employeeById(person?.dottedLineManagerId)
  const decidedBy = store.employeeById(request.decidedBy)

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[520px]"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2.5">
            {person && <Initials person={person} size="sm" />}
            {fullName(person)}
          </SheetTitle>
          <SheetDescription>
            {LEAVE_TYPE_LABEL[request.type]} leave · {request.id}
          </SheetDescription>
        </SheetHeader>

        <dl className="px-4">
          <Row label="Status">
            <RequestBadge status={request.status} />
          </Row>
          <Row label="Dates">
            {formatDate(request.startDate)} – {formatDate(request.endDate)}
          </Row>
          <Row label="Days">
            <span className="tabular">{request.days}</span>
          </Row>
          <Row label="Reason">{request.reason}</Row>
          <Row label="Submitted">{formatDateTime(request.submittedAt)}</Row>
          <Row label="Approvers">
            <span className="flex flex-wrap items-center gap-1.5">
              <Pill tone={request.status === "pending" ? "warning" : "success"}>
                1 · {fullName(manager)}
              </Pill>
              {dotted && (
                <Pill tone="neutral">Dotted line · {fullName(dotted)}</Pill>
              )}
              <Pill tone="neutral">2 · Head of Department</Pill>
              <Pill tone="neutral">3 · HR Admin</Pill>
            </span>
          </Row>
          {request.decidedAt && (
            <Row label="Decided">
              {fullName(decidedBy)} · {formatDateTime(request.decidedAt)}
              {request.decisionNote && (
                <span className="mt-1 block text-muted-foreground">
                  “{request.decisionNote}”
                </span>
              )}
            </Row>
          )}
        </dl>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button asChild>
            <Link href={leaveLink.request(request.id)}>
              Open in Leave
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
