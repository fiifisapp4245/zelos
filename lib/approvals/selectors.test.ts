import { describe, expect, it } from "vitest"

import {
  applyDecision,
  getApprovalsForUser,
  isOverdue,
  isWaitingOn,
  stepPosition,
} from "./selectors"
import { APPROVAL_CHAINS, canBulkApprove, chainFor } from "./approval-chains"
import type { ApprovalItem, ApprovalType, ChainStep } from "./types"
import type { SessionContext } from "../session"
import type { Employee } from "../types"

const NOW = new Date("2026-09-18T09:00:00")

function session(over: Partial<SessionContext> = {}): SessionContext {
  return {
    id: "fiifi",
    first_name: "Fiifi",
    last_name: "Boakye",
    email: "fiifi@xanthan.com",
    job_title: "Head of People",
    department: "People",
    roles: ["hr_admin", "employee"],
    direct_report_count: 1,
    company: { name: "Xanthan" },
    ...over,
  }
}

const HR = session()
const PAYROLL = session({
  id: "maame",
  roles: ["payroll", "employee"],
  department: "Finance",
})
const MANAGER = session({
  id: "adwoa",
  roles: ["line_manager", "employee"],
  department: "Engineering",
  direct_report_count: 5,
})
const EMPLOYEE = session({
  id: "kofi",
  roles: ["employee"],
  direct_report_count: 0,
})

const EMPLOYEES = [
  {
    id: "kofi",
    managerId: "adwoa",
    dottedLineManagerId: null,
    department: "Engineering",
    branch: "Accra HQ",
  },
  {
    id: "abla",
    managerId: "abena",
    dottedLineManagerId: null,
    department: "Marketing",
    branch: "Takoradi",
  },
  {
    id: "nana",
    managerId: "adwoa",
    dottedLineManagerId: null,
    department: "Engineering",
    branch: "Accra HQ",
  },
] as unknown as Employee[]

function item(over: Partial<ApprovalItem> = {}): ApprovalItem {
  const chain: ChainStep[] = [
    { role: "line_manager", label: "Line manager" },
    { role: "hr_admin", label: "HR Admin" },
  ]
  return {
    id: "a1",
    type: "leaveRequest",
    module: "leave",
    requester: "kofi",
    subject: "kofi",
    summary: "Annual leave · 5 days",
    submittedAt: "2026-09-10T09:00:00",
    dueAt: "2026-09-20",
    chain,
    currentStepIndex: 0,
    status: "pending",
    payload: {
      leaveType: "annual",
      startDate: "2026-10-01",
      endDate: "2026-10-05",
      days: 5,
      reason: "Rest",
    },
    history: [],
    ...over,
  }
}

const decision = (over: Partial<Parameters<typeof applyDecision>[1]> = {}) => ({
  stepIndex: 0,
  actorId: "adwoa",
  action: "approve" as const,
  at: "2026-09-18T10:00:00",
  ...over,
})

describe("isOverdue", () => {
  it("is true once the due date has passed", () => {
    expect(isOverdue(item({ dueAt: "2026-09-17" }), NOW)).toBe(true)
  })

  it("is false on the due date itself", () => {
    expect(isOverdue(item({ dueAt: "2026-09-18" }), NOW)).toBe(false)
  })

  it("is false for anything already settled, however late", () => {
    expect(
      isOverdue(item({ dueAt: "2026-01-01", status: "approved" }), NOW)
    ).toBe(false)
  })
})

describe("canBulkApprove", () => {
  it("allows the five routine types", () => {
    for (const t of [
      "leaveRequest",
      "attendanceCorrection",
      "timesheet",
      "shiftSwap",
      "openShiftPickup",
    ] as ApprovalType[]) {
      expect(canBulkApprove(t)).toBe(true)
    }
  })

  it("refuses anything touching pay, exit or conduct", () => {
    for (const t of [
      "bankDetailsChange",
      "compensationChange",
      "finalSettlement",
      "disciplinarySanction",
      "documentVerification",
      "payrollRunSignOff",
    ] as ApprovalType[]) {
      expect(canBulkApprove(t)).toBe(false)
    }
  })
})

