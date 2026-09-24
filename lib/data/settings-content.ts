/**
 * Sample content for each Company Settings screen.
 *
 * These are realistic values for the launch jurisdiction (Ghana) on a ~25-person
 * services company, so the prototype shows what each screen holds rather than an
 * empty shell. Rendered generically by the settings detail route.
 */

import { ATTENDANCE_POLICY } from "./attendance-log"
import { SCHEDULE_POLICY } from "./schedules"

/** Which one the company mostly is, which decides where Schedules opens. */
const WORK_MODEL_LABEL = {
  office: "Office hours",
  mixed: "Mixed — office hours and rostered branches",
  shift: "Shift-based",
}

export type Block =
  | {
      kind: "fields"
      title?: string
      description?: string
      rows: [string, string][]
    }
  | {
      kind: "toggles"
      title?: string
      description?: string
      rows: { label: string; blurb?: string; on: boolean }[]
    }
  | {
      kind: "note"
      title?: string
      text: string
    }
  | {
      kind: "orgTree"
      title?: string
      description?: string
    }
  /** Banner + logo + headline facts, as on the company profile. */
  | {
      kind: "cover"
      rows: [string, string][]
      action?: string
    }
  /** Label above value, in columns — the card layout used on company details. */
  | {
      kind: "grid"
      title?: string
      description?: string
      columns?: 2 | 3
      rows: [string, string][]
    }
  /** Offices, read from the branches configured in the org structure. */
  | { kind: "offices"; title?: string; description?: string }
  /** An editable table, defined in settings-tables.ts. */
  | { kind: "managedTable"; tableId: string }

