"use client"

import * as React from "react"
import Link from "next/link"
import { Briefcase, MapPin, Search } from "lucide-react"

import { PublicShell } from "@/components/public/shell"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/talent/form"
import { useStore } from "@/lib/store"
import { TODAY_ISO, formatDate } from "@/lib/format"
import { EMPLOYMENT_TYPE_LABEL } from "@/lib/format"
import { daysLeft, listedRoles } from "@/lib/careers"

export default function CareersPage() {
  const store = useStore()
  const company = store.company.tradingName || store.company.legalName
  const [q, setQ] = React.useState("")
  const [dept, setDept] = React.useState("all")

  const roles = listedRoles(store.requisitions, TODAY_ISO)
  const depts = [...new Set(roles.map((r) => r.department))].sort()
  const needle = q.trim().toLowerCase()
  const shown = roles.filter(
    (r) =>
      (dept === "all" || r.department === dept) &&
      (!needle ||
        `${r.title} ${r.department} ${r.branch}`.toLowerCase().includes(needle))
  )

  return (
    <PublicShell company={company}>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Work with us</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          {company} is growing. Have a look at what is open, and apply in a few
          minutes.
        </p>
      </header>

      {!store.ready ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : roles.length === 0 ? (
        <div className="rounded-xl border p-8 text-center">
          <Briefcase className="mx-auto size-6 text-muted-foreground" />
          <h2 className="mt-3 font-medium">
            There are no open roles right now
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Please check back soon.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search roles"
                placeholder="Search roles"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <NativeSelect
              aria-label="Team"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="w-auto"
            >
              <option value="all">All teams</option>
              {depts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </NativeSelect>
          </div>

          {shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No roles match your search.
            </p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {shown.map((r) => {
                const left = daysLeft(r.careers?.closesOn ?? null, TODAY_ISO)
                return (
                  <li key={r.id}>
                    <Link
                      href={`/careers/${r.id}`}
                      className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{r.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                          <span>{r.department}</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5" />
                            {r.branch}
                          </span>
                          <span>{EMPLOYMENT_TYPE_LABEL[r.employmentType]}</span>
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {left !== null
                          ? `Apply by ${formatDate(r.careers!.closesOn!)}`
                          : "Open"}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </PublicShell>
  )
}
