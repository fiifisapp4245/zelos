"use client"

import Link from "next/link"

import { Initials } from "@/components/common"
import { ViewAll, Widget, WidgetEmpty } from "./widget"
import { useStore } from "@/lib/store"
import {
  attentionItemsFor,
  bucketFor,
  type AttentionBucket,
  type AttentionItem,
} from "@/lib/home/home-data"
import type { WidgetScope } from "@/lib/home/home-config"
import { formatDate, fullName } from "@/lib/format"
import { cn } from "@/lib/utils"

const BUCKETS: AttentionBucket[] = ["Overdue", "This week", "Later"]

/** Records that will become a problem if nobody touches them. */
export function NeedsAttention({ scope }: { scope?: WidgetScope }) {
  const store = useStore()
  const {
    session,
    employees,
    documents,
    actingAssignments,
    reviews,
    approvals,
  } = store

  const items = attentionItemsFor({
    scope,
    viewerId: session.id,
    employees,
    documents,
    acting: actingAssignments,
    reviews,
    approvals,
  })

  const grouped = BUCKETS.map((b) => ({
    bucket: b,
    rows: items.filter((i) => bucketFor(i) === b),
  })).filter((g) => g.rows.length > 0)

  /**
   * These are not approvals, so "View more" cannot point at /approvals. It
   * goes wherever the items in that scope are actually worked: compliance
   * alerts for HR, the pay run for payroll, the team for a manager.
   */
  const more =
    scope === "payroll"
      ? { href: "/pay/payroll", label: "Open payroll" }
      : scope === "team"
        ? { href: "/team", label: "View team" }
        : { href: "/alerts", label: "View more" }

  return (
    <Widget
      title="Needs attention"
      count={items.length}
      fills
      actions={<ViewAll href={more.href} label={more.label} />}
      bodyClassName="min-h-0 p-0"
    >
      {items.length === 0 ? (
        <WidgetEmpty>No records need attention.</WidgetEmpty>
      ) : (
        <div className="divide-y">
          {grouped.map((group) => (
            <div key={group.bucket}>
              <h3
                className={cn(
                  "px-5 pt-3 pb-1.5 text-[11px] font-medium tracking-wide uppercase",
                  group.bucket === "Overdue"
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {group.bucket}
                <span className="tabular ml-1.5 opacity-60">
                  {group.rows.length}
                </span>
              </h3>
              <ul>
                {group.rows.slice(0, 6).map((item) => (
                  <Row key={item.id} item={item} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Widget>
  )
}

function Row({ item }: { item: AttentionItem }) {
  const overdue = item.daysLeft !== null && item.daysLeft < 0

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <Initials person={item.employee} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {fullName(item.employee)}
        </p>
        <p className="truncate text-xs text-muted-foreground">{item.issue}</p>
      </div>
      {item.dueOn && (
        <span
          className={cn(
            "shrink-0 text-xs whitespace-nowrap",
            overdue ? "font-medium text-destructive" : "text-muted-foreground"
          )}
        >
          {formatDate(item.dueOn)}
          <span className="block text-right opacity-70">
            {relative(item.daysLeft!)}
          </span>
        </span>
      )}
      <Link
        href={item.href}
        className="shrink-0 rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {item.actionLabel}
      </Link>
    </li>
  )
}

function relative(days: number) {
  if (days < 0) return `${Math.abs(days)}d ago`
  if (days === 0) return "today"
  return `in ${days}d`
}
