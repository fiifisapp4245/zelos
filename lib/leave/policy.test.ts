import { describe, expect, it } from "vitest"

import {
  applyLeavePolicy,
  leaveRulesFor,
  parseEntitlementDays,
  validateLeaveRow,
} from "./policy"
import { COUNTRY_RULE_PACKS } from "../data/pay"
import { LEAVE_BALANCES } from "../data/records"
import { TABLE_ROWS } from "../data/settings-tables"

const rules = { annualMinimumDays: 15, source: "Labour Act" }
const rows = TABLE_ROWS["leave-types"] as unknown as {
  id: string
  name: string
  kind: string
  entitlement: string
}[]

describe("reading an entitlement", () => {
  it("reads days, ranges and weeks the way Settings writes them", () => {
    expect(parseEntitlementDays("12 days")).toEqual({ min: 12, max: 12 })
    expect(parseEntitlementDays("15–21 days by grade")).toEqual({
      min: 15,
      max: 21,
    })
    expect(parseEntitlementDays("15-21 days")).toEqual({ min: 15, max: 21 })
    expect(parseEntitlementDays("14 weeks")).toEqual({ min: 70, max: 70 })
    expect(parseEntitlementDays("1 day")).toEqual({ min: 1, max: 1 })
  })

  it("does not read a cap, or words, as an entitlement", () => {
    expect(parseEntitlementDays("Up to 5 days")).toBeNull()
    expect(parseEntitlementDays("by grade")).toBeNull()
    expect(parseEntitlementDays("")).toBeNull()
  })
})

describe("the statutory floor comes from the country's rules", () => {
  it("finds Ghana's minimum in its rule pack, for any year", () => {
    expect(
      leaveRulesFor(COUNTRY_RULE_PACKS, "Ghana", "2026-09-18")
        ?.annualMinimumDays
    ).toBe(15)
    expect(
      leaveRulesFor(COUNTRY_RULE_PACKS, "Ghana", "2025-06-01")
        ?.annualMinimumDays
    ).toBe(15)
  })

  it("says nothing for a country whose rules are not held", () => {
    expect(
      leaveRulesFor(COUNTRY_RULE_PACKS, "Nigeria", "2026-09-18")
    ).toBeNull()
  })
})

describe("saving a leave type", () => {
  it("refuses annual leave that starts below the floor, and says where the floor comes from", () => {
    const msg = validateLeaveRow(
      { id: "x", name: "Annual", kind: "Annual", entitlement: "12 days" },
      [],
      rules,
      "Ghana"
    )
    expect(msg).toMatch(/15 working days/)
    expect(msg).toMatch(/Labour Act/)
  })

  it("accepts the floor itself, and a range that starts at it", () => {
    for (const e of ["15 days", "15–21 days by grade", "20 days"])
      expect(
        validateLeaveRow(
          { id: "x", name: "Annual", kind: "Annual", entitlement: e },
          [],
          rules,
          "Ghana"
        )
      ).toBeNull()
  })

  it("does not apply the annual floor to other kinds, or when no floor is known", () => {
    expect(
      validateLeaveRow(
        { id: "x", name: "Study", kind: "Other", entitlement: "5 days" },
        [],
        rules,
        "Ghana"
      )
    ).toBeNull()
    expect(
      validateLeaveRow(
        { id: "x", name: "Annual", kind: "Annual", entitlement: "3 days" },
        [],
        null,
        "Nigeria"
      )
    ).toBeNull()
  })

  it("keeps one annual and one sick type", () => {
    const sick = {
      id: "lt-2",
      name: "Sick",
      kind: "Sick",
      entitlement: "12 days",
    }
    expect(
      validateLeaveRow(
        { id: "new", name: "Illness", kind: "Sick", entitlement: "10 days" },
        [sick],
        rules,
        "Ghana"
      )
    ).toMatch(/already the sick/)
    expect(
      validateLeaveRow(
        { ...sick, entitlement: "14 days" },
        [sick],
        rules,
        "Ghana"
      )
    ).toBeNull()
  })

  it("wants a number for annual and sick leave, since balances are read from it", () => {
    expect(
      validateLeaveRow(
        { id: "x", name: "Sick", kind: "Sick", entitlement: "as needed" },
        [],
        rules,
        "Ghana"
      )
    ).toMatch(/number of days/)
  })
})

describe("the balances an employee sees", () => {
  it("lifts annual entitlement to the floor and never lowers a better one", () => {
    const low = {
      ...LEAVE_BALANCES[0],
      annualEntitlement: 10,
      byType: LEAVE_BALANCES[0].byType.map((t) =>
        t.type === "annual" ? { ...t, entitlement: 10 } : t
      ),
    }
    const high = { ...LEAVE_BALANCES[1], annualEntitlement: 21 }
    const [a, b] = applyLeavePolicy([low, high], rows, rules)
    expect(a.annualEntitlement).toBe(15)
    expect(a.byType.find((t) => t.type === "annual")?.entitlement).toBe(15)
    expect(b.annualEntitlement).toBe(21)
  })

  it("reads sick entitlement from the type marked as sick leave", () => {
    const edited = rows.map((r) =>
      r.kind === "Sick" ? { ...r, entitlement: "20 days" } : r
    )
    const [a] = applyLeavePolicy([LEAVE_BALANCES[0]], edited, rules)
    expect(a.sickEntitlement).toBe(20)
    expect(a.byType.find((t) => t.type === "sick")?.entitlement).toBe(20)
  })

  it("leaves the seeded figure when no type is marked as sick leave", () => {
    const none = rows.filter((r) => r.kind !== "Sick")
    const [a] = applyLeavePolicy([LEAVE_BALANCES[0]], none, rules)
    expect(a.sickEntitlement).toBe(LEAVE_BALANCES[0].sickEntitlement)
  })

  it("leaves everything else untouched", () => {
    const [a] = applyLeavePolicy([LEAVE_BALANCES[0]], rows, rules)
    expect(a.annualTaken).toBe(LEAVE_BALANCES[0].annualTaken)
    expect(a.employeeId).toBe(LEAVE_BALANCES[0].employeeId)
  })
})
