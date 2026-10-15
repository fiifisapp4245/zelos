import { describe, expect, it } from "vitest"

import { INITIAL, STORAGE_VERSION, reconcile } from "./store"

/**
 * The persisted shape, pinned to the version that describes it.
 *
 * Session state is written to sessionStorage and read back by whatever
 * code is deployed next. When a record gains a field and the version is
 * not bumped, last week's data is spread over this week's types and the
 * app white-screens on whichever screen reads the new field first —
 * several screens away from the change that caused it. That has already
 * happened once.
 *
 * So: change a shape, and this test fails. Bump STORAGE_VERSION and
 * update the fingerprint in the same commit, and it passes. The point
 * is not the fingerprint, it is that the two can never drift apart
 * quietly.
 */

/** Every key of every seeded record, per slice, in a stable order. */
function fingerprint(): Record<string, string[]> {
  const shape: Record<string, string[]> = {}

  for (const [slice, value] of Object.entries(INITIAL)) {
    if (!Array.isArray(value)) continue
    const keys = new Set<string>()
    for (const record of value)
      if (record && typeof record === "object")
        for (const key of Object.keys(record)) keys.add(key)
    if (keys.size > 0) shape[slice] = [...keys].sort()
  }

  return shape
}

describe("persisted state and its version", () => {
  it("is at the version that matches the shape recorded here", () => {
    expect(STORAGE_VERSION).toBe(11)
  })

  it("carries the fields the pay screens read", () => {
    const shape = fingerprint()

    // The three that broke a deployment when they were added without a
    // version bump. Named individually so the failure says which.
    expect(shape.countryRulePacks).toContain("voluntarySchemes")
    expect(shape.payGroups).toContain("prorationMethod")
    expect(shape.countryRulePacks).toContain("employeeContributionRules")
    expect(shape.countryRulePacks).toContain("contributionAllocations")
    expect(shape.countryRulePacks).toContain("registrations")
    expect(shape.countrySetups).toContain("providers")
  })

  it("has not changed shape without the version changing", () => {
    // Update both together, in one commit, or not at all.
    expect(fingerprint()).toMatchSnapshot()
  })
})

describe("restoring a session", () => {
  it("keeps records that leave out a field only some seeded records carry", () => {
    const saved = {
      ...INITIAL,
      // A company-level entry: no employee field, no before or after.
      auditLog: [
        {
          id: "a-new",
          employeeId: null,
          actorId: "fiifi",
          action: "Acknowledged Ghana rule pack 2027.1",
          at: "2026-09-18T10:00:00",
        },
        ...INITIAL.auditLog,
      ],
      // A remittance marked paid that was never filed.
      filingRecords: [
        ...INITIAL.filingRecords,
        {
          id: "fr-new",
          country: "Ghana",
          deadlineId: "tier2-remittance",
          period: "2026-08",
          paid: { on: "2026-09-18", ref: "PETRA-1", by: "maame" },
        },
      ],
    }
    const kept = reconcile(saved)
    expect(kept.auditLog?.[0].id).toBe("a-new")
    expect(kept.filingRecords?.some((f) => f.id === "fr-new")).toBe(true)
  })

  it("still drops a slice whose records lack a field every seed carries", () => {
    const saved = {
      ...INITIAL,
      payGroups: INITIAL.payGroups.map((g) => {
        const { prorationMethod, ...rest } = g
        void prorationMethod
        return rest
      }),
    } as unknown as typeof INITIAL
    expect(reconcile(saved).payGroups).toBe(INITIAL.payGroups)
  })
})
