import { EMPLOYEES } from "./employees"
import { calculationModeFor } from "../pay/derive"
import type {
  ApprovalSettings,
  AssignmentAbroad,
  CompensationChangeRequest,
  CompensationVersion,
  CountryRulePack,
  LegalEntity,
  PayComponent,
  PayGroup,
} from "../pay/types"

/**
 * Pay data for the prototype, against TODAY = 2026-09-18.
 *
 * Nothing here is a running total. Every figure the pay screens show is
 * worked out from these versions, and a version is never rewritten — a
 * raise appends, a rejection is recorded, a cancellation is recorded.
 */

export const LEGAL_ENTITIES: LegalEntity[] = [
  {
    id: "ent-gh",
    name: "Xanthan Services Limited",
    country: "Ghana",
    currency: "GHS",
  },
  {
    id: "ent-ng",
    name: "Xanthan Nigeria Limited",
    country: "Nigeria",
    currency: "NGN",
  },
]

/**
 * Ghana statutory figures.
 *
 * PLACEHOLDER RATES. The percentages and thresholds below stand in for the
 * real ones pending legal validation with a Ghanaian payroll practitioner.
 * They live here as data precisely so that correcting them is an edit to a
 * fixture and not a change to any calculation. Nothing in the UI describes
 * them as provisional; that is a note for whoever maintains this file.
 */
const GHANA_RULES: CountryRulePack = {
  country: "Ghana",
  version: "2026.1",
  effectiveFrom: "2026-01-01",
  componentTreatments: {
    "pc-base": { taxable: true, socialSecurity: true },
    "pc-transport": { taxable: false, socialSecurity: false, cap: 300 },
    "pc-housing": { taxable: true, socialSecurity: false },
    "pc-fuel-card": { taxable: true, socialSecurity: false, cap: 500 },
    "pc-bonus": { taxable: true, socialSecurity: false },
    "pc-loan": { taxable: false, socialSecurity: false },
    "pc-ssnit-employer": { taxable: false, socialSecurity: true },
    "pc-tier2": { taxable: false, socialSecurity: true },
    "pc-mobile-data": { taxable: false, socialSecurity: false },
    "pc-on-call": { taxable: true, socialSecurity: false },
    "pc-responsibility": { taxable: true, socialSecurity: false },
    "pc-long-service": { taxable: true, socialSecurity: false },
    "pc-welfare": { taxable: false, socialSecurity: false },
    "pc-tier3": { taxable: false, socialSecurity: false },
  },
  employeeContributionRules: [
    {
      id: "ssnit-employee",
      name: "SSNIT Tier 1 & 2 (employee)",
      percentOfBase: 5.5,
      remittedTo: "SSNIT",
      note: "Deducted from gross before PAYE is worked out.",
    },
  ],
  voluntarySchemes: [
    {
      id: "tier3",
      name: "Tier 3 provident fund",
      remittedTo: "The employee's chosen trustee",
      note: "Voluntary on both sides. What anyone puts in is a pay component, not a rate set here.",
    },
  ],
  // Monthly bands, applied in order to taxable pay after the social
  // security deduction. Placeholder figures, as above.
  taxBands: [
    { upTo: 490, ratePercent: 0 },
    { upTo: 110, ratePercent: 5 },
    { upTo: 130, ratePercent: 10 },
    { upTo: 3166.67, ratePercent: 17.5 },
    { upTo: 16000, ratePercent: 25 },
    { upTo: 30520, ratePercent: 30 },
    { upTo: null, ratePercent: 35 },
  ],
  employerContributionRules: [
    {
      id: "ssnit-tier1",
      name: "SSNIT Tier 1",
      percentOfBase: 13,
      remittedTo: "SSNIT",
      note: "Employer share of the first-tier social security contribution.",
    },
    {
      id: "tier2",
      name: "Tier 2 occupational scheme",
      percentOfBase: 5,
      remittedTo: "Petra Trust",
      note: "Paid to the employee's chosen trustee.",
    },
  ],
  statutoryReports: [
    "PAYE monthly return (GRA)",
    "SSNIT contribution schedule",
    "Tier 2 trustee schedule",
    "Annual employer return",
  ],
  filingDeadlines: [
    {
      name: "PAYE monthly return",
      due: "15th of the following month",
      dueDayOfMonth: 15,
    },
    {
      name: "SSNIT contributions",
      due: "14th of the following month",
      dueDayOfMonth: 14,
    },
    {
      name: "Tier 2 remittance",
      due: "14th of the following month",
      dueDayOfMonth: 14,
    },
    { name: "Annual employer return", due: "30 April", annualOn: "04-30" },
  ],
  updates: [
    {
      title: "Rule pack 2026.1 published",
      effectiveFrom: "2026-01-01",
      summary:
        "New PAYE bands for the 2026 year of assessment, and the revised tax-free threshold.",
    },
    {
      title: "Transport allowance cap raised",
      effectiveFrom: "2026-04-01",
      summary:
        "The untaxed portion of transport allowance rises, so more of it now falls outside taxable pay.",
    },
    {
      title: "Tier 2 remittance date confirmed",
      effectiveFrom: "2026-07-01",
      summary:
        "Trustee remittance moves to the 14th, in line with the SSNIT schedule.",
    },
  ],
}

