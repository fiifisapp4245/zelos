import { Wallet } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="My pay"
      description="Your payslips, statutory deductions and the bank or mobile money account they are paid into."
      icon={Wallet}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Me" },
        { label: "My pay" },
      ]}
      emptyTitle="No payslips yet"
      emptyDescription="Payslips appear here once a payroll run that includes you has been approved."
    />
  )
}
