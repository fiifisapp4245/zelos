import type { LucideIcon } from "lucide-react"
import {
  BadgeCheck,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  CircleDollarSign,
  CircleUser,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Gavel,
  GraduationCap,
  House,
  LogOut,
  Network,
  Settings,
  Target,
  UserRoundPlus,
  Users,
  Wallet,
} from "lucide-react"

/**
 * Who a sidebar is built for. One audience per session: the three products
 * in the spec are distinct sidebars, not a union of overlapping permissions.
 * `payroll` is the codebase's fifth role, which would otherwise lose its own
 * screens; it sees the Pay section on top of the employee's own.
 */
export type NavAudience = "hr_admin" | "manager" | "employee" | "payroll"

export type NavSectionId =
  | "primary"
  | "team"
  | "people"
  | "time"
  | "pay"
  | "talent"
  | "relations"
  | "me"
  | "pinned"

/** Counts the sidebar can show against an item. */
export type NavBadgeKey = "approvals"

export interface NavItemConfig {
  id: string
  label: string
  href: string
  icon: LucideIcon
  section: NavSectionId
  roles: NavAudience[]
  badgeKey?: NavBadgeKey
}

export interface NavSection {
  id: NavSectionId
  /** null renders the items with no heading. */
  label: string | null
  items: NavItemConfig[]
}

export const NAV_SECTION_LABEL: Record<NavSectionId, string | null> = {
  primary: null,
  team: "My team",
  people: "People",
  time: "Time",
  pay: "Pay",
  talent: "Talent",
  relations: "Employee relations",
  me: "Me",
  pinned: null,
}

/**
 * Section order differs per audience — an HR Admin opens on the organisation,
 * a manager on their team, an employee on themselves.
 */
export const SECTION_ORDER: Record<NavAudience, NavSectionId[]> = {
  hr_admin: [
    "primary",
    "people",
    "time",
    "pay",
    "talent",
    "relations",
    "pinned",
  ],
  manager: ["primary", "team", "people", "me"],
  employee: ["primary", "me", "people"],
  payroll: ["primary", "pay", "people", "me", "pinned"],
}

/** Rendered at the foot of the sidebar rather than in the scrolling list. */
export const PINNED_SECTION: NavSectionId = "pinned"

const ALL: NavAudience[] = ["hr_admin", "manager", "employee", "payroll"]

/**
 * The one source of truth for the main sidebar. Nothing here is rendered as
 * hard-coded JSX — the sidebar walks this list and nothing else.
 */
