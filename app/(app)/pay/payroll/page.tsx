"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Wallet } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, PageHeader, Panel } from "@/components/common"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { RunsTab } from "@/components/payroll/runs-tab"
import { OneOffsTab } from "@/components/payroll/one-offs-tab"
import { PaymentsTab } from "@/components/payroll/payments-tab"
import { ReportsTab } from "@/components/payroll/reports-tab"
import { FilingsTab } from "@/components/payroll/filings-tab"
import { MyPay } from "@/components/payroll/my-pay"
import { WidgetSkeleton } from "@/components/home/skeletons"
import { usePayroll } from "@/components/payroll/use-payroll"
import { useStore } from "@/lib/store"

const TABS = [
  { value: "runs", label: "Runs" },
  { value: "one-offs", label: "One-off payments" },
  { value: "payments", label: "Payments" },
  { value: "filings", label: "Filings" },
  { value: "reports", label: "Reports" },
]

export default function PayrollPage() {
  return (
    <React.Suspense fallback={null}>
      <Payroll />
    </React.Suspense>
  )
}

function Payroll() {
  const store = useStore()
  const params = useSearchParams()
  const demo = params.get("demo")
  const { canOpenPayroll, isPreparer, isApprover } = usePayroll()
  const router = useRouter()
  const pathname = usePathname()
  // The tab is in the address, so "Open filings" elsewhere lands on it
  // and a refresh keeps it.
  const tab = TABS.some((t) => t.value === params.get("tab"))
    ? params.get("tab")!
    : "runs"
  const setTab = (value: string) => {
    const next = new URLSearchParams(params.toString())
    next.set("tab", value)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  // An employee or a line manager has no run to prepare, so this route
  // is their own pay rather than a locked door.
  if (!canOpenPayroll) {
    const me = store.employeeById(store.session.id)
    return (
      <PageShell
        crumbs={[
          { label: "Workspace", href: "/overview" },
          { label: "Pay" },
          { label: "My pay" },
        ]}
      >
        <PageHeader
          title="My pay"
          description="What you were paid, period by period, and the payslip behind each one."
        />
        {me ? (
          <MyPay employeeId={me.id} />
        ) : (
          <Panel bodyClassName="p-0">
            <EmptyState
              icon={Wallet}
              title="No record found"
              description="Your employee record could not be found in this session."
            />
          </Panel>
        )}
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
          <SegmentedTabs tabs={TABS} />
        </div>

        <TabsContent value="runs">
          {demo === "loading" ? <WidgetSkeleton rows={5} /> : <RunsTab />}
        </TabsContent>

        <TabsContent value="one-offs">
          <OneOffsTab canEdit={isPreparer || isApprover} />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsTab canPay={isPreparer} />
        </TabsContent>

        <TabsContent value="filings">
          <FilingsTab />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
