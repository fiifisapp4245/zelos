"use client"

import * as React from "react"
import { FileCheck2 } from "lucide-react"

import { AttendanceShell } from "@/components/attendance/attendance-shell"
import { DaySheet } from "@/components/attendance/day-sheet"
import { TimesheetEmployee } from "@/components/attendance/timesheet-employee"
import { useAttendance } from "@/components/attendance/use-attendance"
import { EmptyState, Panel } from "@/components/common"
import type { DayRecord } from "@/lib/attendance/types"
import { useStore } from "@/lib/store"
import { TODAY_ISO, formatDate } from "@/lib/format"

const CRUMBS = [
  { label: "Workspace", href: "/overview" },
  { label: "Me" },
  { label: "My timesheet" },
]

/** One person's own period: what the clock captured, and a way to query it. */
export default function MyTimesheetPage() {
  const store = useStore()
  const [openDay, setOpenDay] = React.useState<DayRecord | null>(null)

  const period = store.payPeriods[0]
  const upTo =
    period && period.status !== "closed" && period.end > TODAY_ISO
      ? TODAY_ISO
      : (period?.end ?? "")

  const { records } = useAttendance({
    from: period?.start ?? "",
    to: upTo,
    employeeId: store.session.id,
  })

  if (!period) {
    return (
      <AttendanceShell
        title="My timesheet"
        description="Your hours for the pay period."
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
      title="My timesheet"
      description={`${formatDate(period.start)} – ${formatDate(upTo)}. Hours as the clock captured them, and a way to query any day.`}
      crumbs={CRUMBS}
    >
      <TimesheetEmployee
        period={period}
        records={records}
        onOpenDay={setOpenDay}
      />
      <DaySheet record={openDay} onClose={() => setOpenDay(null)} />
    </AttendanceShell>
  )
}
