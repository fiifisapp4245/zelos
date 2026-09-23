"use client"

import { ChartColumn } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, PageHeader, Panel } from "@/components/common"
import {
  HeadcountByDepartment,
  Movement,
} from "@/components/reports/workforce-sections"

export default function ReportsPage() {
  return (
    <PageShell
      width="wide"
      crumbs={[{ label: "Workspace", href: "/overview" }, { label: "Reports" }]}
    >
      <PageHeader
        title="Reports"
        description="Headcount, turnover, attendance and payroll cost, exportable and aggregated so no individual is identifiable."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <HeadcountByDepartment />
        <Movement />
      </div>

      <Panel className="mt-5" bodyClassName="p-0">
        <EmptyState
          icon={ChartColumn}
          title="No saved reports yet"
          description="Saved and scheduled reports are listed here. Aggregates below the minimum group size are withheld."
        />
      </Panel>
    </PageShell>
  )
}
