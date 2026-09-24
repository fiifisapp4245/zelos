"use client"

import Image from "next/image"
import Link from "next/link"

import { getQuickActions } from "@/lib/home/get-home-for-user"
import type { SessionContext } from "@/lib/session"
import { cn } from "@/lib/utils"

/**
 * The illustration and wash for each action, keyed by the icon name the nav
 * config already carries. Anything without artwork falls back to a plain
 * card rather than a broken image.
 */
const ART: Record<string, { src: string; wash: string; width: number }> = {
  userPlus: { src: "/add_employee.svg", wash: "bg-action-people", width: 155 },
  wallet: { src: "/run_payroll.svg", wash: "bg-action-pay", width: 160 },
  calendarDays: {
    src: "/record_leave.svg",
    wash: "bg-action-leave",
    width: 140,
  },
  chart: { src: "/generate_report.svg", wash: "bg-action-report", width: 151 },
  receipt: { src: "/run_payroll.svg", wash: "bg-action-pay", width: 160 },
  users: { src: "/add_employee.svg", wash: "bg-action-people", width: 155 },
  userRound: { src: "/add_employee.svg", wash: "bg-action-people", width: 155 },
  upload: { src: "/generate_report.svg", wash: "bg-action-report", width: 151 },
  clock: { src: "/record_leave.svg", wash: "bg-action-leave", width: 140 },
  check: { src: "/record_leave.svg", wash: "bg-action-leave", width: 140 },
}

const CARD = cn(
  "group relative flex h-[164px] overflow-hidden rounded-2xl p-5 text-left",
  // Tailwind v4 lifts with the standalone translate property, so
  // naming "transform" here would not transition it.
  "transition-[translate,box-shadow] duration-300 ease-out",
  "hover:shadow-lg motion-safe:hover:-translate-y-0.5",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
)

/**
 * The four things this role opens Home to do. The illustrations are flat
 * path soups with nothing named inside them, so the motion is applied to
 * each drawing as a whole — it lifts, grows and drifts on hover — rather
 * than animating parts that the files do not actually identify.
 */
export function QuickActions({ session }: { session: SessionContext }) {
  const actions = getQuickActions(session)

  return (
    <div
      role="group"
      aria-label="Quick actions"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {actions.map((a) => {
        const art = ART[a.icon]
        const inner = (
          <>
            <span className="relative z-10 text-[15px] font-semibold text-action-foreground">
              {a.label}
            </span>
            {art && (
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute right-0 -bottom-1 origin-bottom-right",
                  "transition-transform duration-500 ease-out",
                  "motion-safe:group-hover:-translate-x-1 motion-safe:group-hover:scale-110",
                  "motion-safe:group-hover:-rotate-1"
                )}
              >
                <Image
                  src={art.src}
                  alt=""
                  width={art.width}
                  height={102}
                  className="h-[102px] w-auto"
                  priority
                />
              </span>
            )}
          </>
        )

        const classes = cn(CARD, art?.wash ?? "border bg-card")

        if (a.href) {
          return (
            <Link key={a.label} href={a.href} className={classes}>
              {inner}
            </Link>
          )
        }
        return (
          <button
            key={a.label}
            type="button"
            className={classes}
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
