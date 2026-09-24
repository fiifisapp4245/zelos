"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Initials, Pill } from "@/components/common"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Amount, RevealProvider, RevealToggle } from "@/components/pay/money"
import {
  FLAG_LABEL,
  totalDeductions,
  totalEmployerContributions,
} from "@/lib/pay/payroll"
import { money } from "@/lib/pay/money"
import type { LineItem, PayrollLine, PayrollRun } from "@/lib/pay/types"
import { useStore } from "@/lib/store"
import { formatDateTime, fullName } from "@/lib/format"

/**
 * One person's pay for this period, in full.
 *
 * Everything that made the number is here — what was earned, what came
 * off, what the employer paid on top, and anything a person changed by
 * hand with their reason attached.
 */
export function LineSheet({
  line,
  run,
  canAdjust,
  onClose,
}: {
  line: PayrollLine
  run: PayrollRun
  canAdjust: boolean
  onClose: () => void
}) {
  const store = useStore()
  const [revealed, setRevealed] = React.useState(true)
  const [adjusting, setAdjusting] = React.useState(false)

  const person = store.employeeById(line.employeeId)

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[600px]"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2.5">
            {person && <Initials person={person} size="sm" />}
            {fullName(person)}
          </SheetTitle>
          <SheetDescription>
            {person?.jobTitle} · {person?.department}
          </SheetDescription>
        </SheetHeader>

        <RevealProvider revealed={revealed}>
          <div className="space-y-5 px-4 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex flex-wrap gap-1.5">
                {line.flags.map((f) => (
                  <Pill key={f} tone="warning">
                    {FLAG_LABEL[f]}
                  </Pill>
                ))}
              </span>
              <RevealToggle revealed={revealed} onChange={setRevealed} />
            </div>

            <dl className="grid grid-cols-3 gap-3">
              <Figure
                label="Gross"
                value={line.gross}
                currency={line.currency}
              />
              <Figure
                label="Deductions"
                value={totalDeductions(line)}
                currency={line.currency}
              />
              <Figure label="Net" value={line.net} currency={line.currency} />
            </dl>

            <Group
              title="Earnings"
              items={line.earnings}
              currency={line.currency}
            />
            <Group
              title="Deductions"
              items={line.deductions}
              currency={line.currency}
            />
            {line.employerContributions.length > 0 && (
              <Group
                title={`Employer contributions · ${money(totalEmployerContributions(line), line.currency)}`}
                items={line.employerContributions}
                currency={line.currency}
              />
            )}

            <section>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Adjustments
                </h3>
                {canAdjust && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setAdjusting(true)}
                  >
                    <Plus className="size-3.5" />
                    Add adjustment
                  </Button>
                )}
              </div>
              {line.adjustments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing on this line has been changed by hand.
                </p>
              ) : (
                <ul className="space-y-2">
                  {line.adjustments.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {a.direction === "add" ? "Added" : "Deducted"}{" "}
                          <Amount value={a.amount} currency={line.currency} />
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {fullName(store.employeeById(a.by))} ·{" "}
                          {formatDateTime(a.at)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-muted-foreground">
                        {a.note}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Payment
              </h3>
              <p className="text-sm">
                {line.paymentDestinationMasked ?? (
                  <span className="text-destructive">
                    No account on file. This line cannot be paid until one is
                    added to the employee record.
                  </span>
                )}
              </p>
            </section>

            <section>
              <h3 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Activity
              </h3>
              <ol className="space-y-1.5 border-l pl-3 text-xs">
                {run.events.map((e, i) => (
                  <li key={i}>
                    <span className="font-medium">{e.action}</span> ·{" "}
                    {fullName(store.employeeById(e.by))} ·{" "}
                    {formatDateTime(e.at)}
                    {e.note && (
                      <span className="block text-muted-foreground">
                        {e.note}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </RevealProvider>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>

      {adjusting && (
        <AdjustmentDialog line={line} onClose={() => setAdjusting(false)} />
      )}
    </Sheet>
  )
}

function Figure({
  label,
  value,
  currency,
}: {
  label: string
  value: number
  currency: string
}) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold">
        <Amount value={value} currency={currency} />
      </dd>
    </div>
  )
}

function Group({
  title,
  items,
  currency,
}: {
  title: string
  items: LineItem[]
  currency: string
}) {
  if (items.length === 0) return null
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <ul className="divide-y rounded-lg border">
        {items.map((item, i) => (
          <li
            key={`${item.componentId}-${i}`}
            className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
          >
            <span>{item.label}</span>
            <Amount value={item.amount} currency={currency} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Adding to or taking off one line.
 *
 * The summary beside the form recalculates as you type, so the effect
 * on what the person actually receives is visible before it is saved
 * rather than after.
 */
function AdjustmentDialog({
  line,
  onClose,
}: {
  line: PayrollLine
  onClose: () => void
}) {
  const store = useStore()
  const [category, setCategory] = React.useState("earning")
  const [componentId, setComponentId] = React.useState("pc-bonus")
  const [amount, setAmount] = React.useState("")
  const [direction, setDirection] = React.useState<"add" | "deduct">("add")
  const [note, setNote] = React.useState("")

  const value = Number(amount) || 0
  const newNet = direction === "add" ? line.net + value : line.net - value
  const newGross = direction === "add" ? line.gross + value : line.gross

  const groups: Record<string, string> = {
    earning: "Earnings",
    deduction: "Deductions",
    other: "Everything else",
  }

  const components = store.payComponents.filter((c) =>
    category === "earning"
      ? c.category === "earning" || c.category === "allowance"
      : category === "deduction"
        ? c.category === "deduction"
        : c.category === "benefit_in_kind" ||
          c.category === "employer_contribution"
  )

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>
            Adjust {fullName(store.employeeById(line.employeeId))}&apos;s line
          </DialogTitle>
          <DialogDescription>
            This changes this run only. It does not touch their package, and the
            note stays on the line for good.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-[1fr_260px]">
          <div className="space-y-4">
            <Tabs
              value={category}
              onValueChange={setCategory}
              className="gap-0"
            >
              <SegmentedTabs
                className="mb-3"
                tabs={Object.entries(groups).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              {Object.keys(groups).map((key) => (
                <TabsContent key={key} value={key}>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {components.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setComponentId(c.id)}
                          aria-pressed={componentId === c.id}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                            componentId === c.id
                              ? "border-primary bg-success-muted font-medium text-primary"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              ))}
            </Tabs>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label htmlFor="adj-amount" className="mb-1.5 block">
                  Amount
                </Label>
                <Input
                  id="adj-amount"
                  type="number"
                  min={0}
                  className="h-9 w-[160px]"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">
                  Direction
                </legend>
                <RadioGroup
                  value={direction}
                  onValueChange={(v) => setDirection(v as "add" | "deduct")}
                  className="flex gap-3"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="add" /> Add
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="deduct" /> Deduct
                  </label>
                </RadioGroup>
              </fieldset>
            </div>

            <div>
              <Label htmlFor="adj-note" className="mb-1.5 block">
                Note
              </Label>
              <Textarea
                id="adj-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why this line is being changed. The approver reads this."
              />
            </div>
          </div>

          <aside
            className="rounded-xl border bg-muted/40 p-3"
            aria-live="polite"
          >
            <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              After this adjustment
            </h3>
            <dl className="mt-2 space-y-2 text-sm">
              <Row
                label="Gross"
                before={line.gross}
                after={newGross}
                currency={line.currency}
              />
              <Row
                label="Deductions"
                before={totalDeductions(line)}
                after={
                  direction === "deduct"
                    ? totalDeductions(line) + value
                    : totalDeductions(line)
                }
                currency={line.currency}
              />
              <Row
                label="Net"
                before={line.net}
                after={newNet}
                currency={line.currency}
                strong
              />
            </dl>
            {newNet <= 0 && (
              <p className="mt-2 text-xs text-destructive">
                This takes the line to zero or below. It will be flagged for the
                approver.
              </p>
            )}
          </aside>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={value <= 0 || note.trim().length < 5}
            onClick={() => {
              store.addLineAdjustment({
                runId: line.runId,
                employeeId: line.employeeId,
                componentId,
                amount: value,
                direction,
                note: note.trim(),
              })
              toast.success("Adjustment added and the line recalculated")
              onClose()
            }}
          >
            Add adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({
  label,
  before,
  after,
  currency,
  strong,
}: {
  label: string
  before: number
  after: number
  currency: string
  strong?: boolean
}) {
  const changed = Math.abs(after - before) > 0.005
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold" : ""}>
        {changed && (
          <span className="mr-1.5 text-xs text-muted-foreground line-through">
            {money(before, currency)}
          </span>
        )}
        <span className="tabular">{money(after, currency)}</span>
      </dd>
    </div>
  )
}
