"use client"

import * as React from "react"
import Link from "next/link"
import {
  Archive,
  Building2,
  CornerDownRight,
  Lock,
  MapPin,
  Network,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, Initials, Panel, Pill } from "@/components/common"
import { FormDialog } from "@/components/common/form-dialog"
import { RowActions } from "@/components/common/row-actions"
import { useSuccessDialog } from "@/components/common/success-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { isOnStrength } from "@/lib/selectors"
import { fullName } from "@/lib/format"
import type { Branch, Department } from "@/lib/types"
import { cn } from "@/lib/utils"

type Tab = "departments" | "branches" | "archive"

export default function StructurePage() {
  const store = useStore()
  const { viewer, departments, branches } = store
  const { celebrate, dialog } = useSuccessDialog()

  const [tab, setTab] = React.useState<Tab>("departments")
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<string[]>([])
  const [editing, setEditing] = React.useState<Department | "new" | null>(null)
  const [editingBranch, setEditingBranch] = React.useState<
    Branch | "new" | null
  >(null)

  if (!has(viewer, "hr_admin")) {
    return (
      <PageShell
        crumbs={[
          { label: "Workspace", href: "/overview" },
          { label: "Structure" },
        ]}
      >
        <Panel>
          <EmptyState
            icon={Lock}
            title="Organisation structure is HR Admin only"
            description="Departments and branches determine who reports to whom and who can see what, so changing them is restricted."
          />
        </Panel>
      </PageShell>
    )
  }

  const activeDepts = departments.filter((d) => !d.archived)
  const activeBranches = branches.filter((b) => !b.archived)
  const archived = [
    ...departments.filter((d) => d.archived),
    ...branches.filter((b) => b.archived),
  ]

  const q = query.trim().toLowerCase()
  const matches = (name: string) => !q || name.toLowerCase().includes(q)

  // Parents first, each followed by its children, so nesting reads top-down.
  const orderedDepts = activeDepts
    .filter((d) => !d.parentId)
    .flatMap((parent) => [
      parent,
      ...activeDepts.filter((c) => c.parentId === parent.id),
    ])
    .filter((d) => matches(d.name))

  const shownBranches = activeBranches.filter((b) => matches(b.name))

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "departments", label: "Departments", count: activeDepts.length },
    { id: "branches", label: "Branches", count: activeBranches.length },
    { id: "archive", label: "Archive", count: archived.length },
  ]

  const rowCount =
    tab === "departments"
      ? orderedDepts.length
      : tab === "branches"
        ? shownBranches.length
        : archived.length

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Employees", href: "/employees" },
      ]}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-semibold tracking-tight">
            Organisation structure
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Departments and physical locations. Used by attendance, payroll and
            employee assignment.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="lg" asChild>
            <Link href="/org-chart">
              <Network className="size-4" />
              View org chart
            </Link>
          </Button>
          <Button
            size="lg"
            onClick={() =>
              tab === "branches" ? setEditingBranch("new") : setEditing("new")
            }
          >
            <Plus className="size-4" />
            {tab === "branches" ? "Add branch" : "Add department"}
          </Button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id)
                setSelected([])
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors",
                tab === t.id
                  ? "bg-success-muted font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {t.label}
              <span
                className={cn(
                  "tabular rounded-full px-1.5 text-xs",
                  tab === t.id
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[280px] flex-1 sm:max-w-[420px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            aria-label="Search structure"
            className="h-10 w-full rounded-lg border bg-card pr-3 pl-9 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3 text-sm">
          <p className="text-muted-foreground">
            Showing{" "}
            <strong className="tabular text-foreground">{rowCount}</strong>{" "}
            {tab === "branches"
              ? "branches"
              : tab === "archive"
                ? "archived units"
                : "departments"}
            {selected.length > 0 && (
              <span className="ml-2 text-primary">
                · {selected.length} selected
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">Sorted by name · A→Z</p>
        </div>

        {rowCount === 0 ? (
          <EmptyState
            icon={tab === "branches" ? MapPin : Building2}
            title={q ? `Nothing matches “${query}”` : "Nothing here yet"}
            description={
              tab === "archive"
                ? "Archived departments and branches appear here and can be restored."
                : "Add the first one to get started."
            }
          />
        ) : tab === "departments" ? (
          <DepartmentTable
            rows={orderedDepts}
            selected={selected}
            onToggle={(id) =>
              setSelected((s) =>
                s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
              )
            }
            onEdit={setEditing}
          />
        ) : tab === "branches" ? (
          <BranchTable rows={shownBranches} onEdit={setEditingBranch} />
        ) : (
          <ArchiveTable rows={archived} />
        )}

        <div className="flex items-center justify-end gap-1 border-t px-5 py-3 text-sm">
          <button
            type="button"
            disabled
            className="rounded-lg px-3 py-1.5 text-muted-foreground disabled:opacity-40"
          >
            ‹ Previous
          </button>
          <span className="grid size-8 place-items-center rounded-lg border bg-card text-sm font-medium">
            1
          </span>
          <button
            type="button"
            disabled
            className="rounded-lg px-3 py-1.5 text-muted-foreground disabled:opacity-40"
          >
            Next ›
          </button>
        </div>
      </div>

      {editing && (
        <DepartmentDialog
          department={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onCreated={(name) =>
            celebrate({
              title: `${name} created`,
              description:
                "The department is live. Assign a head and start moving people into it.",
              primary: {
                label: "View org chart",
                onSelect: () => toast("Opens the org chart."),
              },
              dismissLabel: "Back to structure",
            })
          }
        />
      )}

      {editingBranch && (
        <BranchDialog
          branch={editingBranch === "new" ? null : editingBranch}
          onClose={() => setEditingBranch(null)}
          onCreated={(name) =>
            celebrate({
              title: `${name} created`,
              description:
                "The branch is live and can now be picked on an employee record.",
              dismissLabel: "Back to structure",
            })
          }
        />
      )}

      {dialog}
    </PageShell>
  )
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
        className
      )}
    >
      {children}
    </th>
  )
}

function DepartmentTable({
  rows,
  selected,
  onToggle,
  onEdit,
}: {
  rows: Department[]
  selected: string[]
  onToggle: (id: string) => void
  onEdit: (d: Department) => void
}) {
  const store = useStore()

  function headcount(name: string) {
    return store.employees.filter(
      (e) => e.department === name && isOnStrength(e)
    ).length
  }

  function archive(d: Department) {
    if (headcount(d.name) > 0) {
      toast.error(`Reassign the people in ${d.name} before archiving it.`)
      return
    }
    store.update(
      "departments",
      store.departments.map((x) =>
        x.id === d.id ? { ...x, archived: true } : x
      )
    )
    toast.success(`${d.name} archived.`)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <Th className="w-10 pl-5" />
            <Th>Department</Th>
            <Th>Parent</Th>
            <Th>Head of department</Th>
            <Th>Employees</Th>
            <Th className="w-16 pr-5 text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((d) => {
            const head = store.employeeById(d.headId)
            const parent = store.departments.find((p) => p.id === d.parentId)
            const n = headcount(d.name)

            return (
              <tr key={d.id} className="transition-colors hover:bg-muted/30">
                <td className="py-3 pl-5">
                  <Checkbox
                    checked={selected.includes(d.id)}
                    onCheckedChange={() => onToggle(d.id)}
                    aria-label={`Select ${d.name}`}
                  />
                </td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2">
                    {parent ? (
                      <CornerDownRight className="ml-3 size-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <Building2 className="size-4 shrink-0 text-primary" />
                    )}
                    <span className="font-medium">{d.name}</span>
                  </span>
                </td>
                <td className="px-3 text-muted-foreground">
                  {parent ? parent.name : "—"}
                </td>
                <td className="px-3">
                  {head ? (
                    <Link
                      href={`/employees/${head.id}`}
                      className="flex items-center gap-2.5"
                    >
                      <Initials person={head} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {fullName(head)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {head.jobTitle}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Not assigned</span>
                  )}
                </td>
                <td className="tabular px-3">
                  {n} {n === 1 ? "person" : "people"}
                </td>
                <td className="py-3 pr-5">
                  <div className="flex justify-end">
                    <RowActions
                      label={`Actions for ${d.name}`}
                      actions={[
                        {
                          label: "Edit department",
                          icon: Pencil,
                          onSelect: () => onEdit(d),
                        },
                        {
                          label: "View people",
                          icon: Users,
                          href: `/employees?department=${encodeURIComponent(d.name)}`,
                        },
                        {
                          label: "Archive",
                          icon: Archive,
                          destructive: true,
                          onSelect: () => archive(d),
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
    </div>
  )
}

function BranchTable({
  rows,
  onEdit,
}: {
  rows: Branch[]
  onEdit: (b: Branch) => void
}) {
  const store = useStore()

  function headcount(name: string) {
    return store.employees.filter((e) => e.branch === name && isOnStrength(e))
      .length
  }

  function archive(b: Branch) {
    if (store.branches.filter((x) => !x.archived).length === 1) {
      toast.error("An organisation must keep at least one active branch.")
      return
    }
    if (headcount(b.name) > 0) {
      toast.error(`Reassign the people at ${b.name} before archiving it.`)
      return
    }
    store.update(
      "branches",
      store.branches.map((x) => (x.id === b.id ? { ...x, archived: true } : x))
    )
    toast.success(`${b.name} archived.`)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <Th className="pl-5">Branch</Th>
            <Th>City</Th>
            <Th>Region</Th>
            <Th>Employees</Th>
            <Th className="w-16 pr-5 text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((b, i) => {
            const n = headcount(b.name)
            return (
              <tr key={b.id} className="transition-colors hover:bg-muted/30">
                <td className="py-3 pl-5">
                  <span className="flex items-center gap-2">
                    <MapPin className="size-4 shrink-0 text-primary" />
                    <span className="font-medium">{b.name}</span>
                    {i === 0 && <Pill tone="success">Primary</Pill>}
                  </span>
                </td>
                <td className="px-3">{b.city}</td>
                <td className="px-3 text-muted-foreground">{b.region}</td>
                <td className="tabular px-3">
                  {n} {n === 1 ? "person" : "people"}
                </td>
                <td className="py-3 pr-5">
                  <div className="flex justify-end">
                    <RowActions
                      label={`Actions for ${b.name}`}
                      actions={[
                        {
                          label: "Edit branch",
                          icon: Pencil,
                          onSelect: () => onEdit(b),
                        },
                        {
                          label: "Archive",
                          icon: Archive,
                          destructive: true,
                          onSelect: () => archive(b),
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
    </div>
  )
}

function ArchiveTable({ rows }: { rows: (Department | Branch)[] }) {
  const store = useStore()

  function restore(unit: Department | Branch) {
    const isDept = "headId" in unit
    if (isDept) {
      store.update(
        "departments",
        store.departments.map((x) =>
          x.id === unit.id ? { ...x, archived: false } : x
        )
      )
    } else {
      store.update(
        "branches",
        store.branches.map((x) =>
          x.id === unit.id ? { ...x, archived: false } : x
        )
      )
    }
    toast.success(`${unit.name} restored.`)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <Th className="pl-5">Name</Th>
            <Th>Type</Th>
            <Th className="w-16 pr-5 text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((unit) => {
            const isDept = "headId" in unit
            return (
              <tr key={unit.id} className="transition-colors hover:bg-muted/30">
                <td className="py-3 pl-5">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {isDept ? (
                      <Building2 className="size-4 shrink-0" />
                    ) : (
                      <MapPin className="size-4 shrink-0" />
                    )}
                    <span className="font-medium">{unit.name}</span>
                  </span>
                </td>
                <td className="px-3">
                  <Pill tone="neutral">{isDept ? "Department" : "Branch"}</Pill>
                </td>
                <td className="py-3 pr-5">
                  <div className="flex justify-end">
                    <RowActions
                      label={`Actions for ${unit.name}`}
                      actions={[
                        {
                          label: "Restore",
                          icon: RotateCcw,
                          onSelect: () => restore(unit),
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
    </div>
  )
}

/** Mounted only while open, so the form seeds fresh each time. */
function DepartmentDialog({
  department,
  onClose,
  onCreated,
}: {
  department: Department | null
  onClose: () => void
  onCreated: (name: string) => void
}) {
  const store = useStore()
  const isNew = department === null
  const [name, setName] = React.useState(department?.name ?? "")
  const [parentId, setParentId] = React.useState(department?.parentId ?? "")
  const [headId, setHeadId] = React.useState(department?.headId ?? "")
  const [branchId, setBranchId] = React.useState(
    department?.branchId ?? "accra"
  )

  const parents = store.departments.filter(
    (d) => !d.archived && !d.parentId && d.id !== department?.id
  )

  function save() {
    if (!name.trim()) {
      toast.error("Give the department a name.")
      return
    }
    if (isNew) {
      store.update("departments", [
        ...store.departments,
        {
          id: name.toLowerCase().replace(/[^a-z]+/g, "-"),
          name: name.trim(),
          headId: headId || null,
          parentId: parentId || null,
          branchId,
          archived: false,
        },
      ])
      onClose()
      onCreated(name.trim())
      return
    }
    store.update(
      "departments",
      store.departments.map((d) =>
        d.id === department.id
          ? {
              ...d,
              name: name.trim(),
              headId: headId || null,
              parentId: parentId || null,
              branchId,
            }
          : d
      )
    )
    toast.success(`${name.trim()} updated.`)
    onClose()
  }

  return (
    <FormDialog
      onClose={onClose}
      title={isNew ? "Add department" : `Edit ${department.name}`}
      description={
        isNew
          ? "Create a new team within the organisation"
          : "Rename it, move it under a parent, or change its head"
      }
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save}>
            {isNew ? "Create department" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label
            htmlFor="dept-name"
            className="mb-1.5 block text-sm font-medium"
          >
            Department name
          </Label>
          <Input
            id="dept-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Frontend Engineering"
            className="h-10"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label
              htmlFor="dept-parent"
              className="mb-1.5 block text-sm font-medium"
            >
              Parent department
            </Label>
            <select
              id="dept-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <option value="">None — top level</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label
              htmlFor="dept-branch"
              className="mb-1.5 block text-sm font-medium"
            >
              Branch
            </Label>
            <select
              id="dept-branch"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              {store.branches
                .filter((b) => !b.archived)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div>
          <Label
            htmlFor="dept-head"
            className="mb-1.5 block text-sm font-medium"
          >
            Head of department
          </Label>
          <select
            id="dept-head"
            value={headId}
            onChange={(e) => setHeadId(e.target.value)}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <option value="">Not assigned</option>
            {store.employees.filter(isOnStrength).map((e) => (
              <option key={e.id} value={e.id}>
                {fullName(e)} — {e.jobTitle}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            The head sees everyone in this department, whether or not they
            report to them directly.
          </p>
        </div>
      </div>
    </FormDialog>
  )
}

const REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Northern",
  "Volta",
  "Bono",
]

/** Mounted only while open, so the form seeds fresh each time. */
function BranchDialog({
  branch,
  onClose,
  onCreated,
}: {
  branch: Branch | null
  onClose: () => void
  onCreated: (name: string) => void
}) {
  const store = useStore()
  const isNew = branch === null
  const [name, setName] = React.useState(branch?.name ?? "")
  const [region, setRegion] = React.useState(branch?.region ?? REGIONS[0])
  const [city, setCity] = React.useState(branch?.city ?? "")
  const [address, setAddress] = React.useState("")
  const [primary, setPrimary] = React.useState(false)

  function save() {
    if (!name.trim()) {
      toast.error("Give the branch a name.")
      return
    }
    if (isNew) {
      store.update("branches", [
        ...store.branches,
        {
          id: name.toLowerCase().replace(/[^a-z]+/g, "-"),
          name: name.trim(),
          city: city.trim() || name.trim(),
          region,
          archived: false,
        },
      ])
      onClose()
      onCreated(name.trim())
      return
    }
    store.update(
      "branches",
      store.branches.map((b) =>
        b.id === branch.id
          ? { ...b, name: name.trim(), city: city.trim() || b.city, region }
          : b
      )
    )
    toast.success(`${name.trim()} updated.`)
    onClose()
  }

  return (
    <FormDialog
      onClose={onClose}
      title={isNew ? "Add branch" : `Edit ${branch.name}`}
      description={
        isNew
          ? "Create a new physical location"
          : "Update this location's details"
      }
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save}>
            {isNew ? "Create branch" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label
            htmlFor="branch-name"
            className="mb-1.5 block text-sm font-medium"
          >
            Branch name
          </Label>
          <Input
            id="branch-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kumasi office"
            className="h-10"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label
              htmlFor="branch-region"
              className="mb-1.5 block text-sm font-medium"
            >
              Region
            </Label>
            <select
              id="branch-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label
              htmlFor="branch-city"
              className="mb-1.5 block text-sm font-medium"
            >
              City
            </Label>
            <Input
              id="branch-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ahodwo"
              className="h-10"
            />
          </div>
        </div>

        <div>
          <Label
            htmlFor="branch-address"
            className="mb-1.5 block text-sm font-medium"
          >
            Physical address
          </Label>
          <textarea
            id="branch-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            placeholder="House 14, Adum, Kumasi"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="branch-primary"
            checked={primary}
            onCheckedChange={setPrimary}
          />
          <Label htmlFor="branch-primary" className="text-sm font-medium">
            Set as primary location
          </Label>
        </div>
      </div>
    </FormDialog>
  )
}
