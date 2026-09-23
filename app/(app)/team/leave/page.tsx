"use client"

import { CalendarDays } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="Team leave"
      description="Leave booked, pending and remaining across your reports, with the coverage gaps it creates."
      icon={CalendarDays}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "My team", href: "/team" },
        { label: "Team leave" },
      ]}
      emptyTitle="No leave booked"
      emptyDescription="Requests from your team appear here, alongside a calendar of who is already away."
    />
  )
}
