import type { Tone } from "@/components/common"

/**
 * Editable settings tables.
 *
 * Each table is a schema plus seed rows. One generic component renders the
 * table, the add/edit form and the delete confirmation from this spec, so a new
 * configurable list is data here rather than a new screen.
 */

export type ColumnType = "text" | "number" | "select" | "toggle"

export interface ColumnSpec {
  key: string
  label: string
  type: ColumnType
  /** Options for a select column. */
  options?: string[]
  required?: boolean
  hint?: string
  /** Renders the value as a coloured pill. */
  tone?: Record<string, Tone>
  mono?: boolean
  /** Hidden in the table but still editable in the form. */
  formOnly?: boolean
}

export interface TableSpec {
  id: string
  title: string
  description?: string
  footnote?: string
  columns: ColumnSpec[]
  /** Rows are a fixed set — days of the week, permission roles, and so on. */
  canAdd?: boolean
  canDelete?: boolean
  addLabel?: string
  /** Column whose value names a row in toasts and the delete confirmation. */
  labelKey: string
}

export type TableRow = Record<string, string | number | boolean> & {
  id: string
}

const YES_NO: Record<string, Tone> = { true: "success", false: "neutral" }

const t = (
  key: string,
  label: string,
  extra: Partial<ColumnSpec> = {}
): ColumnSpec => ({
  key,
  label,
  type: "text",
  ...extra,
})
const sel = (
  key: string,
  label: string,
  options: string[],
  extra: Partial<ColumnSpec> = {}
): ColumnSpec => ({ key, label, type: "select", options, ...extra })
const tog = (key: string, label: string): ColumnSpec => ({
  key,
  label,
  type: "toggle",
  tone: YES_NO,
})

