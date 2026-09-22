"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { NAV, visibleFor, type NavItem } from "./nav"
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
  const { viewer, alerts, leaveRequests } = useStore()
  const isActive = useIsActive()

  const badgeCounts = {
    alerts: alerts.filter((a) => !a.acknowledged).length,
    approvals: leaveRequests.filter((r) => r.status === "pending").length,
  }

  return (
    <aside
      className={cn(
        "flex h-dvh shrink-0 flex-col bg-sidebar transition-[width] duration-200",
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
          className="ml-auto grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="px-3 pb-2">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg border bg-background px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:border-ring/40"
            onClick={() =>
              document.dispatchEvent(new CustomEvent("zelos:open-search"))
            }
          >
            <Search className="size-4" />
            <span>Search</span>
            <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((group) => {
          const items = group.items.filter((i) => visibleFor(i, viewer.roles))
          if (items.length === 0) return null
          return (
            <div key={group.label ?? "root"} className="mb-1">
              {group.label && !collapsed && (
                <p className="px-2.5 pt-4 pb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">
                  {group.label}
                </p>
              )}
              {group.label && collapsed && <div className="my-3 border-t" />}
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    isActive={isActive}
                    roles={viewer.roles}
                    badgeCounts={badgeCounts}
                  />
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      <ProfileMenu collapsed={collapsed} isActive={isActive} />
    </aside>
  )
}

function NavRow({
  item,
  collapsed,
  isActive,
  roles,
  badgeCounts,
}: {
  item: NavItem
  collapsed: boolean
  isActive: (href: string) => boolean
  roles: ReturnType<typeof useStore>["viewer"]["roles"]
  badgeCounts: { alerts: number; approvals: number }
}) {
  const children = (item.children ?? []).filter((c) => visibleFor(c, roles))
  const hasChildren = children.length > 0
  const childActive = children.some((c) => isActive(c.href))
  const selfActive = isActive(item.href) && !childActive
  const [manuallyToggled, setManuallyToggled] = React.useState<boolean | null>(
    null
  )
  // A group is open when it holds the current route, unless the user has said otherwise.
  const open = manuallyToggled ?? (childActive || selfActive)

  const Icon = item.icon
  const count = item.badge ? badgeCounts[item.badge] : 0

  if (collapsed) {
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              className={cn(
                "relative grid h-9 place-items-center rounded-lg transition-colors",
                selfActive || childActive
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
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      </li>
    )
  }

  return (
    <li>
      <div className="flex items-center">
        <Link
          href={item.href}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
            selfActive
              ? "bg-success-muted font-medium text-primary"
              : childActive
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
          )}
        >
          <Icon className="size-[18px] shrink-0" />
          <span className="truncate">{item.label}</span>
          {count > 0 && (
            <span className="tabular ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
              {count}
            </span>
          )}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setManuallyToggled(!open)}
            aria-label={
              open ? `Collapse ${item.label}` : `Expand ${item.label}`
            }
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        )}
      </div>

      {hasChildren && open && (
        <ul className="mt-0.5 ml-[18px] space-y-0.5 border-l pl-2.5">
          {children.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                className={cn(
                  "block truncate rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                  isActive(child.href)
                    ? "bg-success-muted font-medium text-primary"
                    : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
                )}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
