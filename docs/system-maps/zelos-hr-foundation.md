# System Map: Zelos HR — Foundation (Employee Operating System)

**Mode:** BUILD
**Date:** 2026-07-11
**Status:** Draft

---

## 1. Purpose

**Stated purpose:** An Employee Operating System that helps organizations run, understand, and continuously improve their workforce by combining operational HR workflows with intelligent, data-driven decision support. Build order: operational foundation → connected workflows → intelligence layer → AI-assisted decision support.

**Revealed purpose (as reconfirmed):** The scope contradiction identified in the first pass has been resolved by separating *vision* (global Employee Operating System), *architecture* (localization-ready from day one), and *implementation* (one jurisdiction first). The visibility contradiction has been resolved by tiering performance data (private coaching notes vs. official reviews vs. escalated records) rather than choosing between full transparency and full opacity. The governing purpose is now explicit: **an operational system trusted in one market first, built on an architecture that doesn't have to be rebuilt to reach the next one** — with the primary operator's attention treated as the scarcest resource in the whole design.

> Two residual risks remain even after this resolution — see Section 11: (1) architecting generalized abstraction layers (tax, compliance, currency) before a second real country's requirements exist to validate them against, and (2) a new, milder loop around reluctance to escalate private notes into the formal record.

---

## 2. Actors, incentives, and permissions

| Actor | What they do | Actually rewarded/punished for | Can see | Can approve | Conflict? |
|---|---|---|---|---|---|
| Founder/Owner/Decision-maker (primary actor, per stated framing) | Runs the business; is the default people-ops owner in an SME with no HR function | Business survival, growth, compliance/legal exposure avoided, payroll not breaking | Everything | Everything (by default, in a small org) | Weak — wants accuracy but has no spare attention; see Section 5 |
| Office Administrator / Ops Manager (the de facto data-enterer in practice) | Does the actual day-to-day data entry: attendance, leave requests, document chasing | "No fires today" — operational smoothness, not data completeness | Whatever the Owner grants; typically broad, operational | Leave, minor operational approvals | **Yes** — rewarded for keeping things moving, not for the tedious, invisible work of complete records |
| HR Manager / People & Culture Lead (secondary, appears as org matures) | Owns policy, compliance, employee relations | Legal exposure avoided, retention, process adherence | Employee records, performance, compliance docs | Performance, disciplinary, compliance | Weakly aligned with Owner; may want more rigor than Owner has time for |
| Department/Team Manager | Runs a team; approves leave, writes coaching notes and official reviews | Team output/throughput, not the accuracy of what they write about their team | Own team's operational data; per this session, **not** salary; private coaching notes visible only to themselves by default | Leave, timesheets; can initiate a disciplinary case | **Reduced, not eliminated** — private coaching notes are no longer HR/Owner-readable by default (see Section 3), but the manager now faces a new incentive around *when to escalate* a note into the official record — see R2' in Section 6 |
| Employee | Does the work; submits leave, updates own profile | Nothing in the system rewards keeping self-service data accurate — no consequence attaches to letting it drift | Own record, own payslip, own leave balance | Nothing | Mild — no reason to prioritize updating the system over doing their actual job |
| Finance | Runs payroll, values labor cost | Payroll accuracy, no compliance fines | Payroll, salary (per decision below) | Payroll runs, write-offs | Weakly aligned — depends entirely on upstream data being complete |
| Recruiter | Runs hiring pipeline | Time-to-hire, reqs filled | Candidate pipeline; not existing employee comp | Offers (often with Owner/HR sign-off) | Low |

**The actor this product lives or dies on:** the Founder/Owner, per the user's own framing — but note this is the *buyer/champion*, not necessarily the *hands-on-keyboard data-enterer*. In practice that is more often the Office Administrator or a general-purpose Ops person. **Building for the Owner's mental model while the Office Administrator does the actual data entry is a common trap** — the persona who decides to adopt is not the persona whose incentives determine whether the data stays accurate day to day.

