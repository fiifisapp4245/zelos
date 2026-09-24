"use client"

import * as React from "react"
import { BarChart3, Lock, Send } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, PageHeader, Panel } from "@/components/common"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { RunsTab } from "@/components/payroll/runs-tab"
import { OneOffsTab } from "@/components/payroll/one-offs-tab"
import { usePayroll } from "@/components/payroll/use-payroll"

export default function PayrollPage() {
  const { canOpenPayroll, isPreparer, isApprover } = usePayroll()
  const [tab, setTab] = React.useState("runs")

  if (!canOpenPayroll) {
    return (
      <PageShell
        crumbs={[
          { label: "Workspace", href: "/overview" },
          { label: "Pay" },
          { label: "Payroll" },
        ]}
      >
        <PageHeader
          title="Payroll"
          description="Preparing, checking and approving each pay period."
        />
        <Panel bodyClassName="p-0">
          <EmptyState
            icon={Lock}
            title="Payroll is restricted"
            description="Runs are prepared by the Payroll Officer and approved by HR. Your own pay slips are on your profile."
          />
        </Panel>
      </PageShell>
    )
  }

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Pay" },
        { label: "Payroll" },
      ]}
    >
      <PageHeader
        title="Payroll"
        description={
          isApprover && !isPreparer
            ? "Runs waiting on your sign-off, and everything that has already been paid."
            : "Preparing, checking and submitting each pay period, against the compensation in force on the pay date."
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="gap-0">
        <div className="mb-4">
          <SegmentedTabs
            tabs={[
              { value: "runs", label: "Runs" },
              { value: "one-offs", label: "One-off payments" },
              { value: "payments", label: "Payments" },
              { value: "reports", label: "Reports" },
            ]}
          />
        </div>

        <TabsContent value="runs">
          <RunsTab />
        </TabsContent>

        <TabsContent value="one-offs">
          <OneOffsTab canEdit={isPreparer || isApprover} />
        </TabsContent>

        <TabsContent value="payments">
          <Panel bodyClassName="p-0">
            <EmptyState
              icon={Send}
              title="No payment batch is open"
              description="Once a run is approved, its lines are batched by channel — bank transfer and mobile money — and sent, with each batch tracked until every line is settled."
            />
          </Panel>
        </TabsContent>

        <TabsContent value="reports">
          <Panel bodyClassName="p-0">
            <EmptyState
              icon={BarChart3}
              title="No reports for this period yet"
              description="Statutory returns and the schedules behind them are produced from approved runs: PAYE, SSNIT, Tier 2 and the annual employer return."
            />
          </Panel>
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
