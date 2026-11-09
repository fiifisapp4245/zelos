"use client"

import * as React from "react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormRow, NativeSelect } from "./form"
import { useStore } from "@/lib/store"
import { EMPLOYMENT_TYPE_LABEL, TODAY_ISO, fullName } from "@/lib/format"
import { SOURCES, newRequisitionId } from "@/lib/talent/recruitment"
import { isOnStrength } from "@/lib/selectors"
import type { EmploymentType, Requisition } from "@/lib/types"

const TYPES = Object.keys(EMPLOYMENT_TYPE_LABEL) as EmploymentType[]

/** Creates a requisition, or edits one. A new one can be saved as a draft first. */
export function RequisitionDialog({
  existing,
  onClose,
}: {
  existing?: Requisition
  onClose: () => void
}) {
  const store = useStore()
  const { departments, branches, employees, requisitions, viewer } = store
  const depts = departments.filter((d) => !d.archived)
  const brs = branches.filter((b) => !b.archived)
  const managers = employees.filter(isOnStrength)

  const [title, setTitle] = React.useState(existing?.title ?? "")
  const [department, setDepartment] = React.useState(
    existing?.department ?? depts[0]?.name ?? ""
  )
  const [branch, setBranch] = React.useState(
    existing?.branch ?? brs[0]?.name ?? ""
  )
  const [type, setType] = React.useState<EmploymentType>(
    existing?.employmentType ?? "full_time"
  )
  const [openings, setOpenings] = React.useState(
    String(existing?.openings ?? 1)
  )
  const [manager, setManager] = React.useState(
    existing?.hiringManagerId ?? viewer.employeeId
  )
  const [start, setStart] = React.useState(existing?.targetStartDate ?? "")
  const [budget, setBudget] = React.useState(
    existing ? String(existing.budgetMonthly) : ""
  )
  const [touched, setTouched] = React.useState(false)

  const errors = {
    title: title.trim() ? null : "Give the role a title.",
    openings:
      Number(openings) >= 1 && Number.isInteger(Number(openings))
        ? null
        : "At least one opening.",
    start: !start
      ? "Choose a target start date."
      : start < TODAY_ISO && !existing
        ? "The target start date is in the past."
        : null,
    budget: Number(budget) > 0 ? null : "Enter the monthly budget per hire.",
  }
  const invalid = Object.values(errors).some(Boolean)

  function save(status: Requisition["status"]) {
    setTouched(true)
    if (invalid) {
      toast.error("Fix the highlighted fields.")
      return
    }
    const fields = {
      title: title.trim(),
      department,
      branch,
      employmentType: type,
      openings: Number(openings),
      hiringManagerId: manager,
      targetStartDate: start,
      budgetMonthly: Number(budget),
    }
    if (existing) {
      store.updateRequisition(existing.id, fields)
      toast.success(`${fields.title} updated.`)
    } else {
      const r: Requisition = {
        ...fields,
        id: newRequisitionId(requisitions),
        status,
        openedOn: TODAY_ISO,
      }
      store.addRequisition(r)
      toast.success(
        status === "open"
          ? `${r.id} is open for applications.`
          : `${r.id} saved as a draft.`
      )
    }
    onClose()
  }

  const show = (k: keyof typeof errors) => (touched ? errors[k] : null)

  return (
    <FormDialog
      title={existing ? `Edit ${existing.id}` : "New requisition"}
      description="A requisition is the approval to hire. Candidates attach to it, and the budget feeds payroll forecasting."
      width="lg"
      onClose={onClose}
      footer={
        existing ? (
          <>
            <Button variant="ghost" size="lg" onClick={onClose}>
              Cancel
            </Button>
            <Button size="lg" onClick={() => save(existing.status)}>
              Save changes
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="lg" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="outline" size="lg" onClick={() => save("draft")}>
              Save as draft
            </Button>
            <Button size="lg" onClick={() => save("open")}>
              Open requisition
            </Button>
          </>
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow
          label="Job title"
          htmlFor="rq-title"
          error={show("title")}
          className="sm:col-span-2"
        >
          <Input
            id="rq-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Senior Backend Engineer"
          />
        </FormRow>
        <FormRow label="Department" htmlFor="rq-dept">
          <NativeSelect
            id="rq-dept"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            {depts.map((d) => (
              <option key={d.id}>{d.name}</option>
            ))}
          </NativeSelect>
        </FormRow>
        <FormRow label="Branch" htmlFor="rq-branch">
          <NativeSelect
            id="rq-branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            {brs.map((b) => (
              <option key={b.id}>{b.name}</option>
            ))}
          </NativeSelect>
        </FormRow>
        <FormRow label="Employment type" htmlFor="rq-type">
          <NativeSelect
            id="rq-type"
            value={type}
            onChange={(e) => setType(e.target.value as EmploymentType)}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {EMPLOYMENT_TYPE_LABEL[t]}
              </option>
            ))}
          </NativeSelect>
        </FormRow>
        <FormRow label="Hiring manager" htmlFor="rq-mgr">
          <NativeSelect
            id="rq-mgr"
            value={manager}
            onChange={(e) => setManager(e.target.value)}
          >
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {fullName(m)}
              </option>
            ))}
          </NativeSelect>
        </FormRow>
        <FormRow label="Openings" htmlFor="rq-open" error={show("openings")}>
          <Input
            id="rq-open"
            type="number"
            min={1}
            value={openings}
            onChange={(e) => setOpenings(e.target.value)}
          />
        </FormRow>
        <FormRow label="Target start" htmlFor="rq-start" error={show("start")}>
          <Input
            id="rq-start"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </FormRow>
        <FormRow
          label="Monthly budget per hire (GHS)"
          htmlFor="rq-budget"
          error={show("budget")}
          className="sm:col-span-2"
        >
          <Input
            id="rq-budget"
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </FormRow>
      </div>
    </FormDialog>
  )
}

