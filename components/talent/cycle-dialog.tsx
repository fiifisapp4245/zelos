"use client"

import * as React from "react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormRow } from "./form"
import { useStore } from "@/lib/store"
import { TODAY_ISO } from "@/lib/format"
import { isOnStrength } from "@/lib/selectors"
import { blankReview } from "@/lib/talent/performance"

/** Starts a review cycle for everyone who has been here long enough to be reviewed. */
export function LaunchCycleDialog({
  onClose,
  onLaunched,
}: {
  onClose: () => void
  onLaunched?: (cycle: string, count: number) => void
}) {
  const store = useStore()
  const [cycle, setCycle] = React.useState("H1 2027")
  const [due, setDue] = React.useState("2027-04-15")
  const [touched, setTouched] = React.useState(false)

  const existing = new Set(
    store.reviews
      .filter((r) => r.cycle === cycle.trim())
      .map((r) => r.employeeId)
  )
  // Pre-hires have nothing to review, and a person with no manager has no reviewer.
  const eligible = store.employees.filter(
    (e) =>
      isOnStrength(e) &&
      e.lifecycleState !== "notice" &&
      e.lifecycleState !== "suspended" &&
      e.managerId &&
      !existing.has(e.id)
  )

  const errors = {
    cycle: cycle.trim() ? null : "Name the cycle.",
    due: due > TODAY_ISO ? null : "The due date has to be in the future.",
    none:
      eligible.length > 0
        ? null
        : "Everyone eligible already has a review in this cycle.",
  }

  function launch() {
    setTouched(true)
    if (errors.cycle || errors.due || errors.none) return
    const name = cycle.trim()
    store.addReviews(
      eligible.map((e, i) =>
        blankReview(
          `pr-${name.replace(/\W+/g, "").toLowerCase()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
          e.id,
          e.managerId!,
          name,
          due
        )
      )
    )
    toast.success(
      `${name} launched for ${eligible.length} people. Self reviews are open.`
    )
    onLaunched?.(name, eligible.length)
    onClose()
  }

  return (
    <FormDialog
      title="Launch a review cycle"
      description="Opens a review for everyone eligible and asks each of them for a self review first."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={launch}>
            Launch for {eligible.length}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow
            label="Cycle name"
            htmlFor="cy-name"
            error={touched ? errors.cycle : null}
          >
            <Input
              id="cy-name"
              value={cycle}
              onChange={(e) => setCycle(e.target.value)}
            />
          </FormRow>
          <FormRow
            label="Reviews due"
            htmlFor="cy-due"
            error={touched ? errors.due : null}
          >
            <Input
              id="cy-due"
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </FormRow>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-medium">{eligible.length} people included</p>
          <p className="mt-1 text-muted-foreground">
            Everyone on strength with a manager. Left out: people serving
            notice, suspended, on a pre-hire record, or already reviewed in this
            cycle.
          </p>
          {touched && errors.none && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {errors.none}
            </p>
          )}
        </div>
      </div>
    </FormDialog>
  )
}
