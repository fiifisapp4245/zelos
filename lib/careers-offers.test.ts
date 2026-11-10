import { describe, expect, it } from "vitest"

import {
  alreadyApplied,
  daysLeft,
  hasErrors,
  isListed,
  listedRoles,
  validateApplication,
  type ApplicationInput,
} from "./careers"
import {
  DEFAULT_OFFER_TEMPLATE,
  letterIntact,
  nameMatches,
  offerProblem,
  renderLetter,
  sha256Hex,
  signingState,
  unknownPlaceholders,
  type OfferContext,
} from "./offers"
import { CANDIDATES, REQUISITIONS } from "./data/records"
import { EMPLOYEES } from "./data/employees"
import type { Requisition } from "./types"

const role = (over: Partial<Requisition> = {}): Requisition => ({
  ...REQUISITIONS[0],
  status: "open",
  careers: {
    published: true,
    summary: "s",
    responsibilities: [],
    requirements: [],
    questions: ["Why us?"],
    closesOn: "2026-10-31",
  },
  ...over,
})

const TODAY = "2026-09-18"

describe("which roles the public page lists", () => {
  it("lists an open, published role before its closing date", () => {
    expect(isListed(role(), TODAY)).toBe(true)
  })

  it("hides a role that is unpublished, not open, or past its closing date", () => {
    expect(
      isListed(
        role({ careers: { ...role().careers!, published: false } }),
        TODAY
      )
    ).toBe(false)
    expect(isListed(role({ status: "on_hold" }), TODAY)).toBe(false)
    expect(isListed(role({ status: "filled" }), TODAY)).toBe(false)
    expect(
      isListed(
        role({ careers: { ...role().careers!, closesOn: "2026-09-17" } }),
        TODAY
      )
    ).toBe(false)
  })

  it("lists a role with no closing date until it is filled, and one that never had a listing never", () => {
    expect(
      isListed(role({ careers: { ...role().careers!, closesOn: null } }), TODAY)
    ).toBe(true)
    expect(isListed({ ...role(), careers: undefined }, TODAY)).toBe(false)
  })

  it("filters a list of requisitions", () => {
    expect(
      listedRoles([role(), role({ status: "closed" })], TODAY)
    ).toHaveLength(1)
  })

  it("counts the days left to apply", () => {
    expect(daysLeft("2026-09-25", TODAY)).toBe(7)
    expect(daysLeft(null, TODAY)).toBeNull()
  })
})

describe("an application", () => {
  const good: ApplicationInput = {
    name: "Ama Mensah",
    email: "ama@example.com",
    phone: "+233 24 123 4567",
    cvName: "ama-cv.pdf",
    answers: { "Why us?": "Because." },
    consent: true,
  }

  it("is accepted when complete", () => {
    expect(hasErrors(validateApplication(good, role()))).toBe(false)
  })

  it("asks for first and last name, a real email, a CV and consent", () => {
    const e = validateApplication(
      { ...good, name: "Ama", email: "nope", cvName: "", consent: false },
      role()
    )
    expect(Object.keys(e).sort()).toEqual(["consent", "cv", "email", "name"])
  })

  it("accepts only a PDF or Word CV", () => {
    expect(
      validateApplication({ ...good, cvName: "cv.exe" }, role()).cv
    ).toMatch(/PDF or Word/)
    expect(
      validateApplication({ ...good, cvName: "cv.DOCX" }, role()).cv
    ).toBeUndefined()
  })

  it("requires every question the role asks, and a plausible phone if one is given", () => {
    const e = validateApplication({ ...good, answers: {}, phone: "12" }, role())
    expect(e.answers).toEqual({ "Why us?": "Please answer this." })
    expect(e.phone).toBeDefined()
    expect(
      validateApplication({ ...good, phone: "" }, role()).phone
    ).toBeUndefined()
  })

  it("spots someone applying twice to the same role, whatever the email's case", () => {
    const c = CANDIDATES[0]
    expect(
      alreadyApplied(CANDIDATES, c.requisitionId, c.email.toUpperCase())
    ).toBe(true)
    expect(alreadyApplied(CANDIDATES, "REQ-OTHER", c.email)).toBe(false)
  })
})

