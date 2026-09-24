"use client"

import Link from "next/link"
import { ArrowUpRight, ClipboardList } from "lucide-react"

import { EmptyState, Initials, Panel, Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { leaveLink } from "@/lib/leave/links"
import { useStore } from "@/lib/store"
import {
  LEAVE_TYPE_LABEL,
  TODAY_ISO,
  formatDate,
  fullName,
  relativeTime,
} from "@/lib/format"
import type { Employee, LeaveRequest } from "@/lib/types"

/**
 * What is still waiting on somebody.
 *
 * Deliberately no approve or decline here. A decision belongs with the
 * approval chain in the Leave module, where the notes and the notifying
 * happen — this is the list, and the way there.
 */
export function PendingRequests({
  scope,
  leave,
}: {
  scope: Employee[]
  leave: LeaveRequest[]
}) {
  const store = useStore()
  const ids = new Set(scope.map((e) => e.id))

  const pending = leave
    .filter((l) => ids.has(l.employeeId) && l.status === "pending")
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  return (
    <Panel
      description="Approve and decline in the Leave module, where the chain and the notes live."
      bodyClassName="p-0"
      actions={
        <Button variant="outline" size="sm" className="h-9" asChild>
          <Link href="/leave?tab=approvals">
            Open approvals
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      }
    >
      {pending.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nothing pending"
          description="Every request in your scope has been decided."
        />
      ) : (
        <ul className="divide-y">
          {pending.map((l) => {
            const person = store.employeeById(l.employeeId)
            const approver = store.employeeById(person?.managerId)
            const started = l.startDate <= TODAY_ISO
            return (
              <li
                key={l.id}
                className="flex flex-wrap items-center gap-3 px-5 py-3.5"
              >
                {person && <Initials person={person} size="sm" />}
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/employees/${l.employeeId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {fullName(person)}
                    </Link>
                    <Pill tone="neutral">{LEAVE_TYPE_LABEL[l.type]}</Pill>
                    {started && (
                      <Pill tone="warning">The days have already passed</Pill>
                    )}
                  </p>
                  <p className="tabular mt-0.5 text-xs text-muted-foreground">
                    {formatDate(l.startDate)} – {formatDate(l.endDate)} ·{" "}
                    {l.days} {l.days === 1 ? "day" : "days"} · submitted{" "}
                    {relativeTime(l.submittedAt)} · with {fullName(approver)}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="h-8" asChild>
                  <Link href={leaveLink.approval(l.id)}>
                    Open in Leave
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