export const NAV_ITEMS: NavItemConfig[] = [
  // Primary
  {
    id: "home",
    label: "Home",
    href: "/overview",
    icon: House,
    section: "primary",
    roles: ALL,
  },
  {
    id: "approvals",
    label: "Approvals",
    href: "/approvals",
    icon: ClipboardCheck,
    section: "primary",
    roles: ["hr_admin", "manager", "payroll"],
    badgeKey: "approvals",
  },

  // My team
  {
    id: "team-members",
    label: "Team members",
    href: "/team",
    icon: Users,
    section: "team",
    roles: ["manager"],
  },
  {
    id: "team-attendance",
    label: "Team attendance",
    href: "/team/attendance",
    icon: CalendarCheck,
    section: "team",
    roles: ["manager"],
  },
  {
    id: "team-schedules",
    label: "Team schedules",
    href: "/team/schedules",
    icon: CalendarRange,
    section: "team",
    roles: ["manager"],
  },
  {
    id: "team-leave",
    label: "Team leave",
    href: "/team/leave",
    icon: CalendarDays,
    section: "team",
    roles: ["manager"],
  },
  {
    id: "team-performance",
    label: "Team performance",
    href: "/team/performance",
    icon: Target,
    section: "team",
    roles: ["manager"],
  },

  // People
  {
    id: "directory",
    label: "Directory",
    href: "/employees",
    icon: Users,
    section: "people",
    roles: ALL,
  },
  {
    id: "org-chart",
    label: "Org chart",
    href: "/org-chart",
    icon: Network,
    section: "people",
    roles: ALL,
  },
  {
    id: "lifecycle",
    label: "Lifecycle events",
    href: "/lifecycle",
    icon: BadgeCheck,
    section: "people",
    roles: ["hr_admin"],
  },
  {
    id: "onboarding",
    label: "Onboarding",
    href: "/onboarding",
    icon: UserRoundPlus,
    section: "people",
    roles: ["hr_admin"],
  },
  {
    id: "offboarding",
    label: "Offboarding",
    href: "/offboarding",
    icon: LogOut,
    section: "people",
    roles: ["hr_admin"],
  },

  // Time
  {
    id: "attendance",
    label: "Attendance",
    href: "/attendance",
    icon: CalendarCheck,
    section: "time",
    roles: ["hr_admin"],
  },
  {
    id: "timesheets",
    label: "Timesheets",
    href: "/timesheets",
    icon: ClipboardList,
    section: "time",
    roles: ["hr_admin"],
  },
  {
    id: "schedules",
    label: "Schedules",
    href: "/schedules",
    icon: CalendarRange,
    section: "time",
    roles: ["hr_admin"],
  },
  {
    id: "leave",
    label: "Leave",
    href: "/leave",
    icon: CalendarDays,
    section: "time",
    roles: ["hr_admin"],
  },

  // Pay
  {
    id: "compensation",
    label: "Compensation",
    href: "/compensation",
    icon: CircleDollarSign,
    section: "pay",
    roles: ["hr_admin", "payroll"],
  },
  {
    id: "payroll",
    label: "Payroll",
    href: "/payroll",
    icon: Wallet,
    section: "pay",
    roles: ["hr_admin", "payroll"],
  },

  // Talent
  {
    id: "recruitment",
    label: "Recruitment",
    href: "/recruitment",
    icon: GraduationCap,
    section: "talent",
    roles: ["hr_admin"],
  },
  {
    id: "performance",
    label: "Performance",
    href: "/performance",
    icon: Target,
    section: "talent",
    roles: ["hr_admin"],
  },

  // Employee relations
  {
    id: "disciplinary",
    label: "Disciplinary",
    href: "/disciplinary",
    icon: Gavel,
    section: "relations",
    roles: ["hr_admin"],
  },
  {
    id: "documents",
    label: "Documents",
    href: "/documents",
    icon: FileText,
    section: "relations",
    roles: ["hr_admin"],
  },

  // Me
  {
    id: "my-profile",
    label: "My profile",
    href: "/me/profile",
    icon: CircleUser,
    section: "me",
    roles: ["manager", "employee", "payroll"],
  },
  {
    id: "my-timesheet",
    label: "My timesheet",
    href: "/me/timesheet",
    icon: ClipboardList,
    section: "me",
    roles: ["manager", "employee", "payroll"],
  },
  {
    id: "my-schedule",
    label: "My schedule",
    href: "/me/schedule",
    icon: CalendarRange,
    section: "me",
    roles: ["manager", "employee", "payroll"],
  },
  {
    id: "my-leave",
    label: "My leave",
    href: "/me/leave",
    icon: CalendarDays,
    section: "me",
    roles: ["manager", "employee", "payroll"],
  },
  {
    id: "my-pay",
    label: "My pay",
    href: "/me/pay",
    icon: Wallet,
    section: "me",
    roles: ["manager", "employee", "payroll"],
  },
  {
    id: "my-performance",
    label: "My performance",
    href: "/me/performance",
    icon: Target,
    section: "me",
    roles: ["manager", "employee", "payroll"],
  },
  {
    id: "my-documents",
    label: "My documents",
    href: "/me/documents",
    icon: FileText,
    section: "me",
    roles: ["manager", "employee", "payroll"],
  },

  // Pinned
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    icon: ChartColumn,
    section: "pinned",
    roles: ["hr_admin", "payroll"],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    section: "pinned",
    roles: ["hr_admin"],
  },
]
