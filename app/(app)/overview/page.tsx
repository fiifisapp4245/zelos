"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"

import { PageShell } from "@/components/shell/page-shell"
import { QuickActions } from "@/components/home/quick-actions"
import { HomeSkeleton } from "@/components/home/skeletons"
import { Celebrations } from "@/components/home/celebrations"
import { LatestPayslip } from "@/components/home/latest-payslip"
import { LeaveBalances } from "@/components/home/leave-balances"
import { MeStrip } from "@/components/home/me-strip"
import { MyDay } from "@/components/home/my-day"
import { MyRequests } from "@/components/home/my-requests"
import { NeedsApproval } from "@/components/home/needs-approval"
import { NeedsAttention } from "@/components/home/needs-attention"
import { PayActions } from "@/components/home/pay-actions"
import { ProfileCompletion } from "@/components/home/profile-completion"
import { TeamToday } from "@/components/home/team-today"
import { Today } from "@/components/home/today"
import { Upcoming } from "@/components/home/upcoming"
import { WorkforceSnapshot } from "@/components/home/workforce-snapshot"
import { StoreContext, useStore } from "@/lib/store"
import { getHomeForUser } from "@/lib/home/get-home-for-user"
import type {
  HomeWidgetConfig,
  WidgetKey,
  WidgetScope,
} from "@/lib/home/home-config"
import { TODAY_ISO } from "@/lib/format"
import { cn } from "@/lib/utils"

type WidgetProps = { scope?: WidgetScope }

/**
 * Widget keys become components here and nowhere else, which is what keeps
 * homeConfig and getHomeForUser free of React.
 */
const widgetRegistry: Record<WidgetKey, React.ComponentType<WidgetProps>> = {
  needsApproval: NeedsApproval,
  needsAttention: NeedsAttention,
  workforceSnapshot: WorkforceSnapshot,
  teamToday: TeamToday,
  myDay: MyDay,
  myRequests: MyRequests,
  leaveBalances: LeaveBalances,
  latestPayslip: LatestPayslip,
  meStrip: MeStrip,
  today: Today,
  upcoming: Upcoming,
  celebrations: Celebrations,
  profileCompletion: ProfileCompletion,
  payActions: PayActions,
}

export default function HomePage() {
  return (
    // useSearchParams needs a suspense boundary to prerender.
    <React.Suspense fallback={null}>
      <Home />
    </React.Suspense>
  )
}

function Home() {
  const { session } = useStore()
  const params = useSearchParams()
  const demo = params.get("demo")

  const layout = getHomeForUser(session)
  const greeting = greetingFor(new Date().getHours())

  // Walk both columns together so each main widget shares a grid row with
  // the rail widget beside it. Grid stretches a row to its tallest cell, so
  // the pair always ends level; the one marked `yields` takes that height
  // rather than setting it.
  const rows = Array.from(
    { length: Math.max(layout.main.length, layout.rail.length) },
    (_, i) => ({ main: layout.main[i], rail: layout.rail[i] })
  )

  return (
    <PageShell width="wide" crumbs={[{ label: "Home" }]}>
      <header className="mb-6">
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight">
          {greeting}, {session.first_name}
        </h1>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          {new Date(TODAY_ISO).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <QuickActions session={session} />
        {layout.header.map((w) => (
          <div key={w.id} className="mt-3">
            <Slot widget={w} />
          </div>
        ))}
      </header>

      {demo === "loading" ? (
        <HomeSkeleton />
      ) : (
        <MaybeEmpty active={demo === "empty"}>
          {/* One grid, not two columns: each row holds a main widget and the
              rail widget beside it, so the pair finishes level. Below lg it
              collapses to a single stacked column. */}
          <div className="grid gap-5 lg:grid-cols-3">
            {rows.map((row, i) => (
              <React.Fragment key={i}>
                {row.main ? (
                  <Slot widget={row.main} span />
                ) : (
                  <span className="hidden lg:col-span-2 lg:block" />
                )}
                {row.rail ? <Slot widget={row.rail} /> : <span />}
              </React.Fragment>
            ))}
          </div>
        </MaybeEmpty>
      )}
    </PageShell>
  )
}

function Slot({ widget, span }: { widget: HomeWidgetConfig; span?: boolean }) {
  const Component = widgetRegistry[widget.widget]
  const cell = span ? "lg:col-span-2" : undefined

  if (!widget.yields) {
    return (
      <div className={cn(cell, "flex flex-col [&>section]:flex-1")}>
        <Component scope={widget.scope} />
      </div>
    )
  }

  // Absolutely positioned content contributes no intrinsic height, which is
  // precisely how this cell takes its size from its partner instead of from
  // its own list. Static below lg, where rows do not exist.
  return (
    <div className={cn(cell, "lg:relative lg:min-h-[200px]")}>
      <div className="lg:absolute lg:inset-0 lg:flex lg:flex-col">
        <Component scope={widget.scope} />
      </div>
    </div>
  )
}

/**
 * `?demo=empty` starves every collection so each widget shows its empty
 * state. Deliberately not surfaced in the UI — it is for demonstrating the
 * page, not part of the product.
 */
function MaybeEmpty({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  const store = useStore()
  const starved = React.useMemo(
    () => ({
      ...store,
      approvals: [],
      alerts: [],
      documents: [],
      leaveRequests: [],
      attendance: [],
      payslips: [],
      actingAssignments: [],
      reviews: [],
      employees: store.employees.filter((e) => e.id === store.session.id),
    }),
    [store]
  )

  if (!active) return <>{children}</>
  return (
    <StoreContext.Provider value={starved}>{children}</StoreContext.Provider>
  )
}

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}
