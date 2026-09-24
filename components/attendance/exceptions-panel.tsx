"use client"

import * as React from "react"
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileQuestion,
  LogOut,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Initials, Panel, Pill } from "@/components/common"
import { RowActions } from "@/components/common/row-actions"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs } from "@/components/ui/tabs"
import {
  EXCEPTION_LABEL,
  exceptionsFrom,
  groupExceptions,
  isResolved,
  summariseGroups,
  type ExceptionItem,
} from "@/lib/attendance/derive"
import type { DayRecord, ExceptionKind } from "@/lib/attendance/types"
import { useStore } from "@/lib/store"
import { formatDate, formatDateTime, fullName } from "@/lib/format"
import { cn } from "@/lib/utils"

const ICON: Record<ExceptionKind, LucideIcon> = {
  noRecord: FileQuestion,
  late: Clock,
  autoClosed: LogOut,
  outsideSchedule: CalendarDays,
}

/**
 * A queue rather than a list. Four late days for one person is one line
 * that says "late 4×", because the thing worth acting on is the pattern,
 * not each row of it.
 *
 * Resolving records who did it and when. It never removes the underlying
 * capture — the day still reads exactly as the clock saw it.
 */
export function ExceptionsPanel({ records }: { records: DayRecord[] }) {
  const store = useStore()
  const [tab, setTab] = React.useState<"open" | "resolved">("open")

  const all = exceptionsFrom(records)
  const open = all.filter((i) => !isResolved(i, store.exceptionResolutions))
  const resolved = all.filter((i) => isResolved(i, store.exceptionResolutions))
  const shown = tab === "open" ? open : resolved
  const groups = groupExceptions(shown)

  function resolve(
    items: ExceptionItem[],
    action: "linkedToLeave" | "noted" | "correctionRequested",
    label: string
  ) {
    for (const i of items) store.resolveException(i.key, action, label)
    toast.success(
      `${items.length} ${items.length === 1 ? "exception" : "exceptions"} resolved · ${label}`
    )
  }

  return (
    <Panel
      description="Grouped by what happened, then by person, so a repeated pattern reads as one line."
      bodyClassName="p-0"
      actions={
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "open" | "resolved")}
        >
          <SegmentedTabs
            tabs={[
              { value: "open", label: "Open", count: open.length },
              {
                value: "resolved",
                label: "Resolved",
                count: resolved.length,
              },
            ]}
          />
        </Tabs>
      }
    >
      {groups.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={
            tab === "open"
              ? "Nothing needs attention"
              : "Nothing has been resolved yet"
          }
          description={
            tab === "open"
              ? "Days with no record, late arrivals and auto-closed days appear here as they occur."
              : "Exceptions you resolve are kept here with who resolved them."
          }
        />
      ) : (
        <ul className="divide-y">
          {groups.map((g) => {
            const Icon = ICON[g.kind]
            const employee = store.employeeById(g.employeeId)
            if (!employee) return null
            const resolution =
              tab === "resolved"
                ? store.exceptionResolutions.find(
                    (r) => r.key === g.items[0].key
                  )
                : undefined

            return (
              <li
                key={`${g.kind}:${g.employeeId}`}
                className="flex flex-wrap items-start gap-3 px-5 py-3.5"
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
                    g.kind === "noRecord"
                      ? "bg-danger-muted text-destructive"
                      : "bg-warning-muted text-warning-foreground"
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <Initials person={employee} size="sm" />
                    <span className="text-sm font-medium">
                      {fullName(employee)}
                    </span>
                    {/* Icon plus text, never the icon on its own. */}
                    <Pill tone={g.kind === "noRecord" ? "danger" : "warning"}>
                      <AlertTriangle className="size-3" aria-hidden />
                      {EXCEPTION_LABEL[g.kind]}
                    </Pill>
                    <span className="tabular text-xs text-muted-foreground">
                      {summariseGroups([g])}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {g.items
                      .slice(0, 4)
                      .map((i) => formatDate(i.date))
                      .join(" · ")}
                    {g.items.length > 4 && ` · +${g.items.length - 4} more`}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {g.items[0].detail}
                  </p>
                  {resolution && (
                    <p className="mt-1 text-xs text-primary">
                      Resolved by{" "}
                      {fullName(store.employeeById(resolution.resolvedBy))} ·{" "}
                      {formatDateTime(resolution.resolvedAt)}
                      {resolution.note && ` · “${resolution.note}”`}
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  {tab === "open" ? (
                    <RowActions
                      label={`Resolve ${EXCEPTION_LABEL[g.kind].toLowerCase()} for ${fullName(employee)}`}
                      actions={[
                        {
                          label: "Link to leave",
                          onSelect: () =>
                            resolve(
                              g.items,
                              "linkedToLeave",
                              "Linked to leave"
                            ),
                        },
                        {
                          label: "Add note",
                          onSelect: () => resolve(g.items, "noted", "Noted"),
                        },
                        {
                          label: "Request correction",
                          onSelect: () =>
                            resolve(
                              g.items,
                              "correctionRequested",
                              "Correction requested"
                            ),
                        },
                      ]}
                    />
                  ) : (
                    <RowActions
                      label={`Reopen ${EXCEPTION_LABEL[g.kind].toLowerCase()} for ${fullName(employee)}`}
                      actions={[
                        {
                          label: "Reopen",
                          onSelect: () => {
                            for (const i of g.items)
                              store.reopenException(i.key)
                            toast.success("Reopened")
                          },
                        },
                      ]}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
