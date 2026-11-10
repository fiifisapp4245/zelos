# Zelos HR — prototype

A clickable prototype of the Zelos employee operating system: one employee record that carries
from recruitment through to retirement. It exists to show engineering what to build, not to be
the thing that ships.

Launch jurisdiction is **Ghana** — Ghana Card, SSNIT, TIN, Tier 2/3 pensions, GhanaPost GPS, MoMo
and GHS appear throughout as real fields rather than placeholders.

```bash
npm install
npm run dev       # http://localhost:3000
```

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 ·
shadcn/ui (`radix-nova` style) · lucide-react · **IBM Plex Sans** as the default sans.

Design tokens live in [app/globals.css](app/globals.css) — the emerald primary, radii and
semantic status colours all come from there. No component hard-codes a colour.

## No backend

Everything runs from seeded mock data held in React state and mirrored into `localStorage`.
Edits you make while demoing persist across navigation and reloads, and are shared between tabs
(which is how a candidate's booking link, opened in a second tab, reaches the recruiter's view).
Which persona you view as stays with the tab. Reset with **Reset demo data** in the persona switcher.

- [lib/data/employees.ts](lib/data/employees.ts) — 25-person workforce
- [lib/data/records.ts](lib/data/records.ts) — leave, attendance, documents, cases, alerts, pipeline
- [lib/store.tsx](lib/store.tsx) — the session store and every mutation

The prototype runs against a **fixed "today" of 2026-09-18** (`TODAY` in
[lib/format.ts](lib/format.ts)) so that "expires in 7 days" stays true whenever you open it.
Seeded dates are positioned relative to it.

## Switching roles

The **persona switcher** is the floating button in the bottom-right corner of the screen. It swaps
the signed-in persona, and it is the fastest way to see the permission model — the thing most
worth demoing:

| Role               | Persona       | What changes                                                         |
| ------------------ | ------------- | -------------------------------------------------------------------- |
| HR Admin           | Fiifi Boakye  | Everything. The only role that can change lifecycle state.           |
| Line Manager       | Adwoa Bediako | Own reports only. **No salary.** No audit log, payroll or structure. |
| Head of Department | Kwesi Owusu   | Whole department, plus their own reports.                            |
| Payroll Officer    | Maame Yeboah  | Compensation and statutory IDs across the org.                       |
| Employee           | Kofi Mensah   | Own record only — a 403 on anyone else's.                            |

## Home

`/overview` is one skeleton for every role — a greeting, up to four quick actions, then a
two-thirds main column and a one-third rail that stacks under it below 1024px. Which widgets
land in which column comes from [lib/home/home-config.ts](lib/home/home-config.ts) and the pure
`getHomeForUser(session)`; the config names widgets as string keys, and the page maps them
through its own registry, so the selector stays free of React and is unit-tested for all four
personas.

The queue leads because that is what Home is for. `NeedsApproval` shows only requests whose
_current_ chain step belongs to you — HR at the HR stage across the company, a manager at their
own stage on their own team, payroll on pay details — and expanding a row gives you the facts
needed to decide without opening the record: leave balance before and after, who else is away
on those dates, and any public holidays in the range.

### Demo states

Two query parameters, deliberately not surfaced anywhere in the UI. Combine either with the
persona switcher to see all four homes in each state.

| URL                      | Shows                                                              |
| ------------------------ | ------------------------------------------------------------------ |
| `/overview?demo=empty`   | Every widget's empty state, by starving the store for that subtree |
| `/overview?demo=loading` | The loading skeletons                                              |

## The three access models

A flat role table was not enough, so [lib/rbac.ts](lib/rbac.ts) implements three models side by
side. This is the part most likely to be expensive to retrofit, so it is modelled properly here
rather than sketched.

1. **Static role-based** — salary is visible to the employee, HR and Payroll. Line managers are
   excluded deliberately; comp conversations route through HR.
2. **Purpose-based** — medical documents and statutory ID reveals require a _stated reason_,
   which is written to the audit log. Seniority alone opens nothing.
3. **Lifecycle/state-based** — who may read a disciplinary case depends on the case's state.
   A coaching note is private to its author until it is deliberately escalated.

Permission roles are modelled **separately from job titles**, because in a 10–50 person company
one person routinely holds several at once. See the matrix under
**Company Settings → Admin & permissions → Role assignment**.

## What to look at

| Route             | Worth noticing                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `/overview`       | Role-aware. Employees get a different landing page entirely.                             |
| `/employees`      | 3-character search minimum, composable filters, table/grid.                              |
| `/employees/new`  | 5-step wizard. Try continuing with an empty form, or reusing Kofi's Ghana Card.          |
| `/employees/kofi` | Full record. Compare the Compensation tab across roles.                                  |
| `/employees/nii`  | Retired — an end state. "Change status" offers nothing.                                  |
| `/leave`          | Approvals, including via a dotted line. Rejection requires a reason.                     |
| `/performance`    | Private notes, escalation as a one-way door, and the HR escalation signal.               |
| `/payroll`        | Blocks the run on incomplete records _before_ it starts.                                 |
| `/alerts`         | Thresholds fire at 30/15/7 days and are generated from dates already in the system.      |
| `/settings`       | Company Settings hub — searchable, ten categories. Try searching "holiday" or "payroll". |

