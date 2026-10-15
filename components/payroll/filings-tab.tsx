"use client"

import * as React from "react"
import Link from "next/link"
import { Download, FileCheck } from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Panel, Pill } from "@/components/common"
import { RowActions } from "@/components/common/row-actions"
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
import {
  REMIND_DAYS_BEFORE,
  complianceCalendar,
  periodLabel,
  reportRows,
  toCsv,
  type CalendarRow,
  type FilingStatus,
} from "@/lib/pay/compliance"
import { packFor } from "@/lib/pay/rule-packs"
import { linesForRun } from "@/lib/pay/run-lines"
import { useStore } from "@/lib/store"
import { TODAY_ISO, formatDate, fullName } from "@/lib/format"
import { usePayroll } from "./use-payroll"

/**
 * Every return and remittance the country rules set, per country and
 * period, and what has been done about each. The Payroll Officer's
 * day-to-day work, so it lives with payroll; HR Admin sees the same tab
 * and a summary on Country rules.
 */
export function FilingsTab() {
  const store = useStore()
  const { isApprover, isPreparer } = usePayroll()
  const countries = [
    ...new Set(
      store.payGroups
        .filter((g) => g.calculationMode === "native")
        .map((g) => g.country)
    ),
  ]
    .filter((c) => packFor(store.countryRulePacks, c, TODAY_ISO))
    .sort((a, b) => a.localeCompare(b))

  if (countries.length === 0)
    return (
      <Panel>
        <EmptyState
          icon={FileCheck}
          title="Nothing to file here"
          description="No pay group is calculated by Zelos, so its filings are the local provider's."
        />
      </Panel>
    )

  return (
    <div className="space-y-4">
      {countries.map((c) => (
        <ComplianceCalendar
          key={c}
          country={c}
          canFile={isPreparer || isApprover}
        />
      ))}
      <p className="text-xs text-muted-foreground">
        Deadlines come from each country&rsquo;s rules. Who is reminded is set
        in{" "}
        {isApprover ? (
          <Link
            href="/settings/statutory-settings"
            className="underline underline-offset-2"
          >
            Country rules
          </Link>
        ) : (
          "Country rules, by an HR Admin"
        )}
        .
      </p>
    </div>
  )
}

/**
 * How a country's filings stand, for the summary on Country rules: the
 * calendar itself lives under Payroll.
 */
export function useFilingSummary(country: string) {
  const store = useStore()
  const pack = packFor(store.countryRulePacks, country, TODAY_ISO)
  if (!pack) return null
  const rows = complianceCalendar({
    pack,
    filings: store.filingRecords,
    todayIso: TODAY_ISO,
  })
  return {
    overdue: rows.filter((r) => r.status === "overdue"),
    nextDue: rows.find((r) => r.status === "due") ?? null,
  }
}

const STATUS_PILL: Record<
  FilingStatus,
  { tone: "neutral" | "success" | "danger" | "info"; label: string }
> = {
  due: { tone: "neutral", label: "Due" },
  filed: { tone: "info", label: "Filed" },
  paid: { tone: "success", label: "Paid" },
  overdue: { tone: "danger", label: "Overdue" },
}

/**
 * Every return and remittance the country's rules set, per period, with
 * what the company has done about each. The deadlines come from the pack;
 * the filed and paid records are the company's.
 */
