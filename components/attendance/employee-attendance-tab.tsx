"use client"

import * as React from "react"

import { Panel, StatCard } from "@/components/common"
import { DayCodeLegend } from "./day-code"
import { DaySheet } from "./day-sheet"
import { RegisterGrid } from "./register-grid"
import {
  rangeFor,
  useAttendance,
  PERIOD_LABEL,
  type PeriodKey,
} from "./use-attendance"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatHours, metricsFor } from "@/lib/attendance/derive"
import {
  statusFor,
  summarise,
  TIMESHEET_STATUS_LABEL,
} from "@/lib/attendance/timesheet"
import type { DayRecord } from "@/lib/attendance/types"
import { useStore } from "@/lib/store"
import { formatDate } from "@/lib/format"

/**
 * One person's register and timesheets, on their own record. It runs the
 * same components the Attendance area runs, narrowed to them — so the
 * numbers cannot disagree with the ones a manager sees.
 */
export function EmployeeAttendanceTab({ employeeId }: { employeeId: string }) {
  const store = useStore()
  const [period, setPeriod] = React.useState<PeriodKey>("thisMonth")
  const [openDay, setOpenDay] = React.useState<DayRecord | null>(null)

  const { from, to } = rangeFor(period)
  const { scope, dates, records } = useAttendance({ from, to, employeeId })
  const metrics = metricsFor(records)

  const payPeriod = store.payPeriods[0]
  const sheetStatus = payPeriod
    ? statusFor(store.timesheets, payPeriod.id, employeeId)
    : null
  const sheet = payPeriod
    ? summarise(employeeId, records, sheetStatus ?? "notSubmitted")
    : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label className="mb-1.5 block text-xs font-medium">Period</Label>
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as PeriodKey)}
          >
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["thisWeek", "twoWeeks", "thisMonth"] as PeriodKey[]).map(
                (k) => (
                  <SelectItem key={k} value={k}>
                    {PERIOD_LABEL[k]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDate(from)} – {formatDate(to)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <Panel
        title="Register"
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

      {payPeriod && sheet && (
        <Panel
          title={`Timesheet · ${payPeriod.label}`}
          description={`${TIMESHEET_STATUS_LABEL[sheet.status]} · ${formatDate(payPeriod.start)} – ${formatDate(payPeriod.end)}`}
          bodyClassName="px-5 py-4"
        >
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Hours
              </dt>
              <dd className="tabular mt-0.5 text-lg font-semibold">
                {formatHours(sheet.worked)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Scheduled
              </dt>
              <dd className="tabular mt-0.5 text-lg font-semibold">
                {formatHours(sheet.scheduled)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Variance
              </dt>
              <dd className="tabular mt-0.5 text-lg font-semibold">
                {formatHours(sheet.variance, { signed: true })}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Adjustments
              </dt>
              <dd className="tabular mt-0.5 text-lg font-semibold">
                {sheet.adjustmentCount}
              </dd>
            </div>
          </dl>
        </Panel>
      )}

      <DaySheet record={openDay} onClose={() => setOpenDay(null)} />
    </div>
  )
}
