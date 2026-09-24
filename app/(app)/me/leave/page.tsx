"use client"

import { CalendarDays } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, PageHeader } from "@/components/common"
import { MyLeaveSummary } from "@/components/leave-attendance/my-leave-summary"
import { useStore } from "@/lib/store"

export default function MyLeavePage() {
  const store = useStore()
  const me = store.employeeById(store.session.id)

  return (
    <PageShell
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Me" },
        { label: "My leave" },
      ]}
    >
      <PageHeader
        title="My leave"
        description="What you have left, what you have booked, and anything about your attendance that leave has yet to explain."
      />
      {me ? (
        <MyLeaveSummary employee={me} />
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No record found"
          description="Your employee record could not be found in this session."
        />
      )}
    </PageShell>
  )
}
