// verify against current GRA/SSNIT rules — filing days and the treatment of
// a deadline falling at a weekend are set by regulation and do change.

export interface StatutoryDeadline {
  id: string
  /** yyyy-mm-dd the filing or payment is due. */
  dueOn: string
  label: string
  authority: "GRA" | "SSNIT" | "Internal"
  detail: string
}

export const STATUTORY_CALENDAR: StatutoryDeadline[] = [
  {
    id: "ssnit-2026-09",
    dueOn: "2026-09-14",
    label: "SSNIT Tier 1 contribution",
    authority: "SSNIT",
    detail: "13.5% employer share for August, filed by the 14th.",
  },
  {
    id: "paye-2026-09",
    dueOn: "2026-09-15",
    label: "PAYE monthly return",
    authority: "GRA",
    detail: "August deductions, due by the 15th of the following month.",
  },
  {
    id: "payroll-run-2026-09",
    dueOn: "2026-09-25",
    label: "September payroll run",
    authority: "Internal",
    detail: "Cut-off for changes is three working days before the run.",
  },
  {
    id: "tier2-2026-09",
    dueOn: "2026-09-28",
    label: "Tier 2 remittance",
    authority: "SSNIT",
    detail: "5% to the approved corporate trustee.",
  },
  {
    id: "ssnit-2026-10",
    dueOn: "2026-10-14",
    label: "SSNIT Tier 1 contribution",
    authority: "SSNIT",
    detail: "13.5% employer share for September.",
  },
  {
    id: "paye-2026-10",
    dueOn: "2026-10-15",
    label: "PAYE monthly return",
    authority: "GRA",
    detail: "September deductions.",
  },
  {
    id: "vat-2026-10",
    dueOn: "2026-10-31",
    label: "Annual PAYE reconciliation",
    authority: "GRA",
    detail: "Employer's yearly return of emoluments.",
  },
]
