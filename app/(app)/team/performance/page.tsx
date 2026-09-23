"use client"

import { Target } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="Team performance"
      description="Goals, check-ins and review cycles for the people who report to you."
      icon={Target}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "My team", href: "/team" },
        { label: "Team performance" },
      ]}
      emptyTitle="No review cycle is open"
      emptyDescription="Goals and check-ins for your reports appear here once a cycle is running."
    />
  )
}
