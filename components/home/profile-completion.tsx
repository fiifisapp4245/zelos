"use client"

import Link from "next/link"

import { Widget } from "./widget"
import { useStore } from "@/lib/store"
import { completeness } from "@/lib/selectors"

/** Only rendered while there is something missing. */
export function ProfileCompletion() {
  const store = useStore()
  const me = store.employeeById(store.session.id)
  if (!me) return null

  const record = completeness(me)
  if (record.percent >= 100) return null

  return (
    <Widget title="Your profile" weight="quiet">
      <div className="flex items-baseline justify-between gap-3">
        <span className="tabular text-2xl leading-tight font-semibold">
          {record.percent}%
        </span>
        <span className="text-xs text-muted-foreground">complete</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={record.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completion"
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${record.percent}%` }}
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">Still needed</p>
      <ul className="mt-1 space-y-0.5">
        {record.missing.map((f) => (
          <li key={f} className="text-sm">
            {f}
          </li>
        ))}
      </ul>

      <Link
        href="/me/profile"
        className="mt-3 inline-block rounded text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Complete profile
      </Link>
    </Widget>
  )
}
