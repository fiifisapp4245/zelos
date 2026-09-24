"use client"

import * as React from "react"
import Link from "next/link"
import { Lock, ScrollText } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  Panel,
  Pill,
} from "@/components/common"
import { FilterSearch } from "@/components/common/filter-bar"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { formatDateTime, fullName } from "@/lib/format"

export default function AuditPage() {
  const store = useStore()
  const { viewer, auditLog } = store
  const [query, setQuery] = React.useState("")

  if (!has(viewer, "hr_admin")) {
    return (
      <PageShell
        crumbs={[
          { label: "Workspace", href: "/overview" },
          { label: "Audit logs" },
        ]}
      >
        <Panel>
          <EmptyState
            icon={Lock}
            title="The audit log is restricted to HR Admin"
            description="Attribution exists so every edit is answerable to a person. Read access to the whole log is deliberately narrower than write access to individual records."
          />
        </Panel>
      </PageShell>
    )
  }

  const q = query.trim().toLowerCase()
  const entries = auditLog.filter((a) => {
    if (!q) return true
    const person = store.employeeById(a.employeeId)
    const actor = store.employeeById(a.actorId)
    return `${a.action} ${a.field ?? ""} ${fullName(person)} ${fullName(actor)}`
      .toLowerCase()
      .includes(q)
  })

  const purposeAccesses = auditLog.filter((a) => a.purpose).length

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Employee", href: "/employees" },
        { label: "Audit logs" },
      ]}
    >
      <PageHeader
        title="Audit logs"
        description="Immutable and attributed. Every write to an employee record, and every reveal of a sensitive field, lands here."
        meta={
          purposeAccesses > 0 && (
            <Pill tone="info">
              {purposeAccesses} purpose-justified access
              {purposeAccesses === 1 ? "" : "es"} recorded
            </Pill>
          )
        }
      />

      <Panel bodyClassName="p-0">
        <div className="border-b p-3">
          {/* Nothing to facet here — one field over one immutable stream. */}
          <FilterSearch
            value={query}
            onChange={setQuery}
            placeholder="Search by action, field or person"
            className="sm:max-w-none"
          />
        </div>

        {entries.length === 0 ? (
          <EmptyState icon={ScrollText} title={`No entries match “${query}”`} />
        ) : (
          <ul className="divide-y">
            {entries.map((a) => {
              const person = store.employeeById(a.employeeId)
              const actor = store.employeeById(a.actorId)
              return (
                <li key={a.id} className="flex gap-3 px-5 py-3.5">
                  <Initials person={actor ?? "System"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{fullName(actor)}</span>{" "}
                      <span className="text-muted-foreground">
                        {a.action.toLowerCase()}
                      </span>
                      {person && (
                        <>
                          {" for "}
                          <Link
                            href={`/employees/${person.id}`}
                            className="font-medium hover:underline"
                          >
                            {fullName(person)}
                          </Link>
                        </>
                      )}
                      {a.field && (
                        <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                          {a.field}
                        </span>
                      )}
                    </p>
                    {(a.before || a.after) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {a.before && (
                          <span className="line-through">{a.before}</span>
                        )}
                        {a.before && a.after && " → "}
                        {a.after && (
                          <span className="text-foreground">{a.after}</span>
                        )}
                      </p>
                    )}
                    {a.purpose && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs">
                        <Lock className="size-3 text-info" />
                        <span className="text-muted-foreground">
                          Stated purpose: <em>{a.purpose}</em>
                        </span>
                      </p>
                    )}
                  </div>
                  <span className="tabular shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(a.at)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </PageShell>
  )
}
