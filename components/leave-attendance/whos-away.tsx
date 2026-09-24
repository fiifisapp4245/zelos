"use client"

import { Sun } from "lucide-react"

import { EmptyState, Initials, Panel, Pill } from "@/components/common"
import { addDays } from "@/lib/time"
import { LEAVE_TYPE_LABEL, formatDate, fullName } from "@/lib/format"
import { useStore } from "@/lib/store"
import type { Employee, LeaveRequest } from "@/lib/types"

/**
 * Who is out over the period being looked at.
 *
 * The question a manager opens this page with, so it is the first thing
 * on it — and it follows the tab's period control rather than keeping a
 * second idea of "today" and "this week" of its own.
 */
export function WhosAway({
  scope,
  leave,
  from,
  to,
  label,
  onOpen,
}: {
  scope: Employee[]
  leave: LeaveRequest[]
  from: string
  to: string
  /** "Away today", "Away this month" — whatever the period is. */
  label: string
  onOpen: (request: LeaveRequest) => void
}) {
  const store = useStore()
  const ids = new Set(scope.map((e) => e.id))

  const away = leave
    .filter(
      (l) =>
        ids.has(l.employeeId) &&
        l.status === "approved" &&
        l.startDate <= to &&
        l.endDate >= from
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  return (
    <div className="space-y-3">
      <h2 className="text-[15px] font-semibold">
        {label}
        <span className="tabular ml-2 font-normal text-muted-foreground">
          {away.length}
        </span>
      </h2>

      {away.length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyState icon={Sun} title="No one is on leave in this period." />
        </Panel>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {away.map((l) => {
            const person = store.employeeById(l.employeeId)
            if (!person) return null
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => onOpen(l)}
                  className="w-full rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="flex items-center gap-2.5">
                    <Initials person={person} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {fullName(person)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {person.department}
                      </span>
                    </span>
                  </span>
                  <span className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Pill tone="info">
                      V · {LEAVE_TYPE_LABEL[l.type]} leave
                    </Pill>
                    <span className="tabular text-xs text-muted-foreground">
                      {formatDate(l.startDate)} – {formatDate(l.endDate)}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Back on {formatDate(addDays(l.endDate, 1))}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
