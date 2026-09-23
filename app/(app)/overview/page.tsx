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
  // Only pin the grid to the viewport when something in it can absorb the
  // slack. The employee home is four fixed widgets — bounding it would
  // crush My day rather than make anything line up.
  const bounded = [...layout.main, ...layout.rail].some((w) => w.fills)
  const greeting = greetingFor(new Date().getHours())

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
      </header>

      {demo === "loading" ? (
        <HomeSkeleton />
      ) : (
        <MaybeEmpty active={demo === "empty"}>
          {/* From lg the two columns share one height and finish level: the
              grid is bounded to the viewport and the widgets marked `fills`
              absorb the slack, scrolling inside themselves. The floor stops
              a short window crushing them — below it the page scrolls a
              little rather than the widgets becoming unreadable. Under lg
              this is one ordinary stacked column. */}
          <div
            className={cn(
              "grid gap-5 lg:grid-cols-3",
              bounded && "lg:h-[calc(100dvh-17rem)] lg:min-h-[460px]"
            )}
          >
            <div className="flex flex-col gap-5 lg:col-span-2 lg:min-h-0">
              {layout.main.map((w) => (
                <Slot key={w.id} widget={w} />
              ))}
            </div>
            <div className="flex flex-col gap-5 lg:min-h-0">
              {layout.rail.map((w) => (
                <Slot key={w.id} widget={w} />
              ))}
            </div>
          </div>
        </MaybeEmpty>
      )}
    </PageShell>
  )
}

function Slot({ widget }: { widget: HomeWidgetConfig }) {
  const Component = widgetRegistry[widget.widget]
  return <Component scope={widget.scope} />
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
