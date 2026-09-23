"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PanelLeftClose, PanelLeftOpen, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { getNavForUser } from "@/lib/nav/get-nav-for-user"
import { PINNED_SECTION, type NavItemConfig } from "@/lib/nav/nav-config"
import { useNavBadges } from "@/lib/nav/use-nav-badges"
import { ProfileMenu } from "./profile-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function ZelosMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground",
        className
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden fill="none">
        <path
          d="M12 3c-3.6 1-6 4-6 7.5 0 3 1.8 5.4 4.2 6.6l-.7 3.9h5l-.7-3.9C16.2 15.9 18 13.5 18 10.5 18 7 15.6 4 12 3Z"
          fill="currentColor"
          opacity=".22"
        />
        <path
          d="M12 21V9m0 0c0-2.2 1.6-4 3.8-4.4M12 9c0-2.2-1.6-4-3.8-4.4M12 14.2c.4-1.8 1.9-3 3.9-3.2M12 14.2c-.4-1.8-1.9-3-3.9-3.2"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

function useIsActive() {
  const pathname = usePathname()
  return React.useCallback(
    (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname]
  )
}

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const { session } = useStore()
  const isActive = useIsActive()
  const badges = useNavBadges()

  const sections = getNavForUser(session)
  const scrolling = sections.filter((s) => s.id !== PINNED_SECTION)
  const pinned = sections.find((s) => s.id === PINNED_SECTION)

  return (
    <aside
      className={cn(
        "flex h-dvh shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[248px]"
      )}
    >
      <div className="flex h-14 items-center gap-2 px-3">
        <ZelosMark />
        {!collapsed && (
          <span className="truncate text-[15px] font-semibold tracking-tight">
            Zelos HR
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="ml-auto grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>

      {/* The only search in the product. The top bar no longer carries one. */}
      <div className="px-3 pb-2">
        <SearchTrigger collapsed={collapsed} />
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
        {scrolling.map((section) => (
          <NavSectionList
            key={section.id}
            id={section.id}
            label={section.label}
            items={section.items}
            collapsed={collapsed}
            isActive={isActive}
            badges={badges}
          />
        ))}
      </nav>

      {pinned && (
        <div className="border-t px-3 py-2">
          <NavSectionList
            id={pinned.id}
            label={pinned.label}
            items={pinned.items}
            collapsed={collapsed}
            isActive={isActive}
            badges={badges}
          />
        </div>
      )}

      <ProfileMenu collapsed={collapsed} isActive={isActive} />
    </aside>
  )
}

function SearchTrigger({ collapsed }: { collapsed: boolean }) {
  const open = () =>
    document.dispatchEvent(new CustomEvent("zelos:open-search"))

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={open}
            aria-label="Search (Command K)"
            aria-keyshortcuts="Meta+K Control+K"
            className="grid h-9 w-full place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Search className="size-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Search · ⌘K</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <button
      type="button"
      onClick={open}
      aria-keyshortcuts="Meta+K Control+K"
      className="flex w-full items-center gap-2 rounded-lg border bg-background px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:border-ring/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Search className="size-4" />
      <span>Search</span>
      <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
        ⌘K
      </kbd>
    </button>
  )
}

function NavSectionList({
  id,
  label,
  items,
  collapsed,
  isActive,
  badges,
}: {
  id: string
  label: string | null
  items: NavItemConfig[]
  collapsed: boolean
  isActive: (href: string) => boolean
  badges: Record<string, number>
}) {
  const headingId = `nav-section-${id}`

  return (
    <div className="mb-1">
      {label &&
        (collapsed ? (
          // The rule stands in for the heading when there is no room to read it.
          <div className="my-3 border-t" role="presentation" />
        ) : (
          <p
            id={headingId}
            className="px-2.5 pt-4 pb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground"
          >
            {label}
          </p>
        ))}
      <ul
        className="space-y-0.5"
        aria-labelledby={label && !collapsed ? headingId : undefined}
        aria-label={label && collapsed ? label : undefined}
      >
        {items.map((item) => (
          <NavRow
            key={item.id}
            item={item}
            collapsed={collapsed}
            active={isActive(item.href)}
            count={item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0}
          />
        ))}
      </ul>
    </div>
  )
}

function NavRow({
  item,
  collapsed,
  active,
  count,
}: {
  item: NavItemConfig
  collapsed: boolean
  active: boolean
  count: number
}) {
  const Icon = item.icon

  if (collapsed) {
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={
                count > 0 ? `${item.label}, ${count} waiting` : item.label
              }
              className={cn(
                "relative grid h-9 place-items-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active
                  ? "bg-success-muted text-primary"
                  : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
              )}
            >
              <Icon className="size-[18px]" />
              {count > 0 && (
                <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
              )}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            {item.label}
            {count > 0 && ` · ${count}`}
          </TooltipContent>
        </Tooltip>
      </li>
    )
  }

  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          active
            ? "bg-success-muted font-medium text-primary"
            : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
        )}
      >
        <Icon className="size-[18px] shrink-0" />
        <span className="truncate">{item.label}</span>
        {count > 0 && (
          <span className="tabular ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
            {count}
            <span className="sr-only"> waiting</span>
          </span>
        )}
      </Link>
    </li>
  )
}