describe("applyDecision", () => {
  it("advances to the next step and stays pending", () => {
    const next = applyDecision(item(), decision())
    expect(next.currentStepIndex).toBe(1)
    expect(next.status).toBe("pending")
    expect(next.history).toHaveLength(1)
  })

  it("settles the item when the last step approves", () => {
    const next = applyDecision(
      item({ currentStepIndex: 1 }),
      decision({ stepIndex: 1, actorId: "fiifi" })
    )
    expect(next.status).toBe("approved")
  })

  it("ends the chain on a decline, whatever step it is on", () => {
    const next = applyDecision(
      item(),
      decision({ action: "decline", note: "No cover" })
    )
    expect(next.status).toBe("declined")
    expect(next.currentStepIndex).toBe(0)
    expect(next.history[0].note).toBe("No cover")
  })

  it("treats a document rejection as a decline", () => {
    const doc = item({
      type: "documentVerification",
      chain: [{ role: "hr_admin", label: "HR Admin" }],
    })
    expect(
      applyDecision(doc, decision({ action: "reject", note: "Illegible" }))
        .status
    ).toBe("declined")
  })

  it("keeps every past decision, so the trail survives", () => {
    const one = applyDecision(item(), decision())
    const two = applyDecision(one, decision({ stepIndex: 1, actorId: "fiifi" }))
    expect(two.history.map((d) => d.actorId)).toEqual(["adwoa", "fiifi"])
  })

  it("does not mutate the item it was given", () => {
    const original = item()
    applyDecision(original, decision())
    expect(original.currentStepIndex).toBe(0)
    expect(original.history).toEqual([])
  })
})

describe("isWaitingOn", () => {
  it("puts a line manager's report on their queue", () => {
    expect(isWaitingOn(item(), MANAGER, EMPLOYEES)).toBe(true)
  })

  it("keeps someone else's report off it", () => {
    expect(
      isWaitingOn(
        item({ subject: "abla", requester: "abla" }),
        MANAGER,
        EMPLOYEES
      )
    ).toBe(false)
  })

  it("gives a head of department everyone in their department", () => {
    const hod = session({
      id: "kwesi",
      roles: ["head_of_department", "employee"],
      department: "Engineering",
      direct_report_count: 3,
    })
    const atHod = item({
      chain: [{ role: "head_of_department", label: "Head of department" }],
    })
    expect(isWaitingOn(atHod, hod, EMPLOYEES)).toBe(true)
  })

  it("only counts the step the item is actually on", () => {
    // Same chain, but it has moved past the line manager to HR.
    expect(isWaitingOn(item({ currentStepIndex: 1 }), MANAGER, EMPLOYEES)).toBe(
      false
    )
    expect(isWaitingOn(item({ currentStepIndex: 1 }), HR, EMPLOYEES)).toBe(true)
  })

  it("honours a named assignee over the role", () => {
    const assigned = item({
      chain: [{ role: "hr_admin", assigneeId: "serwa", label: "HR Admin" }],
    })
    expect(isWaitingOn(assigned, HR, EMPLOYEES)).toBe(false)
  })

  it("never waits on anything already settled", () => {
    expect(isWaitingOn(item({ status: "approved" }), MANAGER, EMPLOYEES)).toBe(
      false
    )
  })
})

