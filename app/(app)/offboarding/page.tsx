"use client"

import * as React from "react"
import Link from "next/link"
import { CheckCircle2, Circle, LogOut, PartyPopper } from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  Panel,
  Pill,
  StatCard,
} from "@/components/common"
import { LifecycleBadge } from "@/components/common/status"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { approachingRetirement, visibleEmployees } from "@/lib/selectors"
import {
  OFFBOARD_REASON_LABEL,
  RETIREMENT_AGE,
  daysUntil,
  formatDate,
  fullName,
  ghs,
  relativeTime,
} from "@/lib/format"
import type { OffboardingCase } from "@/lib/types"
import { cn } from "@/lib/utils"

const CLEARANCE_LABEL: Record<keyof OffboardingCase["clearance"], string> = {
  assets: "Company assets returned",
  access: "System access revoked",
  finance: "Final settlement calculated",
  handover: "Handover completed",
}

export default function OffboardingPage() {
  const store = useStore()
  const { viewer, employees, offboarding } = store
  const scope = visibleEmployees(viewer, employees)
  const scopeIds = new Set(scope.map((e) => e.id))

  const cases = offboarding.filter((c) => scopeIds.has(c.employeeId))
  const active = cases.filter((c) => c.state !== "closed")
  const retiring = approachingRetirement(scope, 400)

  const outstanding = active.reduce(
    (sum, c) => sum + Object.values(c.clearance).filter((v) => !v).length,
    0
  )

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Talent" },
        { label: "Offboarding" },
      ]}
    >
      <PageHeader
        title="Offboarding"
        description="Separation and retirement. Clearance must complete before the record moves to an end state and payroll stops."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active cases"
          value={active.length}
          hint="Serving notice or clearing"
        />
        <StatCard
          label="Clearance items open"
          value={outstanding}
          hint="Across active cases"
        />
        <StatCard
          label="Approaching retirement"
          value={retiring.length}
          hint={`Turning ${RETIREMENT_AGE} within 13 months`}
        />
        <StatCard
          label="Closed this year"
          value={cases.filter((c) => c.state === "closed").length}
        />
      </div>

      <div className="space-y-5">
        {cases.length === 0 ? (
          <Panel>
            <EmptyState
              icon={LogOut}
              title="No offboarding cases"
              description="A case opens automatically when someone moves to Serving notice."
            />
          </Panel>
        ) : (
          cases.map((c) => <CaseCard key={c.id} offboarding={c} />)
        )}

        {retiring.length > 0 && (
          <Panel
            title="Retirement horizon"
            description={`Statutory retirement age is ${RETIREMENT_AGE}. Planning early gives time for handover and succession.`}
            bodyClassName="p-0"
          >
            <ul className="divide-y">
              {retiring.map((r) => (
                <li
                  key={r.employee.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                >
                  <Initials person={r.employee} size="md" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/employees/${r.employee.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {fullName(r.employee)}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {r.employee.jobTitle} · {r.employee.department} · age{" "}
                      {r.age}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Reaches {RETIREMENT_AGE}
                    </p>
                    <p className="tabular text-sm font-medium">
                      {formatDate(r.retireOn)}
                    </p>
                  </div>
                  <Pill
                    tone={
                      (daysUntil(r.retireOn) ?? 0) <= 180 ? "warning" : "info"
                    }
                  >
                    {relativeTime(r.retireOn)}
                  </Pill>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast("Starts a succession plan for this role.")
                    }
                  >
                    Plan succession
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </PageShell>
  )
}

function CaseCard({ offboarding: c }: { offboarding: OffboardingCase }) {
  const store = useStore()
  const employee = store.employeeById(c.employeeId)
  if (!employee) return null

  const items = Object.entries(c.clearance) as [
    keyof OffboardingCase["clearance"],
    boolean,
  ][]
  const done = items.filter(([, v]) => v).length
  const percent = Math.round((done / items.length) * 100)
  const lastDayIn = daysUntil(c.lastWorkingDay)
  const retirement = c.reason === "retirement"

  return (
    <Panel bodyClassName="p-0">
      <div className="flex flex-wrap items-center gap-4 border-b px-5 py-4">
        <Initials person={employee} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <Link
              href={`/employees/${employee.id}`}
              className="font-medium hover:underline"
            >
              {fullName(employee)}
            </Link>
            <LifecycleBadge state={employee.lifecycleState} />
            <Pill tone={retirement ? "info" : "warning"}>
              {retirement && <PartyPopper className="size-3" />}
              {OFFBOARD_REASON_LABEL[c.reason]}
            </Pill>
            <span className="font-mono text-[11px] text-muted-foreground">
              {c.id}
            </span>
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {employee.jobTitle} · notice given {formatDate(c.noticeGivenOn)} ·
            last working day{" "}
            <span
              className={cn(
                lastDayIn !== null &&
                  lastDayIn >= 0 &&
                  lastDayIn <= 14 &&
                  "font-medium text-destructive"
              )}
            >
              {formatDate(c.lastWorkingDay)}
            </span>
            {lastDayIn !== null &&
              lastDayIn >= 0 &&
              ` (${relativeTime(c.lastWorkingDay)})`}
          </p>
        </div>

        <div className="min-w-[160px]">
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Clearance</span>
            <span className="tabular font-medium">
              {done}/{items.length}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                percent === 100 ? "bg-primary" : "bg-warning"
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <div>
          <p className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Clearance checklist
          </p>
          <ul className="space-y-2">
            {items.map(([key, value]) => (
              <li key={key} className="flex items-center gap-2.5 text-sm">
                {value ? (
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={cn(value && "text-muted-foreground line-through")}
                >
                  {CLEARANCE_LABEL[key]}
                </span>
              </li>
            ))}
            <li className="flex items-center gap-2.5 text-sm">
              {c.exitInterviewDone ? (
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span
                className={cn(
                  c.exitInterviewDone && "text-muted-foreground line-through"
                )}
              >
                Exit interview held
              </span>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Settlement
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Notice period</dt>
              <dd className="tabular">{employee.noticePeriodDays} days</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Accrued leave to pay</dt>
              <dd className="tabular">
                {store.leaveBalances.find((b) => b.employeeId === employee.id)
                  ?.annualEntitlement ?? 0}{" "}
                days
              </dd>
            </div>
            <div className="flex justify-between border-t pt-2">
              <dt className="font-medium">Final settlement</dt>
              <dd className="tabular font-medium">
                {c.finalSettlement !== null
                  ? ghs(c.finalSettlement)
                  : "Not yet calculated"}
              </dd>
            </div>
          </dl>
          {c.state !== "closed" && (
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() =>
                toast("Sends the case to Payroll for final settlement.")
              }
            >
              Send to payroll
            </Button>
          )}
        </div>
      </div>
    </Panel>
  )
}