export const TABLE_SPECS: Record<string, TableSpec> = {
  "custom-fields": {
    id: "custom-fields",
    title: "Fields on the employee record",
    description:
      "Added on top of the standard record. Visibility is enforced by the permission layer, not by hiding the field in the UI.",
    footnote:
      "Fields set to purpose-based follow the medical-data rule: HR must state a reason, and the access is logged.",
    addLabel: "Add field",
    labelKey: "name",
    columns: [
      t("name", "Field", { required: true }),
      sel(
        "type",
        "Type",
        ["Text", "Long text", "Number", "Date", "Select", "Group"],
        {
          required: true,
        }
      ),
      sel("appliesTo", "Applies to", [
        "All employees",
        "Non-Ghanaian nationals",
        "Engineering",
        "Finance",
        "People",
        "Operations",
      ]),
      sel(
        "visibleTo",
        "Visible to",
        ["HR only", "HR, Self", "HR, Line manager", "HR — purpose-based"],
        { tone: { "HR — purpose-based": "warning" } }
      ),
      tog("required", "Required"),
    ],
  },

  "job-titles": {
    id: "job-titles",
    title: "Job titles",
    description:
      "Every title an employee record can be assigned to, with its family and pay grade band.",
    footnote: "A title cannot be removed while an employee still holds it.",
    addLabel: "Add job title",
    labelKey: "title",
    columns: [
      t("title", "Job title", { required: true }),
      sel("family", "Family", [
        "Executive",
        "Engineering",
        "Product",
        "Marketing",
        "People",
        "Finance",
        "Operations",
        "Data & Insights",
        "Customer Success",
      ]),
      sel("grade", "Grade band", ["L1", "L2", "L3", "L4", "L5", "L6", "L7"]),
      { key: "filled", label: "Filled", type: "number" },
    ],
  },

  "pay-grades": {
    id: "pay-grades",
    title: "Pay grade bands",
    description: "Monthly gross range per grade, in Ghana Cedis.",
    addLabel: "Add grade",
    labelKey: "grade",
    columns: [
      t("grade", "Grade", { required: true }),
      t("min", "Minimum", { required: true }),
      t("mid", "Midpoint"),
      t("max", "Maximum", { required: true }),
    ],
  },

  "employment-types": {
    id: "employment-types",
    title: "Types in use",
    description:
      "Each type changes how payroll, leave accrual and statutory contributions behave.",
    footnote:
      "Types with no social security deduction are left out of the remittance file automatically. Which scheme that is, and at what rate, is set by the country rule pack — not here.",
    addLabel: "Add type",
    labelKey: "name",
    columns: [
      t("name", "Type", { required: true }),
      // Whether the country's scheme applies, not which scheme it is. The
      // scheme has a name in Ghana and a different one everywhere else.
      sel("socialSecurity", "Social security", ["Deducted", "Not deducted"], {
        tone: { "Not deducted": "neutral", Deducted: "success" },
      }),
      t("accrual", "Leave accrual"),
      t("notice", "Notice period"),
    ],
  },

  "working-week": {
    id: "working-week",
    title: "Standard week",
    description:
      "Which days count as working days, and the hours expected on each.",
    canAdd: false,
    canDelete: false,
    labelKey: "day",
    columns: [
      t("day", "Day"),
      tog("working", "Working day"),
      t("start", "Start"),
      t("end", "End"),
      t("breakMins", "Break"),
    ],
  },

  "work-schedules": {
    id: "work-schedules",
    title: "Schedules",
    addLabel: "Add schedule",
    labelKey: "name",
    columns: [
      t("name", "Schedule", { required: true }),
      t("pattern", "Pattern", { required: true }),
      t("hours", "Hours"),
      sel("branch", "Branch", ["All", "Accra HQ", "Kumasi", "Takoradi"]),
      { key: "assigned", label: "Assigned", type: "number" },
    ],
  },

  "overtime-rates": {
    id: "overtime-rates",
    title: "Overtime rates",
    description: "Applied to the hourly rate derived from monthly gross.",
    footnote:
      "Overtime is capped at 24 hours per employee per month without written HR approval.",
    addLabel: "Add rate",
    labelKey: "condition",
    columns: [
      t("condition", "Condition", { required: true }),
      sel("multiplier", "Multiplier", ["1.0×", "1.5×", "2.0×", "2.5×"]),
      sel("approver", "Approval required", [
        "Line manager",
        "Head of Department",
        "HR Admin",
        "None",
      ]),
    ],
  },

  "leave-types": {
    id: "leave-types",
    title: "Leave types",
    description:
      "Entitlement is the statutory minimum or better. Ghana's Labour Act sets 15 working days as the floor for annual leave.",
    footnote:
      "Carry-over expires on 31 March of the following year. Days beyond the cap are forfeited, not paid out.",
    addLabel: "Add leave type",
    labelKey: "name",
    columns: [
      t("name", "Type", { required: true }),
      t("entitlement", "Entitlement", { required: true }),
      tog("paid", "Paid"),
      sel("accrual", "Accrual", [
        "Monthly",
        "Upfront",
        "On event",
        "On approval",
      ]),
      t("carryOver", "Carry over"),
      t("evidence", "Evidence"),
    ],
  },

  "public-holidays": {
    id: "public-holidays",
    title: "Ghana public holidays — 2026",
    description:
      "Leave and attendance are measured against this calendar. A holiday falling on a weekend is observed on the following Monday.",
    footnote:
      "Islamic holiday dates are confirmed by national declaration and may shift by a day.",
    addLabel: "Add holiday",
    labelKey: "name",
    columns: [
      t("date", "Date", { required: true }),
      sel("day", "Day", [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ]),
      t("name", "Holiday", { required: true }),
      sel("type", "Type", ["Statutory", "Company"], {
        tone: { Statutory: "info", Company: "neutral" },
      }),
      t("observed", "Observed", {
        hint: "Leave as Yes, or note when it is observed instead",
      }),
    ],
  },

  "approval-routing": {
    id: "approval-routing",
    title: "Approval routing",
    addLabel: "Add rule",
    labelKey: "request",
    columns: [
      t("request", "Request", { required: true }),
      sel("first", "First approver", [
        "Line manager",
        "Head of Department",
        "HR Admin",
        "Finance",
        "Owner",
      ]),
      sel("second", "Second approver", [
        "None",
        "Line manager",
        "Head of Department",
        "HR Admin",
        "Finance",
        "Owner",
      ]),
      t("escalates", "Escalates after"),
    ],
  },

  "user-accounts": {
    id: "user-accounts",
    title: "Accounts",
    description:
      "Who can sign in. A person can hold several permission roles at once — see Role assignment.",
    footnote:
      "Deactivating an account never deletes the person's record or their history in the audit log.",
    addLabel: "Invite user",
    labelKey: "name",
    columns: [
      t("name", "Name", { required: true }),
      t("email", "Work email", { required: true, mono: true }),
      t("roles", "Roles"),
      sel("status", "Status", ["Active", "Suspended", "Deactivated"], {
        tone: {
          Active: "success",
          Suspended: "danger",
          Deactivated: "neutral",
        },
      }),
      t("lastActive", "Last active"),
    ],
  },

  "twofa-by-role": {
    id: "twofa-by-role",
    title: "Requirement by role",
    footnote:
      "Roles that can see compensation or change lifecycle state must enrol before their next sign-in.",
    canAdd: false,
    canDelete: false,
    labelKey: "role",
    columns: [
      t("role", "Role"),
      sel("requirement", "Required", ["Required", "Encouraged", "Optional"], {
        tone: {
          Required: "success",
          Encouraged: "warning",
          Optional: "neutral",
        },
      }),
      t("methods", "Methods allowed"),
      t("enrolled", "Enrolled"),
    ],
  },

  "session-timeouts": {
    id: "session-timeouts",
    title: "Timeouts by role",
    canAdd: false,
    canDelete: false,
    labelKey: "role",
    columns: [
      t("role", "Role"),
      t("idle", "Idle timeout", { required: true }),
      t("absolute", "Absolute session"),
      { key: "concurrent", label: "Concurrent sessions", type: "number" },
    ],
  },

  "notification-events": {
    id: "notification-events",
    title: "Events",
    description: "Which events notify whom, and through which channel.",
    footnote:
      "Salary changes never trigger a notification to anyone but the employee, HR and Payroll.",
    addLabel: "Add event",
    labelKey: "event",
    columns: [
      t("event", "Event", { required: true }),
      t("recipients", "Recipients"),
      tog("inApp", "In-app"),
      tog("email", "Email"),
      sel("digest", "Digest", ["No", "Daily", "Weekly"], {
        tone: { No: "neutral", Daily: "info", Weekly: "info" },
      }),
    ],
  },

  "reminder-schedules": {
    id: "reminder-schedules",
    title: "Chase schedule",
    addLabel: "Add reminder",
    labelKey: "item",
    columns: [
      t("item", "Outstanding item", { required: true }),
      t("first", "First reminder"),
      t("repeat", "Repeat"),
      sel("escalatesTo", "Escalates to", [
        "Line manager",
        "Head of Department",
        "HR Admin",
        "Owner",
      ]),
      t("after", "After"),
    ],
  },

  "api-keys": {
    id: "api-keys",
    title: "API keys",
    footnote:
      "Keys are shown once at creation and never again. The BI key can only read aggregates above the 5-person floor.",
    addLabel: "Create key",
    labelKey: "label",
    columns: [
      t("label", "Label", { required: true }),
      t("key", "Key", { mono: true, hint: "Generated on creation" }),
      t("scope", "Scope", { required: true }),
      t("created", "Created"),
      t("lastUsed", "Last used"),
    ],
  },

  webhooks: {
    id: "webhooks",
    title: "Webhooks",
    footnote:
      "Failed deliveries retry 5 times with exponential backoff, then raise an alert to HR Admin.",
    addLabel: "Add webhook",
    labelKey: "event",
    columns: [
      t("event", "Event", { required: true }),
      t("endpoint", "Endpoint", { required: true, mono: true }),
      sel("status", "Status", ["Healthy", "Retrying", "Failed"], {
        tone: { Healthy: "success", Retrying: "warning", Failed: "danger" },
      }),
      t("lastDelivery", "Last delivery"),
    ],
  },
}

