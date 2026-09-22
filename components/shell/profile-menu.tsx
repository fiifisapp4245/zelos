"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown, LogOut } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { fullName, initials } from "@/lib/format"
import { ROLE_LABEL } from "@/lib/rbac"
import { SETTINGS_NAV, visibleFor } from "./nav"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * The profile chip at the foot of the sidebar. Clicking it opens the settings
 * and account list above it; clicking again docks it away.
 */
export function ProfileMenu({
  collapsed,
  isActive,
}: {
  collapsed: boolean
  isActive: (href: string) => boolean
}) {
  const { viewer, activeRole, employeeById } = useStore()
  const me = employeeById(viewer.employeeId)
  const items = SETTINGS_NAV.filter((i) => visibleFor(i, viewer.roles))

  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Close on Escape or on a click outside, so it behaves like a menu.
  React.useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("pointerdown", onPointerDown)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("pointerdown", onPointerDown)
    }
  }, [open])

  function signOut() {
    setOpen(false)
    toast("Signing out is not wired up in the prototype.")
  }

  if (collapsed) {
    return (
      <div ref={containerRef} className="relative border-t p-3">
        {open && (
          <div className="absolute bottom-full left-3 z-50 mb-2 w-[44px] space-y-0.5 rounded-xl bg-popover p-1.5 shadow-xl">
            {items.map((item) => (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "grid h-9 place-items-center rounded-lg transition-colors",
                      isActive(item.href)
                        ? "bg-success-muted text-primary"
                        : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-[18px]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ))}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={signOut}
                  className="grid h-9 w-full place-items-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="size-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Log out</TooltipContent>
            </Tooltip>
          </div>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className={cn(
                "mx-auto grid size-9 place-items-center rounded-full text-xs font-semibold transition-colors",
                open
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-sidebar"
                  : "",
                "bg-primary text-primary-foreground"
              )}
            >
              {me ? initials(me) : "—"}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {fullName(me)} · {ROLE_LABEL[activeRole]}
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative border-t p-3">
      {open && (
        <div className="absolute right-3 bottom-full left-3 z-50 mb-2 rounded-xl bg-popover p-1.5 shadow-xl">
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    isActive(item.href)
                      ? "bg-success-muted font-medium text-primary"
                      : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
                  )}
                >
                  <item.icon className="size-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-1.5 border-t pt-1.5">
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-[18px] shrink-0" />
              Log out
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors",
          open ? "bg-sidebar-hover" : "hover:bg-sidebar-hover"
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {me ? initials(me) : "—"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {fullName(me)}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {ROLE_LABEL[activeRole]}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
    </div>
  )
}
