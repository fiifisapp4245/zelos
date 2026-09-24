"use client"

import { usePathname, useRouter } from "next/navigation"

import { PageShell } from "@/components/shell/page-shell"
import { PageHeader } from "@/components/common"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs } from "@/components/ui/tabs"

const TABS = [
  { value: "register", label: "Register" },
  { value: "timesheets", label: "Timesheets" },
  { value: "schedules", label: "Schedules" },
  { value: "leave", label: "Leave" },
]

/**
 * The frame every attendance view sits in: the same heading block and the
 * same tab bar, so only the content below changes as you move between them.
 * The tabs are routes, which keeps each view linkable.
 */
export function AttendanceShell({
  title,
  description,
  actions,
  toolbar,
  children,
}: {
  title: string
  description: string
  actions?: React.ReactNode
  /** Sits on the tab row, to the right. */
  toolbar?: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const current =
    TABS.find((t) => pathname.startsWith(`/attendance/${t.value}`))?.value ??
    "register"

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Attendance", href: "/attendance/register" },
        { label: TABS.find((t) => t.value === current)?.label ?? "Register" },
      ]}
    >
      <PageHeader title={title} description={description} actions={actions} />

      <Tabs
        value={current}
        onValueChange={(v) => router.push(`/attendance/${v}`)}
        className="gap-0"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SegmentedTabs tabs={TABS} />
          {toolbar}
        </div>
        {children}
      </Tabs>
    </PageShell>
  )
}
