"use client"

import { PageShell } from "@/components/shell/page-shell"
import { PageHeader } from "@/components/common"
import { RosterMode } from "@/components/schedules/roster-mode"
import { useSchedules } from "@/components/schedules/use-schedules"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"

/**
 * The same roster a manager's reports appear on, scoped to them. It is
 * the organisation's roster, not a copy of it — the shifts, warnings and
 * publishing are all the same records.
 */
export default function TeamSchedulesPage() {
  const store = useStore()
  const { scope } = useSchedules()
  const canEdit =
    has(store.viewer, "hr_admin") ||
    has(store.viewer, "line_manager") ||
    has(store.viewer, "head_of_department")

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "My team", href: "/team" },
        { label: "Team schedules" },
      ]}
    >
      <PageHeader
        title="Team schedules"
        description="Who your people are rostered on, and anything the roster is about to commit them to."
      />
      <RosterMode scope={scope} canEdit={canEdit} />
    </PageShell>
  )
}
