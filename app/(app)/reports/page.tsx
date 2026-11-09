"use client"

import * as React from "react"
import {
  CalendarClock,
  ChartColumn,
  Download,
  FileBarChart,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, PageHeader, Panel, Pill } from "@/components/common"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/talent/form"
import {
  HeadcountByDepartment,
  Movement,
} from "@/components/reports/workforce-sections"
import {
  ReportViewer,
  csvName,
  downloadText,
} from "@/components/reports/report-viewer"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { visibleEmployees } from "@/lib/selectors"
import { TODAY_ISO, formatDate } from "@/lib/format"
import { addDays } from "@/lib/time"
import {
  REPORTS,
  REPORT_GROUPS,
  defaultOptions,
  reportsFor,
  runReport,
  toCsv,
  type ReportData,
} from "@/lib/reports"
import type { SavedReport } from "@/lib/types"
import { cn } from "@/lib/utils"

const SCHEDULE_LABEL: Record<SavedReport["schedule"], string> = {
  none: "Not repeated",
  weekly: "Weekly",
  monthly: "Monthly",
}

/** When a repeating report is next due, counting from the last time it was run. */
function nextDue(r: SavedReport) {
  if (r.schedule === "none") return null
  const from = r.lastRunOn ?? r.createdOn
  return addDays(from, r.schedule === "weekly" ? 7 : 30)
}

export default function ReportsPage() {
  const store = useStore()
  const { viewer } = store
  const available = reportsFor(viewer)

  const [tab, setTab] = React.useState("library")
  const [selected, setSelected] = React.useState(available[0]?.id ?? "")
  const [options, setOptions] = React.useState<Record<string, string>>({})

  // Reports only ever see what the viewer can open, so a manager's headcount
  // is their team's and not the company's.
  const data = React.useMemo<ReportData>(() => {
    const people = visibleEmployees(viewer, store.employees)
    const ids = new Set(people.map((e) => e.id))
    const mine = has(viewer, "hr_admin")
      ? store.requisitions
      : store.requisitions.filter(
          (r) => r.hiringManagerId === viewer.employeeId
        )
    const reqIds = new Set(mine.map((r) => r.id))
    return {
      employees: people,
      requisitions: mine,
      candidates: store.candidates.filter((c) => reqIds.has(c.requisitionId)),
      reviews: store.reviews.filter((r) => ids.has(r.employeeId)),
      cases: store.cases.filter((c) => ids.has(c.employeeId)),
      offboarding: store.offboarding.filter((c) => ids.has(c.employeeId)),
      leaveRequests: store.leaveRequests.filter((r) => ids.has(r.employeeId)),
      leaveBalances: store.leaveBalances.filter((b) => ids.has(b.employeeId)),
      documents: store.documents.filter((d) => ids.has(d.employeeId)),
      attendance: store.attendance.filter((a) => ids.has(a.employeeId)),
    }
  }, [viewer, store])

  const def = available.find((r) => r.id === selected) ?? available[0]
  const saved = store.savedReports.filter((r) =>
    available.some((a) => a.id === r.reportId)
  )

  function pick(id: string) {
    setSelected(id)
    const d = REPORTS.find((r) => r.id === id)
    setOptions(d ? defaultOptions(d) : {})
  }

  function openSaved(r: SavedReport) {
    setSelected(r.reportId)
    setOptions(r.options)
    setTab("library")
  }

  function runSaved(r: SavedReport) {
    const d = REPORTS.find((x) => x.id === r.reportId)
    const result = runReport(
      r.reportId,
      data,
      { viewer, today: TODAY_ISO },
      r.options
    )
    if (!d || !result) {
      toast.error("You can no longer run this report.")
      return
    }
    downloadText(csvName(r.name), toCsv(result, r.name, TODAY_ISO))
    store.updateSavedReport(r.id, { lastRunOn: TODAY_ISO })
    toast.success(`${r.name} downloaded.`)
  }

  return (
    <PageShell
      width="wide"
      crumbs={[{ label: "Workspace", href: "/overview" }, { label: "Reports" }]}
    >
      <PageHeader
        title="Reports"
        description="Headcount, turnover, hiring, leave, pay and compliance. Exportable, and aggregated so no individual is identifiable."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <SegmentedTabs
          className="mb-5"
          tabs={[
            { value: "library", label: "Reports" },
            { value: "saved", label: "Saved", count: saved.length },
            { value: "overview", label: "At a glance" },
          ]}
        />

        <TabsContent value="library">
          {!def ? (
            <Panel>
              <EmptyState icon={ChartColumn} title="No reports for your role" />
            </Panel>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
              <nav aria-label="Report library" className="space-y-4">
                {REPORT_GROUPS.map((g) => {
                  const items = available.filter((r) => r.group === g)
                  if (items.length === 0) return null
                  return (
                    <div key={g}>
                      <p className="mb-1.5 px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                        {g}
                      </p>
                      <ul className="space-y-0.5">
                        {items.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              aria-current={
                                r.id === def.id ? "page" : undefined
                              }
                              onClick={() => pick(r.id)}
                              className={cn(
                                "w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                                r.id === def.id
                                  ? "bg-success-muted font-medium text-primary"
                                  : "hover:bg-muted"
                              )}
                            >
                              {r.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </nav>
              <ReportViewer
                key={def.id}
                def={def}
                data={data}
                options={{ ...defaultOptions(def), ...options }}
                onOptions={setOptions}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved">
          <Panel
            title="Saved reports"
            description="Open one to change it, or run it to download the file."
            bodyClassName="p-0"
          >
            {saved.length === 0 ? (
              <EmptyState
                icon={FileBarChart}
                title="No saved reports yet"
                description="Open a report, choose how you want it, and save it. A saved report can repeat weekly or monthly."
                action={
                  <Button variant="outline" onClick={() => setTab("library")}>
                    Browse reports
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y">
                {saved.map((r) => {
                  const d = REPORTS.find((x) => x.id === r.reportId)
                  const due = nextDue(r)
                  const overdue = due !== null && due <= TODAY_ISO
                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm">
                          <button
                            type="button"
                            onClick={() => openSaved(r)}
                            className="font-medium hover:underline"
                          >
                            {r.name}
                          </button>
                          <Pill tone="neutral">{d?.title}</Pill>
                          {overdue && <Pill tone="warning">Due</Pill>}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Saved {formatDate(r.createdOn)}
                          {r.lastRunOn
                            ? ` · last run ${formatDate(r.lastRunOn)}`
                            : " · never run"}
                          {due && ` · next ${formatDate(due)}`}
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarClock className="size-3.5" />
                        <span className="sr-only">Repeat</span>
                        <NativeSelect
                          value={r.schedule}
                          onChange={(e) =>
                            store.updateSavedReport(r.id, {
                              schedule: e.target
                                .value as SavedReport["schedule"],
                            })
                          }
                          className="h-8 w-auto text-xs"
                        >
                          {(
                            Object.keys(
                              SCHEDULE_LABEL
                            ) as SavedReport["schedule"][]
                          ).map((s) => (
                            <option key={s} value={s}>
                              {SCHEDULE_LABEL[s]}
                            </option>
                          ))}
                        </NativeSelect>
                      </label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runSaved(r)}
                      >
                        <Download className="size-3.5" />
                        Run
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Delete ${r.name}`}
                        onClick={() => {
                          store.deleteSavedReport(r.id)
                          toast.success(`${r.name} deleted.`)
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="overview">
          <div className="grid gap-5 lg:grid-cols-2">
            <HeadcountByDepartment />
            <Movement />
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