/**
 * The year before, kept so a closed period still calculates the way it
 * was paid. Bands and the transport cap moved on 1 January 2026; the
 * contribution rates did not.
 */
const GHANA_RULES_2025: CountryRulePack = {
  ...GHANA_RULES,
  version: "2025.1",
  effectiveFrom: "2025-01-01",
  componentTreatments: {
    ...GHANA_RULES.componentTreatments,
    "pc-transport": { taxable: false, socialSecurity: false, cap: 250 },
    "pc-fuel-card": { taxable: true, socialSecurity: false, cap: 400 },
  },
  taxBands: [
    { upTo: 402, ratePercent: 0 },
    { upTo: 110, ratePercent: 5 },
    { upTo: 130, ratePercent: 10 },
    { upTo: 3000, ratePercent: 17.5 },
    { upTo: 16000, ratePercent: 25 },
    { upTo: 30520, ratePercent: 30 },
    { upTo: null, ratePercent: 35 },
  ],
  updates: [
    {
      title: "Rule pack 2025.1 published",
      effectiveFrom: "2025-01-01",
      summary: "Bands for the 2025 year of assessment.",
    },
  ],
}

/**
 * Every version of every country's rules, in one list. Nothing reads
 * this by position — use packFor(), which picks by country and date.
 *
 * No Nigeria pack: that country's results are uploaded from a provider.
 */
export const COUNTRY_RULE_PACKS: CountryRulePack[] = [
  GHANA_RULES,
  GHANA_RULES_2025,
]

function group(
  g: Omit<PayGroup, "calculationMode"> & { contractorGroup?: boolean }
): PayGroup {
  return {
    ...g,
    calculationMode: calculationModeFor(
      g.country,
      Boolean(g.contractorGroup),
      COUNTRY_RULE_PACKS
    ),
  }
}

export const PAY_GROUPS: PayGroup[] = [
  group({
    id: "pg-gh-monthly",
    name: "Ghana monthly",
    entityId: "ent-gh",
    country: "Ghana",
    currency: "GHS",
    frequency: "monthly",
    payDayRule: "28th, or the last working day before it",
    paymentChannels: ["bank_transfer", "mobile_money"],
    varianceThresholdPercent: 10,
  }),
  group({
    id: "pg-ng-monthly",
    name: "Nigeria monthly",
    entityId: "ent-ng",
    country: "Nigeria",
    currency: "NGN",
    frequency: "monthly",
    payDayRule: "Last working day of the month",
    paymentChannels: ["bank_transfer"],
    varianceThresholdPercent: 12,
  }),
  group({
    id: "pg-contractors",
    name: "International contractors",
    entityId: "ent-gh",
    country: "—",
    currency: "USD",
    frequency: "monthly",
    payDayRule: "Within 14 days of an approved invoice",
    paymentChannels: ["international_transfer"],
    varianceThresholdPercent: 20,
    contractorGroup: true,
  }),
]

