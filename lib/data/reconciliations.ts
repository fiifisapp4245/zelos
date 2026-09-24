import type { Reconciliation } from "../leave/reconcile"

/**
 * Mismatches somebody has already dealt with. Nothing here changed an
 * attendance capture or a leave request — each entry only records who
 * looked at the disagreement, and when.
 */
export const RECONCILIATIONS: Reconciliation[] = [
  {
    key: "leaveAfterTheFact:adjoa:2026-09-04",
    action: "markedReconciled",
    note: "Compassionate leave filed on her return; the register reads V from then.",
    by: "akwasi",
    at: "2026-09-07T10:20:00",
  },
]
