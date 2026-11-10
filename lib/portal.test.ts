import { describe, expect, it } from "vitest"

import {
  ageOn,
  changesRequested,
  completion,
  documentsFor,
  emptyData,
  maskTail,
  mergeCompensation,
  recordPatch,
  sectionDone,
  validMomo,
  validateAll,
  validateSection,
  type Ctx,
} from "./portal"
import { EMPLOYEES } from "./data/employees"
import type { PortalData } from "./types"

const emp = EMPLOYEES.find((e) => e.id === "nana") ?? EMPLOYEES[0]
const ctx: Ctx = {
  today: "2026-09-18",
  takenCards: ["GHA-550000000-0"],
  fullName: "Nana Adjei",
}

const full = (over: Partial<PortalData> = {}): PortalData => ({
  ...emptyData(emp),
  dateOfBirth: "1998-04-12",
  gender: "male",
  nationality: "Ghanaian",
  phone: "+233 24 111 2222",
  personalEmail: "nana@example.com",
  residentialAddress: "14 Ring Road, Accra",
  gpsAddress: "GA-123-4567",
  ghanaCard: "GHA-123456789-0",
  idDocuments: [{ id: "d1", name: "card.jpg", sizeKb: 200 }],
  ssnitNumber: "C1234567890",
  tin: "P0123456789",
  tier2Provider: "Petra Trust",
  tier3Provider: "",
  paymentMethod: "mobile_money",
  momoProvider: "MTN MoMo",
  momoNumber: "024 123 4567",
  bankName: "",
  bankAccount: "",
  accountName: "",
  emergencyName: "Kofi Adjei",
  emergencyRelationship: "Brother",
  emergencyPhone: "0201112222",
  emergencyEmail: "",
  ...over,
})

describe("each section's rules", () => {
  it("accepts a complete set of answers in every section", () => {
    const all = validateAll(full(), ctx)
    for (const errs of Object.values(all)) expect(errs).toEqual({})
    expect(completion(full(), ctx)).toEqual({ done: 5, total: 5, percent: 100 })
  })

  it("asks for what is missing in a blank form", () => {
    const blank = {
      ...emptyData(emp),
      phone: "",
      personalEmail: "",
      residentialAddress: "",
      dateOfBirth: "",
      gender: "" as const,
    }
    expect(Object.keys(validateSection("personal", blank, ctx)).sort()).toEqual(
      [
        "dateOfBirth",
        "gender",
        "personalEmail",
        "phone",
        "residentialAddress",
      ].sort()
    )
  })

  it("will not employ someone under 16, or born in the future", () => {
    expect(
      validateSection("personal", full({ dateOfBirth: "2012-01-01" }), ctx)
        .dateOfBirth
    ).toMatch(/at least 16/)
    expect(
      validateSection("personal", full({ dateOfBirth: "2027-01-01" }), ctx)
        .dateOfBirth
    ).toMatch(/not valid/)
    expect(ageOn("2010-09-18", "2026-09-18")).toBe(16)
    expect(ageOn("2010-09-19", "2026-09-18")).toBe(15)
  })

  it("checks the formats HR's own form checks", () => {
    expect(
      validateSection("identity", full({ ghanaCard: "123" }), ctx).ghanaCard
    ).toMatch(/GHA-/)
    expect(
      validateSection("statutory", full({ ssnitNumber: "1234" }), ctx)
        .ssnitNumber
    ).toMatch(/C followed/)
    expect(
      validateSection("statutory", full({ tin: "12" }), ctx).tin
    ).toBeDefined()
    expect(
      validateSection("personal", full({ gpsAddress: "nope" }), ctx).gpsAddress
    ).toBeDefined()
    expect(
      validateSection("personal", full({ gpsAddress: "" }), ctx).gpsAddress
    ).toBeUndefined()
  })

  it("refuses a Ghana Card that is on someone else's record, and an identity with no photo", () => {
    expect(
      validateSection("identity", full({ ghanaCard: "GHA-550000000-0" }), ctx)
        .ghanaCard
    ).toMatch(/another record/)
    expect(
      validateSection("identity", full({ idDocuments: [] }), ctx).idDocuments
    ).toBeDefined()
  })

  it("checks mobile money numbers the way Ghana writes them", () => {
    for (const ok of [
      "0241234567",
      "024 123 4567",
      "+233241234567",
      "+233 24-123-4567",
    ])
      expect(validMomo(ok)).toBe(true)
    for (const bad of ["024123456", "+44 7700 900123", "abc", ""])
      expect(validMomo(bad)).toBe(false)
  })

  it("needs a bank account in the new hire's own name", () => {
    const bank = {
      paymentMethod: "bank" as const,
      bankName: "GCB Bank",
      bankAccount: "1234 5678 9012",
      accountName: "Nana Adjei",
    }
    expect(validateSection("pay", full(bank), ctx)).toEqual({})
    expect(
      validateSection(
        "pay",
        full({ ...bank, accountName: "Someone Else" }),
        ctx
      ).accountName
    ).toMatch(/own name/)
    expect(
      validateSection("pay", full({ ...bank, bankAccount: "123" }), ctx)
        .bankAccount
    ).toBeDefined()
    expect(
      validateSection("pay", full({ paymentMethod: "" }), ctx).paymentMethod
    ).toBeDefined()
  })

  it("only asks for the payment fields that go with the chosen method", () => {
    expect(
      validateSection(
        "pay",
        full({ paymentMethod: "mobile_money", momoNumber: "" }),
        ctx
      ).momoNumber
    ).toBeDefined()
    expect(
      validateSection("pay", full({ paymentMethod: "mobile_money" }), ctx)
        .bankName
    ).toBeUndefined()
  })

  it("wants an emergency contact's full name and a way to reach them", () => {
    const e = validateSection(
      "emergency",
      full({ emergencyName: "Kofi", emergencyPhone: "12" }),
      ctx
    )
    expect(Object.keys(e).sort()).toEqual(["emergencyName", "emergencyPhone"])
  })

  it("reports each section as done or not", () => {
    expect(sectionDone("pay", full(), ctx)).toBe(true)
    expect(sectionDone("pay", full({ paymentMethod: "" }), ctx)).toBe(false)
  })
})

