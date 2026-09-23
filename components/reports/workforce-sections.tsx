"use client"

import Link from "next/link"
import {
  CalendarClock,
  TrendingUp,
  UserPlus,
  type LucideIcon,
} from "lucide-react"

import { Panel } from "@/components/common"
import { useStore } from "@/lib/store"
import {
  approachingRetirement,
  headcountByDepartment,
  visibleEmployees,
} from "@/lib/selectors"
import { TODAY_ISO, daysUntil, formatDate, fullName } from "@/lib/format"
import type { Employee } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Headcount and movement used to sit on the overview. Home now carries one
 * metric row and no charts, so the breakdowns live here, where someone has
 * come looking for them.
 */
export function HeadcountByDepartment() {
  const { viewer, employees } = useStore()
  const scope = visibleEmployees(viewer, employees)
  const rows = headcountByDepartment(scope)
  const max = rows[0]?.count || 1

  return (
    <Panel
      title="Headcount by department"
      description="People on strength, largest first."
      bodyClassName="px-5 py-4"
    >
      <ul className="space-y-3">
        {rows.map((d) => (
          <li key={d.name}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="truncate">{d.name}</span>
              <span className="tabular text-muted-foreground">{d.count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(d.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export function Movement() {
  const { viewer, employees } = useStore()
  const scope = visibleEmployees(viewer, employees)

  const startingSoon = scope.filter(
    (e) => e.startDate >= TODAY_ISO && (daysUntil(e.startDate) ?? 0) <= 30
  )
  const leaving = scope.filter((e) => e.lifecycleState === "notice")
  const retiring = approachingRetirement(scope)

  return (
    <Panel
      title="Movement"
      description="Who is arriving, leaving and reaching retirement."
      bodyClassName="px-5 py-4"
    >
      <ul className="space-y-3 text-sm">
        <MovementRow
          icon={UserPlus}
          tone="info"
          label="Joining"
          people={startingSoon}
          dateOf={(e) => e.startDate}
          href="/onboarding"
        />
        <MovementRow
          icon={CalendarClock}
          tone="warning"
          label="Serving notice"
          people={leaving}
          dateOf={(e) => e.contractEndDate ?? e.startDate}
          href="/offboarding"
        />
        <MovementRow
          icon={TrendingUp}
          tone="neutral"
          label="Retiring within a year"
          people={retiring.map((r) => r.employee)}
          dateOf={(e) =>
            retiring.find((r) => r.employee.id === e.id)?.retireOn ??
            e.startDate
          }
          href="/offboarding"
        />
      </ul>
    </Panel>
  )
}

function MovementRow({
  icon: Icon,
  tone,
  label,
  people,
  dateOf,
  href,
}: {
  icon: LucideIcon
  tone: "info" | "warning" | "neutral"
  label: string
  people: Employee[]
  dateOf: (e: Employee) => string
  href: string
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg",
          tone === "info" && "bg-info-muted text-info",
          tone === "warning" && "bg-warning-muted text-warning-foreground",
          tone === "neutral" && "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {label}{" "}
          <span className="tabular text-muted-foreground">
            ({people.length})
          </span>
        </p>
        {people.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nobody right now.</p>
        ) : (
          <ul className="mt-0.5 space-y-0.5">
            {people.slice(0, 4).map((p) => (
              <li key={p.id} className="truncate text-xs text-muted-foreground">
                <Link
                  href={href}
                  className="rounded hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {fullName(p)} · {formatDate(dateOf(p))}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}