**The actor who silently degrades data quality:** the Team Manager, via the self-censorship loop created by the visibility decision made this session (see Section 3) — and, more mundanely, the Office Administrator, who has no attached consequence for incomplete records in an MVP with no enforcement.

---

## 3. Permissions and visibility

**Permission roles (distinct from job roles — do not conflate):**

| Permission role | Held by | Can read | Can write | Can approve | Attributable? |
|---|---|---|---|---|---|
| Owner/Admin | Founder, or whoever configures the org | Everything | Everything, org config | Everything | To be decided — must be yes |
| HR/People Ops | HR Manager, or Owner wearing this hat | Employee records, performance (raw notes, per decision), compliance docs | Same | Performance, disciplinary, compliance | Must be yes |
| Finance | Finance Manager, or Owner wearing this hat | Payroll, salary | Payroll, salary | Payroll runs | Must be yes |
| Manager | Team/Department lead | Own team's operational data, own raw performance notes; **not** salary by default | Leave approvals, performance notes, timesheets | Leave, minor operational | Must be yes |
| Employee (self-service) | Every employee | Own record, own payslip, own leave balance | Limited self-fields (address, bank pending approval) | Nothing | Must be yes |

**Critical modeling note:** In the primary-actor segment (10–50 person SME with no mature HR function), one real person — the Founder — will simultaneously hold the Owner/Admin, HR, Finance, and Manager permission roles, while *also* being an Employee of the company. The data model must let permission roles compose freely per user rather than assuming one job title maps to one permission role. This is exactly the "role vs. role" trap the reference material warns about, and it is not a hypothetical for this product — it is the default case for the stated primary actor.

**Sensitive fields and who can read them (fully reconfirmed this session):**

| Field | Can read | Access model |
|---|---|---|
| Salary / compensation | Self, HR, Finance, Owner — **not** direct manager by default | Static role-based |
| Official performance reviews | Employee, HR, authorized leadership | Static role-based |
| Private manager coaching notes | Manager only, by default | Static role-based, narrow |
| Escalated performance concerns | Becomes part of the official employee record — visible per the official-review rule above, once submitted through the formal process | **State-transition-based** — visibility changes when the record moves from "private" to "escalated" |
| Health/medical data | Fine-grained, purpose-based access; **not** unrestricted for Owner/Admin by default | Purpose-based, not role-based — access must be justified by why it's needed (e.g. accommodations processing), not just by seniority |
| Disciplinary records | Manager: can initiate. HR: validates and manages the process. Employee: sees finalized actions relevant to them. Leadership: sees only finalized records, where appropriate | **Lifecycle-based** — visibility depends on case state (open/investigation → finalized), not a fixed reader list |
| Immigration/visa/statutory compliance documents | HR/Compliance role only, scoped to launch jurisdiction(s) for v1 | Static role-based, narrowed by the single-jurisdiction v1 decision |

**Modeling implication:** three different access models now coexist — static role-based (salary, official reviews), purpose-based (health), and lifecycle/state-based (disciplinary, escalated performance concerns). A simple RBAC table is no longer sufficient; the permission layer needs to support **state as an input to visibility**, not just role. This is a real increase in schema complexity relative to the original plan, and it should be treated as core foundation work (Section 9), not a later add-on, since it's exactly the kind of thing that's expensive to retrofit.

**One-way doors:**

- Salary figures — decided, defensible default (self + HR/Finance/Owner). Low risk as configured.
- Private coaching notes — **now resolved in the direction that avoids the one-way-door risk.** Because coaching notes are private to the manager by default, and only the deliberate act of escalation exposes anything, managers calibrate their writing around a private audience from the first cycle — which is the condition that actually protects candor. The residual risk moves from *content* (the note itself) to *timing* (whether/when a manager escalates) — see R2' in Section 6.
- Health, disciplinary — **resolved via purpose-based and lifecycle-based access respectively (see table above).** Neither is fully specified yet at the field level (which specific fields count as "health data," what counts as a valid "purpose" for access, what the disciplinary case states are) — that detail work must still happen before schema, but the *model* is now decided, which is the harder part.
- Immigration/visa/statutory documents — narrowed automatically by the single-jurisdiction v1 decision; re-opens as a live one-way-door question each time a new jurisdiction is added, not just once.

