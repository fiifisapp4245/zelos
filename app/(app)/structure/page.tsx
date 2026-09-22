"use client"

import * as React from "react"
import Link from "next/link"
import { Archive, Building2, Lock, MapPin, Plus, Users } from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  Panel,
  Pill,
  StatCard,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { isOnStrength } from "@/lib/selectors"
import { fullName } from "@/lib/format"
import type { Branch, Department } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function StructurePage() {
  const store = useStore()
  const { viewer, departments, branches, employees } = store
  const [showArchived, setShowArchived] = React.useState(false)
  const [adding, setAdding] = React.useState<"department" | "branch" | null>(
    null
  )

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

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Organisation" },
        { label: "Structure" },
      ]}
    >
      <PageHeader
        title="Organisation structure"
        description="Departments and branches. A unit cannot be archived while people are still assigned to it — reassign them first."
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm transition-colors",
                showArchived
                  ? "border-primary bg-success-muted text-primary"
                  : "hover:bg-muted"
              )}
            >
              <Archive className="mr-1.5 inline size-4" />
              {showArchived ? "Hide" : "Show"} archived
            </button>
            <Button size="lg" onClick={() => setAdding("department")}>
              <Plus className="size-4" />
              Add department
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Departments"
          value={activeDepts.length}
          icon={Building2}
        />
        <StatCard
          label="Branches"
          value={activeBranches.length}
          icon={MapPin}
        />
        <StatCard
          label="People assigned"
          value={employees.filter(isOnStrength).length}
          icon={Users}
        />
        <StatCard
          label="Archived units"
          value={
            departments.filter((d) => d.archived).length +
            branches.filter((b) => b.archived).length
          }
        />
      </div>

      <Tabs defaultValue="departments">
        <TabsList className="mb-5 h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0">
          {[
            ["departments", "Departments"],
            ["branches", "Branches"],
          ].map(([v, l]) => (
            <TabsTrigger
              key={v}
              value={v}
              className="flex-none rounded-none border-0 border-b-2 border-transparent px-3.5 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              {l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="departments">
          <Panel bodyClassName="p-0">
            <ul className="divide-y">
              {departments
                .filter((d) => showArchived || !d.archived)
                .map((d) => (
                  <DepartmentRow key={d.id} department={d} />
                ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="branches">
          <Panel
            bodyClassName="p-0"
            actions={
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAdding("branch")}
              >
                <Plus className="size-3.5" />
                Add branch
              </Button>
            }
          >
            <ul className="divide-y">
              {branches
                .filter((b) => showArchived || !b.archived)
                .map((b) => (
                  <BranchRow
                    key={b.id}
                    branch={b}
                    activeCount={activeBranches.length}
                  />
                ))}
            </ul>
          </Panel>
        </TabsContent>
      </Tabs>

      {adding && (
        <AddUnitDialog
          key={adding}
          kind={adding}
          onClose={() => setAdding(null)}
        />
      )}
    </PageShell>
  )
}

function DepartmentRow({ department: d }: { department: Department }) {
  const store = useStore()
  const head = store.employeeById(d.headId)
  const members = store.employees.filter(
    (e) => e.department === d.name && isOnStrength(e)
  )
  const parent = store.departments.find((p) => p.id === d.parentId)
  const blocked = members.length > 0

  function archive() {
    if (blocked) {
      toast.error(
        `Reassign ${members.length} employee${members.length === 1 ? "" : "s"} before archiving ${d.name}.`
      )
      return
    }
    store.update(
      "departments",
      store.departments.map((x) =>
        x.id === d.id ? { ...x, archived: !x.archived } : x
      )
    )
    toast.success(`${d.name} ${d.archived ? "restored" : "archived"}.`)
  }

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-3 px-5 py-3.5",
        d.archived && "opacity-60"
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Building2 className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{d.name}</span>
          {parent && <Pill tone="neutral">under {parent.name}</Pill>}
          {d.archived && <Pill tone="neutral">Archived</Pill>}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {head ? (
            <>
              Head:{" "}
              <Link href={`/employees/${head.id}`} className="hover:underline">
                {fullName(head)}
              </Link>
            </>
          ) : (
            "No head assigned"
          )}
        </p>
      </div>

      <div className="flex -space-x-2">
        {members.slice(0, 4).map((m) => (
          <Initials
            key={m.id}
            person={m}
            size="xs"
            className="ring-2 ring-card"
          />
        ))}
        {members.length > 4 && (
          <span className="grid size-6 place-items-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card">
            +{members.length - 4}
          </span>
        )}
      </div>

      <span className="tabular w-20 text-right text-sm text-muted-foreground">
        {members.length} {members.length === 1 ? "person" : "people"}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={archive}
        disabled={blocked && !d.archived}
      >
        {d.archived ? "Restore" : "Archive"}
      </Button>
    </li>
  )
}

function BranchRow({
  branch: b,
  activeCount,
}: {
  branch: Branch
  activeCount: number
}) {
  const store = useStore()
  const members = store.employees.filter(
    (e) => e.branch === b.name && isOnStrength(e)
  )
  const isLast = activeCount === 1 && !b.archived
  const blocked = members.length > 0 || isLast

  function archive() {
    if (isLast) {
      toast.error("An organisation must keep at least one active branch.")
      return
    }
    if (members.length > 0) {
      toast.error(
        `Reassign ${members.length} employee${members.length === 1 ? "" : "s"} before archiving ${b.name}.`
      )
      return
    }
    store.update(
      "branches",
      store.branches.map((x) =>
        x.id === b.id ? { ...x, archived: !x.archived } : x
      )
    )
    toast.success(`${b.name} ${b.archived ? "restored" : "archived"}.`)
  }

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-3 px-5 py-3.5",
        b.archived && "opacity-60"
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <MapPin className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{b.name}</span>
          {b.archived && <Pill tone="neutral">Archived</Pill>}
          {isLast && <Pill tone="warning">Last active branch</Pill>}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {b.city}, {b.region} Region
        </p>
      </div>
      <span className="tabular w-20 text-right text-sm text-muted-foreground">
        {members.length} {members.length === 1 ? "person" : "people"}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={archive}
        disabled={blocked && !b.archived}
      >
        {b.archived ? "Restore" : "Archive"}
      </Button>
    </li>
  )
}

function AddUnitDialog({
  kind,
  onClose,
}: {
  kind: "department" | "branch" | null
  onClose: () => void
}) {
  const store = useStore()
  const [name, setName] = React.useState("")
  const [city, setCity] = React.useState("")
  const [region, setRegion] = React.useState("")

  if (!kind) return null
  const isDept = kind === "department"

  function save() {
    if (!name.trim()) {
      toast.error("Give it a name.")
      return
    }
    const id = name.toLowerCase().replace(/[^a-z]+/g, "-")
    if (isDept) {
      store.update("departments", [
        ...store.departments,
        {
          id,
          name: name.trim(),
          headId: null,
          parentId: null,
          branchId: "accra",
          archived: false,
        },
      ])
    } else {
      store.update("branches", [
        ...store.branches,
        {
          id,
          name: name.trim(),
          city: city.trim() || name.trim(),
          region: region.trim(),
          archived: false,
        },
      ])
    }
    toast.success(`${name.trim()} created.`)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {kind}</DialogTitle>
          <DialogDescription>
            {isDept
              ? "Departments scope what a Head of Department can see."
              : "Branches group people by physical location and can carry their own holiday calendar."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isDept ? "Customer Success" : "Tema"}
              className="h-10"
            />
          </div>
          {!isDept && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label
                  htmlFor="city"
                  className="mb-1.5 block text-sm font-medium"
                >
                  City
                </Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-10"
                />
              </div>
              <div>
                <Label
                  htmlFor="region"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Region
                </Label>
                <Input
                  id="region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Greater Accra"
                  className="h-10"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save}>
            Create {kind}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
