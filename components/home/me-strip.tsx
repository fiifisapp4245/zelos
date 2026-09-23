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
      className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border bg-card/60 px-4 py-2.5"
    >
      <h2 id="me-strip-heading" className="sr-only">
        You
      </h2>

      <span className="text-sm">
        <span className="text-muted-foreground">
          {clockedIn ? "In since " : "Status "}
        </span>
        <span className="font-medium">
          {clockedIn ? today?.clockIn : "not clocked in"}
        </span>
      </span>

      <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />

      <span className="text-sm">
        <span className="tabular font-medium">{annual}</span>
        <span className="text-muted-foreground"> days annual leave left</span>
      </span>

      {month && (
        <>
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
          <span className="text-sm text-muted-foreground">
            Latest payslip {month} ·{" "}
            <Link
              href="/me/pay"
              className="rounded font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              View
            </Link>
          </span>
        </>
      )}

      <Button
        size="sm"
        variant={clockedIn ? "outline" : "default"}
        className="ml-auto"
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
    </section>
  )
}
