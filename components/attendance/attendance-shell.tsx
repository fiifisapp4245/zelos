"use client"

import { PageShell } from "@/components/shell/page-shell"
import { PageHeader } from "@/components/common"
import type { Crumb } from "@/components/shell/topbar"

/**
 * The frame the attendance views share.
 *
 * Deliberately no tab bar: Attendance, Timesheets, Schedules and Leave are
 * already four items in the sidebar under Time. Repeating them as tabs
 * inside one of them would give the same four destinations two homes.
 */
export function AttendanceShell({
  title,
  description,
  crumbs,
  actions,
  children,
}: {
  title: string
  description: string
  crumbs: Crumb[]
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <PageShell width="wide" crumbs={crumbs}>
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </PageShell>
  )
}
