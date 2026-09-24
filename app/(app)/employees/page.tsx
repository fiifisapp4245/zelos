"use client"

import * as React from "react"
import Link from "next/link"
import {
  Download,
  Eye,
  Pencil,
  RefreshCw,
  ListFilter,
  Search,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  Pill,
  ViewToggle,
  type ListView,
} from "@/components/common"
import { RowActions } from "@/components/common/row-actions"
import { FilterMenu } from "@/components/common/filter-bar"
import { LifecycleBadge } from "@/components/common/status"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useStore } from "@/lib/store"
import { canChangeLifecycle, canEditRecord, has } from "@/lib/rbac"
import { isOnStrength, visibleEmployees } from "@/lib/selectors"
import {
  EMPLOYMENT_TYPE_LABEL,
  LIFECYCLE_LABEL,
  daysUntil,
  formatDate,
  fullName,
} from "@/lib/format"
import type { Employee, EmploymentType, LifecycleState } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ChangeStatusDialog } from "@/components/employees/change-status-dialog"
import { EditRecordDialog } from "./[id]/edit-record-dialog"

type SortKey = "name" | "department" | "startDate" | "status"

export default function DirectoryPage() {
  const store = useStore()
  const { viewer, employees } = store

  const [query, setQuery] = React.useState("")
  const [states, setStates] = React.useState<LifecycleState[]>([])
  const [departments, setDepartments] = React.useState<string[]>([])
  const [types, setTypes] = React.useState<EmploymentType[]>([])
  const [contractOnly, setContractOnly] = React.useState(false)
  const [view, setView] = React.useState<ListView>("table")
  const [sort, setSort] = React.useState<SortKey>("name")

  const scope = React.useMemo(
    () => visibleEmployees(viewer, employees),
    [viewer, employees]
  )
  const allDepartments = React.useMemo(
    () => [...new Set(scope.map((e) => e.department))].sort(),
    [scope]
  )

  const q = query.trim().toLowerCase()
  // The spec requires at least 3 characters before search narrows the list.
  const searchActive = q.length >= 3

  const filtered = React.useMemo(() => {
    const rows = scope.filter((e) => {
      if (searchActive) {
        const hay =
          `${fullName(e)} ${e.employeeId} ${e.jobTitle} ${e.email}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (states.length && !states.includes(e.lifecycleState)) return false
      if (departments.length && !departments.includes(e.department))
        return false
      if (types.length && !types.includes(e.employmentType)) return false
      if (contractOnly && e.contractType !== "fixed_term") return false
      return true
    })

    return rows.sort((a, b) => {
      if (sort === "department") return a.department.localeCompare(b.department)
      if (sort === "startDate") return a.startDate.localeCompare(b.startDate)
      if (sort === "status")
        return a.lifecycleState.localeCompare(b.lifecycleState)
      return fullName(a).localeCompare(fullName(b))
    })
  }, [scope, q, searchActive, states, departments, types, contractOnly, sort])

  const activeFilterCount =
    states.length + departments.length + types.length + (contractOnly ? 1 : 0)

  function clearFilters() {
    setStates([])
    setDepartments([])
    setTypes([])
    setContractOnly(false)
  }

  const expiring = scope.filter(
    (e) => e.contractEndDate && (daysUntil(e.contractEndDate) ?? 999) <= 90
  ).length

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Employees" },
      ]}
    >
      <PageHeader
        title="Employees"
        description={
          <span className="tabular">
            {scope.length} people · {scope.filter(isOnStrength).length} on
            strength · {expiring} contracts expiring
          </span>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                toast("Export queued — CSV will download when ready.")
              }
            >
              <Download className="size-4" />
              Export
            </Button>
            {has(viewer, "hr_admin") && (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() =>
                    toast("Bulk import accepts the Zelos CSV template.")
                  }
                >
                  <Upload className="size-4" />
                  Import
                </Button>
                <Button size="lg" asChild>
                  <Link href="/employees/new">
                    <UserPlus className="size-4" />
                    Add employee
                  </Link>
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, ID, job title… (min. 3 chars)"
              className="h-10 w-full rounded-lg border bg-background pr-3 pl-9 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            />
          </div>

          <ViewToggle view={view} onChange={setView} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg">
                <ListFilter className="size-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(v) => setSort(v as SortKey)}
              >
                <DropdownMenuRadioItem value="name">
                  Name · A→Z
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="department">
                  Department
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="startDate">
                  Start date
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="status">
                  Status
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
          <span className="mr-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Filters
          </span>

          <FilterMenu
            label="Status"
            options={(Object.keys(LIFECYCLE_LABEL) as LifecycleState[]).map(
              (s) => ({
                value: s,
                label: LIFECYCLE_LABEL[s],
              })
            )}
            selected={states}
            onToggle={(v) =>
              setStates((s) =>
                s.includes(v as LifecycleState)
                  ? s.filter((x) => x !== v)
                  : [...s, v as LifecycleState]
              )
            }
          />
          <FilterMenu
            label="Department"
            options={allDepartments.map((d) => ({ value: d, label: d }))}
            selected={departments}
            onToggle={(v) =>
              setDepartments((s) =>
                s.includes(v) ? s.filter((x) => x !== v) : [...s, v]
              )
            }
          />
          <FilterMenu
            label="Employment type"
            options={(
              Object.keys(EMPLOYMENT_TYPE_LABEL) as EmploymentType[]
            ).map((t) => ({
              value: t,
              label: EMPLOYMENT_TYPE_LABEL[t],
            }))}
            selected={types}
            onToggle={(v) =>
              setTypes((s) =>
                s.includes(v as EmploymentType)
                  ? s.filter((x) => x !== v)
                  : [...s, v as EmploymentType]
              )
            }
          />
          <button
            type="button"
            onClick={() => setContractOnly((v) => !v)}
            className={cn(
              "rounded-full border border-dashed px-3 py-1.5 text-xs transition-colors",
              contractOnly
                ? "border-primary bg-success-muted font-medium text-primary"
                : "text-muted-foreground hover:border-ring/50 hover:text-foreground"
            )}
          >
            + Fixed-term only
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3.5" />
              Clear filters
            </button>
          )}
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 border-b px-3 py-2.5">
            {states.map((s) => (
              <Chip
                key={s}
                onRemove={() => setStates((x) => x.filter((v) => v !== s))}
              >
                Status: {LIFECYCLE_LABEL[s]}
              </Chip>
            ))}
            {departments.map((d) => (
              <Chip
                key={d}
                onRemove={() => setDepartments((x) => x.filter((v) => v !== d))}
              >
                Department: {d}
              </Chip>
            ))}
            {types.map((t) => (
              <Chip
                key={t}
                onRemove={() => setTypes((x) => x.filter((v) => v !== t))}
              >
                Type: {EMPLOYMENT_TYPE_LABEL[t]}
              </Chip>
            ))}
            {contractOnly && (
              <Chip onRemove={() => setContractOnly(false)}>
                Contract: Fixed-term
              </Chip>
            )}
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-3 text-sm">
          <p className="text-muted-foreground">
            Showing{" "}
            <strong className="tabular text-foreground">
              {filtered.length}
            </strong>{" "}
            of <span className="tabular">{scope.length}</span> employees
          </p>
          <p className="text-xs text-muted-foreground">
            Sorted by {sort === "startDate" ? "start date" : sort}
          </p>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              searchActive
                ? `No results for “${query}”`
                : "No employees match these filters"
            }
            description="Try a different search term, or clear the filters to see everyone in your scope."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("")
                  clearFilters()
                }}
              >
                Clear search and filters
              </Button>
            }
          />
        ) : view === "table" ? (
          <DirectoryTable rows={filtered} />
        ) : (
          <DirectoryGrid rows={filtered} />
        )}
      </div>
    </PageShell>
  )
}

function Chip({
  children,
  onRemove,
}: {
  children: React.ReactNode
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-muted px-2.5 py-1 text-xs font-medium text-primary">
      {children}
      <button type="button" onClick={onRemove} aria-label="Remove filter">
        <X className="size-3" />
      </button>
    </span>
  )
}

function DirectoryTable({ rows }: { rows: Employee[] }) {
  const store = useStore()
  const { viewer } = store
  const [editing, setEditing] = React.useState<string | null>(null)
  const [changingStatus, setChangingStatus] = React.useState<string | null>(
    null
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y bg-muted/40 text-left">
            <Th className="pl-5">Employee</Th>
            <Th>Employee ID</Th>
            <Th>Department</Th>
            <Th>Type</Th>
            <Th>Manager</Th>
            <Th>Contract</Th>
            <Th>Status</Th>
            <Th className="w-16 pr-5 text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((e) => {
            const endsIn = daysUntil(e.contractEndDate)
            return (
              <tr key={e.id} className="transition-colors hover:bg-muted/40">
                <td className="py-3 pl-5">
                  <Link
                    href={`/employees/${e.id}`}
                    className="flex items-center gap-3"
                  >
                    <Initials person={e} size="md" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {fullName(e)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {e.jobTitle}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 font-mono text-xs text-muted-foreground">
                  {e.employeeId}
                </td>
                <td className="px-3">{e.department}</td>
                <td className="px-3">
                  <Pill tone="neutral">
                    {EMPLOYMENT_TYPE_LABEL[e.employmentType]}
                  </Pill>
                </td>
                <td className="px-3 text-muted-foreground">
                  {e.managerId
                    ? fullName(store.employeeById(e.managerId))
                    : "—"}
                  {e.dottedLineManagerId && (
                    <span className="block text-xs text-muted-foreground/70">
                      ⋯ {fullName(store.employeeById(e.dottedLineManagerId))}
                    </span>
                  )}
                </td>
                <td className="px-3">
                  {e.contractEndDate ? (
                    <span
                      className={cn(
                        "tabular text-xs",
                        endsIn !== null && endsIn <= 30
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                      )}
                    >
                      ends {formatDate(e.contractEndDate)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Permanent
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <LifecycleBadge state={e.lifecycleState} />
                </td>
                <td className="py-3 pr-5">
                  <div className="flex justify-end">
                    <RowActions
                      label={`Actions for ${fullName(e)}`}
                      actions={[
                        {
                          label: "View record",
                          icon: Eye,
                          href: `/employees/${e.id}`,
                        },
                        canEditRecord(viewer, e) && {
                          label: "Edit details",
                          icon: Pencil,
                          onSelect: () => setEditing(e.id),
                        },
                        canChangeLifecycle(viewer) && {
                          label: "Change status",
                          icon: RefreshCw,
                          onSelect: () => setChangingStatus(e.id),
                        },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {editing && (
        <EditRecordDialog
          employeeId={editing}
          open
          onOpenChange={() => setEditing(null)}
        />
      )}
      {changingStatus && (
        <ChangeStatusDialog
          employeeId={changingStatus}
          open
          onOpenChange={() => setChangingStatus(null)}
        />
      )}
    </div>
  )
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
        className
      )}
    >
      {children}
    </th>
  )
}

function DirectoryGrid({ rows }: { rows: Employee[] }) {
  const store = useStore()
  return (
    <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((e) => (
        <Link
          key={e.id}
          href={`/employees/${e.id}`}
          className="rounded-xl border p-4 transition-colors hover:border-ring/50 hover:bg-muted/30"
        >
          <div className="flex items-start gap-3">
            <Initials person={e} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{fullName(e)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {e.jobTitle}
              </p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/80">
                {e.employeeId}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <LifecycleBadge state={e.lifecycleState} />
            <Pill tone="neutral">{e.department}</Pill>
          </div>
          <p className="mt-3 truncate text-xs text-muted-foreground">
            Reports to{" "}
            {e.managerId ? fullName(store.employeeById(e.managerId)) : "—"}
          </p>
        </Link>
      ))}
    </div>
  )
}
