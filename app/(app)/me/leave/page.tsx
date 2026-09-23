import { CalendarDays } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="My leave"
      description="Your balances, the leave you have booked and anything still awaiting a decision."
      icon={CalendarDays}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Me" },
        { label: "My leave" },
      ]}
      emptyTitle="No leave booked"
      emptyDescription="Requests you submit appear here with their balance impact and who they are waiting on."
    />
  )
}
