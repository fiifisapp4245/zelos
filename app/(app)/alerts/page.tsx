"use client"

import * as React from "react"
import Link from "next/link"
import { Bell, ExternalLink, Mail, Settings2 } from "lucide-react"
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
import { useStore } from "@/lib/store"
import { openAlertsFor, visibleEmployees } from "@/lib/selectors"
import { RETIREMENT_AGE, daysUntil, formatDate, fullName } from "@/lib/format"
import type { Alert, AlertKind } from "@/lib/types"
import { cn } from "@/lib/utils"

const KIND_LABEL: Record<AlertKind, string> = {
  contract_expiry: "Contract expiry",
  probation_end: "Probation ending",
  document_expiry: "Document expiring",
  retirement: `Reaching ${RETIREMENT_AGE}`,
}

const KIND_BLURB: Record<AlertKind, string> = {
  contract_expiry:
    "Auto-generated 30, 15 and 7 days before a fixed-term contract ends.",
  probation_end:
    "Fires 30 days before probation ends so a confirmation decision can be made.",
  document_expiry:
    "Fires 60 days before a statutory or identity document expires.",
  retirement: `Fires 180 days before an employee reaches ${RETIREMENT_AGE}.`,
}

export default function AlertsPage() {
  const store = useStore()
  const { viewer, employees, alerts } = store
  const scope = visibleEmployees(viewer, employees)
  const scopeIds = new Set(scope.map((e) => e.id))

  const [kind, setKind] = React.useState<AlertKind | "all">("all")

  const inScope = alerts.filter((a) => scopeIds.has(a.employeeId))
  const open = openAlertsFor(viewer, employees, alerts)
  const filtered = kind === "all" ? open : open.filter((a) => a.kind === kind)
  const acknowledged = inScope.filter((a) => a.acknowledged)

  const critical = open.filter((a) => (daysUntil(a.dueOn) ?? 0) <= 7).length
  const thisMonth = open.filter((a) => {
    const d = daysUntil(a.dueOn) ?? 999
    return d > 7 && d <= 30
  }).length
  const overdue = open.filter((a) => (daysUntil(a.dueOn) ?? 0) < 0).length

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Compliance" },
        { label: "Alerts" },
      ]}
    >
      <PageHeader
        title="Compliance alerts"
        description="Generated from dates already in the system — contract ends, probation, document expiry and retirement. Permanent staff with no expiring documents never appear here."
        meta={
          open.length > 0 && (
            <Pill tone="warning">
              <Bell className="size-3" />
              {open.length} open
            </Pill>
          )
        }
        actions={
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={() => toast("Opens alert threshold settings.")}
            >
              <Settings2 className="size-4" />
              Alert settings
            </Button>
            <Button
              size="lg"
              onClick={() =>
                toast("Drafted an email to every affected line manager.")
              }
            >
              <Mail className="size-4" />
              Email line managers
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Overdue"
          value={overdue}
          hint="Deadline already passed"
        />
        <StatCard label="Critical" value={critical} hint="≤ 7 days remaining" />
        <StatCard
          label="This month"
          value={thisMonth}
          hint="8–30 days remaining"
        />
        <StatCard
          label="Acknowledged"
          value={acknowledged.length}
          hint="Decision recorded"
        />
      </div>

      <Timeline alerts={open} />

      <div className="mt-6 mb-4 flex flex-wrap gap-2">
        <Chip active={kind === "all"} onClick={() => setKind("all")}>
          All types
        </Chip>
        {(Object.keys(KIND_LABEL) as AlertKind[]).map((k) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
            {KIND_LABEL[k]}
          </Chip>
        ))}
      </div>

      <Panel
        title={`Open alerts · ${filtered.length}`}
        description="Acknowledge once you have spoken with the line manager and decided to renew, extend or end."
        bodyClassName="p-0"
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nothing open"
            description="Every alert in this category has been acknowledged."
          />
        ) : (
          <ul className="divide-y">
            {filtered.map((a) => (
              <AlertRow key={a.id} alert={a} />
            ))}
          </ul>
        )}
      </Panel>

      {acknowledged.length > 0 && (
        <Panel title="Acknowledged" className="mt-5" bodyClassName="p-0">
          <ul className="divide-y">
            {acknowledged.map((a) => {
              const emp = store.employeeById(a.employeeId)
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 px-5 py-3 opacity-70"
                >
                  {emp && <Initials person={emp} size="sm" />}
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {fullName(emp)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {KIND_LABEL[a.kind]} · {formatDate(a.dueOn)}
                  </span>
                  <Pill tone="success">Acknowledged</Pill>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
    </PageShell>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-primary bg-success-muted font-medium text-primary"
          : "text-muted-foreground hover:border-ring/50 hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function AlertRow({ alert: a }: { alert: Alert }) {
  const store = useStore()
  const emp = store.employeeById(a.employeeId)
  if (!emp) return null
  const d = daysUntil(a.dueOn) ?? 0
  const tone =
    d < 0 ? "danger" : d <= 7 ? "danger" : d <= 15 ? "warning" : "info"

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-4">
      <span
        className={cn(
          "h-12 w-1 shrink-0 rounded-full",
          tone === "danger"
            ? "bg-destructive"
            : tone === "warning"
              ? "bg-warning"
              : "bg-info"
        )}
      />
      <Initials person={emp} size="md" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <Link
            href={`/employees/${emp.id}`}
            className="text-sm font-medium hover:underline"
          >
            {fullName(emp)}
          </Link>
          <Pill tone={tone}>{a.thresholdDays}-day threshold</Pill>
          <span className="font-mono text-[11px] text-muted-foreground">
            {a.ref}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {emp.jobTitle} · {emp.department} · manager{" "}
          {fullName(store.employeeById(emp.managerId))}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {KIND_BLURB[a.kind]}
        </p>
      </div>

      <div className="text-right">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
          {KIND_LABEL[a.kind]}
        </p>
        <p className="tabular text-sm font-medium">{formatDate(a.dueOn)}</p>
        <p
          className={cn(
            "tabular text-xs",
            tone === "danger" ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {d < 0 ? `${Math.abs(d)} days overdue` : `in ${d} days`}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/employees/${emp.id}`}>
            Open record <ExternalLink className="size-3" />
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            store.acknowledgeAlert(a.id)
            toast.success("Acknowledged. Recorded against your name.")
          }}
        >
          Acknowledge
        </Button>
      </div>
    </li>
  )
}

function Timeline({ alerts }: { alerts: Alert[] }) {
  const store = useStore()
  const future = alerts
    .map((a) => ({ alert: a, days: daysUntil(a.dueOn) ?? 0 }))
    .filter((x) => x.days >= 0 && x.days <= 90)

  return (
    <Panel
      title="Next 90 days"
      description="Each marker is a compliance deadline."
      actions={
        <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <Legend className="bg-destructive">≤7 days</Legend>
          <Legend className="bg-warning">≤15 days</Legend>
          <Legend className="bg-info">≤30 days</Legend>
          <Legend className="bg-muted-foreground/50">Later</Legend>
        </span>
      }
    >
      {future.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nothing falls due in the next 90 days.
        </p>
      ) : (
        <div className="relative pt-10 pb-6">
          <div className="absolute top-[52px] right-0 left-0 h-1 rounded-full bg-muted" />
          {[0, 7, 15, 30, 60, 90].map((m) => (
            <div
              key={m}
              className="absolute top-[46px] w-px"
              style={{ left: `${(m / 90) * 100}%` }}
            >
              <span className="block h-3 w-px bg-border" />
              <span className="tabular absolute top-4 -translate-x-1/2 text-[10px] whitespace-nowrap text-muted-foreground">
                {m === 0 ? "Today" : `${m}d`}
              </span>
            </div>
          ))}
          {future.map(({ alert: a, days }, i) => {
            const emp = store.employeeById(a.employeeId)
            const tone =
              days <= 7
                ? "bg-destructive"
                : days <= 15
                  ? "bg-warning"
                  : days <= 30
                    ? "bg-info"
                    : "bg-muted-foreground/50"
            return (
              <div
                key={a.id}
                className="absolute"
                style={{
                  left: `${Math.min(97, (days / 90) * 100)}%`,
                  top: i % 2 === 0 ? 8 : 78,
                }}
              >
                <span className="block -translate-x-1/2 rounded-md border bg-card px-2 py-1 text-[10px] whitespace-nowrap shadow-sm">
                  {emp?.firstName} {emp?.lastName} · {days}d
                </span>
                <span
                  className={cn(
                    "absolute left-1/2 size-2.5 -translate-x-1/2 rounded-full ring-2 ring-card",
                    tone
                  )}
                  style={{ top: i % 2 === 0 ? 40 : -30 }}
                />
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

function Legend({
  className,
  children,
}: {
  className: string
  children: React.ReactNode
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} />
      {children}
    </span>
  )
}
