"use client"

import { Sun } from "lucide-react"

import { EmptyState, Initials, Panel, Pill } from "@/components/common"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { addDays } from "@/lib/time"
import { LEAVE_TYPE_LABEL, TODAY_ISO, formatDate, fullName } from "@/lib/format"
import { useStore } from "@/lib/store"
import type { Employee, LeaveRequest } from "@/lib/types"

/**
 * Who is out, today and over the week.
 *
 * The question a manager actually opens this page with, so it is the
 * first thing on it.
 */
export function WhosAway({
  scope,
  leave,
  onOpen,
}: {
  scope: Employee[]
  leave: LeaveRequest[]
  onOpen: (request: LeaveRequest) => void
}) {
  const store = useStore()
  const ids = new Set(scope.map((e) => e.id))
  const weekEnd = addDays(TODAY_ISO, 6)

  const approved = leave.filter(
    (l) => ids.has(l.employeeId) && l.status === "approved"
  )
  const today = approved.filter(
    (l) => l.startDate <= TODAY_ISO && l.endDate >= TODAY_ISO
  )
  const week = approved.filter(
    (l) => l.startDate <= weekEnd && l.endDate >= TODAY_ISO
  )

  return (
    <Tabs defaultValue="today" className="gap-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          tabs={[
            { value: "today", label: "Away today", count: today.length },
            { value: "week", label: "This week", count: week.length },
          ]}
        />
      </div>

      {(
        [
          ["today", today, "No one is on leave today."],
          ["week", week, "No one is on leave this week."],
        ] as const
      ).map(([value, list, empty]) => (
        <TabsContent key={value} value={value}>
          {list.length === 0 ? (
            <Panel bodyClassName="p-0">
              <EmptyState icon={Sun} title={empty} />
            </Panel>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((l) => {
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
        </TabsContent>
      ))}
    </Tabs>
  )
}
