import { CalendarRange } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="Schedules"
      description="Shift patterns and rosters by branch and department, and who is rostered when."
      icon={CalendarRange}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Time", href: "/attendance" },
        { label: "Schedules" },
      ]}
      emptyTitle="No schedules published"
      emptyDescription="Published rosters appear here. Attendance is measured against whatever is scheduled for the day."
    />
  )
}
