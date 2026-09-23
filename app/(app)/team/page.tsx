"use client"

import { Users } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="Team members"
      description="The people who report to you, directly and on a dotted line, with their current state."
      icon={Users}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "My team" },
        { label: "Team members" },
      ]}
      emptyTitle="No one reports to you yet"
      emptyDescription="Your direct and dotted-line reports appear here as soon as the reporting line is set."
    />
  )
}
