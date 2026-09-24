"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useStore } from "@/lib/store"
import type { AssignmentScope, WorkPattern } from "@/lib/schedules/types"
import { formatDate, fullName } from "@/lib/format"
import { TODAY_ISO } from "@/lib/format"
import type { Employee } from "@/lib/types"

const SCOPE_LABEL: Record<AssignmentScope, string> = {
  employee: "One person",
  department: "A department",
  branch: "A branch",
  company: "Everyone",
}

/**
 * Putting people on a pattern from a date.
 *
 * The assignment is added, never edited over the top of the last one, so
 * the register and the timesheets for earlier dates keep reading against
 * whatever was in force at the time.
 */
export function AssignSheet({
  pattern,
  scope,
  onClose,
}: {
  pattern: WorkPattern
  /** The people this session may assign. */
  scope: Employee[]
  onClose: () => void
}) {
  const store = useStore()
  const [level, setLevel] = React.useState<AssignmentScope>("employee")
  const [target, setTarget] = React.useState("")
  const [effectiveFrom, setEffectiveFrom] = React.useState(TODAY_ISO)
  const [reason, setReason] = React.useState("")

  const departments = [...new Set(scope.map((e) => e.department))].sort()
  const branches = [...new Set(scope.map((e) => e.branch))].sort()

  const valid =
    (level === "company" || target !== "") && reason.trim().length > 3

  const affected = scope.filter((e) =>
    level === "company"
      ? true
      : level === "branch"
        ? e.branch === target
        : level === "department"
          ? e.department === target
          : e.id === target
  )

  function save() {
    store.assignPattern({
      patternId: pattern.id,
      scope: level,
      target: level === "company" ? null : target,
      effectiveFrom,
      reason: reason.trim(),
    })
    toast.success(
      `${affected.length} ${affected.length === 1 ? "person" : "people"} on ${pattern.name} from ${formatDate(effectiveFrom)}`
    )
    onClose()
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[520px]"
      >
        <SheetHeader>
          <SheetTitle>Assign {pattern.name}</SheetTitle>
          <SheetDescription>
            An individual assignment beats a department one, a department beats
            a branch, and a branch beats the company default.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div>
            <Label className="mb-1.5 block">Assign to</Label>
            <Select
              value={level}
              onValueChange={(v) => {
                setLevel(v as AssignmentScope)
                setTarget("")
              }}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["employee", "department", "branch", "company"] as const).map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {SCOPE_LABEL[s]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {level !== "company" && (
            <div>
              <Label className="mb-1.5 block">
                {level === "employee"
                  ? "Person"
                  : level === "department"
                    ? "Department"
                    : "Branch"}
              </Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Choose one" />
                </SelectTrigger>
                <SelectContent>
                  {level === "employee"
                    ? scope.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {fullName(e)}
                        </SelectItem>
                      ))
                    : (level === "department" ? departments : branches).map(
                        (t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        )
                      )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="effective" className="mb-1.5 block">
              Effective from
            </Label>
            <Input
              id="effective"
              type="date"
              className="h-9 w-[180px]"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Dates before this keep reading against the pattern in force then.
            </p>
          </div>

          <div>
            <Label htmlFor="reason" className="mb-1.5 block">
              Reason
            </Label>
            <Textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why the hours are changing, for whoever reads this later."
            />
          </div>

          <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <strong className="tabular font-semibold text-foreground">
              {affected.length}
            </strong>{" "}
            {affected.length === 1 ? "person" : "people"} in your scope, unless
            something more specific already covers them.
          </p>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={save}>
            Assign
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
