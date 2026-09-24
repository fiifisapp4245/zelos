"use client"

import Link from "next/link"

import { Initials } from "@/components/common"
import { DayCodeCell, DAY_CODE_HINT, DAY_CODE_LABEL } from "./day-code"
import { formatHours } from "@/lib/attendance/derive"
import type { DayRecord } from "@/lib/attendance/types"
import { formatDate, fullName } from "@/lib/format"
import type { Employee } from "@/lib/types"
import { cn } from "@/lib/utils"

const DAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"]

/**
 * People down, days across. The first column and the header stay put while
 * the days scroll, and the scrolling happens inside this container so the
 * page itself never moves sideways.
 *
 * Every cell is a button: the code alone cannot carry a day's detail, so
 * the cell's accessible name says who, when and what, and opening it gives
 * the rest.
 */
export function RegisterGrid({
  scope,
  dates,
  records,
  onOpenDay,
}: {
  scope: Employee[]
  dates: string[]
  records: DayRecord[]
  onOpenDay: (record: DayRecord) => void
}) {
  const byPerson = new Map<string, DayRecord[]>()
  for (const r of records) {
    const list = byPerson.get(r.employeeId)
    if (list) list.push(r)
    else byPerson.set(r.employeeId, [r])
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <caption className="sr-only">
          Daily attendance register, {formatDate(dates[0])} to{" "}
          {formatDate(dates[dates.length - 1])}. Each cell is a button that
          opens the detail for that day.
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-20 border-b bg-card px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
            >
              Employee
            </th>
            {dates.map((d) => {
              const day = new Date(`${d}T00:00:00`)
              return (
                <th
                  key={d}
                  scope="col"
                  className="border-b bg-muted/40 px-1 py-2 text-center text-[11px] font-medium text-muted-foreground"
                >
                  <span className="block" aria-hidden>
                    {DAY_LETTER[day.getDay()]}
                  </span>
                  <span className="tabular block" aria-hidden>
                    {day.getDate()}
                  </span>
                  <span className="sr-only">{formatDate(d)}</span>
                </th>
              )
            })}
            <th
              scope="col"
              className="border-b bg-card px-4 py-2.5 text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
            >
              Hours
            </th>
          </tr>
        </thead>
        <tbody>
          {scope.map((e) => {
            const days = byPerson.get(e.id) ?? []
            const total = days.reduce((n, r) => n + r.hours, 0)
            return (
              <tr key={e.id} className="group">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b bg-card px-4 py-2 text-left font-normal group-hover:bg-muted/30"
                >
                  <Link
                    href={`/employees/${e.id}`}
                    className="flex min-w-0 items-center gap-2.5 rounded hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Initials person={e} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {fullName(e)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {e.department}
                      </span>
                    </span>
                  </Link>
                </th>

                {dates.map((d) => {
                  const r = days.find((x) => x.date === d)
                  if (!r) return <td key={d} className="border-b" />
                  return (
                    <td
                      key={d}
                      className="border-b px-1 py-2 text-center group-hover:bg-muted/30"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenDay(r)}
                        className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        aria-label={`${fullName(e)}, ${formatDate(d)}: ${DAY_CODE_LABEL[r.code]}. ${DAY_CODE_HINT[r.code]}.`}
                      >
                        <DayCodeCell code={r.code} />
                      </button>
                    </td>
                  )
                })}

                <td
                  className={cn(
                    "tabular border-b px-4 py-2 text-right font-medium group-hover:bg-muted/30"
                  )}
                >
                  {formatHours(total)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
