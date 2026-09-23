"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { SETTINGS_NAV_GROUPS } from "@/lib/nav/settings-nav"
import { cn } from "@/lib/utils"

/**
 * Navigation for the Settings area, rendered inside it rather than in the
 * main sidebar. Every entry points at a screen that already exists.
 */
export function SettingsNav({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Settings"
      className={cn("rounded-xl border bg-card p-2", className)}
    >
      {SETTINGS_NAV_GROUPS.map((group) => {
        const headingId = `settings-nav-${group.id}`
        return (
          <div key={group.id} className="mb-1 last:mb-0">
            <p
              id={headingId}
              className="flex items-center gap-2 px-2.5 pt-3 pb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground"
            >
              <group.icon className="size-3.5" />
              {group.label}
            </p>
            <ul className="space-y-0.5" aria-labelledby={headingId}>
              {group.items.map((item) => {
                const active = pathname === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block truncate rounded-lg px-2.5 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        active
                          ? "bg-success-muted font-medium text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}
