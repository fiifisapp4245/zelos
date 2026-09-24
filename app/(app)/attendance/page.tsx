"use client"

import * as React from "react"
import { Search, Users } from "lucide-react"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatHours, metricsFor } from "@/lib/attendance/derive"
import type { DayRecord } from "@/lib/attendance/types"
import { useStore } from "@/lib/store"
import { formatDate } from "@/lib/format"

export default function RegisterPage() {
  const store = useStore()
  const [period, setPeriod] = React.useState<PeriodKey>("twoWeeks")
  const [custom, setCustom] = React.useState({ from: "", to: "" })
  const [department, setDepartment] = React.useState("all")
  const [branch, setBranch] = React.useState("all")
  const [search, setSearch] = React.useState("")
  const [openDay, setOpenDay] = React.useState<DayRecord | null>(null)

  const { from, to } = rangeFor(period, custom)
  const { scope, dates, records } = useAttendance({
    from,
    to,
    filters: {
      department: department === "all" ? undefined : department,
      branch: branch === "all" ? undefined : branch,
      search,
    },
  })

  const metrics = metricsFor(records)
  const departments = [
    ...new Set(store.employees.map((e) => e.department)),
  ].sort()
  const branches = store.branches.filter((b) => !b.archived)

  return (
    <AttendanceShell
      title="Attendance"
      description={`${formatDate(from)} – ${formatDate(to)} across ${scope.length} ${scope.length === 1 ? "person" : "people"} in your scope`}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Attendance" },
      ]}
    >
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card px-4 py-3">
        <div>
          <Label className="mb-1.5 block text-xs font-medium">Period</Label>
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as PeriodKey)}
          >
            <SelectTrigger className="h-9 w-[160px]">
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
        </div>

        {period === "custom" && (
          <>
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
          </>
        )}

        <div>
          <Label className="mb-1.5 block text-xs font-medium">Department</Label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs font-medium">Branch</Label>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.name}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative min-w-[200px] flex-1">
          <Label htmlFor="q" className="mb-1.5 block text-xs font-medium">
            Search
          </Label>
          <Search
            className="pointer-events-none absolute bottom-2.5 left-3 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="q"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or job title"
            className="h-9 pl-9"
          />
        </div>
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
