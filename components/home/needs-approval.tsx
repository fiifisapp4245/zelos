"use client"

import * as React from "react"
import { toast } from "sonner"

import { Widget, ViewAll, WidgetEmpty } from "./widget"
import { ApprovalRow } from "@/components/approvals/approval-row"
import { ApprovalDrawer } from "@/components/approvals/approval-drawer"
import { useStore } from "@/lib/store"
import { getApprovalsForUser } from "@/lib/approvals/selectors"
import { TYPE_LABEL } from "@/lib/approvals/approval-chains"
import type { WidgetScope } from "@/lib/home/home-config"
import { TODAY } from "@/lib/format"
import type { ApprovalItem, ApprovalModule } from "@/lib/approvals/types"
import { cn } from "@/lib/utils"

type Filter = ApprovalModule | "all"

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "leave", label: "Leave" },
  { id: "profile", label: "Pay details" },
  { id: "lifecycle", label: "Lifecycle" },
  { id: "documents", label: "Documents" },
]

/**
 * The first five of whatever is waiting, and the way in to the rest. It runs
 * the same getApprovalsForUser the Approvals page runs and renders the same
 * row, so the two can never disagree about the queue.
 */
export function NeedsApproval({ scope }: { scope?: WidgetScope }) {
  const store = useStore()
  const { session, approvals, employees } = store

  const [filter, setFilter] = React.useState<Filter>("all")
  const [open, setOpen] = React.useState<ApprovalItem | null>(null)
  // Rows leave on a short delay so the decision is visibly acknowledged.
  const [leaving, setLeaving] = React.useState<string[]>([])

  const queue = getApprovalsForUser(session, approvals, {
    tab: "waiting",
    employees,
    now: TODAY,
  })
  const shown = queue
    .filter((i) => filter === "all" || i.module === filter)
    .filter((i) => !leaving.includes(i.id))
    .slice(0, 5)

  function decide(
    item: ApprovalItem,
    action: "approve" | "decline" | "verify" | "reject",
    note?: string
  ) {
    setLeaving((l) => [...l, item.id])
    setOpen(null)
    window.setTimeout(() => {
      store.decideApproval(item.id, action, note)
      toast.success(`${TYPE_LABEL[item.type]} ${action}d`)
    }, 220)
  }

  // Payroll only ever sees pay details, so the chips would be one chip.
  const showFilters = scope !== "payDetails"

  return (
    <>
      <Widget
        id="needs-approval"
        title="Needs your approval"
        count={queue.length}
        weight="primary"
        actions={
          queue.length > 0 && <ViewAll href="/approvals" count={queue.length} />
        }
        bodyClassName="flex flex-col p-0"
      >
        {showFilters && (
          <div
            role="group"
            aria-label="Filter by module"
            className="flex shrink-0 flex-wrap gap-1.5 border-b px-5 py-3"
          >
            {FILTERS.map((f) => {
              const n =
                f.id === "all"
                  ? queue.length
                  : queue.filter((i) => i.module === f.id).length
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    filter === f.id
                      ? "border-primary bg-success-muted font-medium text-primary"
                      : "text-muted-foreground hover:border-ring/50 hover:text-foreground"
                  )}
                >
                  {f.label}
                  {n > 0 && (
                    <span className="tabular ml-1.5 opacity-60">{n}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {shown.length === 0 ? (
          <WidgetEmpty>All caught up. Nothing is waiting on you.</WidgetEmpty>
        ) : (
          <ul className="divide-y">
            {shown.map((item) => (
              <ApprovalRow
                key={item.id}
                item={item}
                compact
                onOpen={() => setOpen(item)}
              />
            ))}
          </ul>
        )}
      </Widget>

      <ApprovalDrawer
        item={open}
        onClose={() => setOpen(null)}
        onDecide={decide}
      />
    </>
  )
}
