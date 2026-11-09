import type { Alert, AlertKind, AlertSettings } from "./types"
import { daysUntil } from "./format"

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  leadDays: {
    contract_expiry: 30,
    probation_end: 30,
    document_expiry: 60,
    retirement: 180,
  },
  lastEmailedOn: null,
}

/** An alert shows once it is within its kind's lead time, or already past due. */
export function isDue(a: Alert, settings: AlertSettings) {
  const d = daysUntil(a.dueOn)
  return d !== null && d <= (settings.leadDays[a.kind] ?? 30)
}

export const LEAD_LIMITS = { min: 1, max: 365 }

export function validLead(n: number) {
  return Number.isInteger(n) && n >= LEAD_LIMITS.min && n <= LEAD_LIMITS.max
}

export type { AlertKind }
