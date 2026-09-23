import type { LucideIcon } from "lucide-react"
import {
  Bell,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Network,
  Plug,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  UserRoundPlus,
} from "lucide-react"

/**
 * The Company Settings catalogue.
 *
 * One entry per configurable area, grouped the way an HR Admin looks for them
 * rather than the way the data model is shaped. `href` points at a screen that
 * already exists; everything else resolves to the generic detail route so no
 * link in the hub is dead.
 */

export interface SettingItem {
  slug: string
  label: string
  /** What this controls — shown on the detail page and searched against. */
  blurb: string
  /** An existing screen that already covers this, if there is one. */
  href?: string
}

export interface SettingCategory {
  slug: string
  label: string
  icon: LucideIcon
  items: SettingItem[]
}

export const SETTINGS: SettingCategory[] = [
  {
    slug: "company-details",
    label: "Company details",
    icon: Building2,
    items: [
      {
        slug: "company-information",
        label: "Company information",
        blurb:
          "Registered name, trading name, TIN, SSNIT employer number and registered address.",
      },
      {
        slug: "localization",
        label: "Localization",
        blurb:
          "Operating country, currency, date format, timezone and the statutory rules that follow from them.",
      },
      {
        slug: "job-catalog",
        label: "Grade structure",
        blurb:
          "The list of job titles, families and pay grades that employee records can be assigned to.",
      },
    ],
  },
  {
    slug: "organizational-structure",
    label: "Organizational structure",
    icon: Network,
    items: [
      {
        slug: "departments",
        label: "Departments",
        blurb:
          "Departments and their heads. Scopes what a Head of Department can see.",
        href: "/structure",
      },
      {
        slug: "branches",
        label: "Branches",
        blurb: "Physical locations, their regions and their holiday calendars.",
        href: "/structure",
      },
      {
        slug: "org-structure-diagram",
        label: "Structure diagram",
        blurb:
          "How departments, their heads and their branches sit in relation to one another.",
      },
    ],
  },
  {
    slug: "employee-settings",
    label: "Employee settings",
    icon: UserRoundPlus,
    items: [
      {
        slug: "lifecycle-event-types",
        label: "Lifecycle event types",
        blurb:
          "The transitions the state machine permits, and which of them require a reason or an approval.",
      },
      {
        slug: "custom-fields",
        label: "Custom fields",
        blurb:
          "Extra fields to capture on an employee record, and which roles may read them.",
      },
      {
        slug: "employment-types",
        label: "Employment types",
        blurb:
          "Full-time, part-time, contractor, intern and National Service, and how each behaves in payroll and leave.",
      },
      {
        slug: "employment-id-format",
        label: "ID format",
        blurb:
          "The pattern new employee IDs are generated from — currently ZEL-0000.",
      },
      {
        slug: "subdomain",
        label: "Subdomain",
        blurb:
          "The address staff sign in at, and whether the company is reachable on a custom domain.",
      },
      {
        slug: "archiving",
        label: "Archiving",
        blurb:
          "How long ended records, documents and audit history are kept before they are archived.",
      },
      {
        slug: "expiry-alerts",
        label: "Expiry alerts",
        blurb:
          "Thresholds for contract, probation, document and retirement alerts.",
        href: "/alerts",
      },
    ],
  },
  {
    slug: "time-attendance",
    label: "Time & attendance",
    icon: Timer,
    items: [
      {
        slug: "working-week",
        label: "Working week",
        blurb:
          "Which days count as working days, and the standard hours per week.",
      },
      {
        slug: "work-schedules",
        label: "Work schedules & shifts",
        blurb: "Shift patterns and the people or branches assigned to each.",
      },
      {
        slug: "clock-in-methods",
        label: "Devices & capture",
        blurb:
          "How attendance is captured — web, mobile, biometric or manual entry by a supervisor.",
      },
      {
        slug: "overtime-grace",
        label: "Attendance rules",
        blurb:
          "How many minutes late still counts as on time, and how overtime is accrued and paid.",
      },
    ],
  },
  {
    slug: "leave",
    label: "Leave",
    icon: CalendarDays,
    items: [
      {
        slug: "leave-policies",
        label: "Leave policies",
        blurb:
          "Entitlement per leave type, accrual rules and how much may be carried over.",
      },
      {
        slug: "public-holidays",
        label: "Public holidays",
        blurb:
          "The statutory holiday calendar, per branch, that leave and attendance are measured against.",
      },
      {
        slug: "approval-settings",
        label: "Approval routing",
        blurb:
          "Who approves what, and whether a dotted-line manager can approve alongside the line manager.",
      },
    ],
  },
  {
    slug: "payroll-payments",
    label: "Payroll & payments",
    icon: CircleDollarSign,
    items: [
      {
        slug: "statutory-settings",
        label: "Country rules",
        blurb:
          "SSNIT Tier 1 and 2 rates, Tier 3 handling and the PAYE bands applied at disbursement.",
      },
      {
        slug: "pay-schedule",
        label: "Pay schedule",
        blurb: "Pay cycle, cut-off date and pay date.",
      },
      {
        slug: "allowance-deduction-type",
        label: "Pay components",
        blurb:
          "Recurring allowances and deductions, and whether each is taxable.",
      },
      {
        slug: "payment-methods",
        label: "Payment methods",
        blurb:
          "Which disbursement methods are allowed — mobile money providers and bank transfer.",
      },
      {
        slug: "payslip-settings",
        label: "Pay-slip settings",
        blurb:
          "What appears on a pay slip, and when it is released to the employee.",
      },
      {
        slug: "payroll-approval",
        label: "Payroll approval",
        blurb:
          "Who signs off a run before it is disbursed, and whether two approvals are required.",
        href: "/payroll",
      },
    ],
  },
  {
    slug: "admin-permissions",
    label: "Admin & permissions",
    icon: SlidersHorizontal,
    items: [
      {
        slug: "users",
        label: "Users",
        blurb: "Who can sign in, and whether their account is active.",
      },
      {
        slug: "role-assignment",
        label: "Roles & permissions",
        blurb:
          "Which permission roles each person holds. Roles compose — one person can hold several at once.",
      },
      {
        slug: "audit-log",
        label: "Audit log",
        blurb:
          "Every attributed write, and every reveal of a sensitive field with its stated purpose.",
        href: "/audit",
      },
    ],
  },
  {
    slug: "security",
    label: "Security",
    icon: ShieldCheck,
    items: [
      {
        slug: "two-factor-authentication",
        label: "Two-factor authentication",
        blurb: "Whether 2FA is required, and for which roles.",
      },
      {
        slug: "password-policy",
        label: "Password policy",
        blurb: "Minimum length, complexity and rotation period.",
      },
      {
        slug: "session-timeout",
        label: "Session timeout",
        blurb: "How long an idle session stays signed in.",
      },
    ],
  },
  {
    slug: "notifications",
    label: "Notifications",
    icon: Bell,
    items: [
      {
        slug: "email-in-app-notification",
        label: "Email & in-app notification",
        blurb: "Which events notify which roles, and through which channel.",
      },
      {
        slug: "reminder-schedules",
        label: "Reminder schedules",
        blurb:
          "How often an outstanding approval or task is chased, and when it escalates.",
      },
    ],
  },
  {
    slug: "integrations",
    label: "Integrations",
    icon: Plug,
    items: [
      {
        slug: "billing",
        label: "Billing",
        blurb:
          "The plan, the seats it covers, the invoices raised against it and the card they are charged to.",
      },
      {
        slug: "api-keys-webhooks",
        label: "API keys & webhooks",
        blurb:
          "Keys issued to other systems, and the events Zelos posts outward.",
      },
    ],
  },
]

/** Resolves a detail-route slug back to its item and parent category. */
export function findSetting(slug: string) {
  for (const category of SETTINGS) {
    const item = category.items.find((i) => i.slug === slug)
    if (item) return { category, item }
  }
  return null
}

export const SETTINGS_SLUGS = SETTINGS.flatMap((c) =>
  c.items.filter((i) => !i.href).map((i) => i.slug)
)