export const PAY_COMPONENTS: PayComponent[] = [
  {
    id: "pc-transport",
    name: "Transport allowance",
    category: "allowance",
    calculation: "fixed",
    recurrence: "recurring",
  },
  {
    id: "pc-housing",
    name: "Housing allowance",
    category: "allowance",
    calculation: "percent_of_base",
    recurrence: "recurring",
  },
  {
    id: "pc-fuel-card",
    name: "Fuel card",
    category: "benefit_in_kind",
    calculation: "fixed",
    recurrence: "recurring",
  },
  {
    id: "pc-bonus",
    name: "Performance bonus",
    category: "earning",
    calculation: "fixed",
    recurrence: "one_off",
  },
  {
    id: "pc-loan",
    name: "Staff loan repayment",
    category: "deduction",
    calculation: "fixed",
    recurrence: "recurring",
  },
  {
    id: "pc-ssnit-employer",
    name: "SSNIT Tier 1 (employer)",
    category: "employer_contribution",
    calculation: "percent_of_base",
    recurrence: "recurring",
  },
  {
    id: "pc-tier2",
    name: "Tier 2 (employer)",
    category: "employer_contribution",
    calculation: "percent_of_base",
    recurrence: "recurring",
  },
  // Company policy, carried over from the allowance and deduction lists
  // that used to be configured as free text. Who each one applies to is
  // not expressible yet — see the note in the pay rules work.
  {
    id: "pc-mobile-data",
    name: "Mobile data allowance",
    category: "allowance",
    calculation: "fixed",
    recurrence: "recurring",
  },
  {
    id: "pc-on-call",
    name: "On-call allowance",
    category: "allowance",
    calculation: "fixed",
    recurrence: "recurring",
  },
  {
    id: "pc-responsibility",
    name: "Responsibility allowance",
    category: "allowance",
    calculation: "percent_of_base",
    recurrence: "recurring",
  },
  {
    id: "pc-long-service",
    name: "Long service award",
    category: "earning",
    calculation: "fixed",
    recurrence: "one_off",
  },
  {
    id: "pc-welfare",
    name: "Welfare fund",
    category: "deduction",
    calculation: "fixed",
    recurrence: "recurring",
  },
  {
    id: "pc-tier3",
    name: "Tier 3 top-up",
    category: "deduction",
    calculation: "fixed",
    recurrence: "recurring",
  },
]

export const APPROVAL_SETTINGS: ApprovalSettings = {
  compensationApproverRole: "hr_admin",
  payrollPreparerRole: "payroll",
  payrollApproverRole: "hr_admin",
  delegateUserId: null,
}

/**
 * Selorm is with the Lagos team while the migration runs. Past 183 days
 * his tax residency moves, which changes who withholds — so the count is
 * carried on the record rather than noticed afterwards.
 */
export const ASSIGNMENTS_ABROAD: AssignmentAbroad[] = [
  {
    employeeId: "selorm",
    country: "Nigeria",
    since: "2026-04-21",
    daysAbroad: 150,
  },
]

/* ── Versions ────────────────────────────────────────────────────────── */

const NIGERIA_STAFF = ["abena", "kwesi", "akos"]
const CONTRACTORS: Record<
  string,
  { country: string; monthly: number; from?: string }
> = {
  kwame: { country: "Kenya", monthly: 4200 },
  // Engaged from September, which is why the contractor run flags her
  // as somebody who was not paid last month.
  harriet: { country: "United Kingdom", monthly: 5800, from: "2026-09-01" },
}

/** Nigeria salaries in naira, which are not Ghana salaries converted. */
const NIGERIA_BASE: Record<string, number> = {
  abena: 1_150_000,
  kwesi: 2_400_000,
  akos: 980_000,
}

const ON_STRENGTH = EMPLOYEES.filter(
  (e) =>
    !["pre_hire", "resigned", "terminated", "retired"].includes(
      e.lifecycleState
    )
)

interface Step {
  effectiveFrom: string
  base: number
  reason: string
  proposedBy: string
  approvedBy: string
  /** Overrides the derived status, for a scheduled or cancelled step. */
  status?: CompensationVersion["status"]
  changeRequestId?: string
}

