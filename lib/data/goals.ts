import type { CheckIn, Goal, KeyResult } from "../types"

const kr = (
  id: string,
  title: string,
  start: number,
  target: number,
  current: number,
  unit: string,
  kind: KeyResult["kind"] = "number"
): KeyResult => ({ id, title, kind, start, target, current, unit })

const base = {
  description: "",
  returnNote: null,
  cycle: "H2 2026",
  startOn: "2026-07-01",
  dueOn: "2026-12-31",
}

export const GOALS: Goal[] = [
  {
    ...base,
    id: "g-co-1",
    title: "Launch payroll v2 to every customer",
    description:
      "Move all customers onto the new payroll engine without a missed pay run.",
    level: "company",
    ownerId: null,
    team: null,
    parentId: null,
    dueOn: "2026-12-15",
    status: "active",
    createdBy: "esi",
    keyResults: [
      kr("k1", "Customers migrated", 0, 120, 54, "customers"),
      kr("k2", "Payroll run errors per month", 14, 3, 9, "errors"),
    ],
  },
  {
    ...base,
    id: "g-co-2",
    title: "Grow the team sustainably",
    description:
      "Hire the people the roadmap needs, and keep the people we have.",
    level: "company",
    ownerId: null,
    team: null,
    parentId: null,
    status: "active",
    createdBy: "esi",
    keyResults: [
      kr("k1", "Open roles filled", 0, 6, 2, "roles"),
      kr("k2", "Voluntary turnover, annualised", 12, 8, 10, "%", "percent"),
    ],
  },
  {
    ...base,
    id: "g-eng-1",
    title: "Make the platform dependable",
    level: "team",
    ownerId: null,
    team: "Engineering",
    parentId: "g-co-1",
    status: "active",
    createdBy: "adwoa",
    keyResults: [
      kr("k1", "Uptime", 99.2, 99.9, 99.7, "%"),
      kr("k2", "Deploys per week", 4, 12, 8, "deploys"),
      kr("k3", "P1 incidents this quarter", 6, 1, 3, "incidents"),
    ],
  },
  {
    ...base,
    id: "g-mk-1",
    title: "Tell the payroll v2 story",
    level: "team",
    ownerId: null,
    team: "Marketing",
    parentId: "g-co-1",
    status: "active",
    createdBy: "yaw",
    keyResults: [
      kr("k1", "Launch campaign live", 0, 1, 0, "", "yes_no"),
      kr("k2", "Qualified leads", 0, 400, 150, "leads"),
    ],
  },
  {
    ...base,
    id: "g-kofi-1",
    title: "Finish the payments migration",
    level: "individual",
    ownerId: "kofi",
    team: null,
    parentId: "g-eng-1",
    status: "active",
    createdBy: "adwoa",
    keyResults: [
      kr("k1", "Services migrated", 0, 6, 4, "services"),
      kr("k2", "Cutovers with zero downtime", 0, 6, 4, "cutovers"),
    ],
  },
  {
    ...base,
    id: "g-kofi-2",
    title: "Bring design in earlier",
    description:
      "Get design involved before build starts, so there is less rework.",
    level: "individual",
    ownerId: "kofi",
    team: null,
    parentId: "g-eng-1",
    status: "active",
    createdBy: "kofi",
    keyResults: [
      kr(
        "k1",
        "Features with a design review before build",
        0,
        4,
        1,
        "features"
      ),
    ],
  },
  {
    ...base,
    id: "g-selorm-1",
    title: "Halve the on-call load",
    level: "individual",
    ownerId: "selorm",
    team: null,
    parentId: "g-eng-1",
    status: "active",
    createdBy: "adwoa",
    keyResults: [kr("k1", "Pager alerts per week", 30, 10, 18, "alerts")],
  },
  {
    ...base,
    id: "g-ama-1",
    title: "Redesign the onboarding flow",
    description: "Shorter, clearer, and tested with real new hires.",
    level: "individual",
    ownerId: "ama",
    team: null,
    parentId: null,
    status: "proposed",
    createdBy: "ama",
    keyResults: [kr("k1", "Usability test score", 60, 85, 60, "points")],
  },
  {
    ...base,
    id: "g-abla-1",
    title: "Grow organic traffic",
    level: "individual",
    ownerId: "abla",
    team: null,
    parentId: "g-mk-1",
    status: "active",
    createdBy: "abena",
    keyResults: [
      kr("k1", "Monthly organic sessions", 8000, 12000, 9400, "sessions"),
    ],
  },
]

const ci = (
  id: string,
  goalId: string,
  at: string,
  by: string,
  confidence: CheckIn["confidence"],
  note: string,
  values: Record<string, number>
): CheckIn => ({ id, goalId, at, by, confidence, note, values })

export const CHECK_INS: CheckIn[] = [
  ci(
    "ci-1",
    "g-co-1",
    "2026-09-12T10:00:00",
    "esi",
    "at_risk",
    "Migration pace has slowed since the August freeze.",
    { k1: 54, k2: 9 }
  ),
  ci(
    "ci-2",
    "g-co-2",
    "2026-09-10T10:00:00",
    "fiifi",
    "on_track",
    "Two engineers started; interviews under way for two more.",
    { k1: 2, k2: 10 }
  ),
  ci(
    "ci-3",
    "g-eng-1",
    "2026-09-14T16:00:00",
    "adwoa",
    "on_track",
    "Uptime held through the migration weekend.",
    { k1: 99.7, k2: 8, k3: 3 }
  ),
  ci(
    "ci-4",
    "g-mk-1",
    "2026-09-05T11:00:00",
    "yaw",
    "at_risk",
    "Campaign creative is late; leads are tracking slightly behind.",
    { k1: 0, k2: 150 }
  ),
  ci(
    "ci-5",
    "g-kofi-1",
    "2026-09-08T09:30:00",
    "kofi",
    "on_track",
    "Four of six services across. Ledger service is next.",
    { k1: 4, k2: 4 }
  ),
  ci(
    "ci-6",
    "g-kofi-1",
    "2026-08-25T09:30:00",
    "kofi",
    "on_track",
    "Three services across.",
    { k1: 3, k2: 3 }
  ),
  ci(
    "ci-7",
    "g-kofi-2",
    "2026-08-20T15:00:00",
    "kofi",
    "on_track",
    "Held one design review for the new statements feature.",
    { k1: 1 }
  ),
  ci(
    "ci-8",
    "g-selorm-1",
    "2026-09-16T08:45:00",
    "selorm",
    "on_track",
    "Noise from the two flappy alerts is gone.",
    { k1: 18 }
  ),
  ci(
    "ci-9",
    "g-abla-1",
    "2026-08-30T14:00:00",
    "abla",
    "at_risk",
    "Two posts delayed by review; traffic flat.",
    { k1: 9400 }
  ),
]
