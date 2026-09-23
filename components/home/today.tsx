"use client"

import Link from "next/link"

import { Initials } from "@/components/common"
import { Widget } from "./widget"
import { useStore } from "@/lib/store"
import { outToday, teamOf } from "@/lib/home/home-data"
import { holidaysBetween } from "@/lib/fixtures/ghanaHolidays"
import type { WidgetScope } from "@/lib/home/home-config"
import {
  LEAVE_TYPE_LABEL,
  TODAY,
  TODAY_ISO,
  formatDate,
  fullName,
} from "@/lib/format"

/** Ambient context: who is missing, and what is coming in the next fortnight. */
export function Today({ scope }: { scope?: WidgetScope }) {
  const store = useStore()
  const { session, employees, leaveRequests } = store

  const people =
    scope === "team"
      ? [
          ...teamOf(employees, session.id),
          ...employees.filter((e) => e.id === session.id),
        ]
      : employees

  const away = outToday(people, leaveRequests)

  const fortnight = new Date(TODAY)
  fortnight.setDate(fortnight.getDate() + 14)
  const holidays = holidaysBetween(
    TODAY_ISO,
    fortnight.toISOString().slice(0, 10)
  )

  return (
    <Widget
      title="Today"
      weight="quiet"
      description={new Date(TODAY_ISO).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {scope === "team" ? "Team out today" : "Out today"}
            <span className="tabular ml-1.5 opacity-60">{away.length}</span>
          </h3>
          {away.length === 0 ? (
            <p className="mt-1.5 text-sm text-muted-foreground">
              Everyone is in.
            </p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {away.map(({ employee, type, until }) => (
                <li key={employee.id}>
                  <Link
                    href={`/employees/${employee.id}`}
                    title={`${fullName(employee)} — ${LEAVE_TYPE_LABEL[type]} until ${formatDate(until)}`}
                    className="block rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Initials person={employee} size="sm" />
                    <span className="sr-only">
                      {fullName(employee)}, {LEAVE_TYPE_LABEL[type]} until{" "}
                      {formatDate(until)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t pt-3">
          <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Public holidays
          </h3>
          {holidays.length === 0 ? (
            <p className="mt-1.5 text-sm text-muted-foreground">
              None in the next 14 days.
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {holidays.map((h) => (
                <li key={h.date} className="flex justify-between gap-3 text-sm">
                  <span className="truncate">{h.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(h.date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Widget>
  )
}