## Design decisions worth keeping

These came out of [docs/system-maps/zelos-hr-foundation.md](docs/system-maps/zelos-hr-foundation.md)
and are load-bearing, not cosmetic.

- **The lifecycle is a real state machine.** `LIFECYCLE_TRANSITIONS` in
  [lib/format.ts](lib/format.ts) defines what may follow what. Resigned, Terminated and Retired
  are end states with no way out — re-employment means a new record, so service history stays
  intact.
- **A state is an obligation, not a label.** `lifecycleTasks()` in
  [lib/lifecycle-actions.ts](lib/lifecycle-actions.ts) derives the decisions the current states
  have made due — probation confirmations, returns from leave, notice served, suspension
  reviews, retirements, contracts running out — and `/lifecycle` puts them at the top as a
  worklist. It only ever offers transitions the state machine permits, and every outcome goes
  through the same reason-and-audit dialog as a manual change.
- **Every write is attributed.** The audit log cannot be edited or cleared by anyone, including
  HR. Revealing a statutory ID is itself a logged event with its stated purpose.
- **Data completeness is surfaced early.** A payroll run that discovers a missing SSNIT number
  has already failed. Records show a completeness bar, and `/payroll` refuses to start.
- **Aggregates need at least 5 people** (`MIN_AGGREGATION_GROUP`). Below that, a "team average"
  is one person's data wearing a label.
- **Dotted-line managers are first class**, not a note in a text field. They can approve leave and
  see operational data; they never see salary.
- **Ghana is configuration, not hard-coded logic.** The jurisdiction panel under
  **Company Settings → Company details → Localization** is the seam
  a second country plugs into. Build the seam; don't build a generalised tax engine before a real
  second country exists to design against.

## Structure

```
app/(app)/            one folder per module, each its own route
app/(app)/settings/   the Company Settings hub + [section] detail route
components/shell/     sidebar, topbar, role switcher, page shell
components/common/    PageHeader, Panel, StatCard, Field, Pill, EmptyState, Restricted
components/ui/        shadcn primitives (generated — avoid editing)
lib/data/settings.ts  the Company Settings catalogue (categories → items)
lib/rbac.ts           the permission layer
lib/selectors.ts      role-scoped queries (visibleEmployees, completeness, …)
lib/format.ts         labels, dates, GHS, the lifecycle state machine
lib/home/            the Home widget config, getHomeForUser and its selectors
lib/fixtures/        Ghana public holidays and the GRA/SSNIT filing calendar
lib/lifecycle-actions.ts  the decisions each lifecycle state has made due
```

## Company Settings

`/settings` is a hub, not a form. Ten categories, each listing the areas it
controls, with a search across both names and descriptions. Settings are reached
from the profile chip at the foot of the sidebar — clicking it opens Company
Settings, Account Settings, Learn more, Help and Log out, and clicking again
docks the list away. They sit there rather than in the nav list because they
configure the product rather than being part of daily work.

Items that already have a screen link straight to it — Departments and Branches
to `/structure`, Audit log to `/audit`, Expiry alerts to `/alerts`, Payroll
approval to `/payroll`. Everything else resolves to `/settings/<slug>`, and all
27 of those detail pages carry realistic sample content for the launch
jurisdiction — Ghana public holidays, GRA PAYE bands, SSNIT tier rates, the job
catalogue and pay-grade bands, and so on. **Organizational structure → Structure
diagram** draws the departments, their heads and their branches from live store
data.

Sample content lives in [lib/data/settings-content.ts](lib/data/settings-content.ts)
as declarative blocks (`fields`, `table`, `toggles`, `note`, `orgTree`), rendered
by a generic renderer. Adding a screen means adding data, not a component.

Adding an area means adding one entry to `SETTINGS` in
[lib/data/settings.ts](lib/data/settings.ts) — the hub, the search and the
detail route all pick it up.

## Known gaps

Deliberately out of scope for a prototype: real authentication, PAYE band calculation, file
upload (the dropzones are visual), email/SMS delivery, and the intelligence layer — which should
stay deferred until there is clean operational data for it to read.

Company Settings screens are read-only: they show what each area holds and how it is
configured, but nothing there writes yet.


## Interview booking and assessments

Two candidate-facing flows, both public pages with no login, protected by a private token.

- **Booking** — Recruitment → Booking sets up pages (length, buffer, window, interviewers, video) and
  weekly availability. From a candidate's record, *Send booking link* creates a private link
  (`/book/<token>`). The candidate picks a slot in their own time zone, gets a confirmation with a
  video link and a calendar file, and can reschedule or cancel until the cut-off. A slot can never be
  booked twice; public holidays and approved leave are taken out of availability.
