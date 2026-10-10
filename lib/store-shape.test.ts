import { describe, expect, it } from "vitest"

import { INITIAL, STORAGE_VERSION } from "./store"

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
    expect(STORAGE_VERSION).toBe(7)
  })

  it("carries the fields the pay screens read", () => {
    const shape = fingerprint()

    // The three that broke a deployment when they were added without a
    // version bump. Named individually so the failure says which.
    expect(shape.countryRulePacks).toContain("voluntarySchemes")
    expect(shape.payGroups).toContain("prorationMethod")
    expect(shape.countryRulePacks).toContain("employeeContributionRules")
  })

  it("has not changed shape without the version changing", () => {
    // Update both together, in one commit, or not at all.
    expect(fingerprint()).toMatchSnapshot()
  })
})
