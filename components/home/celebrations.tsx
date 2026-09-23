"use client"

import { Cake, PartyPopper } from "lucide-react"
import { toast } from "sonner"

import { Initials } from "@/components/common"
import { Widget, WidgetEmpty } from "./widget"
import { useStore } from "@/lib/store"
import { celebrationsFor, teamOf } from "@/lib/home/home-data"
import type { WidgetScope } from "@/lib/home/home-config"
import { formatDate, fullName } from "@/lib/format"

/** Birthdays and work anniversaries in the next seven days. */
export function Celebrations({ scope }: { scope?: WidgetScope }) {
  const store = useStore()
  const { session, employees } = store

  const people =
    scope === "team"
      ? [
          ...teamOf(employees, session.id),
          ...employees.filter((e) => e.id === session.id),
        ]
      : employees

  const items = celebrationsFor(people)

  return (
    <Widget title="Celebrations" weight="quiet" bodyClassName="p-0">
      {items.length === 0 ? (
        <WidgetEmpty>Nothing in the next seven days.</WidgetEmpty>
      ) : (
        <ul className="divide-y">
          {items.map((c) => (
            <li
              key={`${c.employee.id}-${c.kind}`}
              className="flex items-center gap-2.5 px-4 py-2.5"
            >
              <Initials person={c.employee} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {fullName(c.employee)}
                </p>
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  {c.kind === "birthday" ? (
                    <Cake className="size-3" />
                  ) : (
                    <PartyPopper className="size-3" />
                  )}
                  {c.kind === "birthday"
                    ? "Birthday"
                    : `${c.years} ${c.years === 1 ? "year" : "years"}`}
                  {" · "}
                  {c.daysAway === 0 ? "today" : formatDate(c.on)}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  toast.success(`Wishes sent to ${c.employee.firstName}`)
                }
                className="shrink-0 rounded-lg border px-2.5 py-1 text-xs transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Send wishes
              </button>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  )
}
