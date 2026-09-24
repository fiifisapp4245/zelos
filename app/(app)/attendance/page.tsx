"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Users } from "lucide-react"

import { AttendanceShell } from "@/components/attendance/attendance-shell"
import { DayCodeLegend } from "@/components/attendance/day-code"
import { DaySheet } from "@/components/attendance/day-sheet"
import { ExceptionsPanel } from "@/components/attendance/exceptions-panel"
import { RegisterGrid } from "@/components/attendance/register-grid"
import {
  PERIOD_LABEL,
  rangeFor,
  useAttendance,
  type PeriodKey,
} from "@/components/attendance/use-attendance"
import { EmptyState, Panel, StatCard } from "@/components/common"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FilterSearch, FilterToolbar } from "@/components/common/filter-bar"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import {
  exceptionsFrom,
  formatHours,
  isResolved,
  metricsFor,
} from "@/lib/attendance/derive"
import type { DayRecord } from "@/lib/attendance/types"
import { LeaveReconcile } from "@/components/leave-attendance/leave-reconcile"
import { useStore } from "@/lib/store"
import { formatDate } from "@/lib/format"

/** The register is one of three readings of the same fortnight. */
type Tab = "register" | "exceptions" | "leave"

export default function RegisterPage() {
  return (
    <React.Suspense fallback={null}>
      <Register />
    </React.Suspense>
  )
}

function Register() {
  const store = useStore()
  const params = useSearchParams()
  const [period, setPeriod] = React.useState<PeriodKey>("twoWeeks")
  const [custom, setCustom] = React.useState({ from: "", to: "" })
  const [departments, setDepartments] = React.useState<string[]>([])
  const [branches, setBranches] = React.useState<string[]>([])
  const [search, setSearch] = React.useState("")
  // Other modules link at a reading of the period, not just the page.
  const [view, setView] = React.useState<Tab>(
    (params.get("tab") as Tab | null) ?? "register"
  )
  const [openDay, setOpenDay] = React.useState<DayRecord | null>(null)

  const { from, to } = rangeFor(period, custom)
  const { scope, dates, records } = useAttendance({
    from,
    to,
    filters: { departments, branches, search },
  })

  const metrics = metricsFor(records)
  const openExceptions = exceptionsFrom(records).filter(
    (i) => !isResolved(i, store.exceptionResolutions)
  ).length
  const allDepartments = [
    ...new Set(store.employees.map((e) => e.department)),
  ].sort()
  const allBranches = store.branches.filter((b) => !b.archived)

  return (
    <AttendanceShell
      title="Attendance"
      description={`${formatDate(from)} – ${formatDate(to)} across ${scope.length} ${scope.length === 1 ? "person" : "people"} in your scope`}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Attendance" },
      ]}
    >
      {/* The register is what happened, exceptions are what to do about
          it, and leave is the record it has to agree with. One at a time
          rather than one long scroll. */}
      <Tabs
        value={view}
        onValueChange={(v) => setView(v as Tab)}
        className="gap-0"
      >
        <div className="mb-4">
          <SegmentedTabs
            tabs={[
              { value: "register", label: "Daily register" },
              {
                value: "exceptions",
                label: "Exceptions",
                count: openExceptions,
              },
              { value: "leave", label: "Leave reconciliation" },
            ]}
            emphasise={openExceptions > 0 ? ["exceptions"] : undefined}
          />
        </div>

        {view !== "leave" && (
          <>
            {/* The platform filter bar. Period sits on the bar rather than in
          the popover: it is the range being looked at, never off. */}
            <FilterToolbar
              className="mb-4"
              fields={[
                {
                  kind: "multi",
                  key: "departments",
                  label: "Department",
                  values: departments,
                  options: allDepartments.map((d) => ({ value: d, label: d })),
                },
                {
                  kind: "multi",
                  key: "branches",
                  label: "Branch",
                  values: branches,
                  options: allBranches.map((b) => ({
                    value: b.name,
                    label: b.name,
                  })),
                },
              ]}
              onChange={(patch) => {
                if (patch.departments)
                  setDepartments(patch.departments as string[])
                if (patch.branches) setBranches(patch.branches as string[])
              }}
              onClear={() => {
                setDepartments([])
                setBranches([])
                setSearch("")
              }}
            >
              <FilterSearch
                value={search}
                onChange={setSearch}
                placeholder="Search by name or job title"
              />
              <Select
                value={period}
                onValueChange={(v) => setPeriod(v as PeriodKey)}
              >
                <SelectTrigger className="h-9 w-[160px]" aria-label="Period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PERIOD_LABEL) as PeriodKey[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {PERIOD_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {period === "custom" && (
                <>
                  <Input
                    type="date"
                    aria-label="From"
                    className="h-9 w-[150px]"
                    value={custom.from}
                    onChange={(e) =>
                      setCustom((c) => ({ ...c, from: e.target.value }))
                    }
                  />
                  <Input
                    type="date"
                    aria-label="To"
                    className="h-9 w-[150px]"
                    value={custom.to}
                    onChange={(e) =>
                      setCustom((c) => ({ ...c, to: e.target.value }))
                    }
                  />
                </>
              )}
            </FilterToolbar>

            <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Attendance rate"
                value={`${metrics.attendanceRate}%`}
                hint="Present, remote or late"
              />
              <StatCard
                label="Hours logged"
                value={formatHours(metrics.hoursLogged)}
                hint="Across the period"
              />
              <StatCard
                label="Late arrivals"
                value={metrics.lateArrivals}
                hint="After scheduled start plus grace"
              />
              <StatCard
                label="Days with no record"
                value={metrics.noRecordDays}
                hint="No clock-in and no leave on file"
              />
            </div>
          </>
        )}

        {scope.length === 0 && view !== "leave" ? (
          <Panel bodyClassName="p-0">
            <EmptyState
              icon={Users}
              title="Nobody matches these filters"
              description="Widen the department, branch or search to see the register."
            />
          </Panel>
        ) : (
          <>
            <TabsContent value="register">
              <Panel
                description="Each cell opens the detail for that day."
                bodyClassName="p-0"
                actions={<DayCodeLegend />}
              >
                <RegisterGrid
                  scope={scope}
                  dates={dates}
                  records={records}
                  onOpenDay={setOpenDay}
                />
              </Panel>
            </TabsContent>

            <TabsContent value="exceptions">
              <ExceptionsPanel records={records} />
            </TabsContent>

            {/* Leave is owned by the Leave module; what lives here is the
              place the two records are read against each other. */}
            <TabsContent value="leave">
              <LeaveReconcile />
            </TabsContent>
          </>
        )}
      </Tabs>

      <DaySheet record={openDay} onClose={() => setOpenDay(null)} />
    </AttendanceShell>
  )
}
