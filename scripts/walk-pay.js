/**
 * Walks the Pay demo run-book in a real browser and reports what each
 * step actually does.
 *
 *   npm run dev          # in one terminal
 *   node scripts/walk-pay.js
 *
 * Every check is independent: a failure is recorded and the walk
 * continues, so one broken step does not hide the rest. It drives the
 * Chrome already on the machine through playwright-core, and it clicks
 * the persona switcher rather than reaching into the store, so it
 * exercises the same path a person demoing this would take.
 *
 * Note: Chromium's innerText applies text-transform, so uppercase
 * labels come back uppercase — compare with has(), not includes().
 */

import { chromium } from "playwright-core"

const BASE = "http://localhost:3000"
const results = []
const log = (step, ok, detail) => {
  results.push({ step, ok, detail })
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}\n      ${detail}`)
}

async function switchRole(page, label) {
  await page.click('button[aria-label^="Viewing as"]')
  await page.click(`li button:has-text("${label}")`)
  await page.waitForTimeout(400)
}

const text = async (page) =>
  (await page.locator("main").innerText()).replace(/\s+/g, " ")
// Chromium's innerText applies text-transform, so compare case-insensitively.
const has = (t, s) => t.toLowerCase().includes(s.toLowerCase())

async function run() {
  const browser = await chromium.launch({ channel: "chrome", headless: true })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  })
  page.on("pageerror", (e) => log("console error", false, e.message))

  /* ── ACT 1 · Line manager proposes ─────────────────────────────── */
  await page.goto(`${BASE}/overview`, { waitUntil: "networkidle" })
  await switchRole(page, "Line Manager")
  await page.goto(`${BASE}/pay/compensation`, { waitUntil: "networkidle" })

  let t = await text(page)
  const rows = await page.locator("tbody tr").count()
  log(
    "1.1 Manager sees only her reports, masked",
    t.includes("GHS ••••••") && rows > 0 && rows < 12,
    `${rows} rows, masked=${t.includes("GHS ••••••")}`
  )

  await page.click('button:has-text("Reveal amounts")')
  await page.waitForTimeout(200)
  t = await text(page)
  log(
    "1.2 Reveal unmasks the screen",
    !t.includes("GHS ••••••") && /GHS [\d,]+\.\d\d/.test(t),
    t.match(/GHS [\d,]+\.\d\d/)?.[0] ?? "no amount found"
  )

  const boxes = page.locator('tbody [role="checkbox"]')
  const boxCount = await boxes.count()
  if (boxCount >= 2) {
    await boxes.nth(0).click()
    await boxes.nth(1).click()
  }
  await page.waitForTimeout(200)
  const changeBtn = page
    .locator('a:has-text("Change pay"), button:has-text("Change pay")')
    .first()
  log(
    "1.3 Selecting rows arms Change pay",
    (await changeBtn.innerText()).includes("2"),
    await changeBtn.innerText()
  )

  await changeBtn.click()
  await page.waitForURL(/changes\/new/, { timeout: 5000 })
  await page.waitForTimeout(400)
  t = await text(page)
  log(
    "1.4 Wizard opens on Define change with both people carried in",
    t.includes("What is changing?"),
    t.slice(t.indexOf("Change pay"), t.indexOf("Change pay") + 120)
  )

  await page.fill("#value", "8")
  await page.fill("#reason", "Market adjustment for the platform team.")
  await page.click('button:has-text("Continue")')
  await page.waitForTimeout(400)
  t = await text(page)
  log(
    "1.5 Review shows per-person deltas and cost per currency",
    t.includes("Review") && t.includes("Cost impact"),
    t.includes("Cost impact")
      ? "cost impact panel present"
      : "MISSING cost impact"
  )

  await page.click('button:has-text("Submit for approval")')
  await page.waitForTimeout(700)
  log(
    "1.6 Submitting lands on Changes",
    page.url().includes("tab=changes"),
    page.url()
  )

  /* ── ACT 2 · HR decides ────────────────────────────────────────── */
  await switchRole(page, "HR Admin")
  await page.goto(`${BASE}/overview`, { waitUntil: "networkidle" })
  t = await text(page)
  log(
    "2.1 Home shows the Pay decisions strip",
    has(t, "Pay decisions"),
    has(t, "Pay decisions")
      ? t.slice(t.indexOf("Pay decisions"), t.indexOf("Pay decisions") + 160)
      : "MISSING"
  )

  await page.goto(`${BASE}/pay/compensation?tab=changes`, {
    waitUntil: "networkidle",
  })
  await page.waitForTimeout(400)
  t = await text(page)
  log(
    "2.2 Changes tab lists requests",
    has(t, "Awaiting approval"),
    `rows: ${await page.locator("tbody tr").count()}`
  )

  // The request Fiifi proposed himself — approve must be refused.
  await page.locator('tbody tr:has-text("Serwa")').first().click()
  await page.waitForTimeout(500)
  const sheet = page.locator('[role="dialog"]')
  let sheetText = (await sheet.innerText()).replace(/\s+/g, " ")
  const approveDisabled = await sheet
    .locator('button:has-text("Approve")')
    .first()
    .isDisabled()
  log(
    "2.3 Cannot approve what you proposed",
    approveDisabled && sheetText.includes("proposed this change"),
    approveDisabled
      ? sheetText.slice(
          sheetText.indexOf("You proposed"),
          sheetText.indexOf("You proposed") + 90
        )
      : "APPROVE WAS ENABLED"
  )
  await page.keyboard.press("Escape")
  await page.waitForTimeout(300)

  await page.locator('tbody tr:has-text("Fiifi")').first().click()
  await page.waitForTimeout(500)
  sheetText = (await page.locator('[role="dialog"]').innerText()).replace(
    /\s+/g,
    " "
  )
  log(
    "2.4 Cannot approve a change to your own pay",
    sheetText.includes("your own pay"),
    sheetText.includes("your own pay") ? "reason shown" : "NO REASON SHOWN"
  )
  await page.keyboard.press("Escape")
  await page.waitForTimeout(300)

  /* ── ACT 3 · Payroll prepares ──────────────────────────────────── */
  await switchRole(page, "Payroll Officer")
  await page.goto(`${BASE}/pay/payroll`, { waitUntil: "networkidle" })
  t = await text(page)
  log(
    "3.1 Runs tab with the summary strip",
    has(t, "Waiting on you") && has(t, "Ghana monthly"),
    t.slice(0, 160)
  )

  await page.goto(`${BASE}/pay/payroll/runs/run-gh-2026-09`, {
    waitUntil: "networkidle",
  })
  await page.waitForTimeout(400)
  t = await text(page)
  const warnCount = (t.match(/Fix it/g) || []).length
  log(
    "3.2 Run detail shows readiness, totals, variance",
    warnCount === 3 && t.includes("Worth a second look"),
    `${warnCount} Fix it links`
  )

  // The sentence the variance panel prints.
  const flagged = t.match(/(\d+) of\s*(\d+)?\s*lines? flagged/)
  log(
    "3.3 Variance heading reads as a sentence",
    Boolean(flagged && flagged[2]),
    flagged ? `"${flagged[0]}"` : "no flagged count found"
  )

  // Warning wording.
  const changeSentence = t.match(
    /\d+ changes? of bank or mobile money details (is|are) still waiting/
  )
  log(
    "3.4 Payment-change warning agrees in number",
    Boolean(
      changeSentence &&
      !(
        changeSentence[0].startsWith("1 change ") && changeSentence[1] === "are"
      )
    ),
    changeSentence ? `"${changeSentence[0]}"` : "not found"
  )

  /* ── the deep links the run points at ──────────────────────────── */
  const leaveWarning = t.match(
    /([^.]+?) (?:has|have) days in this period that leave does not explain/
  )
  const leaveLink = await page
    .locator('li:has-text("Leave and attendance agree") a:has-text("Fix it")')
    .getAttribute("href")
  await page.goto(`${BASE}${leaveLink}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(600)
  await text(page)
  const activeTab = await page
    .locator('[role="tab"][data-state="active"]')
    .first()
    .innerText()
  const reconVisible = await page
    .locator('section[aria-label="Reconciliation"]')
    .isVisible()
    .catch(() => false)
  const inViewport = await page
    .locator('section[aria-label="Reconciliation"]')
    .evaluate((el) => {
      const r = el.getBoundingClientRect()
      return r.top < window.innerHeight && r.bottom > 0
    })
    .catch(() => false)
  log(
    "3.5 Leave 'Fix it' opens the right tab",
    activeTab.includes("Leave"),
    `active tab: ${activeTab}`
  )
  log(
    "3.6 Leave 'Fix it' lands ON the thing to fix",
    inViewport,
    inViewport
      ? "reconciliation section is on screen"
      : `reconciliation present=${reconVisible} but OFF SCREEN — user must scroll past who's away, the timeline and pending requests`
  )
  // The names the warning gave must be findable where it landed.
  const named = (leaveWarning?.[1] ?? "")
    .split(/,| and /)
    .map((n) => n.trim())
    .filter((n) => /^[A-Z][a-z]+ [A-Z]/.test(n))
  const reconText = await page
    .locator('section[aria-label="Reconciliation"]')
    .innerText()
    .catch(() => "")
  const found = named.filter((n) => reconText.includes(n))
  log(
    "3.7 The people the warning names are on the screen it lands on",
    named.length > 0 && found.length === named.length,
    `warning named ${named.join(", ") || "nobody"}; found on destination: ${found.join(", ") || "none"}`
  )

  /* ── back to the run: a line and an adjustment ─────────────────── */
  await page.goto(`${BASE}/pay/payroll/runs/run-gh-2026-09`, {
    waitUntil: "networkidle",
  })
  await page.waitForTimeout(400)
  await page
    .locator('tbody tr:has-text("Kwabena")')
    .first()
    .locator("button")
    .first()
    .click()
  await page.waitForTimeout(500)
  sheetText = (await page.locator('[role="dialog"]').innerText()).replace(
    /\s+/g,
    " "
  )
  log(
    "3.8 Line sheet shows the breakdown and the adjustment's author",
    has(sheetText, "Adjustments") && has(sheetText, "Maame"),
    has(sheetText, "Maame") ? "author and note present" : "NO AUTHOR"
  )

  await page
    .locator('[role="dialog"] button:has-text("Add adjustment")')
    .click()
  await page.waitForTimeout(500)
  const modal = page.locator('[role="dialog"]').last()
  await modal.locator("#adj-amount").fill("500")
  await page.waitForTimeout(300)
  const modalText = (await modal.innerText()).replace(/\s+/g, " ")
  log(
    "3.9 Adjustment modal recalculates live",
    has(modalText, "After this adjustment"),
    modalText.slice(0, 160)
  )
  await page.keyboard.press("Escape")
  await page.waitForTimeout(200)
  await page.keyboard.press("Escape")
  await page.waitForTimeout(300)

  /* ── ACT 4 · approve, then pay ─────────────────────────────────── */
  const payrollApprove = await page
    .locator('main button:has-text("Approve")')
    .first()
    .isDisabled()
    .catch(() => null)
  log(
    "4.1 Preparer cannot approve their own run",
    payrollApprove === true,
    payrollApprove === true
      ? "Approve is disabled for Maame"
      : `isDisabled=${payrollApprove}`
  )

  await switchRole(page, "HR Admin")
  await page.goto(`${BASE}/pay/payroll/runs/run-gh-2026-09`, {
    waitUntil: "networkidle",
  })
  await page.waitForTimeout(400)
  await page.locator('main button:has-text("Approve")').first().click()
  await page.waitForTimeout(700)
  t = await text(page)
  log(
    "4.2 HR can approve, and the run becomes read-only",
    t.includes("never edited") || t.includes("Approved"),
    t.slice(t.indexOf("Approved"), t.indexOf("Approved") + 140)
  )

  await switchRole(page, "Payroll Officer")
  await page.goto(`${BASE}/pay/payroll`, { waitUntil: "networkidle" })
  await page.getByRole("tab", { name: "Payments", exact: true }).click()
  await page.waitForTimeout(600)
  t = await text(page)
  log(
    "4.3 Payments tab lists the approved run",
    has(t, "Create payment batches") ||
      has(t, "Bank file") ||
      has(t, "MTN MoMo"),
    t.slice(0, 200)
  )

  const createBtn = page
    .locator('button:has-text("Create payment batches")')
    .first()
  if (await createBtn.count()) {
    await createBtn.click()
    await page.waitForTimeout(600)
    t = await text(page)
    log(
      "4.4 Batches are created per channel",
      has(t, "MTN MoMo"),
      t.match(/MTN MoMo[^·]*/)?.[0] ?? "no batch"
    )
    const send = page.locator('button:has-text("Send batch")').first()
    if (await send.count()) {
      await send.click()
      await page.waitForTimeout(500)
      const confirm = page
        .locator('button:has-text("Confirm settlement")')
        .first()
      const canConfirm = await confirm.count()
      if (canConfirm) await confirm.click()
      await page.waitForTimeout(500)
      t = await text(page)
      log(
        "4.5 Batch walks Initiated → Sent → Confirmed",
        t.includes("Confirmed"),
        canConfirm ? "confirmed" : "no confirm button after send"
      )
    } else
      log(
        "4.5 Batch walks Initiated → Sent → Confirmed",
        false,
        "no Send batch button"
      )
  } else
    log(
      "4.4 Batches are created per channel",
      false,
      "no Create payment batches button"
    )

  t = await text(page)
  log(
    "4.6 A failed payment is listed with the reason and two ways out",
    has(t, "registered in another name") && has(t, "Retry"),
    t.includes("Retry") ? "retry + alternative channel offered" : "MISSING"
  )
  log(
    "4.7 Somebody with no account is named, not silently dropped",
    has(t, "not in any batch"),
    t.match(/\d+ (person is|people are) not in any batch/)?.[0] ?? "MISSING"
  )

  /* ── Reports ───────────────────────────────────────────────────── */
  await page.getByRole("tab", { name: "Reports", exact: true }).click()
  await page.waitForTimeout(700)
  t = await text(page)
  log(
    "5.1 Reports: register, statutory, trends, departments, deadlines",
    has(t, "Payroll register") &&
      has(t, "Statutory reports") &&
      has(t, "Cost by department") &&
      has(t, "Filing deadlines"),
    [
      t.includes("Payroll register") && "register",
      t.includes("Statutory reports") && "statutory",
      t.includes("Payroll trend") && "trend",
      t.includes("Cost by department") && "departments",
      t.includes("Filing deadlines") && "deadlines",
    ]
      .filter(Boolean)
      .join(", ")
  )
  log(
    "5.2 Nigeria is shown as provider-calculated",
    has(t, "Provided by your local provider"),
    has(t, "Provided by your local provider") ? "shown" : "MISSING"
  )

  /* ── ACT 5 · the employee ──────────────────────────────────────── */
  await switchRole(page, "Employee")
  await page.goto(`${BASE}/me/pay`, { waitUntil: "networkidle" })
  await page.waitForTimeout(400)
  t = await text(page)
  log(
    "6.1 Employee sees their own payslips",
    has(t, "Your last payslip") && has(t, "Payslips"),
    t.slice(0, 140)
  )

  const openSlip = page.locator('a:has-text("Open payslip")').first()
  if (await openSlip.count()) {
    await openSlip.click()
    await page.waitForTimeout(700)
    t = await text(page)
    log(
      "6.2 Payslip separates employer contributions from deductions",
      has(t, "Paid by your employer on top of your pay") &&
        has(t, "not deducted"),
      t.includes("Paid by your employer on top of your pay")
        ? "labelled correctly"
        : "MISSING"
    )
    log(
      "6.3 Payslip links back to the compensation behind it",
      has(t, "compensation in force"),
      has(t, "compensation in force") ? "link present" : "MISSING"
    )
  } else log("6.2 Payslip opens", false, "no Open payslip link")

  /* ── the run-book's claim about /pay/payroll for an employee ───── */
  await page.goto(`${BASE}/pay/payroll`, { waitUntil: "networkidle" })
  await page.waitForTimeout(400)
  t = await text(page)
  log(
    "6.4 /pay/payroll shows an employee their own pay, not a locked door",
    t.includes("My pay"),
    t.slice(0, 120)
  )

  await browser.close()

  const failed = results.filter((r) => !r.ok)
  console.log(
    `\n──────────\n${results.length - failed.length}/${results.length} passed`
  )
  if (failed.length) {
    console.log("\nFAILURES")
    for (const f of failed) console.log(`  · ${f.step}\n    ${f.detail}`)
  }
}

run().catch((e) => {
  console.error("WALK CRASHED:", e.message)
  process.exit(1)
})
