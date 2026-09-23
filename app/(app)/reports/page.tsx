"use client"

import { ChartColumn } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="Reports"
      description="Headcount, turnover, attendance and payroll cost, exportable and aggregated so no individual is identifiable."
      icon={ChartColumn}
      crumbs={[{ label: "Workspace", href: "/overview" }, { label: "Reports" }]}
      emptyTitle="No reports saved yet"
      emptyDescription="Saved and scheduled reports are listed here. Aggregates below the minimum group size are withheld."
    />
  )
}