**Does any actor's willingness to record accurate data depend on what they know others can see? — Yes, but the shape of the risk has changed, not disappeared.**

With private coaching notes no longer HR/Owner-readable by default, the original self-censorship loop (R2) is substantially mitigated — managers should write more candidly, knowing the default audience is just themselves. But a new, milder dynamic replaces it: the manager now controls *whether and when* a concern crosses from private note into official, auditable record. That decision — to escalate or not — is itself an incentive-laden choice, and it's a new loop, not a solved problem. **See R2' in Section 6.**

---

## 4. Elements

- **Employee record** — core identity, employment history; the system of record everything else depends on
- **Org structure** — departments, teams, reporting lines; also encodes who holds which permission role
- **Attendance/Time record** — daily presence/hours data
- **Leave** — types, balances, requests, approvals
- **Payroll / compensation data** — pay figures, payroll runs, integrations
- **Recruitment pipeline** — requisitions, candidates, offers
- **Onboarding workflow** — tasks, documents, checklist per new hire
- **Performance workflow** — review cycles, ratings, manager notes
- **Compliance/document vault** — contracts, certifications, statutory documents, per-country rules
- **Insights/Intelligence layer** — derived signal sitting on top of the above; explicitly the last thing to build, per the user's own stated philosophy

---

## 5. Stocks and flows

**Stocks:**

| Stock | Currently | Inflow | Outflow | Rate limiter |
|---|---|---|---|---|
| Pending approvals (leave, expenses, adjustments) | N/A — greenfield | Requests submitted | Approved/rejected | The single scarce approver's attention |
| Incomplete onboarding tasks (per new hire) | N/A | New hire created | Task completed | Whoever owns the task and whether they're accountable for it |
| Compliance documents expiring/missing | N/A | New requirement, or expiry approaching | Renewed/uploaded | Someone remembering to chase it, per country |
| Leave balance (per employee) | N/A | Accrual | Leave taken | Policy config + approval speed |
| Data completeness / trust in the system of record | N/A, starts empty | Nothing automatic — must be manually entered | Decays via turnover, org change, no forced re-verification | Whether a downstream workflow (e.g. payroll) actually blocks on the missing field, or silently tolerates it |

**Flows:**

| Flow | From → To | Triggered by | Friction / throttle |
|---|---|---|---|
| Hire → Onboard → Active employee | Candidate → Employee | Offer accepted | Manual paperwork; multiplies with per-country statutory variance |
| Leave request → Approval → Balance adjustment | Employee → Manager | Employee submission | Manager/approver responsiveness |
| Time worked → Payroll run → Payment | Attendance/comp data → Paid employee | Pay cycle | Any missing upstream data blocks or silently corrupts the run |
| Performance cycle → Review → Rating recorded | Manager → Record | Cycle schedule | Manager time and willingness — see the self-censorship loop |
| Compliance requirement → Document upload → Verified | Requirement → Vault | Hire date, renewal date, or per-country statutory calendar | Whoever is accountable for chasing it, times the number of countries in scope |

**The rate limiter that governs everything:** the single resource-constrained decision-maker's (or their office-admin proxy's) attention. In the stated primary-actor segment, one person is the de facto approver, data-enterer, and compliance owner for nearly every flow above simultaneously. Every stock in this system drains through the same scarce human. **This is the structural constraint the whole roadmap should be organized around** — and it is in direct tension with the multi-country-from-day-one decision, which multiplies the volume of things that same scarce attention must track (different statutory documents, different payroll cycles, different leave law per country) without multiplying the attention available to track them.

---

## 6. Loops

