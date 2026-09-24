"use client"

import { Wallet } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, PageHeader, Panel } from "@/components/common"
import { MyPay } from "@/components/payroll/my-pay"
import { useStore } from "@/lib/store"

/** The same view Payroll shows an employee, reached from their own menu. */
export default function MyPayPage() {
  const store = useStore()
  const me = store.employeeById(store.session.id)

  return (
    <PageShell
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Me" },
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
