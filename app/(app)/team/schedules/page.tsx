"use client"

import { CalendarRange } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="Team schedules"
      description="The shifts and working patterns your reports are rostered on."
      icon={CalendarRange}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "My team", href: "/team" },
        { label: "Team schedules" },
      ]}
      emptyTitle="No shifts rostered"
      emptyDescription="Rosters covering your team appear here, including cover arranged while someone is away."
    />
  )
}
