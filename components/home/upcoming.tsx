"use client"

import Link from "next/link"

import { Widget } from "./widget"
import { useStore } from "@/lib/store"
import { STATUTORY_CALENDAR } from "@/lib/fixtures/statutoryCalendar"
import { TODAY, TODAY_ISO, daysUntil, formatDate, fullName } from "@/lib/format"
import { cn } from "@/lib/utils"

/** The dated obligations: the pay run, the filings, who is arriving. */
export function Upcoming() {
  const store = useStore()

  const deadlines = STATUTORY_CALENDAR.filter((d) => {
    const left = daysUntil(d.dueOn)
    return left !== null && left >= -7 && left <= 45
  }).sort((a, b) => a.dueOn.localeCompare(b.dueOn))

  const run = deadlines.find((d) => d.authority === "Internal")
  const filings = deadlines.filter((d) => d.authority !== "Internal")

  const weekEnd = new Date(TODAY)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const starters = store.employees.filter(
    (e) =>
      e.startDate >= TODAY_ISO &&
      e.startDate <= weekEnd.toISOString().slice(0, 10)
  )

  const openCycles = new Set(
    store.reviews.filter((r) => r.status !== "complete").map((r) => r.cycle)
  )

  return (
    <Widget title="Upcoming" weight="quiet">
      <div className="space-y-4">
        {run && (
          <div className="rounded-lg border bg-success-muted/50 px-3 py-2.5">
            <p className="text-[11px] font-medium tracking-wide text-primary uppercase">
              Next payroll run
            </p>
            <p className="mt-0.5 text-sm font-medium">
              {formatDate(run.dueOn)}
              <span className="tabular ml-1.5 text-muted-foreground">
                in {daysUntil(run.dueOn)} days
              </span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{run.detail}</p>
          </div>
        )}

        <div>
          <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Statutory deadlines
          </h3>
          <ul className="mt-1.5 space-y-1.5">
            {filings.map((d) => {
              const left = daysUntil(d.dueOn) ?? 0
              return (
                <li
                  key={d.id}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{d.label}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {d.authority}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs whitespace-nowrap",
                      left < 0
                        ? "font-medium text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {formatDate(d.dueOn)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="border-t pt-3">
          <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Starting this week
          </h3>
          {starters.length === 0 ? (
            <p className="mt-1.5 text-sm text-muted-foreground">Nobody.</p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {starters.map((e) => (
                <li key={e.id} className="flex justify-between gap-3 text-sm">
                  <Link
                    href={`/employees/${e.id}`}
                    className="truncate rounded hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {fullName(e)}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(e.startDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {openCycles.size > 0 && (
          <div className="border-t pt-3">
            <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Review cycles open
            </h3>
            <p className="mt-1.5 text-sm">
              {[...openCycles].join(", ")} ·{" "}
              <Link
                href="/performance"
                className="rounded font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Open performance
              </Link>
            </p>
          </div>
        )}
      </div>
    </Widget>
  )
}