```
R1 (engine, virtuous — the intended flywheel):
    operational data entered accurately (attendance, leave, comp)
    → trustworthy system of record
    → intelligence layer surfaces useful signal (retention risk, bottlenecks)
    → decision-maker acts on it and sees value
    → decision-maker/org invests more effort keeping data accurate
    → richer signal → [back to start]                     (delay: weeks to months before first credible insight [ASSUMPTION — validate])

B1 (the ceiling):
    more workflows/modules launch (payroll, compliance, performance, recruiting)
    → the single scarce approver/admin's attention spreads thinner
    → data entry/approval latency rises
    → data quality and timeliness drop
    → intelligence layer signal degrades
    → value delivered per unit of admin effort falls
    → admin's willingness to keep investing effort plateaus  (delay: compounds as headcount and module count grow [ASSUMPTION])

R2' (residual, milder — escalation reluctance, replaces the original self-censorship loop):
    manager holds a legitimate coaching note privately (now the default, per the tiered model)
    → escalating it converts it into a formal, auditable record with due-process consequences
    → the manager — attention-constrained and often conflict-averse — under-escalates real concerns to avoid the formal process
    → performance and disciplinary issues compound privately, invisible to HR/Owner, until they're too large to ignore
    → the eventual escalation arrives late, disproportionate, and without the earlier documentation that would support due process
                                                             (delay: months — the whole point of the loop is that nothing is visible until it isn't [ASSUMPTION])

R3 (originally vicious — the multi-country dilution loop; now resolved to a milder residual risk):
    the scope decision now sequences implementation to one jurisdiction first, so the original dilution loop (breadth crowding out depth) is substantially closed off
    → residual risk: building generalized tax/compliance/currency abstraction layers before a second real jurisdiction's requirements exist to test them against
    → the abstractions get shaped by guesswork rather than a real second case
    → when jurisdiction #2 actually arrives, its rules don't fit the guessed abstraction as cleanly as hoped
    → some rework happens anyway, just later and against a live customer instead of in the design phase
                                                             (delay: doesn't surface until jurisdiction #2 is actually being implemented [ASSUMPTION])
```

**The engine:** R1 — this is the loop the entire product philosophy is betting on.

**The ceiling:** B1 — normal and expected; every ops product hits an attention ceiling. Not itself alarming.

**Resolved loops:** the original R2 (self-censorship on all performance notes) is substantially closed by tiering visibility. The original R3 (multi-country dilution) is substantially closed by sequencing implementation to one jurisdiction. Both were real, and both were closed by rung-6/rung-7 decisions rather than a feature — which is the right kind of fix.

**New residual loops:** R2' and the abstraction-layer risk under R3 are milder versions of the same underlying dynamics, worth watching rather than blocking on. Neither is a reason to reverse the decisions just made — they're a reason to add light monitoring (Section 9).

**Loop speed asymmetry — does the failure loop run faster than the success loop?**

**Less severe than the original finding, but not zero.** R1 (the value flywheel) still needs weeks-to-months of accumulated clean data before the intelligence layer says anything credible `[ASSUMPTION — validate]`. R2' is slower than the original R2 — escalation reluctance compounds over months, not from the first review cycle — which meaningfully narrows the gap. The abstraction-layer risk under R3 doesn't bite until a second jurisdiction is actually being built, which by design is now well after v1. **The governing constraint from the first pass (attention scarcity, via B1) remains the sharpest one** — the user has independently converged on this same conclusion (Section 3 of their reply) and proposed elevating it to a governing product principle, which this map fully supports.

---

## 7. Delays

| Between | And | Length | Consequence |
|---|---|---|---|
| Data entered inaccurately/incompletely | Anyone noticing | Until a payroll run fails or a dispute/audit surfaces it | Garbage flows downstream silently; nothing looks broken in the meantime |
| Manager writes a bland performance note | Decision-maker trusting a flawed "manager effectiveness" insight | Until a retention surprise or an employee dispute exposes the gap | The intelligence layer's core promise is undermined before anyone notices |
| A country's compliance requirement changes or a document expires | Someone becoming aware | Depends entirely on whether v1 includes automated compliance monitoring — likely not, in a v1 | Legal/financial exposure, multiplied by number of countries in scope |
| A new workflow request is submitted (leave, onboarding task) | Actual completion | Bound by the single scarce approver's bandwidth | Bottleneck worsens as more modules launch — this is B1 above |

---

## 8. Second-order effects

