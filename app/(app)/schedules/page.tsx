"use client"

import * as React from "react"

import { PageShell } from "@/components/shell/page-shell"
import { PageHeader } from "@/components/common"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { PatternsMode } from "@/components/schedules/patterns-mode"
import { RosterMode } from "@/components/schedules/roster-mode"
import { MySchedule } from "@/components/schedules/my-schedule"
import { useSchedules } from "@/components/schedules/use-schedules"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { addDays, datesBetween, startOfWeek } from "@/lib/time"
import { TODAY_ISO } from "@/lib/format"

export default function SchedulesPage() {
  const store = useStore()
  const { audience, scope, input, policy, defaultGraceMinutes } = useSchedules()

  // On-site and shift-based companies live in the roster; office and
  // mixed ones live in the patterns. Either way both are one click away.
  const [mode, setMode] = React.useState(
    policy.primaryWorkModel === "shift" ? "roster" : "patterns"
  )

  const canEdit =
    has(store.viewer, "hr_admin") ||
    has(store.viewer, "line_manager") ||
    has(store.viewer, "head_of_department")
  const range = datesBetween(startOfWeek(TODAY_ISO), addDays(TODAY_ISO, 13))

  if (audience === "employee") {
    const me = store.employeeById(store.session.id)
    return (
      <PageShell
        width="wide"
        crumbs={[
          { label: "Workspace", href: "/overview" },
          { label: "Schedules" },
        ]}
      >
        <PageHeader
          title="My schedule"
          description="The shifts and working pattern you are on for the next two weeks."
        />
        {me && <MySchedule employee={me} input={input} />}
      </PageShell>
    )
  }

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Time", href: "/attendance" },
        { label: "Schedules" },
      ]}
    >
      <PageHeader
        title="Schedules"
        description="What the business expects of people, and therefore what attendance is measured against."
      />

      <Tabs value={mode} onValueChange={setMode} className="gap-0">
        <div className="mb-4">
          <SegmentedTabs
            tabs={[
              { value: "patterns", label: "Work patterns" },
              { value: "roster", label: "Shift roster" },
            ]}
          />
        </div>

        <TabsContent value="patterns">
          <PatternsMode
            scope={scope}
            input={input}
            defaultGraceMinutes={defaultGraceMinutes}
            canEdit={canEdit}
            dates={range}
          />
        </TabsContent>

        <TabsContent value="roster">
          <RosterMode scope={scope} canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
