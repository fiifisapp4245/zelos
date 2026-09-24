"use client"

import { CalendarCheck } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="Team attendance"
      description="Who clocked in, who is late and which days have no record across your reports."
      icon={CalendarCheck}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "My team", href: "/team" },
        { label: "Team attendance" },
      ]}
      emptyTitle="No attendance recorded"
      emptyDescription="Once your team starts clocking in, their days appear here against their schedule."
    />
  )
}