| Change | 1st order (what the pitch promises) | 2nd order | 3rd order |
|---|---|---|---|
| ~~Multi-country from day one~~ → **Global vision, single-jurisdiction implementation, localization-ready architecture** (reconfirmed) | v1 ships fast in the launch market; global sales narrative stays intact | Engineering must design config seams (tax rates, holiday calendars, statutory templates) even though only one jurisdiction is implemented — some abstraction work happens before it's validated by a real second case | If the abstraction is well-guessed, jurisdiction #2 is cheap. If it's guessed wrong, some of that early abstraction work is redone anyway — just later, against a real customer instead of in design. This is the residual risk under R3 (Section 6) |
| Tiered performance data (private coaching notes / official reviews / escalated concerns) (reconfirmed) | Candid coaching preserved; formal decisions still auditable | Managers now decide when to escalate a note — a new point of discretion that didn't exist under either "always visible" or "always private" | Under-escalation lets real concerns compound privately for months before HR/Owner ever see them (R2', Section 6) — a slower, subtler version of the original risk, not its elimination |
| Managers cannot see salary (self+HR/Finance/Owner only) | Tighter security around comp data; fewer leak vectors | Managers who want to justify a raise or promotion to their report must route through HR/Finance rather than acting directly — an added hop on every comp conversation | If that hop is slow (same scarce-attention bottleneck as B1), managers may informally promise things they can't back with data — a manager/employee trust gap the intelligence layer will likely misread as something else entirely |
| AI-generated insights operate on aggregated, permission-aware data instead of raw private notes (new, reconfirmed) | Preserves the privacy boundary while still surfacing patterns | Aggregation must be coarse enough not to re-identify individuals through small denominators (e.g. a 3-person team's "90% negative sentiment" aggregate is not actually anonymous) | If aggregation granularity isn't deliberately bounded by team/group size, the aggregate becomes a de facto re-identification channel — undermining the privacy design it was meant to protect |

---

## 9. Leverage-ranked interventions

| # | Intervention | Rung | Effort | Expected effect |
|---|---|---|---|---|
| 1 | ~~Re-confirm multi-country scope~~ → **Reconfirmed: single-jurisdiction v1, localization-ready architecture** | 7 — Goal | Done (decision made) | Closes the original R3 dilution loop. Residual risk moved to abstraction-guessing (see #6) |
| 2 | **Attribute every data edit** (leave adjustments, comp changes, record edits) to an individual, with an immutable audit log | 6 — Rule | Low | Prevents the accountability vacuum before it exists — far cheaper now than retrofitting into a live schema |
| 3 | ~~Decide the open one-way doors~~ → **Reconfirmed model: purpose-based access for health data, lifecycle-based access for disciplinary records, tiered access for performance data** | 6 — Rule | Medium (still needs field-level detail work — which fields count as health data, what counts as a valid access "purpose," what the disciplinary case states are) | The *model* is decided, which is the hard part; detailed schema work remains before freeze |
| 4 | ~~Reconsider performance-note visibility~~ → **Reconfirmed: private coaching notes (manager-only default), official reviews (HR/employee/leadership), escalated concerns (join the official record on escalation)** | 6 — Rule | Medium (schema + workflow design for the escalation transition itself) | Preserves candor while keeping formal decisions auditable. Introduces R2' (escalation reluctance) — mitigate with #9 below, don't let it block this decision |
| 5 | **Model permission roles independent of job roles** from the data layer up, allowing one person to hold Owner + HR + Finance + Manager + Employee simultaneously | 6 — Rule | Low–Medium | Matches the actual default case for the primary-actor segment; avoids the "role vs. role" trap |
| 6 | **Build country-variant *values* as config (tax rates, holiday calendars, statutory templates), not a fully generalized abstract tax/compliance engine, until a second real jurisdiction's requirements exist** | 3 — Structure (the user's proposed abstraction layers are structure, not rule, despite feeling architectural) | Medium | Keeps the localization-ready promise without over-fitting the abstraction to guesswork — see the anti-pattern note in Section 11 |
| 7 | **Elevate "reduce the primary operator's cognitive load" to an explicit, checkable product principle** — every proposed feature is evaluated against it before it enters the roadmap | 7 — Goal | Low to state, ongoing to enforce | This is the single highest-leverage move available: it directly targets the governing constraint (B1, Section 6) that the user independently converged on. Correctly rung-7 — it redefines what the system optimizes for, not just how a feature works |
| 8 | **Bound AI-insight aggregation granularity** (minimum group size before a pattern is surfaced) so aggregated signals can't re-identify individuals through small denominators | 6 — Rule | Low | Protects the privacy boundary that the tiered performance model and purpose-based health access were just designed to create — without this, aggregation quietly reopens the same one-way door |
| 9 | Light-touch monitor for R2': surface *volume* of unescalated private notes per manager (not content) to HR as a pattern signal, without breaking the privacy boundary | 5 — Loop (deliberately dampens R2' without reopening the original R2) | Low–Medium | Gives HR an early-warning signal for escalation reluctance while respecting the tiering decision just made |
| 10 | Core build sequence: Employee record + Org structure → Attendance/Leave → Payroll → Recruitment/Onboarding → Performance → Compliance vault → Intelligence layer | 3 — Structure | High | Matches the user's own stated build order; most of the actual engineering roadmap sits here |
| 11 | Surface a lightweight "data completeness" indicator per employee/module to the decision-maker | 4 — Delay | Low | Shortens the feedback delay between incomplete entry and someone noticing, before a payroll run fails on it |
| 12 | Insights/analytics dashboards | 3 — Structure | High | Despite feeling strategic, a dashboard is structure unless it demonstrably changes a decision cycle — don't inflate it |

