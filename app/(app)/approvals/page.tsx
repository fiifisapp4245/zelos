"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ClipboardCheck } from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, PageHeader } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { WidgetSkeleton } from "@/components/home/skeletons"
import { ApprovalRow } from "@/components/approvals/approval-row"
import { ApprovalDrawer } from "@/components/approvals/approval-drawer"
import { BulkBar } from "@/components/approvals/bulk-bar"
import {
  ApprovalFiltersBar,
  hasAnyFilter,
} from "@/components/approvals/filters"
import { useStore } from "@/lib/store"
import { resolveAudience } from "@/lib/nav/get-nav-for-user"
import {
  getApprovalsForUser,
  type ApprovalTab,
} from "@/lib/approvals/selectors"
import { TYPE_LABEL, canBulkApprove } from "@/lib/approvals/approval-chains"
import type { ApprovalFilters } from "@/lib/approvals/selectors"
import type {
  ApprovalItem,
  ApprovalModule,
  ApprovalType,
  DecisionAction,
} from "@/lib/approvals/types"
import { TODAY } from "@/lib/format"
import { cn } from "@/lib/utils"

const TABS: { id: ApprovalTab; label: string }[] = [
  { id: "waiting", label: "Waiting on me" },
  { id: "inProgress", label: "In progress" },
  { id: "completed", label: "Completed" },
]

const EMPTY: Record<ApprovalTab, string> = {
  waiting: "All caught up. Nothing is waiting on you.",
  inProgress: "Nothing you've approved is still in progress.",
  completed: "Decisions you make will appear here.",
}

export default function ApprovalsPage() {
  return (
    <React.Suspense fallback={null}>
      <Approvals />
    </React.Suspense>
  )
}

