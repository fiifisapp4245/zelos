"use client"

import { ClipboardList } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="My timesheet"
      description="Record your hours for the week and submit them for approval."
      icon={ClipboardList}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Me" },
        { label: "My timesheet" },
      ]}
      emptyTitle="No hours recorded this week"
      emptyDescription="Entries you add are saved as a draft until you submit the week."
    />
  )
}