export function AddCandidateDialog({
  requisitionId,
  onClose,
}: {
  requisitionId?: string
  onClose: () => void
}) {
  const store = useStore()
  const open = store.requisitions.filter((r) =>
    ["open", "on_hold"].includes(r.status)
  )
  const [req, setReq] = React.useState(requisitionId ?? open[0]?.id ?? "")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [source, setSource] = React.useState(SOURCES[0])
  const [touched, setTouched] = React.useState(false)

  const errors = {
    req: req ? null : "Choose the requisition they applied to.",
    name: name.trim().split(/\s+/).length >= 2 ? null : "First and last name.",
    email: /.+@.+\..+/.test(email) ? null : "Enter a valid email address.",
    dup: store.candidates.some(
      (c) =>
        c.requisitionId === req &&
        c.email.toLowerCase() === email.trim().toLowerCase()
    )
      ? "This person has already applied to this role."
      : null,
  }

  function save() {
    setTouched(true)
    if (errors.req || errors.name || errors.email || errors.dup) return
    const tones = [
      "bg-emerald-600",
      "bg-blue-600",
      "bg-amber-700",
      "bg-violet-600",
      "bg-rose-600",
    ]
    store.addCandidate({
      id: `c-${Math.random().toString(36).slice(2, 7)}`,
      requisitionId: req,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      stage: "applied",
      appliedOn: TODAY_ISO,
      source,
      rating: 3,
      avatarTone: tones[store.candidates.length % tones.length],
      notes: "",
      rejectedReason: null,
      interviews: [],
      offer: null,
      employeeId: null,
    })
    toast.success(`${name.trim()} added to the pipeline.`)
    onClose()
  }

  return (
    <FormDialog
      title="Add a candidate"
      description="Starts at Applied. Screen, interview and move them on from the pipeline."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save}>
            Add candidate
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow
          label="Applying for"
          htmlFor="ac-req"
          error={touched ? errors.req : null}
          className="sm:col-span-2"
        >
          <NativeSelect
            id="ac-req"
            value={req}
            onChange={(e) => setReq(e.target.value)}
          >
            {open.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} — {r.id}
              </option>
            ))}
          </NativeSelect>
        </FormRow>
        <FormRow
          label="Full name"
          htmlFor="ac-name"
          error={touched ? errors.name : null}
        >
          <Input
            id="ac-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormRow>
        <FormRow label="Source" htmlFor="ac-source">
          <NativeSelect
            id="ac-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </NativeSelect>
        </FormRow>
        <FormRow
          label="Email"
          htmlFor="ac-email"
          error={touched ? (errors.email ?? errors.dup) : null}
        >
          <Input
            id="ac-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormRow>
        <FormRow label="Phone" htmlFor="ac-phone">
          <Input
            id="ac-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+233 …"
          />
        </FormRow>
      </div>
    </FormDialog>
  )
}