function placement(employeeId: string) {
  if (CONTRACTORS[employeeId])
    return {
      entityId: "ent-gh",
      payGroupId: "pg-contractors",
      currency: "USD",
      workCountry: CONTRACTORS[employeeId].country,
      workerType: "contractor" as const,
    }
  if (NIGERIA_STAFF.includes(employeeId))
    return {
      entityId: "ent-ng",
      payGroupId: "pg-ng-monthly",
      currency: "NGN",
      workCountry: "Nigeria",
      workerType: "employee" as const,
    }
  return {
    entityId: "ent-gh",
    payGroupId: "pg-gh-monthly",
    currency: "GHS",
    workCountry: "Ghana",
    workerType: "employee" as const,
  }
}

/**
 * One person's chain. Each step supersedes the one before it, so the
 * history reads backwards without anything being overwritten.
 */
function chain(employeeId: string, steps: Step[]): CompensationVersion[] {
  const place = placement(employeeId)
  const out: CompensationVersion[] = []
  const live = steps.filter((s) => s.status !== "cancelled")

  steps.forEach((step, i) => {
    const previous = out.filter((v) => v.status !== "cancelled").at(-1) ?? null
    const isLast = live.at(-1) === step
    const status: CompensationVersion["status"] =
      step.status ?? (isLast ? "effective" : "superseded")

    out.push({
      id: `cv-${employeeId}-${i + 1}`,
      employeeId,
      versionNumber: i + 1,
      effectiveFrom: step.effectiveFrom,
      ...place,
      taxResidency: employeeId === "selorm" ? "Ghana" : place.workCountry,
      payBasis: "salaried",
      baseAmount: step.base,
      frequency: "monthly",
      components: componentsFor(employeeId, place.workerType),
      reason: step.reason,
      proposedBy: step.proposedBy,
      proposedAt: `${step.effectiveFrom}T09:00:00`,
      approvedBy: status === "pending" ? null : step.approvedBy,
      approvedAt:
        status === "pending" ? null : `${step.effectiveFrom}T15:30:00`,
      status,
      supersedesVersionId: previous?.id ?? null,
      changeRequestId: step.changeRequestId ?? null,
    })
  })

  return out
}

function componentsFor(
  employeeId: string,
  workerType: "employee" | "contractor"
) {
  if (workerType === "contractor") return []
  const senior = ["esi", "adwoa", "yaw", "fiifi", "kwesi", "akwasi"].includes(
    employeeId
  )
  return [
    { componentId: "pc-transport", amount: 300 },
    ...(senior ? [{ componentId: "pc-housing", rate: 15 }] : []),
  ]
}

/** Everyone starts with the balance migrated from the old spreadsheet. */
const OPENING = "Opening balance migrated at go-live"