- **Assessments** — Recruitment → Assessments holds the question bank (multiple choice, multiple
  answer, short, long, upload, JavaScript coding), tests built from it, and results. A candidate opens
  `/assess/<token>`, accepts the terms, and takes the test against a clock fixed at the moment they
  start (refreshing does not add time; answers after the deadline are refused; the test submits
  itself). Written answers go to a reviewer; moving to Offer can require a reviewed result.
- **Outbox** — there is no mail server. Every email these flows would send is recorded under `/outbox`
  (bell menu → *Sent emails*), links included. Reminders sit there as *Scheduled*.

Prototype limits, on purpose: coding runs in a Web Worker with the network removed and a 3-second kill
(a real build uses an isolated server-side sandbox), the editor has no syntax highlighting, uploaded
files keep only their name, and calendar sync is not built.

## Careers page and offer e-signature

- **Careers** — Recruitment → Careers publishes a requisition to the public jobs page (`/careers`,
  `/careers/<requisition>`). A role shows only while it is open, published and before its closing
  date. The form (name, email, phone, CV, the role's own questions, consent) refuses an incomplete
  application or a second one to the same role from the same email, and the application lands in the
  pipeline at Applied with the CV and answers on the candidate's record.
- **Offers** — from a candidate, *Prepare letter* fills a template from the offer and the role, shows
  exactly what will be sent, and sends a private link (`/sign/<token>`). The letter is stored as text
  with its SHA-256, so what the candidate signs is what was sent. They type their name (checked against
  the candidate's own), optionally draw a signature, and sign or decline. A signature accepts the offer
  and hires the candidate: the same pre-hire record and onboarding tasks as *Hire*. The signed copy can
  be printed or downloaded, and carries the signing record. Withdrawing, resending and expiry are
  handled; a changed letter is reported as not matching its checksum.

This is an electronic signature in the sense of a typed name with an audit trail, suitable for a
prototype. A production build should add identity checks, a trusted timestamp and PDF output.

## Pre-hire portal

Hiring someone (by *Hire*, or by a signed offer) also invites them to fill in their own details at
`/welcome/<token>`, a private link emailed to their personal address, with reminders a week and two
days before their first day. They work through five short sections (about you, identity with a photo
of their Ghana Card, tax and pension, how they are paid, emergency contact) with the same format
checks HR's own form uses, and it saves as they go, so they can stop and come back. Nothing touches
their record until HR accepts it: Onboarding → *Review details* shows each section, and HR accepts it
or sends it back with a note (the new hire is emailed and only has to fix what was flagged). Accepting
writes the personal, statutory and payment fields, keeps salary and grade, turns the uploads into
identity documents waiting to be verified, and completes the matching onboarding task.

## Smaller additions

- **Scheduled report emails** — a saved report that repeats weekly or monthly is emailed as a CSV to the
  addresses on it when it comes due (checked whenever the app opens), and *Email now* sends one on demand.
  Each report runs with the access of the person who saved it, so a manager's file never holds the company.
  Messages, with the file attached, are in the Outbox.
- **Leave rules from the country** — Ghana's 15-day annual minimum lives in its rule pack, not in a form.
  Settings → Leave policies refuses annual leave below it (and says where the floor comes from), balances
  never show less, and the leave type marked *Sick* sets everyone's sick entitlement.
- **Announcements** — news for everyone, a department or an office, with read tracking. A policy asks each
  person to confirm they have read and understood it; HR sees who has not and can remind them.
- **Company assets** — a register of laptops, phones, SIMs and cards, with assign, take back, repair, lost
  and retire, each leaving a history line. Starting an exit builds the leaver's checklist from what the
  register says they hold, and ticking an item off (or marking it lost) updates the register too.
- **Pulse surveys** — short anonymous surveys (eNPS, 1–5 agreement, free text). An answer carries no name,
  only the team; who took part is kept apart and the answers are stored in a shuffled order. Results are
  shown only once five people have answered, and a team only once it has five.

## Goals and OKRs

`/goals` holds goals at three levels: company, team and individual. Each has key results (a number, a percentage or done/not done) and can sit under a goal it supports, so progress rolls up. A goal with no key results of its own shows the average of the goals beneath it.

- **Check-ins** move each key result to where it stands now, with a confidence (on track, at risk, off track) and a note. A goal with no check-in for 14 days is flagged, and a manager can ask for one, which sends an email to the Outbox.
- **Approval:** a goal you set for yourself is proposed to your manager (or HR), who approves it or sends it back with a note. Goals set by a manager or HR start active.
- **Who sees what:** company and team goals are open to everyone. An individual goal is visible to its owner, their managers and HR.
- **Performance review:** the review sheet lists the person's goals for that cycle with their progress and health.
- **Reports:** "Goals and OKRs" (HR) shows company and team goals one by one, and individual goals only by department once a group has 5 or more.

Logic is in `lib/goals.ts` with tests in `lib/goals.test.ts`.
