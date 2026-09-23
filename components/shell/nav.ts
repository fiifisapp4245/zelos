import type { LucideIcon } from "lucide-react"
import { CircleHelp, CircleUser, Info } from "lucide-react"

import type { PermissionRole } from "@/lib/types"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Roles that see this item. Omit to show it to everyone. */
  roles?: PermissionRole[]
}

/**
 * The account menu behind the profile chip. It holds what belongs to the
 * person rather than to the company — Company Settings is pinned in the
 * sidebar itself, so it is deliberately not repeated here.
 *
 * The main sidebar is built from lib/nav/nav-config.ts, not from this file.
 */
export const SETTINGS_NAV: NavItem[] = [
  { label: "Account Settings", href: "/account", icon: CircleUser },
  { label: "Learn more", href: "/learn", icon: Info },
  { label: "Help", href: "/help", icon: CircleHelp },
]

export function visibleFor(item: NavItem, roles: PermissionRole[]) {
  if (!item.roles) return true
  return item.roles.some((r) => roles.includes(r))
}
