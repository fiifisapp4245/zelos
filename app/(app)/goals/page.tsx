"use client"

import * as React from "react"
import { Plus, Target } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/common"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { GoalDialog } from "@/components/goals/goal-dialog"
import { GoalRow } from "@/components/goals/goal-bits"
import { GoalSheet } from "@/components/goals/goal-sheet"
import { useStore } from "@/lib/store"
import { TODAY_ISO } from "@/lib/format"
import { canApproveGoal, canViewGoal, pct, summarise } from "@/lib/goals"
import { has } from "@/lib/rbac"
import { wholeTeam } from "@/lib/selectors"
import type { Goal } from "@/lib/types"

export default function GoalsPage() {
  const store = useStore()
  const { viewer, goals, employees } = store
  const ctx = { viewer, employees }

  const [tab, setTab] = React.useState("mine")
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)

  const visible = goals.filter((g) => canViewGoal(g, ctx))
  const mine = visible.filter(
    (g) => g.level === "individual" && g.ownerId === viewer.employeeId
  )
  const reports = new Set(wholeTeam(viewer, employees).map((e) => e.id))
  // HR sees everyone's; a manager sees their own reports'.
  const team = visible.filter(
    (g) =>
      g.level === "individual" &&
      g.ownerId !== viewer.employeeId &&
      (has(viewer, "hr_admin") || (g.ownerId && reports.has(g.ownerId)))
  )
  const teamGoals = visible.filter((g) => g.level === "team")
  const awaiting = visible.filter((g) => canApproveGoal(g, ctx))
  const stats = summarise(
    visible.filter((g) => g.level === "individual"),
    goals,
    store.checkIns,
    TODAY_ISO
  )
  const roots = visible.filter((g) => g.level === "company")

  const list = (items: Goal[], empty: string) =>
    items.length === 0 ? (
      <EmptyState icon={Target} title={empty} />
    ) : (
      <ul className="divide-y">
        {items.map((g) => (
          <GoalRow key={g.id} goal={g} onOpen={setOpenId} />
        ))}
      </ul>
    )

  function Tree({ goal, depth }: { goal: Goal; depth: number }) {
    const kids = visible.filter((c) => c.parentId === goal.id)
    return (
      <>
        <div
          style={{ paddingLeft: depth * 24 }}
          className="border-b last:border-0"
        >
          <ul>
            <GoalRow goal={goal} onOpen={setOpenId} />
          </ul>
        </div>
        {kids.map((k) => (
          <Tree key={k.id} goal={k} depth={depth + 1} />
        ))}
      </>
    )
  }

  return (
    <PageShell
      width="wide"
      crumbs={[{ label: "Workspace", href: "/overview" }, { label: "Goals" }]}
    >
      <PageHeader
        title="Goals"
        description="What each person, team and the company is working towards, and how it is going."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            New goal
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Live goals"
          value={stats.count}
          hint="Individual, in this cycle"
        />
        <StatCard
          label="Average progress"
          value={`${pct(stats.avgProgress)}%`}
        />
        <StatCard
          label="At risk"
          value={stats.atRisk}
          hint="At risk or off track"
        />
        <StatCard
          label="Awaiting approval"
          value={awaiting.length}
          hint={`${stats.stale} without a recent check-in`}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <SegmentedTabs
          className="mb-5"
          tabs={[
            { value: "mine", label: "My goals", count: mine.length },
            {
              value: "team",
              label: "Team",
              count:
                team.length + awaiting.filter((a) => !team.includes(a)).length,
            },
            { value: "company", label: "Company alignment" },
          ]}
          emphasise={awaiting.length ? ["team"] : []}
        />
        <TabsContent value="mine">
          <Panel bodyClassName="p-0">
            {list(mine, "You have no goals yet")}
          </Panel>
        </TabsContent>
        <TabsContent value="team">
          {teamGoals.length > 0 && (
            <Panel title="Team goals" bodyClassName="p-0" className="mb-5">
              {list(teamGoals, "")}
            </Panel>
          )}
          <Panel title="Your reports' goals" bodyClassName="p-0">
            {list(team, "No goals from your reports")}
          </Panel>
        </TabsContent>
        <TabsContent value="company">
          <Panel
            title="How goals line up"
            description="Each goal sits under the one it supports. A goal with no key results of its own shows the average of those beneath it."
            bodyClassName="p-0"
          >
            {roots.length === 0 ? (
              <EmptyState icon={Target} title="No company goals" />
            ) : (
              roots.map((r) => <Tree key={r.id} goal={r} depth={0} />)
            )}
          </Panel>
          {visible.some((g) => g.level !== "company" && !g.parentId) && (
            <Panel
              title="Not aligned to anything"
              bodyClassName="p-0"
              className="mt-5"
            >
              {list(
                visible.filter((g) => g.level !== "company" && !g.parentId),
                ""
              )}
            </Panel>
          )}
        </TabsContent>
      </Tabs>

      <GoalSheet goalId={openId} onClose={() => setOpenId(null)} />
      {creating && (
        <GoalDialog
          onClose={() => setCreating(false)}
          onSaved={(g) => {
            setTab(
              g.level === "individual" && g.ownerId === viewer.employeeId
                ? "mine"
                : tab
            )
            setOpenId(g.id)
          }}
        />
      )}
    </PageShell>
  )
}