function ComplianceCalendar({
  country,
  canFile,
}: {
  country: string
  canFile: boolean
}) {
  const store = useStore()
  const { source } = usePayroll()
  const pack = packFor(store.countryRulePacks, country, TODAY_ISO)
  const [marking, setMarking] = React.useState<{
    row: CalendarRow
    as: "filed" | "paid"
  } | null>(null)
  const receiptFor = React.useRef<CalendarRow | null>(null)
  const fileInput = React.useRef<HTMLInputElement>(null)
  if (!pack) return null

  const setup = store.countrySetups.find((c) => c.country === country)
  const owner = setup?.filingOwnerId
    ? fullName(store.employeeById(setup.filingOwnerId))
    : null
  const rows = complianceCalendar({
    pack,
    filings: store.filingRecords,
    todayIso: TODAY_ISO,
  })
  const overdue = rows.filter((r) => r.status === "overdue").length

  function download(row: CalendarRow) {
    const groups = store.payGroups.filter(
      (g) => g.country === country && g.calculationMode === "native"
    )
    const runs = store.payrollRuns.filter(
      (r) =>
        r.kind === "regular" &&
        groups.some((g) => g.id === r.payGroupId) &&
        r.periodStart.startsWith(row.period)
    )
    const lines = runs.flatMap((run) =>
      linesForRun(run, source).lines.map((line) => {
        const employee = store.employeeById(line.employeeId)
        return {
          line,
          base:
            line.earnings.find((e) => e.componentId === "pc-base")?.amount ?? 0,
          person: {
            name: fullName(employee),
            tin: employee?.compensation.tin ?? "—",
            ssnitNumber: employee?.compensation.ssnitNumber ?? "—",
          },
        }
      })
    )
    if (lines.length === 0) {
      toast.error(
        `No ${country} run for ${periodLabel(row.period)} yet, so there is nothing to report.`
      )
      return
    }
    const csv = toCsv(reportRows(row.deadline, pack!, lines))
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${row.deadline.id}-${row.period}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Panel
      title={`Filings and remittances · ${country}`}
      description={
        owner
          ? `${owner} files these and is reminded ${REMIND_DAYS_BEFORE} days before each is due.`
          : "Nobody is responsible for filing yet. Choose somebody in your setup above."
      }
      actions={
        overdue > 0 ? (
          <Pill tone="danger">{overdue} overdue · escalated to HR Admin</Pill>
        ) : null
      }
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {["Obligation", "Period", "Due", "Status", "Record", ""].map(
                (h) => (
                  <th
                    key={h}
                    scope="col"
                    className={
                      h === ""
                        ? "sticky-actions px-4 py-2.5 last:pr-5"
                        : "px-4 py-2.5 text-[11px] font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase first:pl-5"
                    }
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const pill = STATUS_PILL[row.status]
              const payee = pack.payees.find(
                (p) => p.id === row.deadline.payeeId
              )
              return (
                <tr key={row.key}>
                  <td className="py-3 pl-5">
                    <span className="font-medium">{row.deadline.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {row.deadline.kind === "return" ? "Return" : "Remittance"}{" "}
                      to {payee?.name ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 whitespace-nowrap">
                    {periodLabel(row.period)}
                  </td>
                  <td className="tabular px-4 whitespace-nowrap">
                    {formatDate(row.dueOn)}
                  </td>
                  <td className="px-4">
                    <Pill tone={pill.tone}>{pill.label}</Pill>
                    {row.escalated ? (
                      <span className="mt-0.5 block text-xs text-destructive">
                        Escalated to HR Admin
                      </span>
                    ) : row.reminded && owner ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {owner} reminded {formatDate(row.remindOn)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 text-xs text-muted-foreground">
                    {row.record?.filed && (
                      <span className="block">
                        Filed {formatDate(row.record.filed.on)} ·{" "}
                        {row.record.filed.ref}
                      </span>
                    )}
                    {row.record?.paid && (
                      <span className="block">
                        Paid {formatDate(row.record.paid.on)} ·{" "}
                        {row.record.paid.ref}
                      </span>
                    )}
                    {row.record?.receiptName && (
                      <span className="block">
                        Receipt: {row.record.receiptName}
                      </span>
                    )}
                    {!row.record && "—"}
                  </td>
                  <td className="sticky-actions py-3 pr-5 pl-2 text-right">
                    <RowActions
                      label={`Actions for ${row.deadline.name}, ${periodLabel(row.period)}`}
                      actions={[
                        Boolean(row.deadline.report) && {
                          label: `Download ${row.deadline.report}`,
                          icon: Download,
                          onSelect: () => download(row),
                        },
                        canFile &&
                          !row.record?.filed && {
                            label: "Mark filed",
                            onSelect: () => setMarking({ row, as: "filed" }),
                          },
                        canFile &&
                          row.deadline.kind === "remittance" &&
                          !row.record?.paid && {
                            label: "Mark paid",
                            onSelect: () => setMarking({ row, as: "paid" }),
                          },
                        canFile && {
                          label: row.record?.receiptName
                            ? "Replace receipt"
                            : "Attach receipt",
                          onSelect: () => {
                            receiptFor.current = row
                            fileInput.current?.click()
                          },
                        },
                      ]}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <input
        ref={fileInput}
        type="file"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          const row = receiptFor.current
          e.target.value = ""
          if (!file || !row) return
          store.recordFiling({
            country,
            deadlineId: row.deadline.id,
            period: row.period,
            receiptName: file.name,
          })
          toast.success(`Receipt attached to ${row.deadline.name}`)
        }}
      />

      {marking && (
        <MarkDialog
          row={marking.row}
          as={marking.as}
          onClose={() => setMarking(null)}
          onSave={(on, ref) => {
            store.recordFiling({
              country,
              deadlineId: marking.row.deadline.id,
              period: marking.row.period,
              [marking.as]: { on, ref, by: store.viewer.employeeId },
            })
            toast.success(`${marking.row.deadline.name} marked ${marking.as}`)
            setMarking(null)
          }}
        />
      )}
    </Panel>
  )
}

function MarkDialog({
  row,
  as,
  onClose,
  onSave,
}: {
  row: CalendarRow
  as: "filed" | "paid"
  onClose: () => void
  onSave: (on: string, ref: string) => void
}) {
  const [on, setOn] = React.useState(TODAY_ISO)
  const [ref, setRef] = React.useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Mark {row.deadline.name} {as}
          </DialogTitle>
          <DialogDescription>
            For {periodLabel(row.period)}, due {formatDate(row.dueOn)}. The
            reference is what the authority gave you, so the record can be
            matched to their acknowledgement.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="mark-on" className="mb-1.5 block">
              Date {as}
            </Label>
            <Input
              id="mark-on"
              type="date"
              value={on}
              max={TODAY_ISO}
              onChange={(e) => setOn(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="mark-ref" className="mb-1.5 block">
              Reference
            </Label>
            <Input
              id="mark-ref"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!on || ref.trim() === ""}
            onClick={() => onSave(on, ref.trim())}
          >
            Mark {as}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
