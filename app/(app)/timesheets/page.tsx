import { ClipboardList } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="Timesheets"
      description="Hours recorded against projects and cost centres, submitted weekly and approved before they reach payroll."
      icon={ClipboardList}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Time", href: "/attendance" },
        { label: "Timesheets" },
      ]}
      emptyTitle="No timesheets in this period"
      emptyDescription="Submitted timesheets are listed here by person and week, with their approval state."
    />
  )
}