describe("what acceptance changes", () => {
  it("writes the personal fields and the emergency contact", () => {
    const p = recordPatch(full({ phone: " +233 24 111 2222 " }))
    expect(p).toMatchObject({
      dateOfBirth: "1998-04-12",
      ghanaCard: "GHA-123456789-0",
      phone: "+233 24 111 2222",
      emergencyContact: { name: "Kofi Adjei", relationship: "Brother" },
    })
  })

  it("keeps salary and grade, and clears the payment method that was not chosen", () => {
    const c = mergeCompensation(
      {
        ...emp.compensation,
        grossMonthly: 15000,
        payGrade: "L5",
        paymentMethod: "bank",
        bankName: "Old Bank",
        bankAccount: "999",
      },
      full()
    )
    expect(c.grossMonthly).toBe(15000)
    expect(c.payGrade).toBe("L5")
    expect(c.paymentMethod).toBe("mobile_money")
    expect(c.momoNumber).toBe("024 123 4567")
    expect(c.bankName).toBe("")
    expect(c.bankAccount).toBe("")
    expect(c.tin).toBe("P0123456789")
    expect(c.tier3Provider).toBeNull()
  })

  it("turns uploads into identity documents waiting to be verified", () => {
    const docs = documentsFor(
      { employeeId: "nana", data: full() },
      "2026-09-18T09:00:00Z"
    )
    expect(docs).toEqual([
      expect.objectContaining({
        id: "d1",
        employeeId: "nana",
        category: "identity",
        status: "pending",
        uploadedBy: "nana",
      }),
    ])
  })

  it("lists the sections sent back, with the note for each", () => {
    expect(
      changesRequested({
        review: {
          personal: { status: "ok", note: "" },
          pay: { status: "changes", note: "Wrong number" },
        },
      })
    ).toEqual([{ section: "pay", note: "Wrong number" }])
  })

  it("shows only the tail of an account number", () => {
    expect(maskTail("1234 5678 9012")).toBe("••••••••9012")
    expect(maskTail("12")).toBe("12")
  })
})
