"use client"

import * as React from "react"
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Copy,
  Send,
} from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Panel, Pill } from "@/components/common"
import { FilterSearch, FilterToolbar } from "@/components/common/filter-bar"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { RosterGrid } from "./roster-grid"
import { ShiftSheet } from "./shift-sheet"
import { WarningsBar, WarningsDrawer } from "./warnings-drawer"
import { PublishDialog } from "./publish-dialog"
import { useRosterWeek } from "./use-schedules"
import { useStore } from "@/lib/store"
import { liveShifts } from "@/lib/schedules/derive"
import {
  rosterWarnings,
  rosterTotals,
  unpublished,
} from "@/lib/schedules/warnings"
import type { Shift } from "@/lib/schedules/types"
import { SCHEDULE_POLICY } from "@/lib/data/schedules"
import { addDays, datesBetween, formatHours } from "@/lib/time"
import { formatDate, TODAY_ISO } from "@/lib/format"
import type { Employee } from "@/lib/types"

/**
 * The roster.
 *
 * A week at a time by default, because a week is the unit people plan
 * in. Everything that could go wrong with it is counted in one bar
 * above the grid rather than hidden in the cells.
 */
export function RosterMode({
  scope,
  canEdit,
}: {
  scope: Employee[]
  canEdit: boolean
}) {
  const store = useStore()
  const week = useRosterWeek()
  const [view, setView] = React.useState<"week" | "day">("week")
  const [day, setDay] = React.useState(TODAY_ISO)
  const [branch, setBranch] = React.useState(() => {
    const rostered = store.shifts.map((s) => s.branch)
    return rostered[0] ?? "Accra HQ"
  })
  const [departments, setDepartments] = React.useState<string[]>([])
  const [search, setSearch] = React.useState("")
  const [openShift, setOpenShift] = React.useState<Shift | null>(null)
  const [reviewing, setReviewing] = React.useState(false)
  const [publishing, setPublishing] = React.useState(false)

  const dates =
    view === "week" ? datesBetween(week.monday, addDays(week.monday, 6)) : [day]

  const branches = [...new Set(store.shifts.map((s) => s.branch))].sort()
  const allDepartments = [
    ...new Set(
      store.shifts.filter((s) => s.branch === branch).map((s) => s.department)
    ),
  ].sort()

  const q = search.trim().toLowerCase()
  const people = scope
    .filter((e) => e.branch === branch)
    .filter((e) => !departments.length || departments.includes(e.department))
    .filter(
      (e) =>
        !q ||
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.jobTitle.toLowerCase().includes(q)
    )

  // Open shifts belong to the branch rather than to a person, so they
  // are scoped by branch and department alone.
  const inView = store.shifts.filter(
    (s) =>
      dates.includes(s.date) &&
      s.branch === branch &&
      (!departments.length || departments.includes(s.department)) &&
      (s.employeeId === null || people.some((e) => e.id === s.employeeId))
  )

  const warnings = rosterWarnings(inView, store.leaveRequests, SCHEDULE_POLICY)
  const pending = unpublished(inView.filter((s) => !s.cancelled))
  const totals = rosterTotals(inView)

  function newShift(employeeId: string | null, date: string) {
    const person = scope.find((e) => e.id === employeeId)
    setOpenShift({
      id: "",
      employeeId,
      date,
      start: "09:00",
      end: "17:00",
      breakMinutes: 60,
      position: "Cover",
      branch,
      department: person?.department ?? allDepartments[0] ?? "Operations",
      state: "draft",
    })
  }

  function copyLastWeek() {
    store.copyWeek(addDays(week.monday, -7), week.monday)
    toast.success("Last week copied in as drafts")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as "week" | "day")}
          >
            <SegmentedTabs
              tabs={[
                { value: "week", label: "Week" },
                { value: "day", label: "Day" },
              ]}
            />
          </Tabs>

          {view === "week" ? (
            <span className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="size-9 p-0"
                onClick={week.previous}
                aria-label="Previous week"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="size-9 p-0"
                onClick={week.next}
                aria-label="Next week"
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={week.today}
                disabled={week.isThisWeek}
              >
                Today
              </Button>
              <span className="tabular ml-1 text-sm text-muted-foreground">
                {formatDate(week.monday)} –{" "}
                {formatDate(addDays(week.monday, 6))}
              </span>
            </span>
          ) : (
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              aria-label="Day"
              className="h-9 rounded-lg border bg-background px-3 text-sm"
            />
          )}
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            {pending.length > 0 && (
              <Pill tone="warning">
                {pending.length} unpublished{" "}
                {pending.length === 1 ? "change" : "changes"}
              </Pill>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={copyLastWeek}
              disabled={view === "day"}
            >
              <Copy className="size-4" />
              Copy last week
            </Button>
            <Button
              size="sm"
              className="h-9"
              onClick={() => setPublishing(true)}
              disabled={pending.length === 0}
            >
              <Send className="size-4" />
              Publish schedule
            </Button>
          </div>
        )}
      </div>

      <FilterToolbar
        fields={[
          {
            kind: "select",
            key: "branch",
            label: "Branch",
            value: branch,
            allLabel: "All branches",
            options: branches.map((b) => ({ value: b, label: b })),
          },
          {
            kind: "multi",
            key: "departments",
            label: "Department",
            values: departments,
            options: allDepartments.map((d) => ({ value: d, label: d })),
          },
        ]}
        onChange={(patch) => {
          if (typeof patch.branch === "string" && patch.branch !== "all")
            setBranch(patch.branch)
          if (patch.departments) setDepartments(patch.departments as string[])
        }}
        onClear={() => {
          setDepartments([])
          setSearch("")
        }}
      >
        <FilterSearch
          value={search}
          onChange={setSearch}
          placeholder="Search by name or job title"
        />
      </FilterToolbar>

      <WarningsBar warnings={warnings} onReview={() => setReviewing(true)} />

      <Panel bodyClassName="p-0">
        {people.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="Nobody to roster here"
            description="No one in your scope works at this branch, or the filters have narrowed everyone out."
          />
        ) : (
          <RosterGrid
            scope={people}
            dates={dates}
            shifts={inView}
            leave={store.leaveRequests}
            warnings={warnings}
            onOpenShift={setOpenShift}
            onNewShift={newShift}
            canEdit={canEdit}
          />
        )}
      </Panel>

      <p className="text-sm text-muted-foreground">
        <strong className="tabular font-semibold text-foreground">
          {formatHours(totals.hours)}
        </strong>{" "}
        scheduled across{" "}
        <strong className="tabular font-semibold text-foreground">
          {totals.headcount}
        </strong>{" "}
        {totals.headcount === 1 ? "person" : "people"}
        {totals.open > 0 && `, and ${totals.open} still open`} this{" "}
        {view === "week" ? "week" : "day"}.{" "}
        {liveShifts(inView).length === 0 && "Nothing is rostered yet."}
      </p>

      {openShift && (
        <ShiftSheet
          key={openShift.id || `${openShift.employeeId}-${openShift.date}`}
          shift={openShift}
          scope={scope.filter((e) => e.branch === branch)}
          branch={branch}
          canEdit={canEdit}
          onClose={() => setOpenShift(null)}
        />
      )}

      {reviewing && (
        <WarningsDrawer
          warnings={warnings}
          shifts={inView}
          onOpenShift={(s) => {
            setReviewing(false)
            setOpenShift(s)
          }}
          onClose={() => setReviewing(false)}
        />
      )}

      {publishing && (
        <PublishDialog
          pending={pending}
          warnings={warnings}
          onClose={() => setPublishing(false)}
        />
      )}
    </div>
  )
}
