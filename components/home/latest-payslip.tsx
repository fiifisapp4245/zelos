"use client"

import * as React from "react"
import Link from "next/link"
import { Download, Eye, EyeOff } from "lucide-react"
import { Widget, WidgetEmpty } from "./widget"
import { Button } from "@/components/ui/button"
import { downloadPayslip } from "@/components/payroll/my-pay"
import { usePayslips } from "@/components/payroll/use-payslips"
import { useStore } from "@/lib/store"
import { money } from "@/lib/pay/money"
import { formatDate } from "@/lib/format"

/** Net pay is masked until asked for — a payslip is nobody else's business. */
export function LatestPayslip() {
  const store = useStore()
  const [revealed, setRevealed] = React.useState(false)

  // The same payslips the Pay section derives, rather than a second
  // set that could drift from the runs.
  const { payslips } = usePayslips(store.session.id)
  const slip = payslips[0]

  if (!slip) {
    return (
      <Widget title="Latest payslip">
        <WidgetEmpty>No payslips yet.</WidgetEmpty>
      </Widget>
    )
  }

  const month = new Date(`${slip.period}-01T00:00:00`).toLocaleDateString(
    "en-GB",
    {
      month: "long",
      year: "numeric",
    }
  )

  return (
    <Widget
      title="Latest payslip"
      actions={
        <Link
          href="/me/pay"
          className="rounded text-sm font-medium text-primary transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          View all payslips
        </Link>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {month} · paid {formatDate(slip.payDate)}
          </p>
          <p className="mt-1 flex items-center gap-2">
            <span className="tabular text-2xl leading-tight font-semibold">
              {revealed
                ? money(slip.net, slip.currency)
                : `${slip.currency} ••••••`}
            </span>
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-pressed={revealed}
              aria-label={revealed ? "Hide net pay" : "Show net pay"}
              className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {revealed ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </p>
          <p className="text-xs text-muted-foreground">Net pay</p>
        </div>

        <Button
          variant="outline"
          onClick={() => downloadPayslip(slip, store.company.tradingName)}
        >
          <Download className="size-4" />
          Download
        </Button>
      </div>
    </Widget>
  )
}
