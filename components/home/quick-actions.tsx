"use client"

import Link from "next/link"
import {
  CalendarDays,
  ChartColumn,
  Check,
  Clock,
  Receipt,
  Upload,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { getQuickActions } from "@/lib/home/get-home-for-user"
import type { SessionContext } from "@/lib/session"
import { cn } from "@/lib/utils"

const ICONS: Record<string, LucideIcon> = {
  userPlus: UserPlus,
  wallet: Wallet,
  calendarDays: CalendarDays,
  chart: ChartColumn,
  users: Users,
  check: Check,
  clock: Clock,
  userRound: UserRound,
  upload: Upload,
  receipt: Receipt,
}

const CHIP = cn(
  "flex items-center gap-2 rounded-full border bg-card px-3.5 py-2 text-sm",
  "transition-colors hover:bg-muted",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
)

/** Four at most: past that a shortcut row is just a menu. */
export function QuickActions({ session }: { session: SessionContext }) {
  const actions = getQuickActions(session)

  return (
    <div
      role="group"
      aria-label="Quick actions"
      className="flex flex-wrap items-center gap-2"
    >
      {actions.map((a) => {
        const Icon = ICONS[a.icon] ?? Check
        if (a.href) {
          return (
            <Link key={a.label} href={a.href} className={CHIP}>
              <Icon className="size-4 text-muted-foreground" />
              {a.label}
            </Link>
          )
        }
        return (
          <button
            key={a.label}
            type="button"
            className={CHIP}
            onClick={() => {
              const target = document.getElementById(a.scrollTo!)
              target?.scrollIntoView({ behavior: "smooth", block: "start" })
              // Move focus too, so the keyboard follows the scroll.
              target?.querySelector<HTMLElement>("button, a")?.focus()
            }}
          >
            <Icon className="size-4 text-muted-foreground" />
            {a.label}
          </button>
        )
      })}
    </div>
  )
}
