"use client"

import { CalendarRange } from "lucide-react"

import { AttendanceShell } from "@/components/attendance/attendance-shell"
import { EmptyState, Panel } from "@/components/common"

export default function SchedulesPage() {
  return (
    <AttendanceShell
      title="Schedules"
      description="Shift patterns and rosters by branch and department, and who is rostered when. Attendance is measured against whatever is scheduled here."
    >
      <Panel bodyClassName="p-0">
        <EmptyState
          icon={CalendarRange}
          title="No rosters published"
          description="Published rosters appear here, with the cover arranged while someone is away."
        />
      </Panel>
    </AttendanceShell>
  )
}
