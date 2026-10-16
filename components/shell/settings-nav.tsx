"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SETTINGS_NAV_GROUPS,
  type SettingsNavGroup,
} from "@/lib/nav/settings-nav"
import { cn } from "@/lib/utils"

/**
 * Settings navigation in two short steps instead of one long list: the
 * group, as tabs across the top, then the pages in that group beside the
 * content. Forty-odd entries in a single rail made every settings page
 * carry a second sidebar longer than the page itself.
 */

/** The group a settings page belongs to, by its address. */
export function groupFor(pathname: string): SettingsNavGroup {
  return (
    SETTINGS_NAV_GROUPS.find((g) => g.items.some((i) => i.href === pathname)) ??
    SETTINGS_NAV_GROUPS[0]
  )
}

/**
 * The six groups as text tabs, the current one underlined. Each opens its
 * group's first page. The rule beneath them is the container's.
 */
export function SettingsGroupTabs({ className }: { className?: string }) {
  const pathname = usePathname()
  const current = groupFor(pathname)

  return (
    <nav aria-label="Settings groups" className={className}>
      <ul className="-mb-px flex gap-7 overflow-x-auto">
        {SETTINGS_NAV_GROUPS.map((group) => {
          const active = group.id === current.id
          return (
            <li key={group.id} className="shrink-0">
              <Link
                href={group.items[0].href}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "block border-b-2 pt-1 pb-3 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "border-primary font-semibold text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {group.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * The pages of the current group: a plain list beside the content, the
 * current page on the brand's green pill, as in the main sidebar; a strip that scrolls sideways when narrow.
 */
export function SettingsGroupNav({ className }: { className?: string }) {
  const pathname = usePathname()
  const group = groupFor(pathname)
  const list = React.useRef<HTMLUListElement>(null)

  // On a narrow screen the list is a sideways strip; bring the current
  // page into view rather than leaving it past the edge.
  React.useEffect(() => {
    const ul = list.current
    if (!ul || ul.scrollWidth <= ul.clientWidth) return
    const active = ul.querySelector<HTMLElement>('[aria-current="page"]')
    if (active) ul.scrollLeft = Math.max(0, active.offsetLeft - 8)
  }, [pathname])

  return (
    <nav aria-label={`${group.label} settings`} className={className}>
      <ul
        ref={list}
        className="relative flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0"
      >
        {group.items.map((item) => {
          const active = pathname === item.href
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-3.5 py-2 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "bg-success-muted font-semibold text-primary"
                    : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
