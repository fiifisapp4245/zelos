"use client"

import * as React from "react"
import Link from "next/link"
import { CalendarCheck, Clock, Download } from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  Panel,
  Pill,
  StatCard,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { visibleEmployees, isOnStrength } from "@/lib/selectors"
import { ATTENDANCE_LABEL, formatDate, fullName } from "@/lib/format"
import type { AttendanceStatus, Employee } from "@/lib/types"
import { cn } from "@/lib/utils"

const CELL_TONE: Record<AttendanceStatus, string> = {
  present: "bg-primary/85 text-primary-foreground",
  remote: "bg-info/70 text-white",
  late: "bg-warning/80 text-warning-foreground",
  absent: "bg-destructive/80 text-white",
  on_leave: "bg-info/25 text-info",
  holiday: "bg-muted text-muted-foreground",
  weekend: "bg-muted/40 text-muted-foreground/50",
}

const CELL_CHAR: Record<AttendanceStatus, string> = {
  present: "P",
  remote: "R",
  late: "L",
  absent: "A",
  on_leave: "V",
  holiday: "H",
  weekend: "·",
}

export default function AttendancePage() {
  const store = useStore()
  const { viewer, employees, attendance } = store
  const scope = visibleEmployees(viewer, employees).filter(isOnStrength)
  const scopeIds = new Set(scope.map((e) => e.id))

  const rows = attendance.filter((a) => scopeIds.has(a.employeeId))
  const dates = [...new Set(rows.map((r) => r.date))].sort()

  const workdays = rows.filter((r) => r.status !== "weekend")
  const presentish = workdays.filter((r) =>
    ["present", "remote", "late"].includes(r.status)
  ).length
  const absences = workdays.filter((r) => r.status === "absent").length
  const lateCount = workdays.filter((r) => r.status === "late").length
  const totalHours = workdays.reduce((sum, r) => sum + r.hours, 0)

  const rate =
    workdays.length > 0 ? Math.round((presentish / workdays.length) * 100) : 0

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Attendance" },
      ]}
    >
      <PageHeader
        title="Attendance"
        description={`Two working weeks to ${formatDate(dates.at(-1) ?? "")} across ${scope.length} people in your scope.`}
        actions={
          <Button
            variant="outline"
            size="lg"
            onClick={() => toast("Timesheet export queued.")}
          >
            <Download className="size-4" />
            Export timesheets
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Attendance rate"
          value={`${rate}%`}
          hint="Present, remote or late"
        />
        <StatCard
          label="Hours logged"
          value={Math.round(totalHours)}
          hint="Across the period"
        />
        <StatCard label="Late arrivals" value={lateCount} hint="After 09:15" />
        <StatCard
          label="Unexplained absences"
          value={absences}
          hint="No leave request on file"
        />
      </div>

      <Panel
        title="Daily register"
        description="P present · R remote · L late · A absent · V on leave"
        bodyClassName="p-0"
      >
        {scope.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="Nobody in your scope" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="sticky left-0 z-10 bg-muted/40 px-5 py-2.5 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Employee
                  </th>
                  {dates.map((d) => {
                    const day = new Date(`${d}T00:00:00`)
                    const weekend = day.getDay() === 0 || day.getDay() === 6
                    return (
                      <th
                        key={d}
                        className={cn(
                          "px-1 py-2.5 text-center text-[10px] font-medium",
                          weekend
                            ? "text-muted-foreground/50"
                            : "text-muted-foreground"
                        )}
                      >
                        <span className="block">
                          {day.toLocaleDateString("en-GB", {
                            weekday: "narrow",
                          })}
                        </span>
                        <span className="tabular block">{day.getDate()}</span>
                      </th>
                    )
                  })}
                  <th className="px-3 py-2.5 text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Hours
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {scope.map((e) => (
                  <AttendanceRow key={e.id} employee={e} dates={dates} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="Exceptions this period"
        className="mt-5"
        bodyClassName="p-0"
      >
        <ExceptionList />
      </Panel>
    </PageShell>
  )
}

function AttendanceRow({
  employee,
  dates,
}: {
  employee: Employee
  dates: string[]
}) {
  const { attendance } = useStore()
  const mine = attendance.filter((a) => a.employeeId === employee.id)
  const hours = mine.reduce((s, r) => s + r.hours, 0)

  return (
    <tr className="transition-colors hover:bg-muted/30">
      <td className="sticky left-0 z-10 bg-card px-5 py-2">
        <Link
          href={`/employees/${employee.id}`}
          className="flex items-center gap-2.5"
        >
          <Initials person={employee} size="xs" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {fullName(employee)}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {employee.department}
            </span>
          </span>
        </Link>
      </td>
      {dates.map((d) => {
        const rec = mine.find((r) => r.date === d)
        const status = rec?.status ?? "holiday"
        return (
          <td key={d} className="px-1 py-2 text-center">
            <span
              title={`${formatDate(d)} — ${ATTENDANCE_LABEL[status]}${rec?.clockIn ? ` (${rec.clockIn}–${rec.clockOut})` : ""}`}
              className={cn(
                "mx-auto grid size-6 place-items-center rounded text-[10px] font-semibold",
                CELL_TONE[status]
              )}
            >
              {CELL_CHAR[status]}
            </span>
          </td>
        )
      })}
      <td className="tabular px-3 py-2 text-right text-sm">
        {Math.round(hours)}h
      </td>
    </tr>
  )
}

function ExceptionList() {
  const store = useStore()
  const { viewer, employees, attendance } = store
  const scopeIds = new Set(visibleEmployees(viewer, employees).map((e) => e.id))

  const exceptions = attendance
    .filter((a) => scopeIds.has(a.employeeId))
    .filter((a) => a.status === "absent" || a.status === "late")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12)

  if (exceptions.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No exceptions"
        description="Nobody was late or absent without cover in this period."
      />
    )
  }

  return (
    <ul className="divide-y">
      {exceptions.map((a) => {
        const employee = store.employeeById(a.employeeId)
        return (
          <li key={a.id} className="flex items-center gap-3 px-5 py-3">
            {employee && <Initials person={employee} size="sm" />}
            <div className="min-w-0 flex-1">
              <Link
                href={`/employees/${a.employeeId}`}
                className="text-sm font-medium hover:underline"
              >
                {fullName(employee)}
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatDate(a.date)}
                {a.clockIn && ` · clocked in ${a.clockIn}`}
              </p>
            </div>
            <Pill tone={a.status === "absent" ? "danger" : "warning"}>
              {ATTENDANCE_LABEL[a.status]}
            </Pill>
          </li>
        )
      })}
    </ul>
  )
}
