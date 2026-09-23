"use client"

import * as React from "react"
import Link from "next/link"
import { Download, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

import { Widget, WidgetEmpty } from "./widget"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { formatDate, ghs } from "@/lib/format"

/** Net pay is masked until asked for — a payslip is nobody else's business. */
export function LatestPayslip() {
  const store = useStore()
  const [revealed, setRevealed] = React.useState(false)

  const slip = store.payslips
    .filter((p) => p.employeeId === store.session.id)
    .sort((a, b) => b.period.localeCompare(a.period))[0]

  if (!slip) {
    return (
      <Widget title="Latest payslip">
        <WidgetEmpty>No payslips yet.</WidgetEmpty>
      </Widget>
    )
  }

  const month = new Date(`${slip.period}-01`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })

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
            {month} · paid {formatDate(slip.paidOn)}
          </p>
          <p className="mt-1 flex items-center gap-2">
            <span className="tabular text-2xl leading-tight font-semibold">
              {revealed ? ghs(slip.netGhs) : "GHS ••••••"}
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
          onClick={() => toast.success(`${month} payslip downloaded`)}
        >
          <Download className="size-4" />
          Download
        </Button>
      </div>
    </Widget>
  )
}
