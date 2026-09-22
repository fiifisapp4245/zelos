"use client"

import Link from "next/link"
import { Info, Pencil, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import { Panel, Pill, Initials, Field, SectionGrid } from "@/components/common"
import { SettingsTable } from "./settings-table"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useStore } from "@/lib/store"
import { isOnStrength } from "@/lib/selectors"
import { fullName } from "@/lib/format"
import type { Block } from "@/lib/data/settings-content"
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

  if (block.kind === "cover") {
    return <CoverBlock rows={block.rows} action={block.action} />
  }

  if (block.kind === "grid") {
    return (
      <Panel title={block.title} description={block.description}>
        <SectionGrid cols={block.columns ?? 2}>
          {block.rows.map(([label, value]) => (
            <Field key={label} label={label} value={value} />
          ))}
        </SectionGrid>
      </Panel>
    )
  }

  if (block.kind === "offices") {
    return <OfficesBlock title={block.title} description={block.description} />
  }

  if (block.kind === "managedTable") {
    return <SettingsTable tableId={block.tableId} />
  }

  return null
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
          <p className="text-sm font-semibold">Xanthan Services Limited</p>
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

/**
 * The company profile: a decorative cover, the logo tile and the handful of
 * facts people actually look for first.
 */
function CoverBlock({
  rows,
  action,
}: {
  rows: [string, string][]
  action?: string
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="relative h-36 overflow-hidden bg-success-muted">
        <svg
          viewBox="0 0 800 160"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 size-full text-primary"
          aria-hidden
        >
          <path
            d="M0 96c90-52 150 34 250 10s130-86 230-70 150 96 240 74v50H0Z"
            fill="currentColor"
            opacity=".16"
          />
          <ellipse
            cx="690"
            cy="34"
            rx="130"
            ry="76"
            fill="currentColor"
            opacity=".2"
          />
          <ellipse
            cx="120"
            cy="-10"
            rx="90"
            ry="60"
            fill="currentColor"
            opacity=".14"
          />
          <path
            d="M150 -20c46 54 6 108 92 150M420 -30c-24 64 44 86 32 172M640 -16c12 56-64 76-30 164"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            opacity=".22"
          />
        </svg>
      </div>

      {/* Positioned so the logo tile sits above the banner, which is relative. */}
      <div className="relative z-10 px-6 pb-6">
        <div className="-mt-12 mb-5 grid size-24 place-items-center rounded-xl border-4 border-card bg-card shadow-sm">
          <span className="grid size-14 place-items-center rounded-lg bg-primary text-xl font-semibold text-primary-foreground">
            X
          </span>
        </div>

        <SectionGrid>
          {rows.map(([label, value]) => (
            <Field key={label} label={label} value={value} />
          ))}
        </SectionGrid>

        {action && (
          <Button
            size="lg"
            className="mt-6"
            onClick={() =>
              toast("Editing the company profile is not wired up yet.")
            }
          >
            {action}
          </Button>
        )}
      </div>
    </section>
  )
}

/**
 * Offices are the branches configured under Organizational structure, so the
 * two screens can never drift apart.
 */
function OfficesBlock({
  title,
  description,
}: {
  title?: string
  description?: string
}) {
  const { branches, employees } = useStore()
  const active = branches.filter((b) => !b.archived)

  return (
    <Panel
      title={title ?? "Offices"}
      description={description}
      bodyClassName="space-y-3 p-4"
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            toast("Add an office from Organizational structure -> Branches.")
          }
        >
          Add office
        </Button>
      }
    >
      {active.map((branch, i) => (
        <div
          key={branch.id}
          className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {/* "Accra HQ" already reads as an office; "Kumasi" does not. */}
                {/office|hq/i.test(branch.name)
                  ? branch.name
                  : `${branch.name} Office`}
              </span>
              {i === 0 && <Pill tone="success">Head office</Pill>}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ghana &bull; {branch.city} &bull; +233 24 ****4567 &bull;{" "}
              {
                employees.filter(
                  (e) => e.branch === branch.name && isOnStrength(e)
                ).length
              }{" "}
              people
            </p>
          </div>
          <Link
            href="/structure"
            aria-label={`Edit ${branch.name}`}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-4" />
          </Link>
          <button
            type="button"
            aria-label={`Remove ${branch.name}`}
            onClick={() =>
              toast("Archive a branch from Organizational structure.")
            }
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
    </Panel>
  )
}
