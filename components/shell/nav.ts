import type { LucideIcon } from "lucide-react"
import {
  BadgeCheck,
  Bell,
  CalendarCheck,
  CircleHelp,
  CircleUser,
  ClipboardList,
  FileText,
  Gavel,
  GraduationCap,
  Info,
  LayoutGrid,
  LogOut,
  Network,
  ScrollText,
  Settings,
  UserRound,
  Users,
  Wallet,
} from "lucide-react"

import type { PermissionRole } from "@/lib/types"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Roles that see this item. Omit to show it to everyone. */
  roles?: PermissionRole[]
  children?: NavItem[]
  badge?: "alerts" | "approvals"
}

export interface NavGroup {
  label: string | null
  items: NavItem[]
}

/**
 * Information architecture follows the employee journey end to end:
 * recruitment → onboarding → active service → performance → separation.
 */
export const NAV: NavGroup[] = [
  {
    label: null,
    items: [
      { label: "Overview", href: "/overview", icon: LayoutGrid },
      {
        label: "Employee",
        href: "/employees",
        icon: Users,
        children: [
          { label: "Directory", href: "/employees", icon: Users },
          { label: "Org chart", href: "/org-chart", icon: Network },
          { label: "Lifecycle events", href: "/lifecycle", icon: BadgeCheck },
          {
            label: "Audit logs",
            href: "/audit",
            icon: ScrollText,
            roles: ["hr_admin"],
          },
        ],
      },
      { label: "Attendance", href: "/attendance", icon: CalendarCheck },
      {
        label: "Leave",
        href: "/leave",
        icon: ClipboardList,
        badge: "approvals",
      },
      {
        label: "Payroll",
        href: "/payroll",
        icon: Wallet,
        roles: ["hr_admin", "payroll"],
      },
    ],
  },
  {
    label: "Talent",
    items: [
      {
        label: "Recruitment",
        href: "/recruitment",
        icon: GraduationCap,
        roles: ["hr_admin", "head_of_department", "line_manager"],
      },
      { label: "Onboarding", href: "/onboarding", icon: UserRound },
      { label: "Performance", href: "/performance", icon: BadgeCheck },
      {
        label: "Offboarding",
        href: "/offboarding",
        icon: LogOut,
        roles: ["hr_admin", "head_of_department"],
      },
    ],
  },
  {
    label: "Compliance",
    items: [
      {
        label: "Alerts",
        href: "/alerts",
        icon: Bell,
        roles: ["hr_admin", "head_of_department"],
        badge: "alerts",
      },
      {
        label: "Disciplinary",
        href: "/disciplinary",
        icon: Gavel,
        roles: ["hr_admin", "line_manager", "head_of_department"],
      },
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
]

/**
 * Pinned to the bottom of the sidebar, above the profile chip. Settings sit
 * here rather than in the nav list because they configure the product rather
 * than being part of the day-to-day workflow. Organisation structure lives
 * inside Company Settings → Organizational structure.
 */
export const SETTINGS_NAV: NavItem[] = [
  {
    label: "Company Settings",
    href: "/settings",
    icon: Settings,
    roles: ["hr_admin"],
  },
  { label: "Account Settings", href: "/account", icon: CircleUser },
  { label: "Learn more", href: "/learn", icon: Info },
  { label: "Help", href: "/help", icon: CircleHelp },
]

export function visibleFor(item: NavItem, roles: PermissionRole[]) {
  if (!item.roles) return true
  return item.roles.some((r) => roles.includes(r))
}