**Highest-leverage available intervention:** #7 — elevating attention-reduction to a governing principle. It's the one item that reframes the optimization target for every other decision on this list, and the user arrived at it independently (their own Section 3), which is a strong signal it's correctly placed rather than inflated.

**Rung distribution — honest assessment:** the user's instinct to treat their five reconfirmed principles as "architectural, not implementation detail" is correct and matches this ladder — items 1, 3, 4, 5, 7, 8 are genuinely rung 6/7, not inflated placeholder rungs. The one place to watch for accidental inflation is #6: "localization abstraction layers" *sound* rung 6/7 (architecture, principle) but a fully generalized tax/compliance/currency engine built before a second jurisdiction exists is still rung 3 structure wearing rung-6 language — build the config seams, not the generalized engine, until real second-country requirements exist to design against.

---

## 10. Decision

**Build first:** Employee record + org structure, with permission roles modeled independently of job roles from day one; an audit log with attribution on every edit; the tiered performance-data model (private/official/escalated) and the purpose-based/lifecycle-based access models for health and disciplinary records, built as core schema — not bolted on later; config-driven country-variant values (tax rates, holidays, statutory templates) for the single launch jurisdiction, structured so a second jurisdiction is additive rather than a rewrite; the operator-attention principle (#7) adopted explicitly as a filter every subsequent feature decision passes through.

**Defer:** The Insights/Intelligence layer, per the original build order — now with an added condition: it must consume performance and health data only through the aggregation-granularity rule (#8), never through raw access, so the privacy design isn't quietly reopened at the exact moment the intelligence layer gets built.

**Cut:** A fully generalized, abstract tax/compliance/currency engine built ahead of a real second jurisdiction. Build the config seams; defer the generalized engine until jurisdiction #2 is a real, funded commitment with actual requirements to design against.

**Stop doing:** N/A — greenfield, nothing to stop yet.

**Escalate:** Nothing remains to escalate from the original two items — both were resolved by the user directly, at the correct level (architectural/product-principle, not a settings tweak). One new item to flag for a future check-in, not urgent now: **when jurisdiction #2 actually becomes a real commitment, revisit whether the config-seam approach (built now) needs to graduate into a more general abstraction** — that's a rung-3 sequencing decision to make later, not now.

---

## 11. Where this map contradicts the stated plan

**Both original contradictions have been resolved by the user, at the right level (architecture and product principle, not a settings tweak).**

**A. Multi-country-from-day-one vs. the stated primary actor — resolved.** The user separated vision (global), architecture (localization-ready), and implementation (one jurisdiction first). This is the correct resolution: it keeps the global narrative intact without asking v1 to prove itself in multiple markets simultaneously. **One new, smaller risk introduced by the resolution itself:** designing generalized abstraction layers (tax engine, compliance engine, currency engine) before a second real jurisdiction's requirements exist to validate them against is a classic premature-abstraction trap — the abstraction gets shaped by guesswork, and some rework happens anyway when jurisdiction #2 arrives, just later and against a live customer. Recommendation (Section 9, #6): build config-driven seams for country-varying *values*, not a fully generalized engine, until there's a real second case.

**B. HR/Owner-readable raw performance notes vs. the "people intelligence" ambition — resolved, with a residual risk correctly anticipated by the user's own design.** Tiering performance data (private coaching / official review / escalated concern) is the right structural answer — it doesn't force a choice between full transparency and full opacity, it routes information to the audience that actually needs it. **The residual risk moves, it doesn't vanish:** the manager now controls the escalation decision itself, and under-escalation (R2', Section 6) is a real, if slower and milder, version of the same underlying problem — concerns compounding invisibly until they're large. This doesn't argue against the tiered model; it argues for the light-touch monitor proposed in Section 9, #9 (surfacing escalation *volume*, not content, as a pattern signal).

**No contradictions remain unresolved.** The user's reconfirmation in both cases moved the decision up the leverage ladder (rung 6/7) rather than settling for a rung-1/3 patch, which is exactly what this map was built to surface.

---

## 12. Assumption register

| # | Assumption | Why it matters | What would falsify it |
|---|---|---|---|
| 1 | R1 (the value flywheel) takes weeks-to-months to produce a first credible insight | Sets the loop-speed-asymmetry finding in Section 6 | Early user testing showing simple operational alerts (e.g., a compliance-expiry reminder) already feel valuable almost immediately — though note that's a workflow feature, not yet "intelligence" |
| 2 | Compliance-expiry discovery delay depends on whether v1 includes automated monitoring | Sets the delay row in Section 7 | Confirm whether automated compliance-deadline tracking is actually in scope for v1, or is itself deferred to the intelligence layer |
| 3 | The single scarce approver/admin is the rate limiter across nearly every flow, even at 10–50 employees | Anchors Sections 5 and 6 (B1); now also the basis for the user's proposed governing principle (Section 9, #7) | Interviews with actual target customers showing that even small orgs already delegate onboarding/leave approval across multiple people, not one bottleneck person |
| 4 | Managers will under-escalate private coaching notes into the formal record at a meaningful rate (R2') | Determines whether the light-touch monitor (Section 9, #9) is necessary at launch or can wait | Early usage data on escalation rate vs. private-note volume, once the tiered model ships |
| 5 | A second real jurisdiction is not yet a funded, scoped commitment | Determines whether building config seams now (not a generalized engine) is the right call, or whether a real second jurisdiction is close enough to warrant more upfront generalization | Check actual sales pipeline — is there a specific, committed second-jurisdiction customer or timeline? |
| 6 | Small denominators (e.g. a 3-person team) are actually present in the customer base at meaningful frequency | Determines how urgent the aggregation-granularity rule (Section 9, #8) is before the intelligence layer ships | Distribution of team sizes across the target segment — if teams are rarely below ~8-10 people, the re-identification risk is lower priority |

**Findings that collapse if these are wrong:** if assumption 4 is false — if managers escalate promptly regardless of the formal-process cost — R2' isn't load-bearing and #9 can be deprioritized. If assumption 5 is false — if a second jurisdiction is already committed — the config-seam-only approach (#6) should be revisited now rather than later, since the cost of guessing wrong is about to be paid soon, not hypothetically.

---

## 13. Traceability

No user stories have been written yet — this map is the input to that step, not a review of one. When stories are drafted, each should trace back to an element, flow, loop, or permission above; anything that doesn't is either scope creep or evidence this map needs revisiting.
