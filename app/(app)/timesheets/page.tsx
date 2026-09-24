"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { FileCheck2 } from "lucide-react"

import { AttendanceShell } from "@/components/attendance/attendance-shell"
import { DaySheet } from "@/components/attendance/day-sheet"
import { TimesheetManager } from "@/components/attendance/timesheet-manager"
import { useAttendance } from "@/components/attendance/use-attendance"
import { EmptyState, Panel } from "@/components/common"
import type { DayRecord } from "@/lib/attendance/types"
import { useStore } from "@/lib/store"
import { TODAY_ISO, formatDate } from "@/lib/format"

const CRUMBS = [
  { label: "Workspace", href: "/overview" },
  { label: "Timesheets" },
]

/** Hours across the team, checked before they reach payroll. */
export default function TimesheetsPage() {
  return (
    <React.Suspense fallback={null}>
      <Timesheets />
    </React.Suspense>
  )
}

function Timesheets() {
  const store = useStore()
  const params = useSearchParams()
  // Payroll links straight at the period it is waiting on.
  const [periodId, setPeriodId] = React.useState(
    params.get("period") ?? store.payPeriods[0]?.id ?? ""
  )
  const [openDay, setOpenDay] = React.useState<DayRecord | null>(null)

  const period =
    store.payPeriods.find((p) => p.id === periodId) ?? store.payPeriods[0]

  // An open period runs past today, and days that have not happened yet are
  // not a shortfall. It stops at today; a closed period runs to its own end.
  const upTo =
    period && period.status !== "closed" && period.end > TODAY_ISO
      ? TODAY_ISO
      : (period?.end ?? "")

  const { scope, records } = useAttendance({
    from: period?.start ?? "",
    to: upTo,
  })

  if (!period) {
    return (
      <AttendanceShell
        title="Timesheets"
        description="Hours for the pay period, checked before they reach payroll."
        crumbs={CRUMBS}
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

  return (
    <AttendanceShell
      title="Timesheets"
      description={`${formatDate(period.start)} – ${formatDate(upTo)} across ${scope.length} ${scope.length === 1 ? "person" : "people"} in your scope`}
      crumbs={CRUMBS}
    >
      <TimesheetManager
        period={period}
        periods={store.payPeriods}
        onPeriodChange={setPeriodId}
        scope={scope}
        records={records}
        onOpenDay={setOpenDay}
      />
      <DaySheet record={openDay} onClose={() => setOpenDay(null)} />
    </AttendanceShell>
  )
}
