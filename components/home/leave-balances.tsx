"use client"

import { Widget, WidgetEmpty } from "./widget"
import { useStore } from "@/lib/store"
import { LEAVE_TYPE_LABEL } from "@/lib/format"

/** Days remaining against entitlement, one tile per type. */
export function LeaveBalances() {
  const store = useStore()
  const balance = store.leaveBalances.find(
    (b) => b.employeeId === store.session.id
  )
  const tiles = (balance?.byType ?? []).filter((t) => t.entitlement > 0)

  return (
    <Widget title="Leave balances">
      {tiles.length === 0 ? (
        <WidgetEmpty>No entitlements recorded yet.</WidgetEmpty>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => {
            const remaining = t.entitlement - t.taken
            const pct = Math.max(
              0,
              Math.min(100, (remaining / t.entitlement) * 100)
            )
            return (
              <div key={t.type} className="rounded-lg border px-3 py-2.5">
                <dt className="truncate text-xs text-muted-foreground">
                  {LEAVE_TYPE_LABEL[t.type]}
                </dt>
                <dd>
                  <span className="tabular text-lg leading-tight font-semibold">
                    {remaining}
                  </span>
                  <span className="tabular text-xs text-muted-foreground">
                    {" "}
                    / {t.entitlement} days
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  {t.pending > 0 && (
                    <span className="mt-1 block text-[11px] text-warning-foreground">
                      {t.pending} pending approval
                    </span>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      )}
    </Widget>
  )
}
