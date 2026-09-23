"use client"

import * as React from "react"
import Link from "next/link"
import { Lock, Search, SlidersHorizontal } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, Panel } from "@/components/common"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { findSetting } from "@/lib/data/settings"
import {
  SETTINGS_NAV_GROUPS,
  type SettingsNavGroup,
} from "@/lib/nav/settings-nav"
import { cn } from "@/lib/utils"

export default function CompanySettingsPage() {
  const { viewer } = useStore()
  const [query, setQuery] = React.useState("")

  if (!has(viewer, "hr_admin")) {
    return (
      <PageShell crumbs={[{ label: "Company settings" }, { label: "Summary" }]}>
        <Panel>
          <EmptyState
            icon={Lock}
            title="Company settings are restricted"
            description="Only HR Admins and the Company Owner can open this area. It controls how Zelos HR behaves for everyone in the organisation."
          />
        </Panel>
      </PageShell>
    )
  }

  const q = query.trim().toLowerCase()

  // The cards and the rail are the same six groups, so a setting is never
  // filed in two places on one screen.
  const results: SettingsNavGroup[] = q
    ? SETTINGS_NAV_GROUPS.map((g) => {
        if (g.label.toLowerCase().includes(q)) return g
        const items = g.items.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            (blurbFor(i.href)?.toLowerCase().includes(q) ?? false)
        )
        return items.length ? { ...g, items } : null
      }).filter((g): g is SettingsNavGroup => g !== null)
    : SETTINGS_NAV_GROUPS

  const hits = results.reduce((n, g) => n + g.items.length, 0)

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Company settings", href: "/settings" },
        { label: "Summary" },
      ]}
    >
      <div className="border-b pb-6">
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight">
          Company Settings
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
          Configure how Zelos HR works for your whole organization. Only HR
          Admins and the Company Owner can access this area.
        </p>
      </div>

      <div className="py-6">
        <div className="relative max-w-[600px]">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search settings ..."
            aria-label="Search settings"
            className="h-11 w-full rounded-lg border bg-card pr-3 pl-10 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </div>
        {q && (
          <p className="mt-2.5 text-xs text-muted-foreground">
            {hits} setting{hits === 1 ? "" : "s"} across {results.length}{" "}
            {results.length === 1 ? "group" : "groups"}
          </p>
        )}
      </div>

      <div>
        <div className="min-w-0 flex-1">
          {results.length === 0 ? (
            <Panel>
              <EmptyState
                icon={SlidersHorizontal}
                title={`No settings match “${query}”`}
                description="Try a broader term — for example “leave”, “payroll” or “security”."
                action={
                  <Button variant="outline" onClick={() => setQuery("")}>
                    Clear search
                  </Button>
                }
              />
            </Panel>
          ) : (
            <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}

/** The catalogue still carries the one-line description for each screen. */
function blurbFor(href: string) {
  const slug = href.startsWith("/settings/")
    ? href.slice("/settings/".length)
    : null
  return slug ? findSetting(slug)?.item.blurb : undefined
}

function GroupCard({ group }: { group: SettingsNavGroup }) {
  const Icon = group.icon

  return (
    <section className="flex flex-col rounded-xl border bg-card p-5">
      <header className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-success-muted text-primary">
          <Icon className="size-4" />
        </span>
        <h2 className="text-sm font-semibold">{group.label}</h2>
      </header>

      <ul className="mt-4 space-y-1">
        {group.items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              title={blurbFor(item.href)}
              className={cn(
                "-mx-2 block rounded-md px-2 py-1.5 text-sm text-muted-foreground",
                "transition-colors hover:bg-success-muted/60 hover:text-primary",
                "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
