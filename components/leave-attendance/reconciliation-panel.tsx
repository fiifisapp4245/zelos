"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpRight, CheckCircle2, Scale } from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Initials, Panel, Pill } from "@/components/common"
import { RowActions } from "@/components/common/row-actions"
import { FilterToolbar } from "@/components/common/filter-bar"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  ACTION_LABEL,
  RECONCILE_EXPLAINER,
  RECONCILE_LABEL,
  SUGGESTED,
  isReconciled,
  type ReconcileItem,
  type ReconcileKind,
} from "@/lib/leave/reconcile"
import { leaveLink } from "@/lib/leave/links"
import { useStore } from "@/lib/store"
import { formatDate, formatDateTime, fullName } from "@/lib/format"
import type { Employee } from "@/lib/types"

const KINDS = Object.keys(RECONCILE_LABEL) as ReconcileKind[]

/**
 * Where attendance and leave disagree, and what to do about it.
 *
 * Reconciling records that somebody looked at the disagreement. It
 * never edits the capture or the request — if one of them is wrong, it
 * is corrected in the module that owns it, which is why every action
 * that changes leave leaves this page.
 */
export function ReconciliationPanel({
  items,
  scope,
}: {
  items: ReconcileItem[]
  scope: Employee[]
}) {
  const store = useStore()
  const [tab, setTab] = React.useState<"open" | "reconciled">("open")
  const [kind, setKind] = React.useState<string>("all")
  const [department, setDepartment] = React.useState<string>("all")

  const departments = [...new Set(scope.map((e) => e.department))].sort()
  const byId = new Map(scope.map((e) => [e.id, e]))

  const filtered = items
    .filter((i) => (kind === "all" ? true : i.kind === kind))
    .filter((i) =>
      department === "all"
        ? true
        : byId.get(i.employeeId)?.department === department
    )

  const open = filtered.filter((i) => !isReconciled(i, store.reconciliations))
  const done = filtered.filter((i) => isReconciled(i, store.reconciliations))
  const shown = tab === "open" ? open : done

  function act(item: ReconcileItem, action: string, label: string) {
    store.reconcile(
      item.key,
      action as Parameters<typeof store.reconcile>[1],
      label
    )
    toast.success(`${RECONCILE_LABEL[item.kind]} · ${label}`)
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as "open" | "reconciled")}
      className="gap-0"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          tabs={[
            { value: "open", label: "Open", count: open.length },
            { value: "reconciled", label: "Reconciled", count: done.length },
          ]}
        />
        <FilterToolbar
          fields={[
            {
              kind: "select",
              key: "kind",
              label: "Type",
              value: kind,
              allLabel: "All types",
              options: KINDS.map((k) => ({
                value: k,
                label: RECONCILE_LABEL[k],
              })),
            },
            {
              kind: "select",
              key: "department",
              label: "Department",
              value: department,
              allLabel: "All departments",
              options: departments.map((d) => ({ value: d, label: d })),
            },
          ]}
          onChange={(patch) => {
            if (typeof patch.kind === "string") setKind(patch.kind)
            if (typeof patch.department === "string")
              setDepartment(patch.department)
          }}
          onClear={() => {
            setKind("all")
            setDepartment("all")
          }}
        />
      </div>

      <TabsContent value={tab}>
        <Panel bodyClassName="p-0">
          {shown.length === 0 ? (
            <EmptyState
              icon={tab === "open" ? CheckCircle2 : Scale}
              title={
                tab === "open"
                  ? "Attendance and leave agree"
                  : "Nothing reconciled yet"
              }
              description={
                tab === "open"
                  ? "Every scheduled day in this period is either captured, covered by leave, or a holiday."
                  : "Mismatches you deal with are kept here with who dealt with them."
              }
            />
          ) : (
            <ul className="divide-y">
              {shown.map((item) => {
                const person = byId.get(item.employeeId)
                const record = store.reconciliations.find(
                  (r) => r.key === item.key
                )
                const suggestions = SUGGESTED[item.kind]
                const range =
                  item.dates.length === 1
                    ? formatDate(item.dates[0])
                    : `${formatDate(item.dates[0])} – ${formatDate(item.dates[item.dates.length - 1])} · ${item.dates.length} days`

                return (
                  <li
                    key={item.key}
                    className="flex flex-wrap items-start gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        {person && <Initials person={person} size="sm" />}
                        <Link
                          href={`/employees/${item.employeeId}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {fullName(person)}
                        </Link>
                        <Pill
                          tone={
                            item.kind === "clockedInOnLeave"
                              ? "warning"
                              : item.kind === "noRecordNoLeave"
                                ? "danger"
                                : "neutral"
                          }
                        >
                          {RECONCILE_LABEL[item.kind]}
                        </Pill>
                        <span className="tabular text-xs text-muted-foreground">
                          {range}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.explanation}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {RECONCILE_EXPLAINER[item.kind]}
                      </p>
                      {record && (
                        <p className="mt-1 text-xs text-primary">
                          {ACTION_LABEL[record.action]} by{" "}
                          {fullName(store.employeeById(record.by))} ·{" "}
                          {formatDateTime(record.at)}
                          {record.note && ` · “${record.note}”`}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {tab === "open" ? (
                        <>
                          {suggestions
                            .filter((s) => s.opensLeave)
                            .slice(0, 1)
                            .map((s) => (
                              <Button
                                key={s.action}
                                variant="outline"
                                size="sm"
                                className="h-8"
                                asChild
                              >
                                <Link
                                  href={
                                    item.leaveRequestId
                                      ? leaveLink.approval(item.leaveRequestId)
                                      : leaveLink.fileFor(
                                          item.employeeId,
                                          item.dates[0],
                                          item.dates[item.dates.length - 1]
                                        )
                                  }
                                >
                                  {s.label}
                                  <ArrowUpRight className="size-3.5" />
                                </Link>
                              </Button>
                            ))}
                          <RowActions
                            label={`Reconcile ${RECONCILE_LABEL[item.kind].toLowerCase()} for ${fullName(person)}`}
                            actions={suggestions.map((s) => ({
                              label: s.label,
                              onSelect: () =>
                                act(item, s.action, ACTION_LABEL[s.action]),
                            }))}
                          />
                        </>
                      ) : (
                        <RowActions
                          label={`Reopen ${RECONCILE_LABEL[item.kind].toLowerCase()} for ${fullName(person)}`}
                          actions={[
                            {
                              label: "Reopen",
                              onSelect: () => {
                                store.reopenReconciliation(item.key)
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
      </TabsContent>
    </Tabs>
  )
}
