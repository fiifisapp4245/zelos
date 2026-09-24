"use client"

import * as React from "react"
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
import { Label } from "@/components/ui/label"
import {
  FilterChipRow,
  FilterChoice,
  FilterMenu,
  FilterSearchRow,
} from "@/components/common/filter-bar"
import { formatHours, metricsFor } from "@/lib/attendance/derive"
import type { DayRecord } from "@/lib/attendance/types"
import { useStore } from "@/lib/store"
import { formatDate } from "@/lib/format"

export default function RegisterPage() {
  const store = useStore()
  const [period, setPeriod] = React.useState<PeriodKey>("twoWeeks")
  const [custom, setCustom] = React.useState({ from: "", to: "" })
  const [departments, setDepartments] = React.useState<string[]>([])
  const [branches, setBranches] = React.useState<string[]>([])
  const [search, setSearch] = React.useState("")
  const [openDay, setOpenDay] = React.useState<DayRecord | null>(null)

  const { from, to } = rangeFor(period, custom)
  const { scope, dates, records } = useAttendance({
    from,
    to,
    filters: { departments, branches, search },
  })

  const metrics = metricsFor(records)
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
      {/* The directory's filter pattern: search on top, dashed chips
          beneath that fill in once they are doing something. */}
      <div className="mb-4 rounded-xl border bg-card">
        <FilterSearchRow
          value={search}
          onChange={setSearch}
          placeholder="Search by name or job title"
        >
          <FilterChoice
            label="Period"
            value={period}
            onChange={(v) => setPeriod(v as PeriodKey)}
            options={(Object.keys(PERIOD_LABEL) as PeriodKey[]).map((k) => ({
              value: k,
              label: PERIOD_LABEL[k],
            }))}
            allLabel="This week"
          />
        </FilterSearchRow>

        <FilterChipRow
          showClear={
            departments.length > 0 || branches.length > 0 || search !== ""
          }
          onClear={() => {
            setDepartments([])
            setBranches([])
            setSearch("")
          }}
        >
          <FilterMenu
            label="Department"
            options={allDepartments.map((d) => ({ value: d, label: d }))}
            selected={departments}
            onToggle={(v) =>
              setDepartments((list) =>
                list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
              )
            }
          />
          <FilterMenu
            label="Branch"
            options={allBranches.map((b) => ({ value: b.name, label: b.name }))}
            selected={branches}
            onToggle={(v) =>
              setBranches((list) =>
                list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
              )
            }
          />
          <span className="ml-auto text-xs text-muted-foreground">
            {formatDate(from)} – {formatDate(to)}
          </span>
        </FilterChipRow>

        {period === "custom" && (
          <div className="flex flex-wrap items-end gap-3 border-b px-3 py-2.5">
            <div>
              <Label
                htmlFor="from"
                className="mb-1.5 block text-xs font-medium"
              >
                From
              </Label>
              <Input
                id="from"
                type="date"
                className="h-9 w-[150px]"
                value={custom.from}
                onChange={(e) =>
                  setCustom((c) => ({ ...c, from: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="to" className="mb-1.5 block text-xs font-medium">
                To
              </Label>
              <Input
                id="to"
                type="date"
                className="h-9 w-[150px]"
                value={custom.to}
                onChange={(e) =>
                  setCustom((c) => ({ ...c, to: e.target.value }))
                }
              />
            </div>
          </div>
        )}
      </div>

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

      {scope.length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyState
            icon={Users}
            title="Nobody matches these filters"
            description="Widen the department, branch or search to see the register."
          />
        </Panel>
      ) : (
        <>
          <Panel
            title="Daily register"
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

          <div className="mt-4">
            <ExceptionsPanel records={records} />
          </div>
        </>
      )}

      <DaySheet record={openDay} onClose={() => setOpenDay(null)} />
    </AttendanceShell>
  )
}