export const SETTINGS_CONTENT: Record<string, Block[]> = {
  // ---------------------------------------------------------------- Company
  "job-catalog": [
    { kind: "managedTable", tableId: "job-titles" },
    { kind: "managedTable", tableId: "pay-grades" },
  ],

  // -------------------------------------------------- Organisational shape
  "org-structure-diagram": [{ kind: "orgTree" }],

  // --------------------------------------------------------------- Employee
  "custom-fields": [{ kind: "managedTable", tableId: "custom-fields" }],

  "employment-types": [{ kind: "managedTable", tableId: "employment-types" }],

  "employment-id-format": [
    {
      kind: "fields",
      title: "Pattern",
      rows: [
        ["Format", "ZEL-0000"],
        ["Prefix", "ZEL"],
        ["Separator", "-"],
        ["Sequence length", "4 digits, zero-padded"],
        ["Sequence start", "0042"],
        ["Next ID to be issued", "ZEL-0328"],
        ["Reset policy", "Never — IDs are permanent and never reused"],
      ],
    },
    {
      kind: "note",
      title: "Why IDs are never reused",
      text: "An employee ID appears on pay slips, SSNIT filings and the audit log. Reusing one after somebody leaves would make historic records ambiguous, so the sequence only ever moves forward — including for re-hired staff, who get a new record and a new ID.",
    },
  ],

  // -------------------------------------------------------- Time & attendance
  "working-week": [
    { kind: "managedTable", tableId: "working-week" },
    {
      kind: "fields",
      title: "Totals",
      rows: [
        ["Standard hours", "40 hours per week"],
        ["Working days", "5 (Monday to Friday)"],
        ["First day of week", "Monday"],
        ["Timezone", "GMT (Africa/Accra)"],
      ],
    },
  ],

  "work-schedules": [{ kind: "managedTable", tableId: "work-schedules" }],

  "clock-in-methods": [
    {
      kind: "toggles",
      title: "Enabled methods",
      description: "How attendance reaches the system.",
      rows: [
        {
          label: "Web check-in",
          blurb: "From the Zelos dashboard on a company device.",
          on: true,
        },
        {
          label: "Mobile app",
          blurb: "With GPS capture, matched against the branch location.",
          on: true,
        },
        {
          label: "Biometric terminal",
          blurb: "Fingerprint readers at Kumasi and Takoradi.",
          on: true,
        },
        {
          label: "Supervisor manual entry",
          blurb: "Requires a reason, and is flagged in the register.",
          on: true,
        },
        {
          label: "Kiosk PIN",
          blurb: "Shared terminal with a personal PIN.",
          on: false,
        },
      ],
    },
  ],

  "overtime-grace": [
    {
      kind: "fields",
      title: "Grace periods",
      description:
        "Lateness is measured against each person's own scheduled start — from their work pattern or their published shift — plus this grace. A pattern may set a shorter grace of its own.",
      rows: [
        ["Company grace period", `${ATTENDANCE_POLICY.graceMinutes} minutes`],
        ["Unfinished days closed at", ATTENDANCE_POLICY.autoCloseAt],
        ["Early departure grace", "10 minutes"],
        ["Minimum day for attendance credit", "4 hours"],
      ],
    },
    {
      kind: "fields",
      title: "Roster thresholds",
      description:
        "What the roster warns about before a schedule is published. None of them blocks publishing.",
      rows: [
        [
          "Weekly hours before overtime is flagged",
          `${SCHEDULE_POLICY.overtimeWeeklyHours} hours`,
        ],
        [
          "Minimum rest between shifts",
          `${SCHEDULE_POLICY.shortRestHours} hours`,
        ],
        [
          "Coverage warning",
          `${SCHEDULE_POLICY.coverageWarnPercent}% of a department away on one day`,
        ],
        [
          "Primary work model",
          WORK_MODEL_LABEL[SCHEDULE_POLICY.primaryWorkModel],
        ],
      ],
    },
    { kind: "managedTable", tableId: "overtime-rates" },
  ],

  // ------------------------------------------------------------------ Leave
  "leave-policies": [{ kind: "managedTable", tableId: "leave-types" }],

  "public-holidays": [{ kind: "managedTable", tableId: "public-holidays" }],

  "approval-settings": [
    { kind: "managedTable", tableId: "approval-routing" },
    {
      kind: "toggles",
      title: "Rules",
      rows: [
        {
          label: "Dotted-line managers can approve",
          blurb:
            "Either the line manager or the dotted-line manager may decide — whoever gets there first.",
          on: true,
        },
        {
          label: "A rejection must carry a reason",
          blurb: "The employee sees the reason on their request.",
          on: true,
        },
        {
          label: "Allow requests that exceed the balance",
          blurb: "Submitted with a warning, and HR must countersign.",
          on: false,
        },
        {
          label: "Auto-approve after escalation window",
          blurb:
            "Off by default — silence should not read as consent on a pay-affecting decision.",
          on: false,
        },
      ],
    },
  ],

  // ---------------------------------------------------------------- Payroll
  "statutory-settings": [
    { kind: "managedTable", tableId: "ssnit-tiers" },
    { kind: "managedTable", tableId: "paye-bands" },
  ],

  "pay-schedule": [
    {
      kind: "fields",
      title: "Cycle",
      rows: [
        ["Frequency", "Monthly"],
        ["Pay date", "28th of the month"],
        [
          "If the 28th is a weekend or holiday",
          "Paid the last working day before",
        ],
        ["Cut-off for changes", "22nd of the month, 17:00"],
        ["Attendance period", "1st to last day of the month"],
        ["Next run", "28 September 2026"],
        ["Next cut-off", "22 September 2026"],
      ],
    },
    {
      kind: "note",
      title: "What the cut-off locks",
      text: "After cut-off, salary changes, new starters and bank or MoMo detail changes roll into the following month. Leave and attendance keep recording as normal — they only affect pay from the next cycle.",
    },
  ],

  "allowance-deduction-type": [
    { kind: "managedTable", tableId: "allowances" },
    { kind: "managedTable", tableId: "deductions" },
  ],

  "payment-methods": [
    {
      kind: "toggles",
      title: "Enabled disbursement methods",
      rows: [
        {
          label: "MTN MoMo",
          blurb: "18 employees. Bulk disbursement file, same-day settlement.",
          on: true,
        },
        {
          label: "Telecel Cash",
          blurb: "2 employees. Bulk disbursement file.",
          on: true,
        },
        {
          label: "AirtelTigo Money",
          blurb: "0 employees. Enabled but unused.",
          on: true,
        },
        {
          label: "Bank transfer",
          blurb: "5 employees. GhIPSS direct credit, next working day.",
          on: true,
        },
        { label: "Cash", blurb: "Disabled — no audit trail.", on: false },
        {
          label: "Cheque",
          blurb: "Disabled — settlement too slow.",
          on: false,
        },
      ],
    },
    {
      kind: "fields",
      title: "Disbursement account",
      rows: [
        ["Bank", "Ecobank Ghana"],
        ["Account name", "Xanthan Services Ltd — Payroll"],
        ["Account number", "1441000987654"],
        ["Branch", "Airport City, Accra"],
        ["Approval before release", "Two signatories"],
      ],
    },
  ],

  "payslip-settings": [
    {
      kind: "toggles",
      title: "Shown on the pay slip",
      rows: [
        { label: "Gross and net pay", on: true },
        { label: "Itemised allowances", on: true },
        { label: "Itemised deductions", on: true },
        {
          label: "SSNIT employer contribution",
          blurb: "Shown as information, not a deduction.",
          on: true,
        },
        { label: "Year-to-date totals", on: true },
        { label: "Leave balance", on: true },
        {
          label: "SSNIT and TIN numbers",
          blurb: "Masked except the last three digits.",
          on: true,
        },
        {
          label: "Cost to company",
          blurb: "Off — internal figure, not the employee's business.",
          on: false,
        },
      ],
    },
    {
      kind: "fields",
      title: "Release",
      rows: [
        ["Released to employee", "On pay date, 09:00"],
        ["Channel", "In-app, plus PDF by email"],
        [
          "PDF protection",
          "Opens with the employee's Ghana Card last 6 digits",
        ],
        ["Retention", "7 years, per GRA record-keeping requirements"],
      ],
    },
  ],

  // ---------------------------------------------------------- Admin & access
  users: [{ kind: "managedTable", tableId: "user-accounts" }],

  // --------------------------------------------------------------- Security
  "two-factor-authentication": [
    { kind: "managedTable", tableId: "twofa-by-role" },
    {
      kind: "fields",
      title: "Recovery",
      rows: [
        ["Backup codes issued", "10 per person, single use"],
        ["Lost-device process", "HR Admin resets, logged with a stated reason"],
        ["Grace period for new enrolment", "7 days from first sign-in"],
      ],
    },
  ],

  "password-policy": [
    {
      kind: "fields",
      title: "Requirements",
      rows: [
        ["Minimum length", "12 characters"],
        ["Must include", "Upper case, lower case and a number"],
        ["Symbols", "Encouraged, not required"],
        [
          "Blocked",
          "Common passwords, and anything containing the person's name",
        ],
        ["Reuse", "Last 5 passwords cannot be reused"],
        ["Rotation", "Every 180 days for HR Admin, Payroll and Owner"],
        ["Failed attempts before lockout", "5"],
        ["Lockout duration", "15 minutes"],
      ],
    },
    {
      kind: "note",
      title: "Why rotation is limited to privileged roles",
      text: "Forced rotation across everyone tends to produce weaker, predictable passwords. It is applied only where the blast radius justifies it — the roles that can read salary or change employment status.",
    },
  ],

  "session-timeout": [
    { kind: "managedTable", tableId: "session-timeouts" },
    {
      kind: "fields",
      title: "Behaviour",
      rows: [
        ["Warning before timeout", "2 minutes, with an extend button"],
        [
          "Unsaved form data",
          "Held locally and restored after re-authentication",
        ],
        ["Sign out everywhere", "Available to the person and to HR Admin"],
      ],
    },
  ],

  // ---------------------------------------------------------- Notifications
  "email-in-app-notification": [
    { kind: "managedTable", tableId: "notification-events" },
  ],

  "reminder-schedules": [
    { kind: "managedTable", tableId: "reminder-schedules" },
  ],

  // ----------------------------------------------------------- Integrations
  "api-keys-webhooks": [
    { kind: "managedTable", tableId: "api-keys" },
    { kind: "managedTable", tableId: "webhooks" },
  ],
}
