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

Everything runs from seeded mock data held in React state and mirrored into `sessionStorage`.
Edits you make while demoing persist across navigation and reset when the tab closes, or via
**Reset demo data** in the persona switcher.

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

| Role | Persona | What changes |
|---|---|---|
| HR Admin | Fiifi Boakye | Everything. The only role that can change lifecycle state. |
| Line Manager | Adwoa Bediako | Own reports only. **No salary.** No audit log, payroll or structure. |
| Head of Department | Kwesi Owusu | Whole department, plus their own reports. |
| Payroll Officer | Maame Yeboah | Compensation and statutory IDs across the org. |
| Employee | Kofi Mensah | Own record only — a 403 on anyone else's. |

## The three access models

A flat role table was not enough, so [lib/rbac.ts](lib/rbac.ts) implements three models side by
side. This is the part most likely to be expensive to retrofit, so it is modelled properly here
rather than sketched.

1. **Static role-based** — salary is visible to the employee, HR and Payroll. Line managers are
   excluded deliberately; comp conversations route through HR.
2. **Purpose-based** — medical documents and statutory ID reveals require a *stated reason*,
   which is written to the audit log. Seniority alone opens nothing.
3. **Lifecycle/state-based** — who may read a disciplinary case depends on the case's state.
   A coaching note is private to its author until it is deliberately escalated.

Permission roles are modelled **separately from job titles**, because in a 10–50 person company
one person routinely holds several at once. See the matrix under
**Company Settings → Admin & permissions → Role assignment**.

## What to look at

| Route | Worth noticing |
|---|---|
| `/overview` | Role-aware. Employees get a different landing page entirely. |
| `/employees` | 3-character search minimum, composable filters, table/grid. |
| `/employees/new` | 5-step wizard. Try continuing with an empty form, or reusing Kofi's Ghana Card. |
| `/employees/kofi` | Full record. Compare the Compensation tab across roles. |
| `/employees/nii` | Retired — an end state. "Change status" offers nothing. |
| `/leave` | Approvals, including via a dotted line. Rejection requires a reason. |
| `/performance` | Private notes, escalation as a one-way door, and the HR escalation signal. |
| `/payroll` | Blocks the run on incomplete records *before* it starts. |
| `/alerts` | Thresholds fire at 30/15/7 days and are generated from dates already in the system. |
| `/settings` | Company Settings hub — searchable, ten categories. Try searching "holiday" or "payroll". |

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
