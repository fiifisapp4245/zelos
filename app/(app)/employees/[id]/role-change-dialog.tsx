"use client"

import * as React from "react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
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
import { TODAY_ISO, fullName, ghs } from "@/lib/format"

export type RoleChangeKind = "transfer" | "promotion" | "acting"

const COPY: Record<
  RoleChangeKind,
  { title: string; description: string; submit: string }
> = {
  transfer: {
    title: "Initiate transfer",
    description:
      "Moves the person to another department, branch or reporting line. Pay is untouched.",
    submit: "Confirm transfer",
  },
  promotion: {
    title: "Initiate promotion",
    description:
      "Sets a new title, grade and salary from an effective date. Payroll picks it up on the next run.",
    submit: "Confirm promotion",
  },
  acting: {
    title: "Assign acting role",
    description:
      "A temporary title with an end date. The substantive role and grade stay as they are.",
    submit: "Assign acting role",
  },
}

export function RoleChangeDialog({
  employeeId,
  kind,
  onClose,
}: {
  employeeId: string
  kind: RoleChangeKind | null
  onClose: () => void
}) {
  if (!kind) return null
  return (
    <RoleChangeForm employeeId={employeeId} kind={kind} onClose={onClose} />
  )
}

/** Mounted only while open, so the fields seed from the current record. */
function RoleChangeForm({
  employeeId,
  kind,
  onClose,
}: {
  employeeId: string
  kind: RoleChangeKind
  onClose: () => void
}) {
  const store = useStore()
  const employee = store.employeeById(employeeId)
  const copy = COPY[kind]

  const [department, setDepartment] = React.useState(employee?.department ?? "")
  const [branch, setBranch] = React.useState(employee?.branch ?? "")
  const [managerId, setManagerId] = React.useState(employee?.managerId ?? "")
  const [jobTitle, setJobTitle] = React.useState(employee?.jobTitle ?? "")
  const [payGrade, setPayGrade] = React.useState(
    employee?.compensation.payGrade ?? ""
  )
  const [salary, setSalary] = React.useState(
    String(employee?.compensation.grossMonthly ?? "")
  )
  const [effective, setEffective] = React.useState(TODAY_ISO)
  const [until, setUntil] = React.useState("")
  const [reason, setReason] = React.useState("")

  if (!employee) return null

  const managers = store.employees.filter(
    (e) => e.id !== employee.id && !["pre_hire"].includes(e.lifecycleState)
  )
  const currentSalary = employee.compensation.grossMonthly
  const nextSalary = Number(salary) || 0
  const uplift = nextSalary - currentSalary

  const changed =
    kind === "transfer"
      ? department !== employee.department ||
        branch !== employee.branch ||
        managerId !== (employee.managerId ?? "")
      : kind === "promotion"
        ? jobTitle !== employee.jobTitle ||
          payGrade !== employee.compensation.payGrade ||
          nextSalary !== currentSalary
        : jobTitle.trim().length > 0 && until.length > 0

  const canSubmit = changed && reason.trim().length >= 5

  function submit() {
    if (!employee || !canSubmit) return
    const who = fullName(employee)

    if (kind === "transfer") {
      store.patchEmployee(
        employee.id,
        { department, branch, managerId: managerId || null },
        `Transfer effective ${effective} — ${reason.trim()}`
      )
      toast.success(`${who} transferred to ${department}, ${branch}.`)
    } else if (kind === "promotion") {
      store.patchEmployee(
        employee.id,
        {
          jobTitle,
          compensation: {
            ...employee.compensation,
            payGrade,
            grossMonthly: nextSalary,
            effectiveFrom: effective,
          },
        },
        `Promotion effective ${effective} — ${reason.trim()}`
      )
      toast.success(`${who} promoted to ${jobTitle} on grade ${payGrade}.`)
    } else {
      store.patchEmployee(
        employee.id,
        { jobTitle: `${jobTitle} (Acting)` },
        `Acting role until ${until} — ${reason.trim()}`
      )
      toast.success(`${who} is acting ${jobTitle} until ${until}.`)
    }

    onClose()
  }

  return (
    <FormDialog
      title={copy.title}
      description={`${copy.description} Logged against your name on ${fullName(employee)}'s record.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" disabled={!canSubmit} onClick={submit}>
            {copy.submit}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {kind === "transfer" && (
          <>
            <Picker
              label="Department"
              value={department}
              onChange={setDepartment}
              options={store.departments
                .filter((d) => !d.archived)
                .map((d) => d.name)}
            />
            <Picker
              label="Branch"
              value={branch}
              onChange={setBranch}
              options={store.branches
                .filter((b) => !b.archived)
                .map((b) => b.name)}
            />
            <div>
              <Label className="mb-1.5 block text-sm font-medium">
                Reports to
              </Label>
              <Select
                value={managerId || "none"}
                onValueChange={(v) => setManagerId(v === "none" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {fullName(m)} — {m.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {kind === "promotion" && (
          <>
            <Text
              label="New job title"
              value={jobTitle}
              onChange={setJobTitle}
            />
            <Text
              label="New pay grade"
              value={payGrade}
              onChange={setPayGrade}
            />
            <div>
              <Label className="mb-1.5 block text-sm font-medium">
                New gross monthly (GHS)
              </Label>
              <Input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="h-10"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Currently {ghs(currentSalary)}.{" "}
                {uplift !== 0 && (
                  <span
                    className={uplift > 0 ? "text-primary" : "text-destructive"}
                  >
                    {uplift > 0 ? "+" : "−"}
                    {ghs(Math.abs(uplift))} (
                    {((uplift / currentSalary) * 100).toFixed(1)}%)
                  </span>
                )}
              </p>
            </div>
          </>
        )}

        {kind === "acting" && (
          <>
            <Text
              label="Acting in role"
              value={jobTitle}
              onChange={setJobTitle}
            />
            <div>
              <Label className="mb-1.5 block text-sm font-medium">
                Acting until <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="h-10"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                An acting assignment always has an end date, so the substantive
                holder can be reinstated without a second decision.
              </p>
            </div>
          </>
        )}

        {kind !== "acting" && (
          <div>
            <Label className="mb-1.5 block text-sm font-medium">
              Effective date
            </Label>
            <Input
              type="date"
              value={effective}
              onChange={(e) => setEffective(e.target.value)}
              className="h-10"
            />
          </div>
        )}

        <div>
          <Label className="mb-1.5 block text-sm font-medium">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this happening? This becomes part of the permanent record."
          />
        </div>
      </div>
    </FormDialog>
  )
}

function Text({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10"
      />
    </div>
  )
}

function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