describe("getApprovalsForUser", () => {
  const items = [
    item({
      id: "overdue",
      dueAt: "2026-09-10",
      submittedAt: "2026-09-01T09:00:00",
    }),
    item({
      id: "today",
      dueAt: "2026-09-18",
      submittedAt: "2026-09-16T09:00:00",
    }),
    item({
      id: "later",
      dueAt: "2026-09-30",
      submittedAt: "2026-09-02T09:00:00",
    }),
  ]

  it("sorts overdue first, then due today, then oldest", () => {
    const got = getApprovalsForUser(MANAGER, items, {
      employees: EMPLOYEES,
      now: NOW,
    })
    expect(got.map((i) => i.id)).toEqual(["overdue", "today", "later"])
  })

  it("gives an employee nothing at all", () => {
    expect(
      getApprovalsForUser(EMPLOYEE, items, { employees: EMPLOYEES })
    ).toEqual([])
  })

  it("filters to overdue only", () => {
    const got = getApprovalsForUser(MANAGER, items, {
      filters: { overdueOnly: true },
      employees: EMPLOYEES,
      now: NOW,
    })
    expect(got.map((i) => i.id)).toEqual(["overdue"])
  })

  it("filters by module and by unit", () => {
    const mixed = [
      item({ id: "l", module: "leave" }),
      item({ id: "d", module: "documents", type: "documentVerification" }),
    ]
    expect(
      getApprovalsForUser(MANAGER, mixed, {
        filters: { module: "leave" },
        employees: EMPLOYEES,
        now: NOW,
      }).map((i) => i.id)
    ).toEqual(["l"])

    expect(
      getApprovalsForUser(MANAGER, mixed, {
        filters: { unit: "Marketing" },
        employees: EMPLOYEES,
        now: NOW,
      })
    ).toEqual([])
  })

  it("moves a decided item from waiting to in progress", () => {
    const decided = applyDecision(item(), decision())
    const opts = { employees: EMPLOYEES, now: NOW }

    expect(getApprovalsForUser(MANAGER, [decided], opts)).toEqual([])
    expect(
      getApprovalsForUser(MANAGER, [decided], { ...opts, tab: "inProgress" })
    ).toHaveLength(1)
    // It is now waiting on HR instead.
    expect(getApprovalsForUser(HR, [decided], opts)).toHaveLength(1)
  })

  it("moves a settled item to completed, for whoever decided it", () => {
    const declined = applyDecision(
      item(),
      decision({ action: "decline", note: "No" })
    )
    const opts = { employees: EMPLOYEES, now: NOW }

    expect(
      getApprovalsForUser(MANAGER, [declined], { ...opts, tab: "completed" })
    ).toHaveLength(1)
    expect(
      getApprovalsForUser(MANAGER, [declined], { ...opts, tab: "inProgress" })
    ).toEqual([])
    // HR never touched it, so it is not their history.
    expect(
      getApprovalsForUser(HR, [declined], { ...opts, tab: "completed" })
    ).toEqual([])
  })

  it("routes pay-stage items to the payroll officer only", () => {
    const atPayroll = item({
      type: "bankDetailsChange",
      module: "profile",
      currentStepIndex: 1,
      chain: [
        { role: "hr_admin", label: "HR Admin" },
        { role: "payroll_officer", label: "Payroll Officer" },
      ],
    })
    const opts = { employees: EMPLOYEES, now: NOW }
    expect(getApprovalsForUser(PAYROLL, [atPayroll], opts)).toHaveLength(1)
    expect(getApprovalsForUser(HR, [atPayroll], opts)).toEqual([])
  })
})

describe("chains", () => {
  it("defines one for every type", () => {
    const types = Object.keys(APPROVAL_CHAINS) as ApprovalType[]
    expect(types.every((t) => APPROVAL_CHAINS[t].length > 0)).toBe(true)
  })

  it("adds payroll to a lifecycle change only when the pay moves", () => {
    expect(chainFor("promotion").map((s) => s.role)).toEqual([
      "head_of_department",
      "hr_admin",
    ])
    expect(
      chainFor("promotion", { payChanges: true }).map((s) => s.role)
    ).toEqual(["head_of_department", "hr_admin", "payroll_officer"])
  })

  it("adds the head of department to a sanction only for a dismissal", () => {
    expect(chainFor("disciplinarySanction").map((s) => s.role)).toEqual([
      "hr_admin",
    ])
    expect(
      chainFor("disciplinarySanction", { dismissal: true }).map((s) => s.role)
    ).toEqual(["head_of_department", "hr_admin"])
  })

  it("routes leave through all three stages", () => {
    expect(APPROVAL_CHAINS.leaveRequest.map((s) => s.role)).toEqual([
      "line_manager",
      "head_of_department",
      "hr_admin",
    ])
  })
})

describe("stepPosition", () => {
  it("counts from one, for the text equivalent", () => {
    expect(stepPosition(item({ currentStepIndex: 1 }))).toEqual({
      step: 2,
      of: 2,
    })
  })
})
