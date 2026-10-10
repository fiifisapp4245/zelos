import { describe, expect, it } from "vitest"

import {
  employedDates,
  isPartial,
  prorate,
  prorationFor,
  type WorkingCalendar,
} from "./proration"

// A 31-day month, for the specification's worked example.
const october = { start: "2026-10-01", end: "2026-10-31" }
const september = { start: "2026-09-01", end: "2026-09-30" }
const february = { start: "2026-02-01", end: "2026-02-28" }

// Monday to Friday, with one public holiday in October.
const calendar: WorkingCalendar = {
  workingWeekdays: [1, 2, 3, 4, 5],
  publicHolidays: ["2026-10-05"],
}

const whole = { startDate: "2020-01-01", endDate: null }

describe("who was employed when", () => {
  it("counts every day for somebody there throughout", () => {
    expect(employedDates(october, whole)).toHaveLength(31)
  })

  it("counts from the day somebody joins", () => {
    const joiner = { startDate: "2026-10-15", endDate: null }
    const days = employedDates(october, joiner)
    expect(days[0]).toBe("2026-10-15")
    expect(days).toHaveLength(17)
  })

  it("counts to the day somebody leaves, inclusive", () => {
    const leaver = { startDate: "2020-01-01", endDate: "2026-10-10" }
    const days = employedDates(october, leaver)
    expect(days.at(-1)).toBe("2026-10-10")
    expect(days).toHaveLength(10)
  })

  it("counts only the overlap for somebody who joins and leaves", () => {
    const brief = { startDate: "2026-10-10", endDate: "2026-10-20" }
    expect(employedDates(october, brief)).toHaveLength(11)
  })

  it("counts nothing for somebody who left before the period", () => {
    const gone = { startDate: "2020-01-01", endDate: "2026-09-30" }
    expect(employedDates(october, gone)).toHaveLength(0)
  })
})

describe("a whole period pays in full, whatever the method", () => {
  for (const method of ["calendar_days", "working_days", "thirtieths"] as const)
    it(`pays all of it on ${method}`, () => {
      const basis = prorationFor(method, october, whole, calendar)
      expect(basis.fraction).toBe(1)
      expect(prorate(10_000, basis)).toBe(10_000)
      expect(isPartial(basis)).toBe(false)
    })
})

describe("joining on the 15th of a 31-day month", () => {
  // 17 days employed: the 15th to the 31st inclusive.
  const joiner = { startDate: "2026-10-15", endDate: null }

  it("calendar days pays 17 of 31", () => {
    const basis = prorationFor("calendar_days", october, joiner, calendar)
    expect(basis.summary).toBe("17 of 31 days")
    // 10,000 × 17 / 31 = 5,483.87
    expect(prorate(10_000, basis)).toBe(5_483.87)
  })

  it("working days pays only the days work was expected", () => {
    const basis = prorationFor("working_days", october, joiner, calendar)
    // October 2026 has 22 weekdays, less the Monday holiday on the 5th:
    // 21. From the 15th there are 12 weekdays, none of them the holiday.
    expect(basis.inPeriod).toBe(21)
    expect(basis.worked).toBe(12)
    expect(prorate(10_000, basis)).toBe(5_714.29)
  })

  it("thirtieths pays 17 of 30", () => {
    const basis = prorationFor("thirtieths", october, joiner, calendar)
    expect(basis.summary).toBe("17 of 30 days")
    expect(prorate(10_000, basis)).toBe(5_666.67)
  })

  it("gives three different answers on the same facts", () => {
    const amounts = (["calendar_days", "working_days", "thirtieths"] as const).map(
      (m) => prorate(10_000, prorationFor(m, october, joiner, calendar))
    )
    expect(new Set(amounts).size).toBe(3)
  })
})

describe("the length of the month", () => {
  const joiner = { startDate: "2026-02-15", endDate: null }
  const septemberJoiner = { startDate: "2026-09-15", endDate: null }

  it("changes the daily slice under calendar days", () => {
    // 14 of 28 in February is exactly half.
    const feb = prorationFor("calendar_days", february, joiner, calendar)
    expect(feb.fraction).toBeCloseTo(0.5, 10)

    // 16 of 30 in September is more than half.
    const sep = prorationFor(
      "calendar_days",
      september,
      septemberJoiner,
      calendar
    )
    expect(sep.worked).toBe(16)
    expect(sep.inPeriod).toBe(30)
  })

  it("does not change it under thirtieths", () => {
    const feb = prorationFor("thirtieths", february, joiner, calendar)
    const sep = prorationFor("thirtieths", september, septemberJoiner, calendar)
    expect(feb.inPeriod).toBe(30)
    expect(sep.inPeriod).toBe(30)
  })
})

describe("public holidays", () => {
  it("cost nothing under working days", () => {
    // The 5th is a Monday holiday. Somebody joining on the 1st and
    // somebody joining on the 6th differ by the working days between.
    const fromFirst = prorationFor(
      "working_days",
      october,
      { startDate: "2026-10-01", endDate: null },
      calendar
    )
    const noHolidays = prorationFor(
      "working_days",
      october,
      { startDate: "2026-10-01", endDate: null },
      { ...calendar, publicHolidays: [] }
    )
    expect(fromFirst.inPeriod).toBe(21)
    expect(noHolidays.inPeriod).toBe(22)
  })

  it("are still paid for under calendar days", () => {
    const basis = prorationFor("calendar_days", october, whole, calendar)
    expect(basis.inPeriod).toBe(31)
  })
})

describe("leaving mid-period", () => {
  const leaver = { startDate: "2020-01-01", endDate: "2026-10-10" }

  it("pays to the last day under calendar days", () => {
    const basis = prorationFor("calendar_days", october, leaver, calendar)
    expect(basis.summary).toBe("10 of 31 days")
    expect(prorate(10_000, basis)).toBe(3_225.81)
  })

  it("marks the period as partial", () => {
    expect(isPartial(prorationFor("calendar_days", october, leaver, calendar))).toBe(
      true
    )
  })
})

describe("edge cases that would otherwise divide by zero", () => {
  it("pays nothing for somebody employed on none of the days", () => {
    const gone = { startDate: "2027-01-01", endDate: null }
    const basis = prorationFor("calendar_days", october, gone, calendar)
    expect(basis.fraction).toBe(0)
    expect(prorate(10_000, basis)).toBe(0)
  })

  it("survives a period with no working days at all", () => {
    const shutdown: WorkingCalendar = {
      workingWeekdays: [1, 2, 3, 4, 5],
      publicHolidays: employedDates(october, whole),
    }
    const basis = prorationFor("working_days", october, whole, shutdown)
    expect(basis.fraction).toBe(0)
    expect(Number.isNaN(prorate(10_000, basis))).toBe(false)
  })
})