const HAND_WRITTEN: Record<string, Step[]> = {
  kofi: [
    {
      effectiveFrom: "2025-01-01",
      base: 6200,
      reason: OPENING,
      proposedBy: "fiifi",
      approvedBy: "esi",
    },
    {
      effectiveFrom: "2025-07-01",
      base: 6900,
      reason: "Confirmed after probation",
      proposedBy: "adwoa",
      approvedBy: "fiifi",
    },
    {
      effectiveFrom: "2026-01-01",
      base: 7600,
      reason: "Annual review, meets expectations",
      proposedBy: "adwoa",
      approvedBy: "fiifi",
    },
  ],
  selorm: [
    {
      effectiveFrom: "2024-06-01",
      base: 7000,
      reason: OPENING,
      proposedBy: "fiifi",
      approvedBy: "esi",
    },
    {
      effectiveFrom: "2025-01-01",
      base: 8200,
      reason: "Annual review",
      proposedBy: "adwoa",
      approvedBy: "fiifi",
    },
    {
      effectiveFrom: "2025-09-01",
      base: 9400,
      reason: "Took on the platform on-call rota",
      proposedBy: "adwoa",
      approvedBy: "fiifi",
    },
    {
      effectiveFrom: "2026-03-01",
      base: 10800,
      reason: "Market adjustment for DevOps",
      proposedBy: "fiifi",
      approvedBy: "esi",
    },
  ],
  ama: [
    {
      effectiveFrom: "2025-02-01",
      base: 9800,
      reason: OPENING,
      proposedBy: "fiifi",
      approvedBy: "esi",
    },
    {
      effectiveFrom: "2026-02-01",
      base: 11200,
      reason: "Annual review, exceeds expectations",
      proposedBy: "kwesi",
      approvedBy: "fiifi",
    },
    // Agreed and dated, not yet in force.
    {
      effectiveFrom: "2026-11-01",
      base: 12600,
      reason: "Promotion to Lead Product Designer",
      proposedBy: "kwesi",
      approvedBy: "fiifi",
      status: "scheduled",
      changeRequestId: "cr-ama-promotion",
    },
  ],
  adjoa: [
    {
      effectiveFrom: "2025-03-01",
      base: 6400,
      reason: OPENING,
      proposedBy: "fiifi",
      approvedBy: "esi",
    },
    {
      effectiveFrom: "2026-01-01",
      base: 7100,
      reason: "Annual review",
      proposedBy: "akwasi",
      approvedBy: "fiifi",
    },
    // Agreed, then stood down before it took effect. Kept, never deleted.
    {
      effectiveFrom: "2026-10-01",
      base: 7900,
      reason: "Retention adjustment",
      proposedBy: "akwasi",
      approvedBy: "fiifi",
      status: "cancelled",
      changeRequestId: "cr-adjoa-retention",
    },
  ],
  abena: [
    {
      effectiveFrom: "2025-01-01",
      base: 950_000,
      reason: OPENING,
      proposedBy: "fiifi",
      approvedBy: "esi",
    },
    {
      effectiveFrom: "2026-01-01",
      base: 1_150_000,
      reason: "Annual review, Lagos market",
      proposedBy: "yaw",
      approvedBy: "fiifi",
    },
  ],
}

export const COMPENSATION_VERSIONS: CompensationVersion[] = ON_STRENGTH.flatMap(
  (e) => {
    if (HAND_WRITTEN[e.id]) return chain(e.id, HAND_WRITTEN[e.id])

    const contractor = CONTRACTORS[e.id]
    const base = contractor
      ? contractor.monthly
      : (NIGERIA_BASE[e.id] ?? e.compensation.grossMonthly)

    return chain(e.id, [
      {
        effectiveFrom: contractor?.from ?? "2026-01-01",
        base,
        reason: contractor ? "Contract start" : OPENING,
        proposedBy: "fiifi",
        approvedBy: "esi",
      },
    ])
  }
)

/* ── Change requests ─────────────────────────────────────────────────── */

