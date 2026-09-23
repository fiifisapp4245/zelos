"use client"

import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { TODAY_ISO } from "@/lib/format"

/**
 * A manager or admin still has a timesheet and a payslip. This is the whole
 * of their self-service, compressed into one quiet row.
 */
export function MeStrip() {
  const store = useStore()
  const { session, attendance, leaveBalances, payslips } = store

  const today = attendance.find(
    (a) => a.employeeId === session.id && a.date === TODAY_ISO
  )
  const clockedIn = Boolean(today?.clockIn && !today?.clockOut)

  const balance = leaveBalances.find((b) => b.employeeId === session.id)
  const annual = balance ? balance.annualEntitlement - balance.annualTaken : 0

  const slip = payslips
    .filter((p) => p.employeeId === session.id)
    .sort((a, b) => b.period.localeCompare(a.period))[0]
  const month = slip
    ? new Date(`${slip.period}-01`).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      })
    : null

  return (
    <section
      aria-labelledby="me-strip-heading"
      className="rounded-xl border bg-card/60 px-4 py-3"
    >
      <h2 id="me-strip-heading" className="sr-only">
        You
      </h2>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
            {clockedIn ? `In since ${today?.clockIn}` : "Not clocked in"}
          </p>
          <p className="tabular text-sm font-medium">
            {annual} days annual leave left
          </p>
        </div>
        <Button
          size="sm"
          variant={clockedIn ? "outline" : "default"}
          onClick={() => {
            if (clockedIn) {
              store.clockOut()
              toast.success("Clocked out")
            } else {
              store.clockIn()
              toast.success("Clocked in")
            }
          }}
        >
          {clockedIn ? "Clock out" : "Clock in"}
        </Button>
      </div>
      {month && (
        <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
          Latest payslip {month} ·{" "}
          <Link
            href="/me/pay"
            className="rounded font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            View
          </Link>
        </p>
      )}
    </section>
  )
}
