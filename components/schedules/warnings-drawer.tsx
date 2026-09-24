"use client"

import Link from "next/link"
import { AlertTriangle, CheckCircle2 } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { EmptyState, Initials, Pill } from "@/components/common"
import { WARNING_LABEL, countByKind } from "@/lib/schedules/warnings"
import type { RosterWarning, Shift, WarningKind } from "@/lib/schedules/types"
import { formatDate, fullName } from "@/lib/format"
import { useStore } from "@/lib/store"

/** The bar above the roster: counts, in words, with a way in. */
export function WarningsBar({
  warnings,
  onReview,
}: {
  warnings: RosterWarning[]
  onReview: () => void
}) {
  const counts = countByKind(warnings)
  const kinds = (Object.keys(counts) as WarningKind[]).filter(
    (k) => counts[k] > 0
  )

  if (kinds.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm">
        <CheckCircle2 className="size-4 text-primary" aria-hidden />
        Nothing flagged on this roster.
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-warning bg-warning-muted px-4 py-2.5">
      <AlertTriangle
        className="size-4 shrink-0 text-warning-foreground"
        aria-hidden
      />
      <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-warning-foreground">
        {kinds.map((k) => (
          <li key={k}>
            <span className="tabular font-semibold">{counts[k]}</span>{" "}
            {WARNING_LABEL[k].toLowerCase()}
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        size="sm"
        className="h-8 bg-card"
        onClick={onReview}
      >
        Review warnings
      </Button>
    </div>
  )
}

/**
 * Every warning in full.
 *
 * None of them blocks anything. They are the roster saying what it is
 * about to commit people to, and the person building it decides.
 */
export function WarningsDrawer({
  warnings,
  shifts,
  onOpenShift,
  onClose,
}: {
  warnings: RosterWarning[]
  shifts: Shift[]
  onOpenShift: (shift: Shift) => void
  onClose: () => void
}) {
  const store = useStore()

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[560px]"
      >
        <SheetHeader>
          <SheetTitle>Roster warnings</SheetTitle>
          <SheetDescription>
            Thresholds come from Settings → Time &amp; attendance. Publishing
            with warnings is allowed once they have been seen.
          </SheetDescription>
        </SheetHeader>

        {warnings.length === 0 ? (
          <div className="px-4">
            <EmptyState
              icon={CheckCircle2}
              title="Nothing flagged"
              description="No leave clashes, no overlaps, nobody over their hours and no open shifts."
            />
          </div>
        ) : (
          <ul className="divide-y border-t">
            {warnings.map((w) => {
              const person = w.employeeId
                ? store.employeeById(w.employeeId)
                : null
              const shift = shifts.find((s) => s.id === w.shiftIds[0])
              return (
                <li key={w.key} className="flex gap-3 px-4 py-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-warning-muted text-warning-foreground">
                    <AlertTriangle className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <Pill tone="warning">
                        <AlertTriangle className="size-3" aria-hidden />
                        {WARNING_LABEL[w.kind]}
                      </Pill>
                      {person ? (
                        <Link
                          href={`/employees/${person.id}`}
                          className="flex items-center gap-1.5 text-sm font-medium hover:underline"
                        >
                          <Initials person={person} size="xs" />
                          {fullName(person)}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium">Open shift</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(w.date)}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {w.detail}
                    </p>
                  </div>
                  {shift && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0"
                      onClick={() => onOpenShift(shift)}
                    >
                      Open shift
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  )
}
