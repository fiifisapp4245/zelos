"use client"

import { PageShell } from "@/components/shell/page-shell"
import { PageHeader } from "@/components/common"
import { LeaveReconcile } from "@/components/leave-attendance/leave-reconcile"

/**
 * A manager's view of the same reconciliation the Attendance area runs,
 * scoped to their reports.
 */
export default function TeamLeavePage() {
  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "My team", href: "/team" },
        { label: "Team leave" },
      ]}
    >
      <PageHeader
        title="Team leave"
        description="Who is away, what is still waiting on a decision, and where the attendance record and the leave record disagree."
      />
      <LeaveReconcile title="Who is off, and when" />
    </PageShell>
  )
}
