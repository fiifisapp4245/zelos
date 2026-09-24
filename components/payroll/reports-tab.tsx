"use client"

import * as React from "react"
import { BarChart3, CalendarClock, Download, Upload } from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Panel, Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Amount, RevealProvider, RevealToggle } from "@/components/pay/money"
import { usePayroll } from "./use-payroll"
import { useStore } from "@/lib/store"
import { registerCsv } from "@/lib/pay/payments"
import {
  costByDepartment,
  nextFilingDates,
  statutoryFor,
  trends,
} from "@/lib/pay/payslips"
import { money, moneyShort } from "@/lib/pay/money"
import { TODAY_ISO, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

function download(name: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

const MONTH = (period: string) =>
  new Date(`${period}-01T00:00:00`).toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
  })

/**
 * What the run produced, once it has produced it.
 *
 * Everything here is read back out of the runs rather than stored, so a
 * report and the register behind it cannot disagree — and every figure
 * stays inside its own currency, because a trend line that adds cedis
 * to naira is a line that means nothing.
 */
export function ReportsTab() {
  const store = useStore()
  const { runs, groups, groupFor, linesFor } = usePayroll()
  const [groupId, setGroupId] = React.useState("all")
  const [revealed, setRevealed] = React.useState(false)

  const entries = runs
    .filter((r) => groupId === "all" || r.payGroupId === groupId)
    .map((run) => ({ run, lines: linesFor(run).lines }))

  const points = trends(entries)
  const currencies = [...new Set(points.map((p) => p.currency))]

  const stated = entries
    .filter(
      ({ run }) =>
        run.status === "approved" ||
        run.status === "paying" ||
        run.status === "paid"
    )
    .sort((a, b) => b.run.payDate.localeCompare(a.run.payDate))

  const latest = stated[0]
  const departments = latest
    ? costByDepartment(
        latest.lines,
        (id) => store.employeeById(id)?.department ?? "—"
      )
    : []

  return (
    <RevealProvider revealed={revealed}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="h-9 w-[200px]" aria-label="Pay group">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pay groups</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <RevealToggle revealed={revealed} onChange={setRevealed} />
        </div>

        {/* ── Registers ─────────────────────────────────────────── */}
        <Panel
          title="Payroll register"
          description="Every line of a run, as it was approved."
          bodyClassName="p-0"
        >
          {stated.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No approved run to report on"
              description="A register is produced once a run has been signed off."
            />
          ) : (
            <ul className="divide-y">
              {stated.map(({ run, lines }) => {
                const group = groupFor(run.payGroupId)
                return (
                  <li
                    key={run.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {group?.name} · {formatDate(run.periodStart)} –{" "}
                        {formatDate(run.periodEnd)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {lines.length} lines · paid {formatDate(run.payDate)}
                      </span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        download(
                          `register-${run.id}.csv`,
                          registerCsv(lines, store.employees)
                        )
                        toast.success("Register downloaded")
                      }}
                    >
                      <Download className="size-3.5" />
                      Register
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        {/* ── Statutory ─────────────────────────────────────────── */}
        <Panel
          title="Statutory reports"
          description="What each pay group has to file, and who produces it."
          bodyClassName="p-0"
        >
          <ul className="divide-y">
            {groups
              .filter((g) => groupId === "all" || g.id === groupId)
              .map((group) => {
                const pack =
                  store.countryRulePacks.find(
                    (p) => p.country === group.country
                  ) ?? null
                const { reports, external } = statutoryFor(group, pack)
                return (
                  <li key={group.id} className="px-5 py-3.5">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {group.name}
                      {external ? (
                        <Pill tone="neutral">
                          Provided by your local provider
                        </Pill>
                      ) : (
                        <Pill tone="success">
                          Produced by Zelos · {pack?.version}
                        </Pill>
                      )}
                    </p>
                    {external ? (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                          Zelos does not hold the rules for{" "}
                          {group.country === "—" ? "this group" : group.country}
                          , so the returns come from whoever calculates the pay.
                          Upload them here to keep them with the run.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() =>
                            toast("Choose the provider's return to attach it.")
                          }
                        >
                          <Upload className="size-3.5" />
                          Upload a return
                        </Button>
                      </div>
                    ) : (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {reports.map((r) => (
                          <li key={r}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => {
                                download(
                                  `${r.toLowerCase().replace(/\W+/g, "-")}.csv`,
                                  `report,period\n${r},${TODAY_ISO.slice(0, 7)}`
                                )
                                toast.success(`${r} downloaded`)
                              }}
                            >
                              <Download className="size-3.5" />
                              {r}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
          </ul>
        </Panel>

        {/* ── Trends ────────────────────────────────────────────── */}
        {currencies.map((currency) => {
          const series = points.filter((p) => p.currency === currency)
          const peak = Math.max(...series.map((p) => p.gross), 1)
          return (
            <Panel
              key={currency}
              title={`Payroll trend · ${currency}`}
              description="Gross, what came off, what the employer paid on top, and what people took home."
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto px-5 pt-4">
                <div
                  className="flex min-w-[420px] items-end gap-4"
                  role="img"
                  aria-label={`Monthly payroll in ${currency}. ${series
                    .map(
                      (p) =>
                        `${MONTH(p.period)}: gross ${money(p.gross, p.currency)}, net ${money(p.net, p.currency)}`
                    )
                    .join(". ")}`}
                >
                  {series.map((p) => (
                    <div key={p.period} className="flex-1 text-center">
                      <div className="flex h-[140px] items-end justify-center gap-1">
                        <Bar
                          value={p.gross}
                          peak={peak}
                          className="bg-primary/25"
                        />
                        <Bar value={p.net} peak={peak} className="bg-primary" />
                        <Bar
                          value={p.employerContributions}
                          peak={peak}
                          className="bg-info/60"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {MONTH(p.period)}
                      </p>
                    </div>
                  ))}
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <Key className="bg-primary/25" label="Gross" />
                  <Key className="bg-primary" label="Net pay" />
                  <Key className="bg-info/60" label="Employer contributions" />
                </ul>
              </div>

              <div className="mt-4 overflow-x-auto border-t">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Monthly payroll totals in {currency}.
                  </caption>
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      {[
                        "Month",
                        "People",
                        "Gross",
                        "Employee deductions",
                        "Employer contributions",
                        "Net pay",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:pl-5 last:pr-5"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {series.map((p) => (
                      <tr key={p.period}>
                        <td className="py-2.5 pl-5">{MONTH(p.period)}</td>
                        <td className="tabular px-4">{p.headcount}</td>
                        <td className="px-4">
                          <Amount value={p.gross} currency={p.currency} />
                        </td>
                        <td className="px-4 text-muted-foreground">
                          <Amount value={p.deductions} currency={p.currency} />
                        </td>
                        <td className="px-4 text-muted-foreground">
                          <Amount
                            value={p.employerContributions}
                            currency={p.currency}
                          />
                        </td>
                        <td className="px-4 py-2.5 pr-5 font-medium">
                          <Amount value={p.net} currency={p.currency} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )
        })}

        {/* ── Cost by department ────────────────────────────────── */}
        <Panel
          title="Cost by department"
          description={
            latest
              ? `From the ${groupFor(latest.run.payGroupId)?.name} run paid ${formatDate(latest.run.payDate)}.`
              : "No approved run yet."
          }
          bodyClassName="p-0"
        >
          {departments.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Nothing to cost yet"
              description="Department costs are worked out from the most recent approved run."
            />
          ) : (
            <ul className="divide-y">
              {departments.map((row) => {
                const largest = departments[0].total
                return (
                  <li
                    key={`${row.department}-${row.currency}`}
                    className="px-5 py-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">{row.department}</span>
                      <span>
                        <Amount value={row.total} currency={row.currency} />
                        <span className="tabular ml-2 text-xs text-muted-foreground">
                          {row.headcount}{" "}
                          {row.headcount === 1 ? "person" : "people"}
                        </span>
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`${row.department}: ${moneyShort(row.total, row.currency)} of ${moneyShort(largest, row.currency)} at the largest department`}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(row.total / largest) * 100}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        {/* ── Filing deadlines ──────────────────────────────────── */}
        {groups
          .filter((g) => groupId === "all" || g.id === groupId)
          .map((group) => {
            const pack = store.countryRulePacks.find(
              (p) => p.country === group.country
            )
            if (!pack) return null
            const dates = nextFilingDates(pack, TODAY_ISO)
            return (
              <Panel
                key={group.id}
                title={`Filing deadlines · ${group.name}`}
                description="Soonest first, worked out from the country rules."
                bodyClassName="p-0"
              >
                <ul className="divide-y">
                  {dates.map((d) => (
                    <li
                      key={d.name}
                      className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm"
                    >
                      <CalendarClock
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{d.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {d.due}
                        </span>
                      </span>
                      <span className="tabular text-right text-xs">
                        <span className="block">{formatDate(d.nextDue)}</span>
                        <span
                          className={cn(
                            "block",
                            d.daysAway <= 7
                              ? "font-medium text-warning-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          in {d.daysAway} days
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )
          })}
      </div>
    </RevealProvider>
  )
}

function Bar({
  value,
  peak,
  className,
}: {
  value: number
  peak: number
  className: string
}) {
  return (
    <span
      className={cn("w-3 rounded-t", className)}
      style={{ height: `${Math.max(2, (value / peak) * 100)}%` }}
    />
  )
}

function Key({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-sm", className)} aria-hidden />
      {label}
    </li>
  )
}
