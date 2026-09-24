"use client"

import * as React from "react"

import { AttendanceShell } from "@/components/attendance/attendance-shell"
import { DaySheet } from "@/components/attendance/day-sheet"
import { TimesheetEmployee } from "@/components/attendance/timesheet-employee"
import { TimesheetManager } from "@/components/attendance/timesheet-manager"
import { useAttendance } from "@/components/attendance/use-attendance"
import { EmptyState, Panel } from "@/components/common"
import { FileCheck2 } from "lucide-react"
import type { DayRecord } from "@/lib/attendance/types"
import { useStore } from "@/lib/store"
import { TODAY_ISO, formatDate } from "@/lib/format"

export default function TimesheetsPage() {
  const store = useStore()
  const [periodId, setPeriodId] = React.useState(store.payPeriods[0]?.id ?? "")
  const [openDay, setOpenDay] = React.useState<DayRecord | null>(null)

  const period =
    store.payPeriods.find((p) => p.id === periodId) ?? store.payPeriods[0]

  // An open period runs past today, and days that have not happened yet are
  // not a shortfall. The timesheet stops at today; a closed period runs to
  // its own end.
  const upTo =
    period && period.status !== "closed" && period.end > TODAY_ISO
      ? TODAY_ISO
      : (period?.end ?? "")

  const { audience, scope, records } = useAttendance({
    from: period?.start ?? "",
    to: upTo,
  })

  if (!period) {
    return (
      <AttendanceShell
        title="Timesheets"
        description="Hours for the pay period, checked before they reach payroll."
      >
        <Panel bodyClassName="p-0">
          <EmptyState
            icon={FileCheck2}
            title="No pay periods configured"
            description="Pay periods are set under Settings → Pay → Pay schedule."
          />
        </Panel>
      </AttendanceShell>
    )
  }

  const isEmployee = audience === "employee"

  return (
    <AttendanceShell
      title={isEmployee ? "My timesheet" : "Timesheets"}
      description={
        isEmployee
          ? `${formatDate(period.start)} – ${formatDate(upTo)}. Hours as the clock captured them, and a way to query any day.`
          : `${formatDate(period.start)} – ${formatDate(upTo)} across ${scope.length} ${scope.length === 1 ? "person" : "people"} in your scope`
      }
    >
      {isEmployee ? (
        <TimesheetEmployee
          period={period}
          records={records}
          onOpenDay={setOpenDay}
        />
      ) : (
        <TimesheetManager
          period={period}
          periods={store.payPeriods}
          onPeriodChange={setPeriodId}
          scope={scope}
          records={records}
          onOpenDay={setOpenDay}
        />
      )}

      <DaySheet record={openDay} onClose={() => setOpenDay(null)} />
    </AttendanceShell>
  )
}
