import type { NavAudience } from "../nav/nav-config"

/**
 * Widgets are named, not imported. The config stays a data file with no React
 * in it, so getHomeForUser can be reasoned about and tested on its own; the
 * page maps these keys through a registry.
 */
export type WidgetKey =
  | "needsApproval"
  | "needsAttention"
  | "workforceSnapshot"
  | "teamToday"
  | "myDay"
  | "myRequests"
  | "leaveBalances"
  | "latestPayslip"
  | "meStrip"
  | "today"
  | "upcoming"
  | "celebrations"
  | "profileCompletion"

export type HomeColumn = "main" | "rail"

/**
 * Narrows what a widget draws on. The same queue serves four personas; the
 * scope is what makes an HR Admin's and a payroll officer's differ.
 */
export type WidgetScope = "company" | "team" | "self" | "payDetails" | "payroll"

export interface HomeWidgetConfig {
  id: string
  widget: WidgetKey
  column: HomeColumn
  roles: NavAudience[]
  order: number
  scope?: WidgetScope
  /** Absorbs the leftover height in its column and scrolls inside itself. */
  fills?: boolean | number
}

export const HOME_WIDGETS: HomeWidgetConfig[] = [
  // ── Main ───────────────────────────────────────────────────────────────
  {
    id: "approvals-hr",
    widget: "needsApproval",
    fills: 2,
    column: "main",
    roles: ["hr_admin"],
    order: 1,
    scope: "company",
  },
  {
    id: "approvals-manager",
    widget: "needsApproval",
    fills: 2,
    column: "main",
    roles: ["manager"],
    order: 1,
    scope: "team",
  },
  {
    id: "approvals-payroll",
    widget: "needsApproval",
    fills: 2,
    column: "main",
    roles: ["payroll"],
    order: 1,
    scope: "payDetails",
  },
  {
    id: "attention-hr",
    widget: "needsAttention",
    fills: true,
    column: "main",
    roles: ["hr_admin"],
    order: 2,
    scope: "company",
  },
  {
    id: "attention-manager",
    widget: "needsAttention",
    fills: true,
    column: "main",
    roles: ["manager"],
    order: 2,
    scope: "team",
  },
  {
    id: "attention-payroll",
    widget: "needsAttention",
    fills: true,
    column: "main",
    roles: ["payroll"],
    order: 2,
    scope: "payroll",
  },
  {
    id: "snapshot",
    widget: "workforceSnapshot",
    column: "main",
    roles: ["hr_admin"],
    order: 3,
    scope: "company",
  },
  {
    id: "team-today",
    widget: "teamToday",
    column: "main",
    roles: ["manager"],
    order: 3,
    scope: "team",
  },
  {
    id: "my-day",
    widget: "myDay",
    column: "main",
    roles: ["employee"],
    order: 1,
    scope: "self",
  },
  {
    id: "my-requests-employee",
    widget: "myRequests",
    column: "main",
    roles: ["employee"],
    order: 2,
    scope: "self",
  },
  {
    id: "my-requests-manager",
    widget: "myRequests",
    column: "main",
    roles: ["manager"],
    order: 4,
    scope: "self",
  },
  {
    id: "leave-balances",
    widget: "leaveBalances",
    column: "main",
    roles: ["employee"],
    order: 3,
    scope: "self",
  },
  {
    id: "latest-payslip",
    widget: "latestPayslip",
    column: "main",
    roles: ["employee"],
    order: 4,
    scope: "self",
  },

  // ── Rail ───────────────────────────────────────────────────────────────
  {
    id: "me-strip",
    widget: "meStrip",
    column: "rail",
    roles: ["hr_admin", "manager", "payroll"],
    order: 1,
    scope: "self",
  },
  {
    id: "upcoming-hr",
    widget: "upcoming",
    fills: true,
    column: "rail",
    roles: ["hr_admin"],
    order: 2,
    scope: "company",
  },
  {
    id: "upcoming-payroll",
    widget: "upcoming",
    fills: true,
    column: "rail",
    roles: ["payroll"],
    order: 2,
    scope: "payroll",
  },
  {
    id: "today-hr",
    widget: "today",
    column: "rail",
    roles: ["hr_admin", "payroll"],
    order: 3,
    scope: "company",
  },
  {
    id: "today-team",
    widget: "today",
    column: "rail",
    roles: ["manager", "employee"],
    order: 3,
    scope: "team",
  },
  {
    id: "celebrations-company",
    widget: "celebrations",
    column: "rail",
    roles: ["hr_admin", "payroll"],
    order: 4,
    scope: "company",
  },
  {
    id: "celebrations-team",
    widget: "celebrations",
    column: "rail",
    roles: ["manager", "employee"],
    order: 4,
    scope: "team",
  },
  {
    id: "profile-completion",
    widget: "profileCompletion",
    column: "rail",
    roles: ["employee"],
    order: 5,
    scope: "self",
  },
]
