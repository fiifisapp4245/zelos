import type { SessionContext } from "../session"
import { resolveAudience } from "../nav/get-nav-for-user"
import {
  HOME_WIDGETS,
  type HomeColumn,
  type HomeWidgetConfig,
} from "./home-config"

export interface HomeLayout {
  /** Full-width, above the paired rows. */
  header: HomeWidgetConfig[]
  main: HomeWidgetConfig[]
  rail: HomeWidgetConfig[]
}

/**
 * The widgets one session sees, in order, split by column.
 *
 * Pure and React-free: the page turns the widget keys into components through
 * its own registry, so this can be reasoned about and tested on its own.
 */
export function getHomeForUser(session: SessionContext): HomeLayout {
  const audience = resolveAudience(session)

  const forColumn = (column: HomeColumn) =>
    HOME_WIDGETS.filter(
      (w) => w.column === column && w.roles.includes(audience)
    ).sort((a, b) => a.order - b.order)

  return {
    header: forColumn("header"),
    main: forColumn("main"),
    rail: forColumn("rail"),
  }
}

export interface QuickAction {
  label: string
  /** Either a route, or a scroll target on this page. */
  href?: string
  scrollTo?: string
  icon: string
}

/**
 * Up to four, because a row of chips stops being a shortcut once it becomes a
 * menu. Each one is the thing that role actually opens Home to do.
 */
export const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  hr_admin: [
    { label: "Add employee", href: "/employees/new", icon: "userPlus" },
    { label: "Run payroll", href: "/pay/payroll", icon: "wallet" },
    { label: "Record leave", href: "/leave", icon: "calendarDays" },
    { label: "Generate report", href: "/reports", icon: "chart" },
  ],
  manager: [
    { label: "Request leave", href: "/me/leave", icon: "calendarDays" },
    { label: "View team", href: "/team", icon: "users" },
    { label: "Approve leave", scrollTo: "needs-approval", icon: "check" },
    { label: "Clock in or out", href: "/attendance", icon: "clock" },
  ],
  employee: [
    { label: "Request leave", href: "/me/leave", icon: "calendarDays" },
    { label: "View payslips", href: "/me/pay", icon: "wallet" },
    { label: "Update profile", href: "/me/profile", icon: "userRound" },
    { label: "Upload document", href: "/me/documents", icon: "upload" },
  ],
  payroll: [
    { label: "Run payroll", href: "/pay/payroll", icon: "wallet" },
    { label: "View payslips", href: "/me/pay", icon: "receipt" },
    { label: "Generate report", href: "/reports", icon: "chart" },
    { label: "Request leave", href: "/me/leave", icon: "calendarDays" },
  ],
}

export function getQuickActions(session: SessionContext): QuickAction[] {
  return QUICK_ACTIONS[resolveAudience(session)] ?? QUICK_ACTIONS.employee
}
