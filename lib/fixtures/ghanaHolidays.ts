// verify dates — Islamic holidays are fixed by national declaration each year
// and may shift by a day; the Monday-observed rule follows the Public Holidays
// Act where a holiday falls on a weekend.

export interface PublicHoliday {
  /** yyyy-mm-dd, the day actually observed. */
  date: string
  name: string
  /** Set when the holiday fell at a weekend and was moved. */
  observedFrom?: string
  kind: "statutory" | "commemorative"
}

export const GHANA_HOLIDAYS: PublicHoliday[] = [
  { date: "2026-01-01", name: "New Year's Day", kind: "statutory" },
  { date: "2026-01-07", name: "Constitution Day", kind: "statutory" },
  { date: "2026-03-06", name: "Independence Day", kind: "statutory" },
  { date: "2026-03-20", name: "Eid ul-Fitr", kind: "statutory" },
  { date: "2026-04-03", name: "Good Friday", kind: "statutory" },
  { date: "2026-04-06", name: "Easter Monday", kind: "statutory" },
  { date: "2026-05-01", name: "May Day", kind: "statutory" },
  { date: "2026-05-27", name: "Eid ul-Adha", kind: "statutory" },
  { date: "2026-08-04", name: "Founders' Day", kind: "statutory" },
  { date: "2026-09-21", name: "Kwame Nkrumah Memorial Day", kind: "statutory" },
  // Xanthan's own closure day, declared by the board rather than the
  // state. It shuts the branches exactly as a statutory day does.
  { date: "2026-09-28", name: "Xanthan founding day", kind: "commemorative" },
  {
    date: "2026-12-07",
    name: "Farmers' Day",
    kind: "commemorative",
    observedFrom: "2026-12-04",
  },
  { date: "2026-12-25", name: "Christmas Day", kind: "statutory" },
  {
    date: "2026-12-28",
    name: "Boxing Day",
    observedFrom: "2026-12-26",
    kind: "statutory",
  },
  { date: "2027-01-01", name: "New Year's Day", kind: "statutory" },
  { date: "2027-01-07", name: "Constitution Day", kind: "statutory" },
]

/** Holidays landing inside a date range, inclusive at both ends. */
export function holidaysBetween(startIso: string, endIso: string) {
  return GHANA_HOLIDAYS.filter((h) => h.date >= startIso && h.date <= endIso)
}