export const CHANGE_REQUESTS: CompensationChangeRequest[] = [
  {
    // Waiting on HR. Proposed by the VP of Engineering, so an HR Admin
    // other than the proposer can decide it.
    id: "cr-eng-uplift",
    kind: "bulk",
    employeeIds: ["kofi", "selorm", "afia"],
    definition: { type: "percent", value: 10 },
    effectiveFrom: "2026-10-01",
    reason:
      "Engineering salaries have fallen behind the Accra market; this closes the gap before the review cycle.",
    proposedBy: "adwoa",
    status: "pending",
    decision: null,
    events: [
      {
        at: "2026-09-14T10:20:00",
        by: "adwoa",
        action: "proposed",
        note: "Benchmarked against three offers we lost this quarter.",
      },
    ],
  },
  {
    // Proposed by the HR Admin persona, so the approve button is visible
    // and disabled for them: you cannot approve what you proposed.
    id: "cr-serwa-uplift",
    kind: "individual",
    employeeIds: ["serwa"],
    definition: { type: "fixed_increase", value: 900 },
    effectiveFrom: "2026-10-01",
    reason: "Took on payroll administration alongside People Operations.",
    proposedBy: "fiifi",
    status: "pending",
    decision: null,
    events: [{ at: "2026-09-15T08:40:00", by: "fiifi", action: "proposed" }],
  },
  {
    // Touches the HR Admin's own pay, which is the other refusal.
    id: "cr-fiifi-review",
    kind: "individual",
    employeeIds: ["fiifi"],
    definition: { type: "percent", value: 8 },
    effectiveFrom: "2026-11-01",
    reason: "Head of People annual review.",
    proposedBy: "esi",
    status: "pending",
    decision: null,
    events: [{ at: "2026-09-16T16:05:00", by: "esi", action: "proposed" }],
  },
  {
    id: "cr-ama-promotion",
    kind: "individual",
    employeeIds: ["ama"],
    definition: { type: "new_amount", value: 12600 },
    effectiveFrom: "2026-11-01",
    reason: "Promotion to Lead Product Designer.",
    proposedBy: "kwesi",
    status: "approved",
    decision: {
      by: "fiifi",
      at: "2026-09-02T11:15:00",
      reason: "Agreed at the September people review.",
    },
    events: [
      { at: "2026-08-28T09:30:00", by: "kwesi", action: "proposed" },
      {
        at: "2026-09-02T11:15:00",
        by: "fiifi",
        action: "approved",
        note: "Agreed at the September people review.",
      },
    ],
  },
  {
    id: "cr-maame-uplift",
    kind: "individual",
    employeeIds: ["maame"],
    definition: { type: "percent", value: 15 },
    effectiveFrom: "2026-09-01",
    reason: "Payroll Officer market rate.",
    proposedBy: "akwasi",
    status: "rejected",
    decision: {
      by: "fiifi",
      at: "2026-08-20T14:00:00",
      reason:
        "Fifteen per cent sits outside the band for the grade. Re-propose at eight, or put the case for a regrade first.",
    },
    events: [
      { at: "2026-08-18T10:00:00", by: "akwasi", action: "proposed" },
      {
        at: "2026-08-20T14:00:00",
        by: "fiifi",
        action: "rejected",
        note: "Outside the band for the grade.",
      },
    ],
  },
  {
    id: "cr-adjoa-retention",
    kind: "individual",
    employeeIds: ["adjoa"],
    definition: { type: "new_amount", value: 7900 },
    effectiveFrom: "2026-10-01",
    reason: "Retention adjustment.",
    proposedBy: "akwasi",
    status: "cancelled",
    decision: {
      by: "akwasi",
      at: "2026-09-12T09:25:00",
      reason: "She has accepted the internal move instead, so this is moot.",
    },
    events: [
      { at: "2026-08-30T11:00:00", by: "akwasi", action: "proposed" },
      {
        at: "2026-09-04T10:00:00",
        by: "fiifi",
        action: "approved",
        note: "Approved for 1 October.",
      },
      {
        at: "2026-09-12T09:25:00",
        by: "akwasi",
        action: "cancelled",
        note: "Internal move agreed instead.",
      },
    ],
  },
  {
    // A move the company can actually make: there is a Nigeria entity.
    id: "cr-abla-relocation",
    kind: "relocation",
    employeeIds: ["abla"],
    definition: { type: "new_amount", value: 1_020_000 },
    effectiveFrom: "2026-11-01",
    reason: "Moving to the Lagos office to run regional content.",
    proposedBy: "yaw",
    status: "pending",
    decision: null,
    relocation: { toCountry: "Nigeria", toEntityId: "ent-ng" },
    events: [
      {
        at: "2026-09-10T13:00:00",
        by: "yaw",
        action: "proposed",
        note: "Lagos from November, on the Nigeria payroll.",
      },
    ],
  },
  {
    // A move the company cannot make yet: no entity in that country.
    id: "cr-kwabena-relocation",
    kind: "relocation",
    employeeIds: ["kwabena"],
    definition: { type: "new_amount", value: 9200 },
    effectiveFrom: "2026-12-01",
    reason: "Family relocation to Kigali; wants to keep the regional role.",
    proposedBy: "yaw",
    status: "pending",
    decision: null,
    relocation: { toCountry: "Rwanda", toEntityId: null },
    events: [
      {
        at: "2026-09-17T09:10:00",
        by: "yaw",
        action: "proposed",
        note: "Asked what the options are.",
      },
    ],
  },
]
