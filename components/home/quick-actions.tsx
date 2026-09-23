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

/**
 * One gradient family, built from the primary green and stepped in strength
 * across the row. It reads as a set rather than four unrelated tiles, and
 * introduces no colour the theme does not already have.
 */
const GRADIENTS = [
  "from-primary/14 via-primary/5 to-card",
  "from-primary/11 via-primary/4 to-card",
  "from-primary/8 via-primary/3 to-card",
  "from-primary/5 via-primary/2 to-card",
]

const CARD = cn(
  "group flex items-center gap-3 rounded-xl border bg-gradient-to-br px-4 py-3.5 text-left text-sm font-medium",
  "transition-colors hover:border-primary/40",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
)

/** Four at most: past that a shortcut row is just a menu. */
export function QuickActions({ session }: { session: SessionContext }) {
  const actions = getQuickActions(session)

  return (
    <div
      role="group"
      aria-label="Quick actions"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {actions.map((a, i) => {
        const Icon = ICONS[a.icon] ?? Check
        const inner = (
          <>
            {/* White, bordered, flat — the border does the separating, so
                no shadow. */}
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-card text-foreground">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 truncate">{a.label}</span>
          </>
        )

        if (a.href) {
          return (
            <Link
              key={a.label}
              href={a.href}
              className={cn(CARD, GRADIENTS[i % GRADIENTS.length])}
            >
              {inner}
            </Link>
          )
        }

        return (
          <button
            key={a.label}
            type="button"
            className={cn(CARD, GRADIENTS[i % GRADIENTS.length])}
            onClick={() => {
              const target = document.getElementById(a.scrollTo!)
              target?.scrollIntoView({ behavior: "smooth", block: "start" })
              // Move focus too, so the keyboard follows the scroll.
              target?.querySelector<HTMLElement>("button, a")?.focus()
            }}
          >
            {inner}
          </button>
        )
      })}
    </div>
  )
}