describe("offer letters", () => {
  const ctx: OfferContext = {
    candidate: CANDIDATES[0],
    req: REQUISITIONS[0],
    manager: EMPLOYEES.find((e) => e.id === REQUISITIONS[0].hiringManagerId),
    company: "Xanthan",
    salaryMonthly: 15000,
    startDate: "2026-11-02",
    today: TODAY,
    expiresOn: "2026-09-25",
  }

  it("fills every placeholder in the default template", () => {
    const letter = renderLetter(DEFAULT_OFFER_TEMPLATE, ctx)
    expect(letter).not.toMatch(/\{\{/)
    expect(letter).toContain("Dear Kwaku Boateng")
    expect(letter).toContain("GHS 15,000")
    expect(letter).toContain("Xanthan")
  })

  it("leaves an unknown placeholder visible rather than guessing, and refuses to send it", () => {
    const t = "Hello {{candidate_name}} {{shoe_size}}"
    expect(unknownPlaceholders(t)).toEqual(["shoe_size"])
    expect(renderLetter(t, ctx)).toContain("{{shoe_size}}")
    expect(offerProblem(ctx, t)).toMatch(/shoe_size/)
  })

  it("will not send without a salary or with a start date in the past", () => {
    expect(offerProblem({ ...ctx, salaryMonthly: 0 }, "x")).toMatch(/salary/)
    expect(offerProblem({ ...ctx, startDate: "2026-09-01" }, "x")).toMatch(
      /past/
    )
    expect(offerProblem(ctx, DEFAULT_OFFER_TEMPLATE)).toBeNull()
  })

  it("notices a letter that was changed after it was sent", async () => {
    const letter = renderLetter(DEFAULT_OFFER_TEMPLATE, ctx)
    const letterHash = await sha256Hex(letter)
    expect(await letterIntact({ letter, letterHash })).toBe(true)
    expect(
      await letterIntact({
        letter: letter.replace("15,000", "25,000"),
        letterHash,
      })
    ).toBe(false)
    expect(letterHash).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe("signing", () => {
  it("accepts the candidate's own name, loosely, and nobody else's", () => {
    expect(nameMatches("Ama Mensah", "Ama Mensah")).toBe(true)
    expect(nameMatches("ama  MENSAH", "Ama Mensah")).toBe(true)
    expect(nameMatches("Mensah Ama", "Ama Mensah")).toBe(true)
    expect(nameMatches("Ama Kofi Mensah", "Ama Mensah")).toBe(true)
    expect(nameMatches("Akosua Mensah", "Ama Mensah")).toBe(false)
    expect(nameMatches("Ama", "Ama Mensah")).toBe(false)
    expect(nameMatches("José Álvarez", "Jose Alvarez")).toBe(true)
  })

  it("only lets a live letter be acted on", () => {
    const now = new Date("2026-09-18T12:00:00Z")
    const live = { status: "sent" as const, expiresOn: "2026-09-25T12:00:00Z" }
    expect(signingState(live, now)).toBeNull()
    expect(signingState({ ...live, status: "viewed" }, now)).toBeNull()
    expect(signingState(undefined, now)).toBe("not_found")
    expect(signingState({ ...live, status: "withdrawn" }, now)).toBe(
      "withdrawn"
    )
    expect(signingState({ ...live, status: "signed" }, now)).toBe("signed")
    expect(signingState({ ...live, status: "declined" }, now)).toBe("declined")
    expect(
      signingState({ ...live, expiresOn: "2026-09-17T12:00:00Z" }, now)
    ).toBe("expired")
  })
})

describe("the signed copy", () => {
  const sig = {
    id: "s",
    token: "t",
    candidateId: "c",
    templateId: null,
    letter: "Dear <b>Ama</b> & co",
    letterHash: "abc",
    salaryMonthly: 1,
    startDate: "2026-11-02",
    status: "signed" as const,
    sentOn: "2026-09-18T09:00:00Z",
    expiresOn: "2026-09-25T23:59:59Z",
    viewedOn: null,
    signedOn: "2026-09-19T10:00:00Z",
    signedName: "<script>alert(1)</script>",
    signatureImage: "javascript:alert(1)",
    declinedReason: null,
    trail: [{ at: "2026-09-19T10:00:00Z", text: "Signed as <i>x</i>" }],
  }

  it("escapes the letter, the typed name and the trail, and rejects a non-image signature", async () => {
    const { signedCopyHtml } = await import("./offers")
    const html = signedCopyHtml(sig, { candidateName: "Ama", company: "X" })
    expect(html).not.toContain("<script>")
    expect(html).not.toContain("<b>Ama</b>")
    expect(html).toContain("&lt;b&gt;Ama&lt;/b&gt; &amp; co")
    expect(html).not.toContain("javascript:")
    expect(html).toContain("SHA-256 of the letter: abc")
  })
})
