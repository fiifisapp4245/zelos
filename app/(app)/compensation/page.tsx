import { CircleDollarSign } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="Compensation"
      description="Pay grades, salary bands and the review cycle that moves people through them."
      icon={CircleDollarSign}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Pay", href: "/payroll" },
        { label: "Compensation" },
      ]}
      emptyTitle="No compensation review is open"
      emptyDescription="Grade structures, band placements and pending pay changes are managed here, separately from the payroll run."
    />
  )
}
