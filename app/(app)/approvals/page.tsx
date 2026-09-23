"use client"

import { ClipboardCheck } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="Approvals"
      description="Every request waiting on you — leave, timesheets, pay changes and lifecycle decisions — in one queue."
      icon={ClipboardCheck}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Approvals" },
      ]}
      emptyTitle="Nothing is waiting on you"
      emptyDescription="Requests routed to you appear here the moment they are submitted, with the policy that routed them."
    />
  )
}
