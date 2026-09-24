"use client"

import * as React from "react"
import Link from "next/link"
import { Coins, Plus } from "lucide-react"
import { toast } from "sonner"

import {
  EmptyState,
  Initials,
  Panel,
  Pill,
  type Tone,
} from "@/components/common"
import { RowActions } from "@/components/common/row-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Amount, RevealProvider, RevealToggle } from "@/components/pay/money"
import { useStore } from "@/lib/store"
import { currentVersion } from "@/lib/pay/derive"
import type { OneOffPayment, OneOffStatus } from "@/lib/pay/types"
import { TODAY_ISO, formatDate, fullName } from "@/lib/format"

const STATUS_LABEL: Record<OneOffStatus, string> = {
  upcoming: "Upcoming",
  included: "In the open run",
  paid: "Paid",
  cancelled: "Cancelled",
}

const STATUS_TONE: Record<OneOffStatus, Tone> = {
  upcoming: "info",
  included: "warning",
  paid: "success",
  cancelled: "neutral",
}

/**
 * Pay that sits outside somebody's package: a bonus, an award, a
 * settlement. It is not a compensation change, so it never touches
 * their versions — it rides along on the first run after its date.
 */
export function OneOffsTab({ canEdit }: { canEdit: boolean }) {
  const store = useStore()
  const [adding, setAdding] = React.useState(false)
  const [cancelling, setCancelling] = React.useState<OneOffPayment | null>(null)
  const [revealed, setRevealed] = React.useState(false)

  const rows = [...store.oneOffPayments].sort((a, b) =>
    b.payFromDate.localeCompare(a.payFromDate)
  )

  return (
    <RevealProvider revealed={revealed}>
      <Panel
        description="Added by managers and HR, paid by the first run after the date given."
        bodyClassName="p-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RevealToggle revealed={revealed} onChange={setRevealed} />
            {canEdit && (
              <Button size="sm" className="h-9" onClick={() => setAdding(true)}>
                <Plus className="size-4" />
                Add a payment
              </Button>
            )}
          </div>
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="No one-off payments"
            description="Bonuses, awards and settlements appear here before they are paid, and stay afterwards."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">One-off payments.</caption>
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  {[
                    "Employee",
                    "Component",
                    "Amount",
                    "Basis",
                    "Pay from",
                    "Recurrence",
                    "Status",
                    "In run",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:pl-5 last:pr-5"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((o) => {
                  const person = store.employeeById(o.employeeId)
                  const component = store.payComponents.find(
                    (c) => c.id === o.componentId
                  )
                  const version = currentVersion(
                    store.compensationVersions,
                    o.employeeId,
                    TODAY_ISO
                  )
                  return (
                    <tr
                      key={o.id}
                      className="align-top transition-colors hover:bg-muted/30"
                    >
                      <td className="py-3 pl-5">
                        <span className="flex items-center gap-2.5">
                          {person && <Initials person={person} size="xs" />}
                          <Link
                            href={`/employees/${o.employeeId}?tab=compensation`}
                            className="font-medium hover:underline"
                          >
                            {fullName(person)}
                          </Link>
                        </span>
                        {o.note && (
                          <span className="mt-0.5 block max-w-[320px] text-xs text-muted-foreground">
                            {o.note}
                          </span>
                        )}
                      </td>
                      <td className="px-4 text-muted-foreground">
                        {component?.name ?? o.componentId}
                      </td>
                      <td className="px-4 font-medium">
                        <Amount
                          value={o.amount}
                          currency={version?.currency ?? "GHS"}
                        />
                      </td>
                      <td className="px-4 text-muted-foreground">
                        {o.basis === "gross" ? "Gross" : "Net in hand"}
                      </td>
                      <td className="tabular px-4 text-muted-foreground">
                        {formatDate(o.payFromDate)}
                      </td>
                      <td className="px-4 text-muted-foreground">
                        {o.recurrence === "once"
                          ? "Once"
                          : `Monthly × ${o.months ?? 1}`}
                      </td>
                      <td className="px-4">
                        <Pill tone={STATUS_TONE[o.status]}>
                          {STATUS_LABEL[o.status]}
                        </Pill>
                      </td>
                      <td className="px-4 text-muted-foreground">
                        {o.includedInRunId ? (
                          <Link
                            href={`/pay/payroll/runs/${o.includedInRunId}`}
                            className="hover:underline"
                          >
                            {o.includedInRunId}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 pr-5 text-right">
                        {canEdit &&
                          (o.status === "upcoming" ||
                            o.status === "included") && (
                            <RowActions
                              label={`Actions for ${fullName(person)}'s payment`}
                              actions={[
                                {
                                  label: "Cancel payment",
                                  destructive: true,
                                  onSelect: () => setCancelling(o),
                                },
                              ]}
                            />
                          )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {adding && <AddOneOffSheet onClose={() => setAdding(false)} />}

      {cancelling && (
        <CancelDialog
          payment={cancelling}
          onClose={() => setCancelling(null)}
        />
      )}
    </RevealProvider>
  )
}

function AddOneOffSheet({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const [employeeId, setEmployeeId] = React.useState("")
  const [componentId, setComponentId] = React.useState("pc-bonus")
  const [amount, setAmount] = React.useState("")
  const [basis, setBasis] = React.useState<"gross" | "net">("gross")
  const [payFromDate, setPayFromDate] = React.useState(TODAY_ISO)
  const [recurrence, setRecurrence] = React.useState<"once" | "monthly_for_n">(
    "once"
  )
  const [months, setMonths] = React.useState("3")
  const [note, setNote] = React.useState("")

  const people = store.employees
    .filter(
      (e) =>
        !["pre_hire", "resigned", "terminated", "retired"].includes(
          e.lifecycleState
        )
    )
    .sort((a, b) => a.lastName.localeCompare(b.lastName))

  const valid =
    employeeId !== "" && Number(amount) > 0 && note.trim().length > 4

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[520px]"
      >
        <SheetHeader>
          <SheetTitle>Add a one-off payment</SheetTitle>
          <SheetDescription>
            This does not change anybody&apos;s package. It is paid once by the
            run that follows the date you give.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div>
            <Label className="mb-1.5 block">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Choose someone" />
              </SelectTrigger>
              <SelectContent>
                {people.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {fullName(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block">Component</Label>
            <Select value={componentId} onValueChange={setComponentId}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {store.payComponents
                  .filter((c) => c.category !== "employer_contribution")
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="oo-amount" className="mb-1.5 block">
              Amount
            </Label>
            <Input
              id="oo-amount"
              type="number"
              min={0}
              className="h-9 w-[180px]"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              In the person&apos;s own currency.
            </p>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Basis</legend>
            <RadioGroup
              value={basis}
              onValueChange={(v) => setBasis(v as "gross" | "net")}
              className="space-y-2"
            >
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm">
                <RadioGroupItem value="gross" className="mt-0.5" />
                <span>
                  <span className="block font-medium">Gross</span>
                  <span className="block text-muted-foreground">
                    The figure is what it costs. Tax comes out of it, so the
                    person receives less than this.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm">
                <RadioGroupItem value="net" className="mt-0.5" />
                <span>
                  <span className="block font-medium">Net in hand</span>
                  <span className="block text-muted-foreground">
                    The figure is what the person receives. The run grosses it
                    up and the employer carries the tax.
                  </span>
                </span>
              </label>
            </RadioGroup>
          </fieldset>

          <div>
            <Label htmlFor="oo-date" className="mb-1.5 block">
              Pay from
            </Label>
            <Input
              id="oo-date"
              type="date"
              className="h-9 w-[180px]"
              value={payFromDate}
              onChange={(e) => setPayFromDate(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Included in the first run after this date.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="mb-1.5 block">Recurrence</Label>
              <Select
                value={recurrence}
                onValueChange={(v) =>
                  setRecurrence(v as "once" | "monthly_for_n")
                }
              >
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once</SelectItem>
                  <SelectItem value="monthly_for_n">
                    Monthly, for a set number of months
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {recurrence === "monthly_for_n" && (
              <div>
                <Label htmlFor="oo-months" className="mb-1.5 block">
                  Months
                </Label>
                <Input
                  id="oo-months"
                  type="number"
                  min={1}
                  className="h-9 w-[100px]"
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="oo-note" className="mb-1.5 block">
              Note
            </Label>
            <Textarea
              id="oo-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What it is for. This stays on the payment."
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              store.addOneOffPayment({
                employeeId,
                componentId,
                amount: Number(amount),
                basis,
                payFromDate,
                recurrence,
                ...(recurrence === "monthly_for_n"
                  ? { months: Number(months) }
                  : {}),
                note: note.trim(),
              })
              toast.success(
                "Payment added; it joins the next run after that date"
              )
              onClose()
            }}
          >
            Add payment
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function CancelDialog({
  payment,
  onClose,
}: {
  payment: OneOffPayment
  onClose: () => void
}) {
  const store = useStore()
  const [reason, setReason] = React.useState("")

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this payment</DialogTitle>
          <DialogDescription>
            It stays on the list marked cancelled, with your reason. There is no
            delete in Pay.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="cancel-oo" className="mb-1.5 block">
            Reason
          </Label>
          <Textarea
            id="cancel-oo"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep it
          </Button>
          <Button
            disabled={reason.trim().length < 5}
            onClick={() => {
              store.cancelOneOffPayment(payment.id, reason.trim())
              toast.success("Payment cancelled and recorded")
              onClose()
            }}
          >
            Cancel payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
