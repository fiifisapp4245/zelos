"use client"

import { CalendarDays } from "lucide-react"
import Link from "next/link"

import { AttendanceShell } from "@/components/attendance/attendance-shell"
import { EmptyState, Panel } from "@/components/common"
import { Button } from "@/components/ui/button"

export default function AttendanceLeavePage() {
  return (
    <AttendanceShell
      title="Leave"
      description="Leave read against the register, so a day away is never mistaken for a day with no record."
    >
      <Panel bodyClassName="p-0">
        <EmptyState
          icon={CalendarDays}
          title="Nothing booked in this period"
          description="Approved leave appears here and on the register as V, alongside the balances it draws down."
          action={
            <Button variant="outline" asChild>
              <Link href="/leave">Open leave management</Link>
            </Button>
          }
        />
      </Panel>
    </AttendanceShell>
  )
}
