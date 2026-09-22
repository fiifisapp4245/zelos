"use client"

import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  FileWarning,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  Panel,
  Pill,
  StatCard,
} from "@/components/common"
import { LifecycleBadge, RequestBadge } from "@/components/common/status"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { ROLE_LABEL, has } from "@/lib/rbac"
import {
  fullName,
  formatDate,
  daysUntil,
  ghs,
  relativeTime,
  LEAVE_TYPE_LABEL,
} from "@/lib/format"
import {
  approachingRetirement,
  directReports,
  dottedReports,
  headcountByDepartment,
  isOnStrength,
  openAlertsFor,
  pendingApprovalsFor,
  visibleEmployees,
} from "@/lib/selectors"
import { cn } from "@/lib/utils"

export default function OverviewPage() {
  const store = useStore()
  const { viewer, employees, leaveRequests, alerts, reviews, activeRole } =
    store
  const me = store.employeeById(viewer.employeeId)

  const scope = visibleEmployees(viewer, employees)
  const onStrength = scope.filter(isOnStrength)
  const approvals = pendingApprovalsFor(viewer, employees, leaveRequests)
  const openAlerts = openAlertsFor(viewer, employees, alerts)
  const reports = directReports(viewer, employees)
  const dotted = dottedReports(viewer, employees)

  const startingSoon = scope
    .filter((e) => e.lifecycleState === "pre_hire")
    .sort(
      (a, b) => (daysUntil(a.startDate) ?? 0) - (daysUntil(b.startDate) ?? 0)
    )

  const leaving = scope.filter((e) => e.lifecycleState === "notice")
  const retiring = approachingRetirement(scope, 400)
  const myReviews = reviews.filter(
    (r) => r.managerId === viewer.employeeId && r.status !== "complete"
  )

  const isEmployeeOnly = activeRole === "employee"

  return (
    <PageShell
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Overview" },
      ]}
    >
      <PageHeader
        title={`Akwaaba, ${me?.firstName ?? "there"}`}
        description={
          isEmployeeOnly
            ? "Your record, your time off and anything waiting on you."
            : "What needs your attention today, and where the workforce stands."
        }
        meta={
          <Pill tone="success" dot>
            Viewing as {ROLE_LABEL[activeRole]}
          </Pill>
        }
        actions={
          has(viewer, "hr_admin") && (
            <Button asChild size="lg">
              <Link href="/employees/new">
                <UserPlus className="size-4" />
                Add employee
              </Link>
            </Button>
          )
        }
      />

      {isEmployeeOnly && me ? (
        <EmployeeHome />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="On strength"
              value={onStrength.length}
              hint={`${scope.length} records in scope`}
              icon={Users}
              href="/employees"
            />
            <StatCard
              label="Awaiting your decision"
              value={approvals.length}
              hint="Leave requests"
              icon={ClipboardList}
              href="/leave"
            />
            <StatCard
              label="Open alerts"
              value={openAlerts.length}
              hint="Contracts, probation, documents"
              icon={AlertTriangle}
              href="/alerts"
            />
            <StatCard
              label="Starting soon"
              value={startingSoon.length}
              hint="Pre-hire records"
              icon={UserPlus}
              href="/onboarding"
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
            <div className="space-y-6">
              <Panel
                title="Waiting on you"
                description="Every one of these is blocked until someone decides."
                bodyClassName="p-0"
                actions={
                  approvals.length > 0 && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/leave">
                        View all <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  )
                }
              >
                {approvals.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title="Nothing waiting"
                    description="No leave requests need your decision right now."
                  />
                ) : (
                  <ul className="divide-y">
                    {approvals.slice(0, 5).map((r) => {
                      const emp = store.employeeById(r.employeeId)
                      return (
                        <li
                          key={r.id}
                          className="flex items-center gap-3 px-5 py-3.5"
                        >
                          {emp && <Initials person={emp} size="sm" />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {fullName(emp)}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {LEAVE_TYPE_LABEL[r.type]} · {r.days}{" "}
                              {r.days === 1 ? "day" : "days"} from{" "}
                              {formatDate(r.startDate)}
                            </p>
                          </div>
                          <span className="hidden text-xs text-muted-foreground sm:block">
                            {relativeTime(r.submittedAt)}
                          </span>
                          <Button size="sm" variant="outline" asChild>
                            <Link href="/leave">Review</Link>
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Panel>

              <Panel
                title="Compliance deadlines"
                description="Auto-generated from contract, probation and document dates."
                bodyClassName="p-0"
                actions={
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/alerts">
                      All alerts <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                }
              >
                {openAlerts.length === 0 ? (
                  <EmptyState
                    icon={FileWarning}
                    title="No open alerts"
                    description="Nothing is approaching a deadline in your scope."
                  />
                ) : (
                  <ul className="divide-y">
                    {openAlerts.slice(0, 5).map((a) => {
                      const emp = store.employeeById(a.employeeId)
                      const d = daysUntil(a.dueOn) ?? 0
                      const tone =
                        d <= 7 ? "danger" : d <= 15 ? "warning" : "info"
                      return (
                        <li
                          key={a.id}
                          className="flex items-center gap-3 px-5 py-3.5"
                        >
                          <span
                            className={cn(
                              "h-9 w-1 shrink-0 rounded-full",
                              tone === "danger"
                                ? "bg-destructive"
                                : tone === "warning"
                                  ? "bg-warning"
                                  : "bg-info"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {fullName(emp)}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {ALERT_LABEL[a.kind]} · {formatDate(a.dueOn)}
                            </p>
                          </div>
                          <Pill tone={tone}>
                            {d < 0 ? `${Math.abs(d)}d overdue` : `in ${d}d`}
                          </Pill>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Panel>
            </div>

            <div className="space-y-6">
              {(reports.length > 0 || dotted.length > 0) && (
                <Panel title="Your team" bodyClassName="p-0">
                  <ul className="divide-y">
                    {reports.map((e) => (
                      <TeamRow key={e.id} employee={e} />
                    ))}
                    {dotted.map((e) => (
                      <TeamRow key={e.id} employee={e} dotted />
                    ))}
                  </ul>
                </Panel>
              )}

              <Panel title="Headcount by department" bodyClassName="px-5 py-4">
                <ul className="space-y-3">
                  {headcountByDepartment(scope)
                    .slice(0, 7)
                    .map((d) => {
                      const max = headcountByDepartment(scope)[0]?.count || 1
                      return (
                        <li key={d.name}>
                          <div className="mb-1 flex items-baseline justify-between text-sm">
                            <span className="truncate">{d.name}</span>
                            <span className="tabular text-muted-foreground">
                              {d.count}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${(d.count / max) * 100}%` }}
                            />
                          </div>
                        </li>
                      )
                    })}
                </ul>
              </Panel>

              <Panel title="Movement" bodyClassName="px-5 py-4">
                <ul className="space-y-3 text-sm">
                  <MovementRow
                    icon={UserPlus}
                    tone="info"
                    label="Joining"
                    people={startingSoon}
                    dateOf={(e) => e.startDate}
                    href="/onboarding"
                  />
                  <MovementRow
                    icon={CalendarClock}
                    tone="warning"
                    label="Serving notice"
                    people={leaving}
                    dateOf={(e) => e.contractEndDate ?? e.startDate}
                    href="/offboarding"
                  />
                  <MovementRow
                    icon={TrendingUp}
                    tone="neutral"
                    label="Retiring within a year"
                    people={retiring.map((r) => r.employee)}
                    dateOf={(e) =>
                      retiring.find((r) => r.employee.id === e.id)?.retireOn ??
                      e.startDate
                    }
                    href="/offboarding"
                  />
                </ul>
              </Panel>

              {myReviews.length > 0 && (
                <Panel title="Reviews you own" bodyClassName="px-5 py-4">
                  <p className="text-sm text-muted-foreground">
                    {myReviews.length} review{myReviews.length === 1 ? "" : "s"}{" "}
                    still open in the current cycle.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/performance">Open performance</Link>
                  </Button>
                </Panel>
              )}
            </div>
          </div>
        </>
      )}
    </PageShell>
  )
}

const ALERT_LABEL: Record<string, string> = {
  contract_expiry: "Contract ends",
  probation_end: "Probation ends",
  document_expiry: "Document expires",
  retirement: "Reaches retirement age",
}

function TeamRow({
  employee,
  dotted = false,
}: {
  employee: ReturnType<typeof useStore>["employees"][number]
  dotted?: boolean
}) {
  return (
    <li>
      <Link
        href={`/employees/${employee.id}`}
        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
      >
        <Initials person={employee} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{fullName(employee)}</p>
          <p className="truncate text-xs text-muted-foreground">
            {employee.jobTitle}
          </p>
        </div>
        {dotted && (
          <Pill tone="neutral" className="text-[10px]">
            Dotted line
          </Pill>
        )}
        <LifecycleBadge state={employee.lifecycleState} />
      </Link>
    </li>
  )
}

function MovementRow({
  icon: Icon,
  tone,
  label,
  people,
  dateOf,
  href,
}: {
  icon: typeof UserPlus
  tone: "info" | "warning" | "neutral"
  label: string
  people: ReturnType<typeof useStore>["employees"]
  dateOf: (e: ReturnType<typeof useStore>["employees"][number]) => string
  href: string
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg",
          tone === "info" && "bg-info-muted text-info",
          tone === "warning" && "bg-warning-muted text-warning-foreground",
          tone === "neutral" && "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {label}{" "}
          <span className="tabular text-muted-foreground">
            ({people.length})
          </span>
        </p>
        {people.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nobody right now.</p>
        ) : (
          <ul className="mt-0.5 space-y-0.5">
            {people.slice(0, 3).map((p) => (
              <li key={p.id} className="truncate text-xs text-muted-foreground">
                <Link
                  href={href}
                  className="hover:text-foreground hover:underline"
                >
                  {fullName(p)} · {formatDate(dateOf(p))}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

/** Self-service landing for someone holding only the employee role. */
function EmployeeHome() {
  const store = useStore()
  const { viewer, leaveRequests, leaveBalances, onboardingTasks, documents } =
    store
  const me = store.employeeById(viewer.employeeId)!
  const balance = leaveBalances.find((b) => b.employeeId === me.id)
  const mine = leaveRequests.filter((r) => r.employeeId === me.id)
  const myTasks = onboardingTasks.filter(
    (t) => t.employeeId === me.id && !t.done
  )
  const myDocs = documents.filter((d) => d.employeeId === me.id)
  const remaining = balance
    ? balance.annualEntitlement +
      balance.carriedOver -
      balance.annualTaken -
      balance.annualPending
    : 0

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Annual leave left"
          value={remaining}
          hint={`of ${(balance?.annualEntitlement ?? 0) + (balance?.carriedOver ?? 0)} days`}
          href="/leave"
        />
        <StatCard
          label="Requests pending"
          value={mine.filter((r) => r.status === "pending").length}
          hint="Awaiting a decision"
          href="/leave"
        />
        <StatCard
          label="Documents on file"
          value={myDocs.length}
          hint={`${myDocs.filter((d) => d.status === "verified").length} verified`}
          href="/documents"
        />
        <StatCard
          label="Tasks for you"
          value={myTasks.length}
          hint="Onboarding checklist"
          href="/onboarding"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="My leave"
          bodyClassName="p-0"
          actions={
            <Button size="sm" variant="outline" asChild>
              <Link href="/leave">Request leave</Link>
            </Button>
          }
        >
          {mine.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No requests yet" />
          ) : (
            <ul className="divide-y">
              {mine.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {LEAVE_TYPE_LABEL[r.type]} · {r.days}{" "}
                      {r.days === 1 ? "day" : "days"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.startDate)} – {formatDate(r.endDate)}
                    </p>
                  </div>
                  <RequestBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="My record"
          description="Contact details are yours to change. Everything else routes through HR."
        >
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Role
              </dt>
              <dd className="mt-1 text-sm font-medium">{me.jobTitle}</dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Department
              </dt>
              <dd className="mt-1 text-sm font-medium">{me.department}</dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Reports to
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {fullName(store.employeeById(me.managerId))}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Gross monthly
              </dt>
              <dd className="tabular mt-1 text-sm font-medium">
                {ghs(me.compensation.grossMonthly)}
              </dd>
            </div>
          </dl>
          <Button variant="outline" size="sm" className="mt-5" asChild>
            <Link href={`/employees/${me.id}`}>Open my profile</Link>
          </Button>
        </Panel>
      </div>
    </>
  )
}
