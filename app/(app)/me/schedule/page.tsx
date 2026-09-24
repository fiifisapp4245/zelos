"use client"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, PageHeader } from "@/components/common"
import { CalendarRange } from "lucide-react"

import { MySchedule } from "@/components/schedules/my-schedule"
import { useSchedules } from "@/components/schedules/use-schedules"
import { useStore } from "@/lib/store"

export default function MySchedulePage() {
  const store = useStore()
  const { input } = useSchedules()
  const me = store.employeeById(store.session.id)

  return (
    <PageShell
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Me" },
        { label: "My schedule" },
      ]}
    >
      <PageHeader
        title="My schedule"
        description="The shifts and working pattern you are on for the next two weeks."
      />
      {me ? (
        <MySchedule employee={me} input={input} />
      ) : (
        <EmptyState
          icon={CalendarRange}
          title="No record to schedule against"
          description="Your employee record could not be found in this session."
        />
      )}
    </PageShell>
  )
}
