"use client"

import { Wallet } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, PageHeader, Panel } from "@/components/common"

/**
 * The payroll run itself: preparing a period, reviewing variance,
 * approving and paying. It reads the same compensation versions the
 * Compensation area writes, so nothing is keyed twice.
 */
export default function PayrollPage() {
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
        description="Preparing, checking and approving each pay period, against the compensation versions in force on the pay date."
      />
      <Panel bodyClassName="p-0">
        <EmptyState
          icon={Wallet}
          title="No pay period is open"
          description="A period is opened against a pay group, prepared from the compensation in force, then checked and approved before anyone is paid."
        />
      </Panel>
    </PageShell>
  )
}