function Approvals() {
  const store = useStore()
  const router = useRouter()
  const params = useSearchParams()
  const { session, approvals, employees } = store

  const audience = resolveAudience(session)
  const isEmployee = audience === "employee"

  // Employees have no approvals at all, so they are sent home rather than
  // shown an empty page. A production build needs a server-side or
  // middleware guard as well — this one only protects the view.
  React.useEffect(() => {
    if (isEmployee) router.replace("/overview")
  }, [isEmployee, router])

  const demo = params.get("demo")
  const tab = (params.get("tab") as ApprovalTab) || "waiting"

  const filters: ApprovalFilters = React.useMemo(
    () => ({
      module: (params.get("module") as ApprovalModule) || "all",
      type: (params.get("type") as ApprovalType) || "all",
      requester: params.get("requester") || "all",
      unit: params.get("unit") || "all",
      from: params.get("from") || undefined,
      to: params.get("to") || undefined,
      overdueOnly: params.get("overdue") === "1",
    }),
    [params]
  )

  /** Filters live in the URL, so a filtered queue can be shared or reloaded. */
  function pushQuery(next: Partial<Record<string, string | undefined>>) {
    const q = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "all") q.delete(k)
      else q.set(k, v)
    }
    router.replace(`/approvals${q.size ? `?${q}` : ""}`, { scroll: false })
  }

  const [selected, setSelected] = React.useState<string[]>([])
  const [open, setOpen] = React.useState<ApprovalItem | null>(null)
  // State, not a ref: the drawer reads it while rendering to know where to
  // put focus back.
  const [openedFrom, setOpenedFrom] = React.useState<HTMLElement | null>(null)

  // Nothing is fetched for an employee, so nothing flashes before the
  // redirect lands.
  const pool = isEmployee || demo === "empty" ? [] : approvals

  const unfiltered = getApprovalsForUser(session, pool, {
    tab,
    employees,
    now: TODAY,
  })
  const items = getApprovalsForUser(session, pool, {
    tab,
    filters,
    employees,
    now: TODAY,
  })

  const waitingCount = getApprovalsForUser(session, pool, {
    tab: "waiting",
    employees,
    now: TODAY,
  }).length

  const eligible = items.filter((i) => canBulkApprove(i.type))
  const allEligibleSelected =
    eligible.length > 0 && eligible.every((i) => selected.includes(i.id))

  function closeDrawer() {
    setOpen(null)
  }

  function decide(item: ApprovalItem, action: DecisionAction, note?: string) {
    store.decideApproval(item.id, action, note)
    setSelected((s) => s.filter((id) => id !== item.id))
    closeDrawer()
    toast.success(`${TYPE_LABEL[item.type]} ${action}d`)
  }

  function decideBulk(action: "approve" | "decline", note?: string) {
    const n = selected.length
    store.decideApprovals(selected, action, note)
    setSelected([])
    toast.success(`${n} request${n === 1 ? "" : "s"} ${action}d`)
  }

  if (isEmployee) return null

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Approvals" },
      ]}
    >
      <PageHeader
        title="Approvals"
        description="Requests other people raised where you are the next approver. Things you have to do yourself live on Home under Needs attention."
        meta={
          <span className="text-sm text-muted-foreground">
            <strong className="tabular font-semibold text-foreground">
              {waitingCount}
            </strong>{" "}
            waiting on you
          </span>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-1 rounded-xl border bg-card p-1">
        {TABS.map((t) => {
          const n = getApprovalsForUser(session, pool, {
            tab: t.id,
            employees,
            now: TODAY,
          }).length
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSelected([])
                pushQuery({ tab: t.id === "waiting" ? undefined : t.id })
              }}
              aria-current={tab === t.id ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                tab === t.id
                  ? "bg-success-muted font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {t.label}
              <span
                className={cn(
                  "tabular rounded-full px-1.5 text-xs",
                  tab === t.id
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {n}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mb-4">
        <ApprovalFiltersBar
          items={unfiltered}
          filters={filters}
          onChange={(f) =>
            pushQuery({
              module: f.module,
              type: f.type,
              requester: f.requester,
              unit: f.unit,
              from: f.from,
              to: f.to,
              overdue: f.overdueOnly ? "1" : undefined,
            })
          }
          onClear={() =>
            router.replace(
              `/approvals${tab === "waiting" ? "" : `?tab=${tab}`}`,
              { scroll: false }
            )
          }
        />
      </div>

      {demo === "loading" ? (
        <div className="space-y-4">
          <WidgetSkeleton rows={4} />
          <WidgetSkeleton rows={3} />
        </div>
      ) : (
        <section
          aria-label={`${TABS.find((t) => t.id === tab)?.label} approvals`}
          className="rounded-xl border bg-card"
        >
          {items.length === 0 ? (
            hasAnyFilter(filters) ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No approvals match these filters"
                description="Widen the range, or clear the filters to see the whole queue."
                action={
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.replace(
                        `/approvals${tab === "waiting" ? "" : `?tab=${tab}`}`,
                        { scroll: false }
                      )
                    }
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState icon={ClipboardCheck} title={EMPTY[tab]} />
            )
          ) : (
            <>
              {tab === "waiting" && eligible.length > 0 && (
                <div className="flex items-center gap-3 border-b px-4 py-2.5 md:px-5">
                  <span className="flex w-8 shrink-0 justify-center">
                    <Checkbox
                      checked={allEligibleSelected}
                      onCheckedChange={(v) =>
                        setSelected(v === true ? eligible.map((i) => i.id) : [])
                      }
                      aria-label={`Select all ${eligible.length} eligible`}
                    />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Select all {eligible.length} eligible
                    {eligible.length !== items.length && (
                      <>
                        {" "}
                        · {items.length - eligible.length} decided individually
                      </>
                    )}
                  </span>
                </div>
              )}

              <ul className="divide-y">
                {items.map((item) => (
                  <ApprovalRow
                    key={item.id}
                    item={item}
                    selected={selected.includes(item.id)}
                    onSelect={
                      tab === "waiting"
                        ? (next) =>
                            setSelected((s) =>
                              next
                                ? [...s, item.id]
                                : s.filter((id) => id !== item.id)
                            )
                        : undefined
                    }
                    onQuickDecide={
                      tab === "waiting"
                        ? (action) => decide(item, action)
                        : undefined
                    }
                    onOpen={(el) => {
                      setOpenedFrom(el)
                      setOpen(item)
                    }}
                  />
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {tab === "waiting" && (
        <BulkBar
          count={selected.length}
          onClear={() => setSelected([])}
          onDecide={decideBulk}
        />
      )}

      <ApprovalDrawer
        item={open}
        onClose={closeDrawer}
        onDecide={decide}
        returnFocusTo={openedFrom}
      />
    </PageShell>
  )
}
