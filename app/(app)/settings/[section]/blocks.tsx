"use client"

import Link from "next/link"
import { Info, Users } from "lucide-react"

import { Panel, Pill, Initials } from "@/components/common"
import { Switch } from "@/components/ui/switch"
import { useStore } from "@/lib/store"
import { isOnStrength } from "@/lib/selectors"
import { fullName } from "@/lib/format"
import type { Block, Cell } from "@/lib/data/settings-content"
import { cn } from "@/lib/utils"

export function SettingBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => (
        <SettingBlock key={i} block={block} />
      ))}
    </div>
  )
}

function SettingBlock({ block }: { block: Block }) {
  if (block.kind === "note") {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-info/30 bg-info-muted px-4 py-3.5">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <div className="min-w-0 text-sm">
          {block.title && <p className="font-medium">{block.title}</p>}
          <p className={cn("text-muted-foreground", block.title && "mt-0.5")}>
            {block.text}
          </p>
        </div>
      </div>
    )
  }

  if (block.kind === "fields") {
    return (
      <Panel
        className="max-w-3xl"
        title={block.title}
        description={block.description}
      >
        <dl className="space-y-2.5 text-sm">
          {block.rows.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-6 border-b pb-2 last:border-0"
            >
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    )
  }

  if (block.kind === "toggles") {
    return (
      <Panel
        className="max-w-3xl"
        title={block.title}
        description={block.description}
      >
        <ul className="space-y-4">
          {block.rows.map((row) => (
            <li
              key={row.label}
              className="flex items-start justify-between gap-6"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{row.label}</p>
                {row.blurb && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.blurb}
                  </p>
                )}
              </div>
              {/* Read-only in the prototype — these show configuration, not controls. */}
              <Switch
                checked={row.on}
                disabled
                aria-readonly
                className="shrink-0"
              />
            </li>
          ))}
        </ul>
      </Panel>
    )
  }

  if (block.kind === "orgTree") {
    return <OrgTreeBlock title={block.title} description={block.description} />
  }

  return (
    <Panel
      title={block.title}
      description={block.description}
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {block.columns.map((c, i) => (
                <th
                  key={c}
                  className={cn(
                    "px-3 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
                    i === 0 && "pl-5",
                    i === block.columns.length - 1 && "pr-5"
                  )}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {block.rows.map((row, r) => (
              <tr key={r} className="transition-colors hover:bg-muted/30">
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className={cn(
                      "px-3 py-2.5 align-top",
                      c === 0 && "pl-5 font-medium",
                      c === row.length - 1 && "pr-5"
                    )}
                  >
                    <CellValue cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.footnote && (
        <p className="border-t px-5 py-3 text-xs text-muted-foreground">
          {block.footnote}
        </p>
      )}
    </Panel>
  )
}

function CellValue({ cell }: { cell: string | Cell }) {
  if (typeof cell === "string") return <>{cell}</>
  if (cell.tone) return <Pill tone={cell.tone}>{cell.text}</Pill>
  return (
    <span
      className={cn(
        cell.mono && "font-mono text-xs",
        cell.muted && "text-muted-foreground"
      )}
    >
      {cell.text}
    </span>
  )
}

/**
 * The organisation drawn as a tree: each department, its head and the branch it
 * reports from. Built from live store data, so it stays true as structure changes.
 */
function OrgTreeBlock({
  title,
  description,
}: {
  title?: string
  description?: string
}) {
  const store = useStore()
  const { departments, branches, employees } = store
  const active = departments.filter((d) => !d.archived)
  const roots = active.filter((d) => !d.parentId)

  function headcount(name: string) {
    return employees.filter((e) => e.department === name && isOnStrength(e))
      .length
  }

  return (
    <Panel
      title={title ?? "Departments"}
      description={
        description ??
        "Departments, their heads and the branch each reports from. Sub-departments are nested beneath their parent."
      }
      bodyClassName="p-5 overflow-x-auto"
    >
      <div className="min-w-[680px]">
        <div className="mx-auto w-fit rounded-xl border-2 border-primary bg-success-muted px-5 py-3 text-center">
          <p className="text-sm font-semibold">AmaliTech Services Limited</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {employees.filter(isOnStrength).length} people ·{" "}
            {branches.filter((b) => !b.archived).length} branches
          </p>
        </div>

        {/* Drop from the company box onto a rail every department hangs from. */}
        <div className="mx-auto h-5 w-px bg-border" />
        <div className="h-px w-full bg-border" />
        <div className="mb-4 flex justify-between">
          {roots.map((d) => (
            <span key={d.id} className="h-4 w-px bg-border" />
          ))}
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roots.map((dept) => {
            const head = store.employeeById(dept.headId)
            const branch = branches.find((b) => b.id === dept.branchId)
            const children = active.filter((d) => d.parentId === dept.id)

            return (
              <li key={dept.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{dept.name}</p>
                  <span className="tabular flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3" />
                    {headcount(dept.name)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {branch?.name ?? "—"}
                </p>

                <div className="mt-3 border-t pt-3">
                  {head ? (
                    <Link
                      href={`/employees/${head.id}`}
                      className="flex items-center gap-2 transition-colors hover:text-primary"
                    >
                      <Initials person={head} size="xs" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium">
                          {fullName(head)}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {head.jobTitle}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No head assigned
                    </p>
                  )}
                </div>

                {children.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-l-2 border-dashed pl-3">
                    {children.map((child) => (
                      <li
                        key={child.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="truncate">{child.name}</span>
                        <span className="tabular shrink-0 text-muted-foreground">
                          {headcount(child.name)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
          <span className="text-xs text-muted-foreground">Branches:</span>
          {branches
            .filter((b) => !b.archived)
            .map((b) => (
              <Pill key={b.id} tone="neutral">
                {b.name} ·{" "}
                {
                  employees.filter(
                    (e) => e.branch === b.name && isOnStrength(e)
                  ).length
                }
              </Pill>
            ))}
          {branches.some((b) => b.archived) && (
            <Pill tone="neutral" className="opacity-60">
              {branches.filter((b) => b.archived).length} archived
            </Pill>
          )}
        </div>
      </div>
    </Panel>
  )
}
