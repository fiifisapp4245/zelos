import type { LucideIcon } from "lucide-react"
import {
  Building2,
  CreditCard,
  ShieldCheck,
  Timer,
  UserRound,
  Wallet,
} from "lucide-react"

export interface SettingsNavItem {
  label: string
  /** Points at a screen that already exists — nothing here is a dead link. */
  href: string
}

export interface SettingsNavGroup {
  id: string
  label: string
  icon: LucideIcon
  items: SettingsNavItem[]
}

/**
 * The Settings area's own navigation. It sits inside Settings rather than in
 * the main sidebar, because these configure the product rather than being
 * part of anyone's day.
 *
 * Several entries point at screens that already existed under other names —
 * they are linked, not rebuilt.
 */
export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    id: "company",
    label: "Company",
    icon: Building2,
    items: [
      { label: "Company info", href: "/settings/company-information" },
      { label: "Branches & departments", href: "/structure" },
      { label: "Working week", href: "/settings/working-week" },
      { label: "Subdomain", href: "/settings/subdomain" },
      { label: "Custom fields", href: "/settings/custom-fields" },
      { label: "ID format", href: "/settings/employment-id-format" },
      { label: "Expiry alerts", href: "/settings/expiry-alerts" },
      { label: "Archiving", href: "/settings/archiving" },
      { label: "Localization", href: "/settings/localization" },
      { label: "Employment types", href: "/settings/employment-types" },
      { label: "Structure diagram", href: "/settings/org-structure-diagram" },
      { label: "Notifications", href: "/settings/email-in-app-notification" },
      { label: "Reminder schedules", href: "/settings/reminder-schedules" },
    ],
  },
  {
    id: "people",
    label: "People",
    icon: UserRound,
    items: [
      { label: "Grade structure", href: "/settings/job-catalog" },
      {
        label: "Lifecycle event types",
        href: "/settings/lifecycle-event-types",
      },
    ],
  },
  {
    id: "time",
    label: "Time",
    icon: Timer,
    items: [
      { label: "Attendance rules", href: "/settings/overtime-grace" },
      { label: "Devices & capture", href: "/settings/clock-in-methods" },
      { label: "Leave policies", href: "/settings/leave-policies" },
      { label: "Approval routing", href: "/settings/approval-settings" },
      { label: "Work schedules & shifts", href: "/settings/work-schedules" },
      { label: "Public holidays", href: "/settings/public-holidays" },
    ],
  },
  {
    id: "pay",
    label: "Pay",
    icon: Wallet,
    items: [
      { label: "Pay groups", href: "/settings/pay-groups" },
      { label: "Pay components", href: "/settings/allowance-deduction-type" },
      { label: "Country rules", href: "/settings/statutory-settings" },
      { label: "Pay schedule", href: "/settings/pay-schedule" },
      { label: "Payment methods", href: "/settings/payment-methods" },
      { label: "Pay-slip settings", href: "/settings/payslip-settings" },
      { label: "Approvals", href: "/settings/payroll-approval" },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: ShieldCheck,
    items: [
      { label: "Roles & permissions", href: "/settings/role-assignment" },
      { label: "Audit log", href: "/audit" },
      { label: "Users", href: "/settings/users" },
      {
        label: "Two-factor authentication",
        href: "/settings/two-factor-authentication",
      },
      { label: "Password policy", href: "/settings/password-policy" },
      { label: "Session timeout", href: "/settings/session-timeout" },
      { label: "API keys & webhooks", href: "/settings/api-keys-webhooks" },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
    items: [{ label: "Billing", href: "/settings/billing" }],
  },
]