function rows(id: string, list: Omit<TableRow, "id">[]): TableRow[] {
  return list.map((r, i) => ({ id: `${id}-${i + 1}`, ...r }) as TableRow)
}

export const TABLE_ROWS: Record<string, TableRow[]> = {
  "custom-fields": rows("cf", [
    {
      name: "T-shirt size",
      type: "Select",
      appliesTo: "All employees",
      visibleTo: "HR only",
      required: false,
    },
    {
      name: "Dietary requirement",
      type: "Select",
      appliesTo: "All employees",
      visibleTo: "HR only",
      required: false,
    },
    {
      name: "Next of kin (second)",
      type: "Group",
      appliesTo: "All employees",
      visibleTo: "HR, Self",
      required: false,
    },
    {
      name: "Professional body",
      type: "Text",
      appliesTo: "Finance",
      visibleTo: "HR, Line manager",
      required: false,
    },
    {
      name: "Work permit number",
      type: "Text",
      appliesTo: "Non-Ghanaian nationals",
      visibleTo: "HR only",
      required: true,
    },
    {
      name: "Disability accommodation",
      type: "Long text",
      appliesTo: "All employees",
      visibleTo: "HR — purpose-based",
      required: false,
    },
  ]),

  "job-titles": rows("jt", [
    { title: "Managing Director", family: "Executive", grade: "L7", filled: 1 },
    { title: "VP Engineering", family: "Engineering", grade: "L6", filled: 1 },
    { title: "Director of Product", family: "Product", grade: "L6", filled: 1 },
    { title: "Head of Marketing", family: "Marketing", grade: "L6", filled: 1 },
    { title: "Head of People", family: "People", grade: "L6", filled: 1 },
    { title: "Finance Manager", family: "Finance", grade: "L5", filled: 1 },
    { title: "DevOps Engineer", family: "Engineering", grade: "L5", filled: 1 },
    {
      title: "Regional Sales Manager",
      family: "Marketing",
      grade: "L5",
      filled: 1,
    },
    {
      title: "Senior Product Designer",
      family: "Product",
      grade: "L4",
      filled: 1,
    },
    {
      title: "Software Engineer",
      family: "Engineering",
      grade: "L3",
      filled: 2,
    },
    {
      title: "Data Analyst",
      family: "Data & Insights",
      grade: "L3",
      filled: 1,
    },
    { title: "QA Engineer", family: "Engineering", grade: "L2", filled: 1 },
    { title: "HR Intern", family: "People", grade: "L1", filled: 1 },
  ]),

  "pay-grades": rows("pg", [
    { grade: "L1", min: "GHS 1,500", mid: "GHS 1,800", max: "GHS 2,200" },
    { grade: "L2", min: "GHS 5,500", mid: "GHS 6,400", max: "GHS 7,500" },
    { grade: "L3", min: "GHS 6,800", mid: "GHS 8,000", max: "GHS 9,500" },
    { grade: "L4", min: "GHS 9,000", mid: "GHS 10,500", max: "GHS 12,500" },
    { grade: "L5", min: "GHS 12,000", mid: "GHS 14,500", max: "GHS 17,000" },
    { grade: "L6", min: "GHS 19,000", mid: "GHS 23,000", max: "GHS 27,000" },
    { grade: "L7", min: "GHS 30,000", mid: "GHS 38,000", max: "GHS 46,000" },
  ]),

  "employment-types": rows("et", [
    {
      name: "Full-time",
      socialSecurity: "Deducted",
      accrual: "15–21 days / year",
      notice: "30 days",
    },
    {
      name: "Part-time",
      socialSecurity: "Deducted",
      accrual: "Pro-rata",
      notice: "14 days",
    },
    {
      name: "Contractor",
      socialSecurity: "Not deducted",
      accrual: "None",
      notice: "Per contract",
    },
    {
      name: "Intern",
      socialSecurity: "Not deducted",
      accrual: "None",
      notice: "7 days",
    },
    {
      name: "National Service",
      socialSecurity: "Not deducted",
      accrual: "Per NSS scheme",
      notice: "Per posting",
    },
  ]),

  "working-week": rows("ww", [
    {
      day: "Monday",
      working: true,
      start: "08:00",
      end: "17:00",
      breakMins: "60 min",
    },
    {
      day: "Tuesday",
      working: true,
      start: "08:00",
      end: "17:00",
      breakMins: "60 min",
    },
    {
      day: "Wednesday",
      working: true,
      start: "08:00",
      end: "17:00",
      breakMins: "60 min",
    },
    {
      day: "Thursday",
      working: true,
      start: "08:00",
      end: "17:00",
      breakMins: "60 min",
    },
    {
      day: "Friday",
      working: true,
      start: "08:00",
      end: "16:00",
      breakMins: "60 min",
    },
    { day: "Saturday", working: false, start: "—", end: "—", breakMins: "—" },
    { day: "Sunday", working: false, start: "—", end: "—", breakMins: "—" },
  ]),

  "work-schedules": rows("ws", [
    {
      name: "Standard office",
      pattern: "Mon–Fri, 08:00–17:00",
      hours: "40 / week",
      branch: "All",
      assigned: 18,
    },
    {
      name: "Warehouse early",
      pattern: "Mon–Sat, 06:00–14:00",
      hours: "44 / week",
      branch: "Kumasi",
      assigned: 3,
    },
    {
      name: "Warehouse late",
      pattern: "Mon–Sat, 14:00–22:00",
      hours: "44 / week",
      branch: "Kumasi",
      assigned: 0,
    },
    {
      name: "Support rota",
      pattern: "Rotating, 7 days",
      hours: "40 / week",
      branch: "Accra HQ",
      assigned: 2,
    },
  ]),

  "overtime-rates": rows("ot", [
    {
      condition: "Weekday beyond 17:00",
      multiplier: "1.5×",
      approver: "Line manager",
    },
    { condition: "Saturday", multiplier: "1.5×", approver: "Line manager" },
    { condition: "Sunday", multiplier: "2.0×", approver: "Head of Department" },
    {
      condition: "Public holiday",
      multiplier: "2.0×",
      approver: "Head of Department",
    },
  ]),

  "leave-types": rows("lt", [
    {
      name: "Annual",
      entitlement: "15–21 days by grade",
      paid: true,
      accrual: "Monthly",
      carryOver: "Up to 5 days",
      evidence: "None",
    },
    {
      name: "Sick",
      entitlement: "12 days",
      paid: true,
      accrual: "Upfront",
      carryOver: "None",
      evidence: "Medical note after 2 days",
    },
    {
      name: "Maternity",
      entitlement: "14 weeks",
      paid: true,
      accrual: "On event",
      carryOver: "None",
      evidence: "Medical certificate",
    },
    {
      name: "Paternity",
      entitlement: "5 days",
      paid: true,
      accrual: "On event",
      carryOver: "None",
      evidence: "None",
    },
    {
      name: "Compassionate",
      entitlement: "5 days",
      paid: true,
      accrual: "On event",
      carryOver: "None",
      evidence: "None",
    },
    {
      name: "Study",
      entitlement: "10 days",
      paid: true,
      accrual: "On approval",
      carryOver: "None",
      evidence: "Proof of enrolment",
    },
    {
      name: "Unpaid",
      entitlement: "No limit",
      paid: false,
      accrual: "On approval",
      carryOver: "None",
      evidence: "None",
    },
  ]),

  "public-holidays": rows("ph", [
    {
      date: "1 January",
      day: "Thursday",
      name: "New Year's Day",
      type: "Statutory",
      observed: "Yes",
    },
    {
      date: "7 January",
      day: "Wednesday",
      name: "Constitution Day",
      type: "Statutory",
      observed: "Yes",
    },
    {
      date: "6 March",
      day: "Friday",
      name: "Independence Day",
      type: "Statutory",
      observed: "Yes",
    },
    {
      date: "20 March",
      day: "Friday",
      name: "Eid ul-Fitr",
      type: "Statutory",
      observed: "Subject to moon sighting",
    },
    {
      date: "3 April",
      day: "Friday",
      name: "Good Friday",
      type: "Statutory",
      observed: "Yes",
    },
    {
      date: "6 April",
      day: "Monday",
      name: "Easter Monday",
      type: "Statutory",
      observed: "Yes",
    },
    {
      date: "1 May",
      day: "Friday",
      name: "May Day",
      type: "Statutory",
      observed: "Yes",
    },
    {
      date: "27 May",
      day: "Wednesday",
      name: "Eid ul-Adha",
      type: "Statutory",
      observed: "Subject to moon sighting",
    },
    {
      date: "4 August",
      day: "Tuesday",
      name: "Founders' Day",
      type: "Statutory",
      observed: "Yes",
    },
    {
      date: "21 September",
      day: "Monday",
      name: "Kwame Nkrumah Memorial Day",
      type: "Statutory",
      observed: "Yes",
    },
    {
      date: "4 December",
      day: "Friday",
      name: "Farmers' Day",
      type: "Statutory",
      observed: "Yes",
    },
    {
      date: "25 December",
      day: "Friday",
      name: "Christmas Day",
      type: "Statutory",
      observed: "Yes",
    },
    {
      date: "26 December",
      day: "Saturday",
      name: "Boxing Day",
      type: "Statutory",
      observed: "Observed Mon 28 Dec",
    },
  ]),

  "approval-routing": rows("ar", [
    {
      request: "Annual leave ≤ 5 days",
      first: "Line manager",
      second: "None",
      escalates: "3 days",
    },
    {
      request: "Annual leave > 5 days",
      first: "Line manager",
      second: "Head of Department",
      escalates: "3 days",
    },
    {
      request: "Sick leave",
      first: "Line manager",
      second: "None",
      escalates: "1 day",
    },
    {
      request: "Maternity / paternity",
      first: "HR Admin",
      second: "None",
      escalates: "2 days",
    },
    {
      request: "Unpaid leave",
      first: "Line manager",
      second: "HR Admin",
      escalates: "3 days",
    },
    {
      request: "Overtime claim",
      first: "Line manager",
      second: "Finance",
      escalates: "5 days",
    },
  ]),

  "user-accounts": rows("ua", [
    {
      name: "Fiifi Boakye",
      email: "fiifi.boakye@xanthan.com",
      roles: "HR Admin, Employee",
      status: "Active",
      lastActive: "Today, 09:12",
    },
    {
      name: "Esi Quainoo",
      email: "esi.quainoo@xanthan.com",
      roles: "Owner, HR Admin, Employee",
      status: "Active",
      lastActive: "Today, 08:40",
    },
    {
      name: "Maame Yeboah",
      email: "maame.yeboah@xanthan.com",
      roles: "Payroll, Employee",
      status: "Active",
      lastActive: "Yesterday, 16:55",
    },
    {
      name: "Adwoa Bediako",
      email: "adwoa.bediako@xanthan.com",
      roles: "Line Manager, Employee",
      status: "Active",
      lastActive: "Today, 10:03",
    },
    {
      name: "Kwesi Owusu",
      email: "kwesi.owusu@xanthan.com",
      roles: "Head of Department, Employee",
      status: "Active",
      lastActive: "Today, 07:58",
    },
    {
      name: "Serwa Acheampong",
      email: "serwa.acheampong@xanthan.com",
      roles: "HR Admin, Employee",
      status: "Active",
      lastActive: "2 days ago",
    },
    {
      name: "Kobby Ansah",
      email: "kobby.ansah@xanthan.com",
      roles: "Employee",
      status: "Suspended",
      lastActive: "24 Aug 2026",
    },
    {
      name: "Nii Lartey",
      email: "nii.lartey@xanthan.com",
      roles: "Employee",
      status: "Deactivated",
      lastActive: "31 Dec 2025",
    },
  ]),

  "twofa-by-role": rows("2fa", [
    {
      role: "Owner",
      requirement: "Required",
      methods: "Authenticator app, SMS",
      enrolled: "1 of 1",
    },
    {
      role: "HR Admin",
      requirement: "Required",
      methods: "Authenticator app, SMS",
      enrolled: "2 of 2",
    },
    {
      role: "Payroll",
      requirement: "Required",
      methods: "Authenticator app",
      enrolled: "1 of 1",
    },
    {
      role: "Head of Department",
      requirement: "Encouraged",
      methods: "Authenticator app, SMS",
      enrolled: "1 of 2",
    },
    {
      role: "Line Manager",
      requirement: "Optional",
      methods: "Authenticator app, SMS",
      enrolled: "0 of 4",
    },
    {
      role: "Employee",
      requirement: "Optional",
      methods: "Authenticator app, SMS",
      enrolled: "3 of 25",
    },
  ]),

  "session-timeouts": rows("sto", [
    { role: "Owner", idle: "20 minutes", absolute: "8 hours", concurrent: 2 },
    {
      role: "HR Admin",
      idle: "20 minutes",
      absolute: "8 hours",
      concurrent: 2,
    },
    { role: "Payroll", idle: "15 minutes", absolute: "8 hours", concurrent: 1 },
    {
      role: "Head of Department",
      idle: "45 minutes",
      absolute: "12 hours",
      concurrent: 3,
    },
    {
      role: "Line Manager",
      idle: "45 minutes",
      absolute: "12 hours",
      concurrent: 3,
    },
    {
      role: "Employee",
      idle: "60 minutes",
      absolute: "24 hours",
      concurrent: 3,
    },
  ]),

  "notification-events": rows("ne", [
    {
      event: "Leave request submitted",
      recipients: "Line manager, dotted-line manager",
      inApp: true,
      email: true,
      digest: "No",
    },
    {
      event: "Leave decision made",
      recipients: "Requesting employee",
      inApp: true,
      email: true,
      digest: "No",
    },
    {
      event: "Contract expiring",
      recipients: "HR Admin, line manager",
      inApp: true,
      email: true,
      digest: "Weekly",
    },
    {
      event: "Probation ending",
      recipients: "HR Admin, line manager",
      inApp: true,
      email: true,
      digest: "Weekly",
    },
    {
      event: "Document expiring",
      recipients: "HR Admin, the employee",
      inApp: true,
      email: true,
      digest: "Weekly",
    },
    {
      event: "New starter added",
      recipients: "HR Admin, IT, line manager",
      inApp: true,
      email: true,
      digest: "No",
    },
    {
      event: "Lifecycle state changed",
      recipients: "HR Admin, line manager",
      inApp: true,
      email: false,
      digest: "No",
    },
    {
      event: "Disciplinary case opened",
      recipients: "HR Admin only",
      inApp: true,
      email: true,
      digest: "No",
    },
    {
      event: "Payroll run ready for approval",
      recipients: "Payroll, Owner",
      inApp: true,
      email: true,
      digest: "No",
    },
    {
      event: "Review cycle opening",
      recipients: "All managers",
      inApp: true,
      email: true,
      digest: "No",
    },
  ]),

  "reminder-schedules": rows("rs", [
    {
      item: "Leave request undecided",
      first: "After 24 hours",
      repeat: "Daily",
      escalatesTo: "Head of Department",
      after: "3 days",
    },
    {
      item: "Onboarding task overdue",
      first: "On due date",
      repeat: "Every 2 days",
      escalatesTo: "HR Admin",
      after: "5 days",
    },
    {
      item: "Missing required document",
      first: "7 days before start",
      repeat: "Every 2 days",
      escalatesTo: "HR Admin",
      after: "On start date",
    },
    {
      item: "Contract expiry unacknowledged",
      first: "30 days out",
      repeat: "At 15 and 7 days",
      escalatesTo: "Owner",
      after: "7 days",
    },
    {
      item: "Performance review overdue",
      first: "On due date",
      repeat: "Weekly",
      escalatesTo: "Head of Department",
      after: "14 days",
    },
    {
      item: "Exit clearance incomplete",
      first: "7 days before last day",
      repeat: "Daily",
      escalatesTo: "HR Admin",
      after: "Last working day",
    },
  ]),

  "api-keys": rows("ak", [
    {
      label: "Payroll bureau export",
      key: "zel_live_••••••••4f2a",
      scope: "Read: employees, compensation",
      created: "12 Mar 2026",
      lastUsed: "Yesterday",
    },
    {
      label: "Identity provider sync",
      key: "zel_live_••••••••9c71",
      scope: "Read/write: users",
      created: "4 Jan 2026",
      lastUsed: "Today, 06:00",
    },
    {
      label: "Attendance terminals",
      key: "zel_live_••••••••2b58",
      scope: "Write: attendance",
      created: "19 Nov 2025",
      lastUsed: "Today, 08:02",
    },
    {
      label: "BI warehouse (read-only)",
      key: "zel_live_••••••••7e03",
      scope: "Read: aggregates only",
      created: "2 Jun 2026",
      lastUsed: "3 days ago",
    },
  ]),

  webhooks: rows("wh", [
    {
      event: "employee.created",
      endpoint: "https://it.xanthan.com/hooks/zelos",
      status: "Healthy",
      lastDelivery: "Today, 09:14 — 200",
    },
    {
      event: "employee.lifecycle_changed",
      endpoint: "https://it.xanthan.com/hooks/zelos",
      status: "Healthy",
      lastDelivery: "Yesterday, 11:02 — 200",
    },
    {
      event: "leave.approved",
      endpoint: "https://ops.xanthan.com/rota",
      status: "Retrying",
      lastDelivery: "Today, 07:31 — 503",
    },
    {
      event: "payroll.run_completed",
      endpoint: "https://finance.xanthan.com/hooks",
      status: "Healthy",
      lastDelivery: "28 Aug 2026 — 200",
    },
  ]),
}
