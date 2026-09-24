"use client"

import * as React from "react"
import Link from "next/link"
import { CircleDollarSign, Lock, Pencil } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, PageHeader, Panel } from "@/components/common"
import { FilterSearch, FilterToolbar } from "@/components/common/filter-bar"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { WidgetSkeleton } from "@/components/home/skeletons"
import { PeopleTable } from "@/components/pay/people-table"
import { ChangesTable } from "@/components/pay/changes-table"
import { ApprovalSheet } from "@/components/pay/approval-sheet"
import { RevealProvider, RevealToggle } from "@/components/pay/money"
import { usePay } from "@/components/pay/use-pay"
import { useStore } from "@/lib/store"
import { PAY_ROLE_NOTE } from "@/lib/pay/access"
import type { CompensationChangeRequest } from "@/lib/pay/types"
import { TODAY_ISO } from "@/lib/format"

export default function CompensationPage() {
  return (
    <React.Suspense fallback={null}>
      <Compensation />
    </React.Suspense>
  )
}

function Compensation() {
  const store = useStore()
  const { role, rows, groups, requests } = usePay()

  const [tab, setTab] = React.useState("people")
  const [revealed, setRevealed] = React.useState(false)
  const [selected, setSelected] = React.useState<string[]>([])
  const [open, setOpen] = React.useState<CompensationChangeRequest | null>(null)

  const [payGroup, setPayGroup] = React.useState("all")
  const [department, setDepartment] = React.useState("all")
  const [branch, setBranch] = React.useState("all")
  const [workerType, setWorkerType] = React.useState("all")
  const [status, setStatus] = React.useState("all")
  const [search, setSearch] = React.useState("")

  const canPropose = role === "approver" || role === "proposer"

  const q = search.trim().toLowerCase()
  const people = rows
    .filter((r) => payGroup === "all" || r.version?.payGroupId === payGroup)
    .filter((r) => department === "all" || r.employee.department === department)
    .filter((r) => branch === "all" || r.employee.branch === branch)
    .filter((r) => workerType === "all" || r.version?.workerType === workerType)
    .filter(
      (r) =>
        !q ||
        `${r.employee.firstName} ${r.employee.lastName}`
          .toLowerCase()
          .includes(q) ||
        r.employee.jobTitle.toLowerCase().includes(q)
    )

  const visibleIds = new Set(rows.map((r) => r.employee.id))
  const changes = requests
    .filter((r) => r.employeeIds.some((id) => visibleIds.has(id)))
    .filter((r) => status === "all" || r.status === status)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))

  const pending = changes.filter((r) => r.status === "pending").length
  const departments = [
    ...new Set(rows.map((r) => r.employee.department)),
  ].sort()
  const branches = [...new Set(rows.map((r) => r.employee.branch))].sort()

  if (role === "self") {
    return (
      <PageShell
        crumbs={[{ label: "Workspace", href: "/overview" }, { label: "Pay" }]}
      >
        <PageHeader
          title="Compensation"
          description="Your own package and its history live on your profile."
        />
        <Panel bodyClassName="p-0">
          <EmptyState
            icon={Lock}
            title="Compensation across the company is restricted"
            description="You can see your own package, its history and anything scheduled, on your profile."
            action={
              <Button variant="outline" asChild>
                <Link
                  href={`/employees/${store.viewer.employeeId}?tab=compensation`}
                >
                  Open my compensation
                </Link>
              </Button>
            }
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
        { label: "Compensation" },
      ]}
    >
      <PageHeader
        title="Compensation"
        description={PAY_ROLE_NOTE[role]}
        actions={
          canPropose && (
            <Button
              size="lg"
              disabled={selected.length === 0}
              asChild={selected.length > 0}
            >
              {selected.length > 0 ? (
                <Link
                  href={`/pay/compensation/changes/new?employees=${selected.join(",")}`}
                >
                  <Pencil className="size-4" />
                  Change pay · {selected.length}
                </Link>
              ) : (
                <>
                  <Pencil className="size-4" />
                  Change pay
                </>
              )}
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="gap-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SegmentedTabs
            tabs={[
              { value: "people", label: "People", count: rows.length },
              { value: "changes", label: "Changes", count: pending },
            ]}
            emphasise={pending > 0 ? ["changes"] : undefined}
          />

          {tab === "people" ? (
            <FilterToolbar
              fields={[
                {
                  kind: "select",
                  key: "payGroup",
                  label: "Pay group",
                  value: payGroup,
                  allLabel: "All pay groups",
                  options: groups.map((g) => ({ value: g.id, label: g.name })),
                },
                {
                  kind: "select",
                  key: "department",
                  label: "Department",
                  value: department,
                  allLabel: "All departments",
                  options: departments.map((d) => ({ value: d, label: d })),
                },
                {
                  kind: "select",
                  key: "branch",
                  label: "Branch",
                  value: branch,
                  allLabel: "All branches",
                  options: branches.map((b) => ({ value: b, label: b })),
                },
                {
                  kind: "select",
                  key: "workerType",
                  label: "Worker type",
                  value: workerType,
                  allLabel: "Everyone",
                  options: [
                    { value: "employee", label: "Employees" },
                    { value: "contractor", label: "Contractors" },
                  ],
                },
              ]}
              onChange={(patch) => {
                if (typeof patch.payGroup === "string")
                  setPayGroup(patch.payGroup)
                if (typeof patch.department === "string")
                  setDepartment(patch.department)
                if (typeof patch.branch === "string") setBranch(patch.branch)
                if (typeof patch.workerType === "string")
                  setWorkerType(patch.workerType)
              }}
              onClear={() => {
                setPayGroup("all")
                setDepartment("all")
                setBranch("all")
                setWorkerType("all")
                setSearch("")
              }}
            >
              <FilterSearch
                value={search}
                onChange={setSearch}
                placeholder="Search by name or job title"
              />
              <RevealToggle revealed={revealed} onChange={setRevealed} />
            </FilterToolbar>
          ) : (
            <FilterToolbar
              fields={[
                {
                  kind: "select",
                  key: "status",
                  label: "Status",
                  value: status,
                  allLabel: "All statuses",
                  options: [
                    { value: "pending", label: "Awaiting approval" },
                    { value: "approved", label: "Approved" },
                    { value: "rejected", label: "Rejected" },
                    { value: "cancelled", label: "Cancelled" },
                  ],
                },
              ]}
              onChange={(patch) => {
                if (typeof patch.status === "string") setStatus(patch.status)
              }}
              onClear={() => setStatus("all")}
            />
          )}
        </div>

        <TabsContent value="people">
          <Panel bodyClassName="p-0">
            {rows.length === 0 ? (
              <WidgetSkeleton rows={4} />
            ) : people.length === 0 ? (
              <EmptyState
                icon={CircleDollarSign}
                title="Nobody matches these filters"
                description="Widen the pay group, department or branch to see people again."
              />
            ) : (
              <RevealProvider revealed={revealed}>
                <PeopleTable
                  rows={people}
                  groups={groups}
                  selected={selected}
                  onSelect={setSelected}
                  selectable={canPropose}
                />
              </RevealProvider>
            )}
          </Panel>
          <p className="mt-3 text-xs text-muted-foreground">
            Amounts are hidden until you reveal them, and revealing is for this
            screen only. Effective dates are as at {TODAY_ISO}.
          </p>
        </TabsContent>

        <TabsContent value="changes">
          <Panel bodyClassName="p-0">
            {changes.length === 0 ? (
              <EmptyState
                icon={CircleDollarSign}
                title="No pay changes to show"
                description="Proposed changes appear here with who raised them and where they have got to."
              />
            ) : (
              <ChangesTable requests={changes} onOpen={setOpen} />
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      {open && <ApprovalSheet request={open} onClose={() => setOpen(null)} />}
    </PageShell>
  )
}
