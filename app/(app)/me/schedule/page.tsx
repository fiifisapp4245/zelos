"use client"

import { CalendarRange } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="My schedule"
      description="The shifts and working pattern you are rostered on."
      icon={CalendarRange}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Me" },
        { label: "My schedule" },
      ]}
      emptyTitle="No shifts rostered"
      emptyDescription="Your published shifts appear here, along with any swaps or cover you have agreed."
    />
  )
}
