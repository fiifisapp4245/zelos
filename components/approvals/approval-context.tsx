"use client"

import { FileText } from "lucide-react"

import { useStore } from "@/lib/store"
import { holidaysBetween } from "@/lib/fixtures/ghanaHolidays"
import { SHIFTS } from "@/lib/fixtures/shifts"
import {
  TIMESHEET_CORRECTIONS,
  TIMESHEETS,
  weekTotal,
} from "@/lib/fixtures/timesheets"
import { assetsOutstanding } from "@/lib/selectors"
import {
  EMPLOYMENT_TYPE_LABEL,
  LEAVE_TYPE_LABEL,
  formatDate,
  fullName,
  ghs,
} from "@/lib/format"
import type { ApprovalItem } from "@/lib/approvals/types"
import type * as P from "@/lib/approvals/types"

/** One labelled fact. The panels are grids of these. */
export function Fact({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border bg-card px-3 py-2.5">
      <dt className="w-[150px] shrink-0 text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm font-medium">{children}</dd>
    </div>
  )
}

/**
 * One column. The drawer is 560px wide, and three columns of facts there
 * truncate the values — which is the one thing a decision panel must not do.
 */
function Grid({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-2.5">{children}</dl>
}

/** before → after, the shape most of these panels take. */
function Delta({
  label,
  before,
  after,
  sub,
}: {
  label: string
  before: React.ReactNode
  after: React.ReactNode
  sub?: React.ReactNode
}) {
  return (
    <Fact label={label}>
      <span className="text-muted-foreground line-through">{before}</span>
      <span className="mx-1.5 text-muted-foreground">→</span>
      <span className="text-primary">{after}</span>
      {sub && (
        <span className="block text-xs text-muted-foreground">{sub}</span>
      )}
    </Fact>
  )
}

/**
 * What you need to decide, without opening the record. One panel per type;
 * everything is read from the fixtures the payload points at, so the panel
 * cannot drift from the data.
 */
export function ApprovalContext({ item }: { item: ApprovalItem }) {
  const store = useStore()
  const name = (id: string) => fullName(store.employeeById(id))

  switch (item.type) {
    case "leaveRequest":
    case "leaveCancellation": {
      const p = item.payload as P.LeavePayload
      const balance = store.leaveBalances.find(
        (b) => b.employeeId === item.subject
      )
      const tile = balance?.byType.find((t) => t.type === p.leaveType)
      const remaining = tile ? tile.entitlement - tile.taken : 0
      const cancelling = item.type === "leaveCancellation"
      const after = cancelling ? remaining + p.days : remaining - p.days
      const overlapping = store.leaveRequests.filter(
        (l) =>
          l.status === "approved" &&
          l.employeeId !== item.subject &&
          l.startDate <= p.endDate &&
          l.endDate >= p.startDate
      )
      const holidays = holidaysBetween(p.startDate, p.endDate)

      return (
        <Grid>
          <Fact
            label={`Balance ${cancelling ? "after cancelling" : "after approval"}`}
          >
            <span className="tabular">
              {remaining} → {after} days
            </span>
            <span className="block text-xs text-muted-foreground">
              of {tile?.entitlement ?? 0} {LEAVE_TYPE_LABEL[p.leaveType]}
            </span>
          </Fact>
          <Fact label="Away at the same time">
            {overlapping.length === 0 ? (
              <span className="text-muted-foreground">Nobody else</span>
            ) : (
              <ul className="space-y-0.5">
                {overlapping.slice(0, 4).map((l) => (
                  <li key={l.id} className="text-xs">
                    {name(l.employeeId)}
                  </li>
                ))}
              </ul>
            )}
          </Fact>
          <Fact label="Public holidays in range">
            {holidays.length === 0 ? (
              <span className="text-muted-foreground">None</span>
            ) : (
              <ul className="space-y-0.5">
                {holidays.map((h) => (
                  <li key={h.date} className="text-xs">
                    {h.name} · {formatDate(h.date)}
                  </li>
                ))}
              </ul>
            )}
          </Fact>
        </Grid>
      )
    }

    case "attendanceCorrection":
    case "overtimeClaim": {
      const p = item.payload as P.TimeCorrectionPayload
      const c = TIMESHEET_CORRECTIONS.find((x) => x.id === p.correctionId)
      if (!c) return null
      return (
        <Grid>
          <Fact label="Recorded">
            {c.recorded.clockIn ?? "—"} –{" "}
            {c.recorded.clockOut ?? "no clock-out"}
            <span className="tabular block text-xs text-muted-foreground">
              {c.recorded.hours} h
            </span>
          </Fact>
          <Fact label="Corrected to">
            <span className="text-primary">
              {c.corrected.clockIn} – {c.corrected.clockOut}
            </span>
            <span className="tabular block text-xs text-primary">
              {c.corrected.hours} h
            </span>
          </Fact>
          <Fact label="Week total">
            <span className="tabular">{weekTotal(c.employeeId)} h</span>
            <span className="block text-xs text-muted-foreground">
              {c.reason}
            </span>
          </Fact>
        </Grid>
      )
    }

    case "timesheet": {
      const p = item.payload as P.TimesheetPayload
      const days = TIMESHEETS.filter((e) => e.employeeId === p.employeeId)
      return (
        <Grid>
          <Fact label="Week starting">{formatDate(p.weekStarting)}</Fact>
          <Fact label="Days recorded">
            <span className="tabular">{days.length}</span>
          </Fact>
          <Fact label="Total">
            <span className="tabular">{weekTotal(p.employeeId)} h</span>
            {days[0]?.project && (
              <span className="block text-xs text-muted-foreground">
                {days[0].project}
              </span>
            )}
          </Fact>
        </Grid>
      )
    }

    case "shiftSwap": {
      const p = item.payload as P.ShiftSwapPayload
      const from = SHIFTS.find((s) => s.id === p.fromShiftId)
      const to = SHIFTS.find((s) => s.id === p.withShiftId)
      if (!from || !to) return null
      return (
        <Grid>
          <Fact label={name(from.employeeId)}>
            {formatDate(from.date)}
            <span className="block text-xs text-muted-foreground">
              {from.start} – {from.end} · {from.branch}
            </span>
          </Fact>
          <Fact label={name(to.employeeId)}>
            {formatDate(to.date)}
            <span className="block text-xs text-muted-foreground">
              {to.start} – {to.end} · {to.branch}
            </span>
          </Fact>
          <Fact label="Effect">
            <span className="text-muted-foreground">
              They trade places; neither loses hours.
            </span>
          </Fact>
        </Grid>
      )
    }

    case "openShiftPickup": {
      const p = item.payload as P.OpenShiftPayload
      const shift = SHIFTS.find((s) => s.id === p.shiftId)
      if (!shift) return null
      return (
        <Grid>
          <Fact label="Shift">
            {formatDate(shift.date)}
            <span className="block text-xs text-muted-foreground">
              {shift.start} – {shift.end}
            </span>
          </Fact>
          <Fact label="Branch">{shift.branch}</Fact>
          <Fact label="Claimed by">{name(item.requester)}</Fact>
        </Grid>
      )
    }

    case "promotion":
    case "transfer":
    case "actingAssignment":
    case "gradeChange": {
      const p = item.payload as P.RoleChangePayload
      const payMoves = p.before.grossMonthly !== p.after.grossMonthly
      return (
        <Grid>
          <Delta
            label="Role"
            before={p.before.jobTitle}
            after={p.after.jobTitle}
            sub={`${p.before.department} → ${p.after.department}`}
          />
          <Delta
            label="Grade and pay"
            before={`${p.before.payGrade} · ${ghs(p.before.grossMonthly)}`}
            after={`${p.after.payGrade} · ${ghs(p.after.grossMonthly)}`}
            sub={payMoves ? "Payroll is on the chain" : "No change to pay"}
          />
          <Fact label="Effective">
            {formatDate(p.effectiveDate)}
            {p.endsOn && (
              <span className="block text-xs text-muted-foreground">
                until {formatDate(p.endsOn)}
              </span>
            )}
            <span className="block text-xs text-muted-foreground">
              {p.reason}
            </span>
          </Fact>
        </Grid>
      )
    }

    case "newHireSignOff": {
      const p = item.payload as P.OnboardingPayload
      const tasks = store.onboardingTasks.filter((t) =>
        p.outstandingTaskIds.includes(t.id)
      )
      return (
        <Grid>
          <Fact label="Starts">{formatDate(p.startDate)}</Fact>
          <Fact label="Outstanding tasks">
            {tasks.length === 0 ? (
              <span className="text-muted-foreground">None</span>
            ) : (
              <ul className="space-y-0.5">
                {tasks.map((t) => (
                  <li key={t.id} className="text-xs">
                    {t.title}
                  </li>
                ))}
              </ul>
            )}
          </Fact>
          <Fact label="Record">
            <span className="text-muted-foreground">
              Sign-off puts them on strength and into the next payroll run.
            </span>
          </Fact>
        </Grid>
      )
    }

    case "resignation":
    case "exitClearance":
    case "finalSettlement": {
      const p = item.payload as P.OffboardingPayload
      const c = store.offboarding.find((x) => x.id === p.caseId)
      const out = c ? assetsOutstanding(c) : []
      return (
        <Grid>
          <Fact label="Last working day">{formatDate(p.lastWorkingDay)}</Fact>
          <Fact label="Outstanding leave">
            <span className="tabular">{p.outstandingLeaveDays} days</span>
            {p.finalSettlement !== undefined && (
              <span className="block text-xs text-muted-foreground">
                Settlement {ghs(p.finalSettlement)}
              </span>
            )}
          </Fact>
          <Fact label="Assets">
            {out.length === 0 ? (
              <span className="text-muted-foreground">All returned</span>
            ) : (
              <ul className="space-y-0.5">
                {out.map((a) => (
                  <li key={a.item} className="text-xs">
                    {a.item}
                    {a.tag && (
                      <span className="text-muted-foreground"> · {a.tag}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Fact>
        </Grid>
      )
    }

    case "profileChange": {
      const p = item.payload as P.ProfileChangePayload
      return (
        <Grid>
          <Fact label="Field">{p.field}</Fact>
          <Fact label="Current">{p.before}</Fact>
          <Fact label="Requested">
            <span className="text-primary">{p.after}</span>
          </Fact>
        </Grid>
      )
    }

    case "bankDetailsChange": {
      const p = item.payload as P.BankDetailsPayload
      return (
        <Grid>
          <Fact label="Method">
            {p.method === "bank" ? "Bank account" : "Mobile money"}
          </Fact>
          <Fact label="Current">
            {p.before.provider}
            <span className="block font-mono text-xs">{p.before.account}</span>
          </Fact>
          <Fact label="Requested">
            <span className="text-primary">{p.after.provider}</span>
            <span className="block font-mono text-xs text-primary">
              {p.after.account}
            </span>
          </Fact>
        </Grid>
      )
    }

    case "compensationChange":
    case "oneOffBonus": {
      const p = item.payload as P.PayAdjustmentPayload
      const change = p.after - p.before
      return (
        <Grid>
          {p.oneOff ? (
            <Fact label="Amount">
              <span className="text-primary">{ghs(p.after)}</span>
              <span className="block text-xs text-muted-foreground">
                One payment, not a salary change
              </span>
            </Fact>
          ) : (
            <Delta
              label="Monthly gross"
              before={ghs(p.before)}
              after={ghs(p.after)}
              sub={`${change > 0 ? "+" : ""}${((change / p.before) * 100).toFixed(1)}%`}
            />
          )}
          <Fact label="Effective">{formatDate(p.effectiveDate)}</Fact>
          <Fact label="Reason">
            <span className="text-muted-foreground">{p.reason}</span>
          </Fact>
        </Grid>
      )
    }

    case "payrollRunSignOff": {
      const p = item.payload as P.PayrollRunPayload
      const variance = p.grossGhs - p.previousGrossGhs
      const month = new Date(`${p.period}-01`).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
      return (
        <Grid>
          <Fact label="Period">
            {month}
            <span className="tabular block text-xs text-muted-foreground">
              {p.headcount} people
            </span>
          </Fact>
          <Fact label="Gross / net">
            <span className="tabular">{ghs(p.grossGhs)}</span>
            <span className="tabular block text-xs text-muted-foreground">
              net {ghs(p.netGhs)}
            </span>
          </Fact>
          <Fact label="Against last run">
            <span
              className={
                variance > 0 ? "text-warning-foreground" : "text-primary"
              }
            >
              {variance > 0 ? "+" : ""}
              {ghs(variance)}
            </span>
            <span className="block text-xs text-muted-foreground">
              {((variance / p.previousGrossGhs) * 100).toFixed(1)}%
            </span>
          </Fact>
        </Grid>
      )
    }

    case "jobRequisition":
    case "offerApproval": {
      const p = item.payload as P.RequisitionPayload
      const req = store.requisitions.find((r) => r.id === p.requisitionId)
      const candidate = store.candidates.find((c) => c.id === p.candidateId)
      return (
        <Grid>
          <Fact label="Role">
            {req?.title ?? "—"}
            <span className="block text-xs text-muted-foreground">
              {req?.department} · {req?.openings} opening
              {req?.openings === 1 ? "" : "s"}
            </span>
          </Fact>
          <Fact label="Budget">
            {req ? ghs(req.budgetMonthly) : "—"}
            <span className="block text-xs text-muted-foreground">
              {req?.branch} · {req && EMPLOYMENT_TYPE_LABEL[req.employmentType]}
            </span>
          </Fact>
          <Fact label={candidate ? "Candidate" : "Hiring manager"}>
            {candidate ? (
              <>
                {candidate.name}
                <span className="block text-xs text-muted-foreground">
                  Offer {p.offerGhs ? ghs(p.offerGhs) : "—"} ·{" "}
                  {candidate.source}
                </span>
              </>
            ) : (
              name(req?.hiringManagerId ?? item.requester)
            )}
          </Fact>
        </Grid>
      )
    }

    case "reviewSignOff":
    case "calibrationOutcome": {
      const p = item.payload as P.ReviewPayload
      const review = store.reviews.find((r) => r.id === p.reviewId)
      return (
        <Grid>
          <Fact label="Cycle">{review?.cycle ?? "—"}</Fact>
          <Fact label="Rating">
            <span className="tabular">{review?.rating ?? "Not rated"}</span>
            <span className="block text-xs text-muted-foreground">
              Reviewer {name(review?.managerId ?? item.requester)}
            </span>
          </Fact>
          <Fact label="Reviewer comments">
            <span className="text-xs font-normal text-muted-foreground">
              {review?.reviewerComments ?? "No comments recorded."}
            </span>
          </Fact>
        </Grid>
      )
    }

    case "disciplinarySanction": {
      const p = item.payload as P.DisciplinaryPayload
      const c = store.cases.find((x) => x.id === p.caseId)
      return (
        <Grid>
          <Fact label="Incident">
            {c?.title ?? "—"}
            <span className="block text-xs text-muted-foreground">
              Raised {c ? formatDate(c.raisedOn) : "—"} by{" "}
              {name(c?.raisedBy ?? item.requester)}
            </span>
          </Fact>
          <Fact label="Severity">
            <span className="capitalize">{c?.severity ?? "—"}</span>
          </Fact>
          <Fact label="Sanction proposed">
            <span className={p.dismissal ? "text-destructive" : undefined}>
              {p.sanction}
            </span>
            {p.dismissal && (
              <span className="block text-xs text-destructive">
                Dismissal — the head of department is on the chain
              </span>
            )}
          </Fact>
        </Grid>
      )
    }

    case "documentVerification": {
      const p = item.payload as P.DocumentPayload
      const doc = store.documents.find((d) => d.id === p.documentId)
      return (
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          {/* Stand-in for the viewer. Rendering a real file is out of scope
              for the prototype; the frame shows where it belongs. */}
          <div className="grid aspect-[3/4] place-items-center rounded-lg border border-dashed bg-muted/40 text-muted-foreground">
            <span className="text-center">
              <FileText className="mx-auto size-6" />
              <span className="mt-1.5 block text-[11px]">Document preview</span>
            </span>
          </div>
          <dl className="grid content-start gap-3 sm:grid-cols-2">
            <Fact label="File">{doc?.name ?? "—"}</Fact>
            <Fact label="Category">
              <span className="capitalize">{doc?.category ?? "—"}</span>
            </Fact>
            <Fact label="Expires">
              {p.expiresOn ? formatDate(p.expiresOn) : "No expiry"}
            </Fact>
            <Fact label="Uploaded by">{name(item.requester)}</Fact>
          </dl>
        </div>
      )
    }
  }
}
