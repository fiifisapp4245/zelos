"use client"

import * as React from "react"
import Link from "next/link"
import {
  History,
  Laptop,
  Pencil,
  Plus,
  Undo2,
  UserPlus,
  Archive,
  AlertOctagon,
} from "lucide-react"

import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  PageHeader,
  Panel,
  Pill,
  StatCard,
  type Tone,
} from "@/components/common"
import { RowActions } from "@/components/common/row-actions"
import { FilterSearch } from "@/components/common/filter-bar"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/talent/form"
import {
  AssetDialog,
  AssetHistoryDialog,
  AssignDialog,
  NoteDialog,
  ReturnDialog,
} from "@/components/assets/asset-dialogs"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { formatDate, fullName } from "@/lib/format"
import { KIND_LABEL, STATUS_LABEL } from "@/lib/assets"
import type { Asset, AssetKind } from "@/lib/types"

const TONE: Record<Asset["status"], Tone> = {
  in_stock: "success",
  assigned: "info",
  repair: "warning",
  retired: "neutral",
  lost: "danger",
}

type Dlg =
  | { kind: "add" }
  | {
      kind: "edit" | "assign" | "return" | "lost" | "retire" | "history"
      a: Asset
    }
  | null

export default function AssetsPage() {
  const store = useStore()
  const isHr = has(store.viewer, "hr_admin")
  const [q, setQ] = React.useState("")
  const [status, setStatus] = React.useState<Asset["status"] | "all">("all")
  const [kind, setKind] = React.useState<AssetKind | "all">("all")
  const [dlg, setDlg] = React.useState<Dlg>(null)

  const needle = q.trim().toLowerCase()
  const shown = store.assets.filter((a) => {
    if (status !== "all" && a.status !== status) return false
    if (kind !== "all" && a.kind !== kind) return false
    if (needle) {
      const holder = fullName(store.employeeById(a.assignedTo ?? undefined))
      return `${a.tag} ${a.name} ${a.serial} ${holder}`
        .toLowerCase()
        .includes(needle)
    }
    return true
  })
  const count = (s: Asset["status"]) =>
    store.assets.filter((a) => a.status === s).length

  if (!isHr)
    return (
      <PageShell
        crumbs={[
          { label: "Workspace", href: "/overview" },
          { label: "Assets" },
        ]}
      >
        <Panel>
          <EmptyState
            icon={Laptop}
            title="Assets are managed by HR"
            description="Ask HR if you need something issued, or have something to return."
          />
        </Panel>
      </PageShell>
    )

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "People" },
        { label: "Assets" },
      ]}
    >
      <PageHeader
        title="Company assets"
        description="Laptops, phones, SIMs and cards: what exists, who has it, and what comes back when someone leaves."
        actions={
          <Button size="lg" onClick={() => setDlg({ kind: "add" })}>
            <Plus className="size-4" />
            Add asset
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Assigned"
          value={count("assigned")}
          hint="With someone"
        />
        <StatCard
          label="In stock"
          value={count("in_stock")}
          hint="Ready to issue"
        />
        <StatCard label="In repair" value={count("repair")} />
        <StatCard label="Lost" value={count("lost")} hint="Written off" />
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap gap-2 border-b p-3">
          <div className="min-w-[220px] flex-1">
            <FilterSearch
              value={q}
              onChange={setQ}
              placeholder="Search tag, name, serial or holder"
            />
          </div>
          <NativeSelect
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="h-10 w-auto"
          >
            <option value="all">All statuses</option>
            {(Object.keys(STATUS_LABEL) as Asset["status"][]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Type"
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            className="h-10 w-auto"
          >
            <option value="all">All types</option>
            {(Object.keys(KIND_LABEL) as AssetKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </NativeSelect>
        </div>

        {shown.length === 0 ? (
          <EmptyState icon={Laptop} title="No assets match" />
        ) : (
          <ul className="divide-y">
            {shown.map((a) => {
              const holder = a.assignedTo
                ? store.employeeById(a.assignedTo)
                : undefined
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono text-xs text-muted-foreground">
                        {a.tag}
                      </span>
                      <span className="font-medium">{a.name}</span>
                      <Pill tone="neutral">{KIND_LABEL[a.kind]}</Pill>
                      <Pill tone={TONE[a.status]}>
                        {STATUS_LABEL[a.status]}
                      </Pill>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.serial && `${a.serial} · `}
                      {holder ? (
                        <>
                          With{" "}
                          <Link
                            href={`/employees/${holder.id}`}
                            className="text-foreground hover:underline"
                          >
                            {fullName(holder)}
                          </Link>
                          {a.assignedOn && ` since ${formatDate(a.assignedOn)}`}
                          {[
                            "notice",
                            "resigned",
                            "terminated",
                            "retired",
                          ].includes(holder.lifecycleState) && " · leaving"}
                        </>
                      ) : (
                        STATUS_LABEL[a.status]
                      )}
                    </p>
                  </div>
                  <RowActions
                    label={`Actions for ${a.tag}`}
                    actions={[
                      a.status === "in_stock" && {
                        label: "Assign",
                        icon: UserPlus,
                        onSelect: () => setDlg({ kind: "assign", a }),
                      },
                      a.status === "assigned" && {
                        label: "Take back",
                        icon: Undo2,
                        onSelect: () => setDlg({ kind: "return", a }),
                      },
                      {
                        label: "History",
                        icon: History,
                        onSelect: () => setDlg({ kind: "history", a }),
                      },
                      {
                        label: "Edit",
                        icon: Pencil,
                        onSelect: () => setDlg({ kind: "edit", a }),
                      },
                      a.status === "repair" && {
                        label: "Back in stock",
                        icon: Undo2,
                        onSelect: () => {
                          store.finishRepair(a.id)
                          toast.success("Back in stock.")
                        },
                      },
                      a.status !== "lost" &&
                        a.status !== "retired" && {
                          label: "Mark lost",
                          icon: AlertOctagon,
                          destructive: true,
                          onSelect: () => setDlg({ kind: "lost", a }),
                        },
                      (a.status === "in_stock" || a.status === "repair") && {
                        label: "Retire",
                        icon: Archive,
                        destructive: true,
                        onSelect: () => setDlg({ kind: "retire", a }),
                      },
                    ]}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {dlg?.kind === "add" && <AssetDialog onClose={() => setDlg(null)} />}
      {dlg?.kind === "edit" && (
        <AssetDialog existing={dlg.a} onClose={() => setDlg(null)} />
      )}
      {dlg?.kind === "assign" && (
        <AssignDialog asset={dlg.a} onClose={() => setDlg(null)} />
      )}
      {dlg?.kind === "return" && (
        <ReturnDialog asset={dlg.a} onClose={() => setDlg(null)} />
      )}
      {(dlg?.kind === "lost" || dlg?.kind === "retire") && (
        <NoteDialog
          asset={dlg.a}
          kind={dlg.kind}
          onClose={() => setDlg(null)}
        />
      )}
      {dlg?.kind === "history" && (
        <AssetHistoryDialog asset={dlg.a} onClose={() => setDlg(null)} />
      )}
    </PageShell>
  )
}
