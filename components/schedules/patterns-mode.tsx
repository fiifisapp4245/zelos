"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, CalendarClock, Plus } from "lucide-react"

import { EmptyState, Initials, Panel, Pill } from "@/components/common"
import { RowActions } from "@/components/common/row-actions"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { PatternSheet } from "./pattern-sheet"
import { AssignSheet } from "./assign-sheet"
import {
  assignmentFor,
  assignmentHistoryFor,
  breakSummary,
  hoursSummary,
  unscheduled,
  weeklyHours,
  workingWeekdays,
  type ScheduleInput,
} from "@/lib/schedules/derive"
import type { WorkPattern } from "@/lib/schedules/types"
import { formatDate, formatDateTime, fullName, TODAY_ISO } from "@/lib/format"
import { formatHours } from "@/lib/time"
import { useStore } from "@/lib/store"
import type { Employee } from "@/lib/types"

/**
 * Fixed-hours staff.
 *
 * The list answers the question people actually ask of it — what are the
 * hours, and who is on them — and the assignment history underneath each
 * person answers the one that follows, which is what they were on in
 * August.
 */
export function PatternsMode({
  scope,
  input,
  defaultGraceMinutes,
  canEdit,
  dates,
}: {
  scope: Employee[]
  input: ScheduleInput
  defaultGraceMinutes: number
  canEdit: boolean
  /** The range the "no schedule" warning is judged over. */
  dates: string[]
}) {
  const [editing, setEditing] = React.useState<WorkPattern | null | undefined>(
    undefined
  )
  const [assigning, setAssigning] = React.useState<WorkPattern | null>(null)
  const [showing, setShowing] = React.useState<WorkPattern | null>(null)

  const gaps = unscheduled(scope, dates, input)

  return (
    <div className="space-y-4">
      {gaps.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning bg-warning-muted px-4 py-3">
          <AlertTriangle
            className="size-4 shrink-0 text-warning-foreground"
            aria-hidden
          />
          <p className="min-w-0 flex-1 text-sm text-warning-foreground">
            <strong className="tabular font-semibold">{gaps.length}</strong>{" "}
            {gaps.length === 1 ? "person has" : "people have"} no schedule, so
            their lateness and variance can&apos;t be calculated.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-8 bg-card"
            onClick={() => setShowing(GAP_LIST)}
          >
            See who
          </Button>
        </div>
      )}

      <Panel
        description="Named hours, assigned to people, departments or branches from a date."
        bodyClassName="p-0"
        actions={
          canEdit && (
            <Button size="sm" className="h-9" onClick={() => setEditing(null)}>
              <Plus className="size-4" />
              New pattern
            </Button>
          )
        }
      >
        {input.patterns.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No patterns yet"
            description="A pattern is a named set of working days and hours that people can be put on."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  {[
                    "Pattern",
                    "Working days",
                    "Hours",
                    "Weekly",
                    "Break",
                    "Grace",
                    "Assigned",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:pl-5 last:pr-5"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {input.patterns.map((p) => {
                  const on = scope.filter(
                    (e) =>
                      assignmentFor(e, TODAY_ISO, input.assignments)
                        ?.patternId === p.id
                  )
                  return (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="py-3 pl-5 font-medium">{p.name}</td>
                      <td className="px-4 text-muted-foreground">
                        {workingWeekdays(p).length} days
                      </td>
                      <td className="px-4 text-muted-foreground">
                        {hoursSummary(p)}
                      </td>
                      <td className="tabular px-4">
                        {formatHours(weeklyHours(p))}
                      </td>
                      <td className="px-4 text-muted-foreground">
                        {breakSummary(p)}
                      </td>
                      <td className="px-4 text-muted-foreground">
                        {p.graceMinutes === null
                          ? `${defaultGraceMinutes} min (company)`
                          : `${p.graceMinutes} min`}
                      </td>
                      <td className="tabular px-4">
                        <button
                          type="button"
                          className="underline-offset-2 hover:underline"
                          onClick={() => setShowing(p)}
                        >
                          {on.length}
                        </button>
                      </td>
                      <td className="py-3 pr-5 text-right">
                        {canEdit && (
                          <RowActions
                            label={`Actions for ${p.name}`}
                            actions={[
                              {
                                label: "Assign people",
                                onSelect: () => setAssigning(p),
                              },
                              {
                                label: "Edit pattern",
                                onSelect: () => setEditing(p),
                              },
                              {
                                label: "See who is on it",
                                onSelect: () => setShowing(p),
                              },
                            ]}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="text-xs text-muted-foreground">
        Precedence: an individual assignment beats a department, a department
        beats a branch, and a branch beats the company default. Where nothing
        assigns a pattern, the person is rostered and their hours come from
        published shifts.
      </p>

      {editing !== undefined && (
        <PatternSheet
          pattern={editing}
          defaultGraceMinutes={defaultGraceMinutes}
          onClose={() => setEditing(undefined)}
        />
      )}

      {assigning && (
        <AssignSheet
          pattern={assigning}
          scope={scope}
          onClose={() => setAssigning(null)}
        />
      )}

      {showing && (
        <PeopleSheet
          pattern={showing}
          scope={scope}
          input={input}
          gaps={gaps}
          onClose={() => setShowing(null)}
        />
      )}
    </div>
  )
}

/** A stand-in row so one sheet can also show the people nothing covers. */
const GAP_LIST: WorkPattern = {
  id: "__gaps__",
  name: "No schedule",
  days: [],
  breakMinutes: 0,
  breakPaid: false,
  graceMinutes: null,
}

function PeopleSheet({
  pattern,
  scope,
  input,
  gaps,
  onClose,
}: {
  pattern: WorkPattern
  scope: Employee[]
  input: ScheduleInput
  gaps: Employee[]
  onClose: () => void
}) {
  const store = useStore()
  const isGaps = pattern.id === GAP_LIST.id
  const people = isGaps
    ? gaps
    : scope.filter(
        (e) =>
          assignmentFor(e, TODAY_ISO, input.assignments)?.patternId ===
          pattern.id
      )

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[560px]"
      >
        <SheetHeader>
          <SheetTitle>
            {isGaps ? "People with no schedule" : pattern.name}
          </SheetTitle>
          <SheetDescription>
            {isGaps
              ? "Nothing expects them on any day in this range, so there is nothing to measure their attendance against."
              : `${people.length} ${people.length === 1 ? "person is" : "people are"} on this pattern today, with the history that put them there.`}
          </SheetDescription>
        </SheetHeader>

        {people.length === 0 ? (
          <div className="px-4">
            <EmptyState
              icon={CalendarClock}
              title="Nobody is on this pattern"
              description="Assign it to a person, a department or a branch to put it to work."
            />
          </div>
        ) : (
          <ul className="divide-y border-t">
            {people.map((e) => {
              const history = assignmentHistoryFor(e, input.assignments)
              return (
                <li key={e.id} className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Initials person={e} size="sm" />
                    <Link
                      href={`/employees/${e.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {fullName(e)}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {e.department} · {e.branch}
                    </span>
                  </div>
                  <ol className="mt-2 space-y-1.5 border-l pl-3">
                    {history.map((a) => {
                      const named = input.patterns.find(
                        (p) => p.id === a.patternId
                      )
                      const current =
                        assignmentFor(e, TODAY_ISO, input.assignments)?.id ===
                        a.id
                      return (
                        <li key={a.id} className="text-xs">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium">
                              {named?.name ?? "Rostered — shifts only"}
                            </span>
                            <span className="text-muted-foreground">
                              from {formatDate(a.effectiveFrom)} ·{" "}
                              {a.scope === "company"
                                ? "company default"
                                : `${a.scope} · ${a.target}`}
                            </span>
                            {current && <Pill tone="success">In force</Pill>}
                          </span>
                          <span className="block text-muted-foreground">
                            {a.reason} —{" "}
                            {fullName(store.employeeById(a.createdBy))},{" "}
                            {formatDateTime(a.createdAt)}
                          </span>
                        </li>
                      )
                    })}
                  </ol>
                </li>
              )
            })}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  )
}
