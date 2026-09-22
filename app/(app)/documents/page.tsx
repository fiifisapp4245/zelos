"use client"

import * as React from "react"
import Link from "next/link"
import { FileText, Search, Upload } from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  Panel,
  StatCard,
} from "@/components/common"
import { DocumentBadge } from "@/components/common/status"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { has, isSelf } from "@/lib/rbac"
import { visibleEmployees } from "@/lib/selectors"
import { DOC_STATUS_LABEL, daysUntil, formatDate, fullName } from "@/lib/format"
import type { DocumentStatus, EmployeeDocument } from "@/lib/types"
import { cn } from "@/lib/utils"

const CATEGORIES: EmployeeDocument["category"][] = [
  "contract",
  "identity",
  "certificate",
  "statutory",
  "medical",
  "other",
]

export default function DocumentsPage() {
  const store = useStore()
  const { viewer, employees, documents } = store
  const scope = visibleEmployees(viewer, employees)
  const scopeIds = new Set(scope.map((e) => e.id))

  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<DocumentStatus | "all">("all")
  const [category, setCategory] = React.useState<
    EmployeeDocument["category"] | "all"
  >("all")

  const canSeeConfidential = has(viewer, "hr_admin")

  const inScope = documents
    .filter((d) => scopeIds.has(d.employeeId))
    .filter((d) => {
      if (!d.confidential) return true
      const emp = store.employeeById(d.employeeId)
      return canSeeConfidential || (emp ? isSelf(viewer, emp) : false)
    })

  const withheld =
    documents.filter((d) => scopeIds.has(d.employeeId)).length - inScope.length

  const q = query.trim().toLowerCase()
  const filtered = inScope.filter((d) => {
    if (status !== "all" && d.status !== status) return false
    if (category !== "all" && d.category !== category) return false
    if (q) {
      const emp = store.employeeById(d.employeeId)
      if (!`${d.name} ${fullName(emp)}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  const expiring = inScope.filter((d) => d.status === "expiring").length
  const expired = inScope.filter((d) => d.status === "expired").length
  const missing = inScope.filter((d) => d.status === "missing").length

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Compliance" },
        { label: "Documents" },
      ]}
    >
      <PageHeader
        title="Document vault"
        description="Contracts, identity, statutory and certification documents. Expiry dates here feed the compliance alerts automatically."
        actions={
          <Button
            size="lg"
            onClick={() =>
              toast("Choose files and the employee to attach them to.")
            }
          >
            <Upload className="size-4" />
            Upload
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="On file"
          value={inScope.length}
          hint="Visible to your role"
        />
        <StatCard
          label="Expiring soon"
          value={expiring}
          hint="Within 60 days"
        />
        <StatCard label="Expired" value={expired} hint="Past their date" />
        <StatCard
          label="Missing"
          value={missing}
          hint="Required but not uploaded"
        />
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by document or person…"
              className="h-10 w-full rounded-lg border bg-background pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            />
          </div>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as DocumentStatus | "all")
            }
            className="h-10 rounded-lg border bg-background px-3 text-sm outline-none"
          >
            <option value="all">All statuses</option>
            {(Object.keys(DOC_STATUS_LABEL) as DocumentStatus[]).map((s) => (
              <option key={s} value={s}>
                {DOC_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) =>
              setCategory(
                e.target.value as EmployeeDocument["category"] | "all"
              )
            }
            className="h-10 rounded-lg border bg-background px-3 text-sm capitalize outline-none"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="capitalize">
                {c}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents match"
            description="Try a different search or clear the filters."
          />
        ) : (
          <ul className="divide-y">
            {filtered.map((d) => {
              const emp = store.employeeById(d.employeeId)
              const expires = daysUntil(d.expiresOn)
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {emp && (
                        <Link
                          href={`/employees/${emp.id}`}
                          className="hover:underline"
                        >
                          {fullName(emp)}
                        </Link>
                      )}{" "}
                      · <span className="capitalize">{d.category}</span> ·{" "}
                      {d.sizeKb} KB
                    </p>
                  </div>
                  {emp && <Initials person={emp} size="xs" />}
                  {d.expiresOn && (
                    <span
                      className={cn(
                        "tabular w-32 shrink-0 text-right text-xs",
                        expires !== null && expires <= 60
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                      )}
                    >
                      {expires !== null && expires < 0
                        ? "expired "
                        : "expires "}
                      {formatDate(d.expiresOn)}
                    </span>
                  )}
                  <DocumentBadge status={d.status} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toast("Download started.")}
                  >
                    Download
                  </Button>
                </li>
              )
            })}
          </ul>
        )}

        {withheld > 0 && (
          <div className="border-t px-5 py-3 text-xs text-muted-foreground">
            {withheld} medical document{withheld === 1 ? "" : "s"} withheld.
            Medical records use purpose-based access — HR must state a reason on
            the employee&apos;s own record, and seniority alone does not grant
            it.
          </div>
        )}
      </Panel>
    </PageShell>
  )
}
