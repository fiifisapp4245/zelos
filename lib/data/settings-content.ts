import type { Tone } from "@/components/common"

/**
 * Sample content for each Company Settings screen.
 *
 * These are realistic values for the launch jurisdiction (Ghana) on a ~25-person
 * services company, so the prototype shows what each screen holds rather than an
 * empty shell. Rendered generically by the settings detail route.
 */

export interface Cell {
  text: string
  tone?: Tone
  mono?: boolean
  muted?: boolean
}

export type Row = (string | Cell)[]

export type Block =
  | {
      kind: "fields"
      title?: string
      description?: string
      rows: [string, string][]
    }
  | {
      kind: "table"
      title?: string
      description?: string
      columns: string[]
      rows: Row[]
      footnote?: string
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

const on = (text: string): Cell => ({ text, tone: "success" })
const off = (text: string): Cell => ({ text, tone: "neutral" })
const warn = (text: string): Cell => ({ text, tone: "warning" })
const mono = (text: string): Cell => ({ text, mono: true })

export const SETTINGS_CONTENT: Record<string, Block[]> = {
  // ---------------------------------------------------------------- Company
  "job-catalog": [
    {
      kind: "table",
      title: "Job titles",
      description:
        "Every title an employee record can be assigned to, with its family and pay grade band.",
      columns: ["Job title", "Family", "Grade band", "Filled", "Open reqs"],
      rows: [
        ["Managing Director", "Executive", "L7", "1", "—"],
        ["VP Engineering", "Engineering", "L6", "1", "—"],
        ["Director of Product", "Product", "L6", "1", "—"],
        ["Head of Marketing", "Marketing", "L6", "1", "—"],
        ["Head of People", "People", "L6", "1", "—"],
        ["Finance Manager", "Finance", "L5", "1", "—"],
        ["DevOps Engineer", "Engineering", "L5", "1", "—"],
        ["Regional Sales Manager", "Marketing", "L5", "1", "—"],
        ["Senior Product Designer", "Product", "L4", "1", "—"],
        ["Software Engineer", "Engineering", "L3", "2", warn("2")],
        ["Data Analyst", "Data & Insights", "L3", "1", "—"],
        ["QA Engineer", "Engineering", "L2", "1", "—"],
        ["HR Intern", "People", "L1", "1", "—"],
      ],
      footnote:
        "A title cannot be removed while an employee still holds it — reassign first.",
    },
    {
      kind: "table",
      title: "Pay grade bands",
      description: "Monthly gross range per grade, in Ghana Cedis.",
      columns: ["Grade", "Minimum", "Midpoint", "Maximum", "People"],
      rows: [
        ["L1", "GHS 1,500", "GHS 1,800", "GHS 2,200", "1"],
        ["L2", "GHS 5,500", "GHS 6,400", "GHS 7,500", "1"],
        ["L3", "GHS 6,800", "GHS 8,000", "GHS 9,500", "7"],
        ["L4", "GHS 9,000", "GHS 10,500", "GHS 12,500", "4"],
        ["L5", "GHS 12,000", "GHS 14,500", "GHS 17,000", "3"],
        ["L6", "GHS 19,000", "GHS 23,000", "GHS 27,000", "4"],
        ["L7", "GHS 30,000", "GHS 38,000", "GHS 46,000", "1"],
      ],
    },
  ],

  // -------------------------------------------------- Organisational shape
  "org-structure-diagram": [{ kind: "orgTree" }],

  // --------------------------------------------------------------- Employee
  "custom-fields": [
    {
      kind: "table",
      title: "Fields on the employee record",
      description:
        "Added on top of the standard record. Visibility is enforced by the permission layer, not by hiding the field in the UI.",
      columns: ["Field", "Type", "Applies to", "Visible to", "Required"],
      rows: [
        ["T-shirt size", "Select", "All employees", "HR", off("No")],
        ["Dietary requirement", "Select", "All employees", "HR", off("No")],
        [
          "Next of kin (second)",
          "Group",
          "All employees",
          "HR, Self",
          off("No"),
        ],
        [
          "Professional body",
          "Text",
          "Finance, Engineering",
          "HR, Line manager",
          off("No"),
        ],
        [
          "Work permit number",
          "Text",
          "Non-Ghanaian nationals",
          "HR only",
          on("Yes"),
        ],
        [
          "Disability accommodation",
          "Long text",
          "All employees",
          { text: "HR — purpose-based", tone: "warning" },
          off("No"),
        ],
      ],
      footnote:
        "Fields marked purpose-based follow the medical-data rule: HR must state a reason, and the access is logged.",
    },
  ],

  "employment-types": [
    {
      kind: "table",
      title: "Types in use",
      description:
        "Each type changes how payroll, leave accrual and statutory contributions behave.",
      columns: ["Type", "SSNIT", "Leave accrual", "Notice period", "People"],
      rows: [
        [
          "Full-time",
          on("Tier 1, 2 & 3"),
          "15–21 days / year",
          "30 days",
          "20",
        ],
        ["Part-time", on("Tier 1 & 2"), "Pro-rata", "14 days", "0"],
        ["Contractor", off("Not deducted"), "None", "Per contract", "1"],
        ["Intern", off("Not deducted"), "None", "7 days", "0"],
        [
          "National Service",
          off("Not deducted"),
          "Per NSS scheme",
          "Per posting",
          "1",
        ],
      ],
      footnote:
        "Contractors and National Service personnel are excluded from the SSNIT remittance file automatically.",
    },
  ],

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
    {
      kind: "table",
      title: "Standard week",
      columns: ["Day", "Working day", "Start", "End", "Break"],
      rows: [
        ["Monday", on("Yes"), "08:00", "17:00", "60 min"],
        ["Tuesday", on("Yes"), "08:00", "17:00", "60 min"],
        ["Wednesday", on("Yes"), "08:00", "17:00", "60 min"],
        ["Thursday", on("Yes"), "08:00", "17:00", "60 min"],
        ["Friday", on("Yes"), "08:00", "16:00", "60 min"],
        ["Saturday", off("No"), "—", "—", "—"],
        ["Sunday", off("No"), "—", "—", "—"],
      ],
    },
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

  "work-schedules": [
    {
      kind: "table",
      title: "Schedules",
      columns: ["Schedule", "Pattern", "Hours", "Branch", "Assigned"],
      rows: [
        ["Standard office", "Mon–Fri, 08:00–17:00", "40 / week", "All", "18"],
        ["Warehouse early", "Mon–Sat, 06:00–14:00", "44 / week", "Kumasi", "3"],
        ["Warehouse late", "Mon–Sat, 14:00–22:00", "44 / week", "Kumasi", "0"],
        ["Support rota", "Rotating, 7 days", "40 / week", "Accra HQ", "2"],
      ],
    },
  ],

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
      rows: [
        ["Late arrival grace", "15 minutes"],
        ["Marked late after", "08:15"],
        ["Early departure grace", "10 minutes"],
        ["Minimum day for attendance credit", "4 hours"],
      ],
    },
    {
      kind: "table",
      title: "Overtime rates",
      description: "Applied to the hourly rate derived from monthly gross.",
      columns: ["Condition", "Multiplier", "Approval required"],
      rows: [
        ["Weekday beyond 17:00", "1.5×", on("Line manager")],
        ["Saturday", "1.5×", on("Line manager")],
        ["Sunday", "2.0×", on("Head of Department")],
        ["Public holiday", "2.0×", on("Head of Department")],
      ],
      footnote:
        "Overtime is capped at 24 hours per employee per month without written HR approval.",
    },
  ],

  // ------------------------------------------------------------------ Leave
  "leave-policies": [
    {
      kind: "table",
      title: "Leave types",
      description:
        "Entitlement is the statutory minimum or better. Ghana's Labour Act sets 15 working days as the floor for annual leave.",
      columns: [
        "Type",
        "Entitlement",
        "Paid",
        "Accrual",
        "Carry over",
        "Evidence",
      ],
      rows: [
        [
          "Annual",
          "15–21 days by grade",
          on("Paid"),
          "Monthly",
          "Up to 5 days",
          off("None"),
        ],
        [
          "Sick",
          "12 days",
          on("Paid"),
          "Upfront",
          "None",
          warn("Medical note after 2 days"),
        ],
        [
          "Maternity",
          "14 weeks",
          on("Paid"),
          "On event",
          "None",
          warn("Medical certificate"),
        ],
        ["Paternity", "5 days", on("Paid"), "On event", "None", off("None")],
        [
          "Compassionate",
          "5 days",
          on("Paid"),
          "On event",
          "None",
          off("None"),
        ],
        [
          "Study",
          "10 days",
          on("Paid"),
          "On approval",
          "None",
          warn("Proof of enrolment"),
        ],
        [
          "Unpaid",
          "No limit",
          off("Unpaid"),
          "On approval",
          "None",
          off("None"),
        ],
      ],
      footnote:
        "Carry-over expires on 31 March of the following year. Unused days beyond the cap are forfeited, not paid out.",
    },
  ],

  "public-holidays": [
    {
      kind: "table",
      title: "Ghana public holidays — 2026",
      description:
        "Leave and attendance are measured against this calendar. A holiday falling on a weekend is observed on the following Monday.",
      columns: ["Date", "Day", "Holiday", "Type", "Observed"],
      rows: [
        ["1 January", "Thursday", "New Year's Day", "Statutory", on("Yes")],
        ["7 January", "Wednesday", "Constitution Day", "Statutory", on("Yes")],
        ["6 March", "Friday", "Independence Day", "Statutory", on("Yes")],
        [
          "20 March",
          "Friday",
          "Eid ul-Fitr",
          "Statutory",
          warn("Subject to moon sighting"),
        ],
        ["3 April", "Friday", "Good Friday", "Statutory", on("Yes")],
        ["6 April", "Monday", "Easter Monday", "Statutory", on("Yes")],
        ["1 May", "Friday", "May Day", "Statutory", on("Yes")],
        [
          "27 May",
          "Wednesday",
          "Eid ul-Adha",
          "Statutory",
          warn("Subject to moon sighting"),
        ],
        ["4 August", "Tuesday", "Founders' Day", "Statutory", on("Yes")],
        [
          "21 September",
          "Monday",
          "Kwame Nkrumah Memorial Day",
          "Statutory",
          on("Yes"),
        ],
        ["4 December", "Friday", "Farmers' Day", "Statutory", on("Yes")],
        ["25 December", "Friday", "Christmas Day", "Statutory", on("Yes")],
        [
          "26 December",
          "Saturday",
          "Boxing Day",
          "Statutory",
          warn("Observed Mon 28 Dec"),
        ],
      ],
      footnote:
        "Islamic holiday dates are confirmed by national declaration and may shift by a day. HR confirms each one two weeks ahead.",
    },
  ],

  "approval-settings": [
    {
      kind: "table",
      title: "Approval routing",
      columns: [
        "Request",
        "First approver",
        "Second approver",
        "Escalates after",
      ],
      rows: [
        ["Annual leave ≤ 5 days", "Line manager", off("None"), "3 days"],
        [
          "Annual leave > 5 days",
          "Line manager",
          "Head of Department",
          "3 days",
        ],
        ["Sick leave", "Line manager", off("None"), "1 day"],
        ["Maternity / paternity", "HR Admin", off("None"), "2 days"],
        ["Unpaid leave", "Line manager", "HR Admin", "3 days"],
        ["Overtime claim", "Line manager", "Finance", "5 days"],
      ],
    },
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
    {
      kind: "table",
      title: "SSNIT contributions",
      description: "Three-tier scheme. Tier 1 and 2 are mandatory.",
      columns: ["Tier", "Employee", "Employer", "Total", "Remitted to"],
      rows: [
        ["Tier 1 — Basic National Scheme", "5.5%", "13.0%", "13.5%", "SSNIT"],
        ["Tier 2 — Occupational Pension", "—", "5.0%", "5.0%", "Petra Trust"],
        [
          "Tier 3 — Provident Fund",
          "Voluntary",
          "Voluntary",
          "Up to 16.5%",
          "Employee's choice",
        ],
      ],
      footnote:
        "Of the 18.5% total Tier 1+2 contribution, 13.5% goes to SSNIT and 5% to the approved Tier 2 trustee.",
    },
    {
      kind: "table",
      title: "PAYE bands — monthly (GRA)",
      description:
        "Applied at disbursement on the chargeable amount after SSNIT relief.",
      columns: ["Chargeable income", "Rate", "Tax on band", "Cumulative"],
      rows: [
        ["First GHS 490", "0%", "GHS 0.00", "GHS 0.00"],
        ["Next GHS 110", "5%", "GHS 5.50", "GHS 5.50"],
        ["Next GHS 130", "10%", "GHS 13.00", "GHS 18.50"],
        ["Next GHS 3,166", "17.5%", "GHS 554.05", "GHS 572.55"],
        ["Next GHS 16,000", "25%", "GHS 4,000.00", "GHS 4,572.55"],
        ["Next GHS 30,520", "30%", "GHS 9,156.00", "GHS 13,728.55"],
        ["Above GHS 50,416", "35%", "On the excess", "—"],
      ],
      footnote:
        "Bands are configuration. When the GRA revises them, this table changes — no code is touched.",
    },
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
    {
      kind: "table",
      title: "Allowances",
      columns: ["Allowance", "Amount", "Frequency", "Taxable", "Applies to"],
      rows: [
        ["Transport", "GHS 600", "Monthly", warn("Taxable"), "All staff"],
        ["Fuel", "GHS 1,200", "Monthly", warn("Taxable"), "L5 and above"],
        ["Mobile data", "GHS 150", "Monthly", off("Non-taxable"), "All staff"],
        [
          "On-call",
          "GHS 400",
          "Per week on call",
          warn("Taxable"),
          "Engineering rota",
        ],
        [
          "Responsibility",
          "10% of basic",
          "Monthly",
          warn("Taxable"),
          "Heads of Department",
        ],
        [
          "Long service",
          "GHS 5,000",
          "On 5-year anniversary",
          warn("Taxable"),
          "All staff",
        ],
      ],
    },
    {
      kind: "table",
      title: "Deductions",
      columns: ["Deduction", "Amount", "Frequency", "Statutory", "Applies to"],
      rows: [
        [
          "SSNIT Tier 1",
          "5.5% of basic",
          "Monthly",
          on("Statutory"),
          "Full & part-time",
        ],
        [
          "PAYE",
          "Per GRA bands",
          "Monthly",
          on("Statutory"),
          "All taxable staff",
        ],
        [
          "Staff loan repayment",
          "Per agreement",
          "Monthly",
          off("Voluntary"),
          "3 employees",
        ],
        [
          "Welfare fund",
          "GHS 50",
          "Monthly",
          off("Voluntary"),
          "Opt-in — 17 employees",
        ],
        [
          "Tier 3 top-up",
          "Employee-set",
          "Monthly",
          off("Voluntary"),
          "Opt-in — 4 employees",
        ],
      ],
      footnote:
        "Total voluntary deductions are capped so that net pay never falls below 60% of gross.",
    },
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
  users: [
    {
      kind: "table",
      title: "Accounts",
      description:
        "Who can sign in. A person can hold several permission roles at once — see Role assignment.",
      columns: ["Name", "Work email", "Roles", "Status", "Last active"],
      rows: [
        [
          "Fiifi Boakye",
          mono("fiifi.boakye@xanthan.com"),
          "HR Admin, Employee",
          on("Active"),
          "Today, 09:12",
        ],
        [
          "Esi Quainoo",
          mono("esi.quainoo@xanthan.com"),
          "Owner, HR Admin, Employee",
          on("Active"),
          "Today, 08:40",
        ],
        [
          "Maame Yeboah",
          mono("maame.yeboah@xanthan.com"),
          "Payroll, Employee",
          on("Active"),
          "Yesterday, 16:55",
        ],
        [
          "Adwoa Bediako",
          mono("adwoa.bediako@xanthan.com"),
          "Line Manager, Employee",
          on("Active"),
          "Today, 10:03",
        ],
        [
          "Kwesi Owusu",
          mono("kwesi.owusu@xanthan.com"),
          "Head of Department, Employee",
          on("Active"),
          "Today, 07:58",
        ],
        [
          "Serwa Acheampong",
          mono("serwa.acheampong@xanthan.com"),
          "HR Admin, Employee",
          on("Active"),
          "2 days ago",
        ],
        [
          "Kobby Ansah",
          mono("kobby.ansah@xanthan.com"),
          "Employee",
          { text: "Suspended", tone: "danger" },
          "24 Aug 2026",
        ],
        [
          "Nii Lartey",
          mono("nii.lartey@xanthan.com"),
          "Employee",
          off("Deactivated"),
          "31 Dec 2025",
        ],
      ],
      footnote:
        "Deactivating an account never deletes the person's record or their history in the audit log.",
    },
  ],

  // --------------------------------------------------------------- Security
  "two-factor-authentication": [
    {
      kind: "table",
      title: "Requirement by role",
      columns: ["Role", "Required", "Methods allowed", "Enrolled"],
      rows: [
        ["Owner", on("Required"), "Authenticator app, SMS", "1 of 1"],
        ["HR Admin", on("Required"), "Authenticator app, SMS", "2 of 2"],
        ["Payroll", on("Required"), "Authenticator app", "1 of 1"],
        [
          "Head of Department",
          warn("Encouraged"),
          "Authenticator app, SMS",
          "1 of 2",
        ],
        ["Line Manager", off("Optional"), "Authenticator app, SMS", "0 of 4"],
        ["Employee", off("Optional"), "Authenticator app, SMS", "3 of 25"],
      ],
      footnote:
        "Roles that can see compensation or change lifecycle state must enrol before their next sign-in.",
    },
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
    {
      kind: "table",
      title: "Timeouts by role",
      columns: [
        "Role",
        "Idle timeout",
        "Absolute session",
        "Concurrent sessions",
      ],
      rows: [
        ["Owner", "20 minutes", "8 hours", "2"],
        ["HR Admin", "20 minutes", "8 hours", "2"],
        ["Payroll", "15 minutes", "8 hours", "1"],
        ["Head of Department", "45 minutes", "12 hours", "3"],
        ["Line Manager", "45 minutes", "12 hours", "3"],
        ["Employee", "60 minutes", "24 hours", "3"],
      ],
    },
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
    {
      kind: "table",
      title: "Events",
      description: "Which events notify whom, and through which channel.",
      columns: ["Event", "Recipients", "In-app", "Email", "Digest"],
      rows: [
        [
          "Leave request submitted",
          "Line manager, dotted-line manager",
          on("On"),
          on("On"),
          off("No"),
        ],
        [
          "Leave decision made",
          "Requesting employee",
          on("On"),
          on("On"),
          off("No"),
        ],
        [
          "Contract expiring",
          "HR Admin, line manager",
          on("On"),
          on("On"),
          on("Weekly"),
        ],
        [
          "Probation ending",
          "HR Admin, line manager",
          on("On"),
          on("On"),
          on("Weekly"),
        ],
        [
          "Document expiring",
          "HR Admin, the employee",
          on("On"),
          on("On"),
          on("Weekly"),
        ],
        [
          "New starter added",
          "HR Admin, IT, line manager",
          on("On"),
          on("On"),
          off("No"),
        ],
        [
          "Lifecycle state changed",
          "HR Admin, line manager",
          on("On"),
          off("Off"),
          off("No"),
        ],
        [
          "Disciplinary case opened",
          "HR Admin only",
          on("On"),
          on("On"),
          off("No"),
        ],
        [
          "Payroll run ready for approval",
          "Payroll, Owner",
          on("On"),
          on("On"),
          off("No"),
        ],
        ["Review cycle opening", "All managers", on("On"), on("On"), off("No")],
      ],
      footnote:
        "Salary changes never trigger a notification to anyone but the employee, HR and Payroll.",
    },
  ],

  "reminder-schedules": [
    {
      kind: "table",
      title: "Chase schedule",
      columns: [
        "Outstanding item",
        "First reminder",
        "Repeat",
        "Escalates to",
        "After",
      ],
      rows: [
        [
          "Leave request undecided",
          "After 24 hours",
          "Daily",
          "Head of Department",
          "3 days",
        ],
        [
          "Onboarding task overdue",
          "On due date",
          "Every 2 days",
          "HR Admin",
          "5 days",
        ],
        [
          "Missing required document",
          "7 days before start",
          "Every 2 days",
          "HR Admin",
          "On start date",
        ],
        [
          "Contract expiry unacknowledged",
          "30 days out",
          "At 15 and 7 days",
          "Owner",
          "7 days",
        ],
        [
          "Performance review overdue",
          "On due date",
          "Weekly",
          "Head of Department",
          "14 days",
        ],
        [
          "Exit clearance incomplete",
          "7 days before last day",
          "Daily",
          "HR Admin",
          "Last working day",
        ],
      ],
    },
    {
      kind: "fields",
      title: "Quiet hours",
      rows: [
        ["No notifications between", "19:00 and 07:00 GMT"],
        ["Weekends", "Held until Monday, except escalations"],
        ["Public holidays", "Held until the next working day"],
      ],
    },
  ],

  // ----------------------------------------------------------- Integrations
  "api-keys-webhooks": [
    {
      kind: "table",
      title: "API keys",
      columns: ["Label", "Key", "Scope", "Created", "Last used"],
      rows: [
        [
          "Payroll bureau export",
          mono("zel_live_••••••••4f2a"),
          "Read: employees, compensation",
          "12 Mar 2026",
          "Yesterday",
        ],
        [
          "Identity provider sync",
          mono("zel_live_••••••••9c71"),
          "Read/write: users",
          "4 Jan 2026",
          "Today, 06:00",
        ],
        [
          "Attendance terminals",
          mono("zel_live_••••••••2b58"),
          "Write: attendance",
          "19 Nov 2025",
          "Today, 08:02",
        ],
        [
          "BI warehouse (read-only)",
          mono("zel_live_••••••••7e03"),
          "Read: aggregates only",
          "2 Jun 2026",
          "3 days ago",
        ],
      ],
      footnote:
        "Keys are shown once at creation and never again. The BI key can only read aggregates above the 5-person floor.",
    },
    {
      kind: "table",
      title: "Webhooks",
      columns: ["Event", "Endpoint", "Status", "Last delivery"],
      rows: [
        [
          "employee.created",
          mono("https://it.xanthan.com/hooks/zelos"),
          on("Healthy"),
          "Today, 09:14 — 200",
        ],
        [
          "employee.lifecycle_changed",
          mono("https://it.xanthan.com/hooks/zelos"),
          on("Healthy"),
          "Yesterday, 11:02 — 200",
        ],
        [
          "leave.approved",
          mono("https://ops.xanthan.com/rota"),
          warn("Retrying"),
          "Today, 07:31 — 503",
        ],
        [
          "payroll.run_completed",
          mono("https://finance.xanthan.com/hooks"),
          on("Healthy"),
          "28 Aug 2026 — 200",
        ],
      ],
      footnote:
        "Failed deliveries retry 5 times with exponential backoff, then raise an alert to HR Admin.",
    },
  ],
}
