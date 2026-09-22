"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Eye,
  EyeOff,
  Lock,
  Search,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import { Initials, Panel, Pill, Restricted } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStore } from "@/lib/store"
import { canRevealStatutoryIds } from "@/lib/rbac"
import { fullName, ghs, EMPLOYMENT_TYPE_LABEL, formatDate } from "@/lib/format"
import type {
  Employee,
  EmploymentType,
  ContractType,
  WorkArrangement,
} from "@/lib/types"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    id: 1,
    title: "Personal & contact",
    blurb: "Identity, government IDs, address",
  },
  {
    id: 2,
    title: "Employment details",
    blurb: "Role, department, reporting line",
  },
  {
    id: 3,
    title: "Compensation & statutory",
    blurb: "Salary, SSNIT, TIN, payment method",
  },
  { id: 4, title: "Documents", blurb: "Contract, ID, certificates" },
  { id: 5, title: "Review & save", blurb: "Confirm and create record" },
]

interface Draft {
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: string
  nationality: string
  idType: string
  ghanaCard: string
  personalEmail: string
  phone: string
  email: string
  linkedin: string
  gpsAddress: string
  residentialAddress: string
  emergencyName: string
  emergencyRelationship: string
  emergencyPhone: string
  emergencyEmail: string
  jobTitle: string
  department: string
  employmentType: EmploymentType
  contractType: ContractType
  workArrangement: WorkArrangement
  branch: string
  payGrade: string
  startDate: string
  probationEndDate: string
  contractEndDate: string
  workingHoursPerWeek: string
  noticePeriodDays: string
  managerId: string
  dottedLineManagerId: string
  grossMonthly: string
  payFrequency: "monthly" | "bi_weekly"
  effectiveFrom: string
  ssnitNumber: string
  tin: string
  tier2Provider: string
  tier3Provider: string
  paymentMethod: "mobile_money" | "bank"
  momoProvider: string
  momoNumber: string
  bankName: string
  bankAccount: string
}

const EMPTY: Draft = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "female",
  nationality: "Ghanaian",
  idType: "Ghana Card",
  ghanaCard: "",
  personalEmail: "",
  phone: "",
  email: "",
  linkedin: "",
  gpsAddress: "",
  residentialAddress: "",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
  emergencyEmail: "",
  jobTitle: "",
  department: "Engineering",
  employmentType: "full_time",
  contractType: "permanent",
  workArrangement: "hybrid",
  branch: "Accra HQ",
  payGrade: "L3",
  startDate: "",
  probationEndDate: "",
  contractEndDate: "",
  workingHoursPerWeek: "40",
  noticePeriodDays: "30",
  managerId: "",
  dottedLineManagerId: "",
  grossMonthly: "",
  payFrequency: "monthly",
  effectiveFrom: "",
  ssnitNumber: "",
  tin: "",
  tier2Provider: "Petra Trust",
  tier3Provider: "",
  paymentMethod: "mobile_money",
  momoProvider: "MTN MoMo",
  momoNumber: "",
  bankName: "",
  bankAccount: "",
}

export default function NewEmployeePage() {
  const router = useRouter()
  const store = useStore()
  const { employees, departments, branches, addEmployee } = store

  const [step, setStep] = React.useState(1)
  const [draft, setDraft] = React.useState<Draft>(EMPTY)
  const [touched, setTouched] = React.useState(false)

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  const errors = validate(draft, step, employees)
  const stepErrors = Object.keys(errors).length

  function next() {
    setTouched(true)
    if (stepErrors > 0) {
      toast.error("Fix the highlighted fields before continuing.")
      return
    }
    setTouched(false)
    setStep((s) => Math.min(5, s + 1))
  }

  function back() {
    setTouched(false)
    setStep((s) => Math.max(1, s - 1))
  }

  function save() {
    const id = `${draft.firstName}-${draft.lastName}`
      .toLowerCase()
      .replace(/[^a-z]+/g, "-")
    const employee: Employee = {
      id,
      employeeId: `ZEL-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      firstName: draft.firstName,
      lastName: draft.lastName,
      jobTitle: draft.jobTitle,
      department: draft.department,
      branch: draft.branch,
      employmentType: draft.employmentType,
      contractType: draft.contractType,
      workArrangement: draft.workArrangement,
      lifecycleState: "pre_hire",
      managerId: draft.managerId || null,
      dottedLineManagerId: draft.dottedLineManagerId || null,
      email:
        draft.email ||
        `${draft.firstName}.${draft.lastName}`
          .toLowerCase()
          .replace(/\s+/g, "") + "@xanthan.com",
      personalEmail: draft.personalEmail,
      phone: draft.phone,
      dateOfBirth: draft.dateOfBirth,
      gender: draft.gender as Employee["gender"],
      nationality: draft.nationality,
      ghanaCard: draft.ghanaCard,
      gpsAddress: draft.gpsAddress,
      residentialAddress: draft.residentialAddress,
      startDate: draft.startDate,
      probationEndDate: draft.probationEndDate || null,
      contractEndDate: draft.contractEndDate || null,
      noticePeriodDays: Number(draft.noticePeriodDays) || 30,
      workingHoursPerWeek: Number(draft.workingHoursPerWeek) || 40,
      emergencyContact: {
        name: draft.emergencyName,
        relationship: draft.emergencyRelationship,
        phone: draft.emergencyPhone,
        email: draft.emergencyEmail,
      },
      compensation: {
        grossMonthly: Number(draft.grossMonthly) || 0,
        currency: "GHS",
        payFrequency: draft.payFrequency,
        payGrade: draft.payGrade,
        effectiveFrom: draft.effectiveFrom || draft.startDate,
        ssnitNumber: draft.ssnitNumber,
        tin: draft.tin,
        tier2Provider: draft.tier2Provider,
        tier3Provider: draft.tier3Provider || null,
        paymentMethod: draft.paymentMethod,
        momoProvider: draft.momoProvider,
        momoNumber: draft.momoNumber,
        bankName: draft.bankName,
        bankAccount: draft.bankAccount,
      },
      avatarTone: "bg-emerald-600",
    }
    addEmployee(employee)
    toast.success(`${fullName(employee)} created as a pre-hire record.`)
    router.push(`/employees/${id}`)
  }

  return (
    <PageShell
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Employees", href: "/employees" },
        { label: "Add new employee" },
      ]}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon-lg"
            asChild
            aria-label="Back to employees"
          >
            <Link href="/employees">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-[26px] leading-tight font-semibold tracking-tight">
              Add new employee
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create the record before their first day. You can save a draft and
              return at any time.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() =>
              toast.success(
                "Draft saved. It will appear in the directory as a draft record."
              )
            }
          >
            Save as draft
          </Button>
          {step < 5 ? (
            <Button size="lg" onClick={next}>
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button size="lg" onClick={save}>
              <Check className="size-4" />
              Create record
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl bg-card p-4">
            <ol className="space-y-1">
              {STEPS.map((s, i) => {
                const done = step > s.id
                const current = step === s.id
                return (
                  <li key={s.id} className="relative">
                    {i < STEPS.length - 1 && (
                      <span
                        className={cn(
                          "absolute top-8 left-[11px] h-[calc(100%-1rem)] w-0.5",
                          done ? "bg-primary" : "bg-border"
                        )}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => step > s.id && setStep(s.id)}
                      disabled={step < s.id}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors",
                        current && "bg-success-muted",
                        step > s.id && "hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "relative z-10 grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-medium",
                          done || current
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground"
                        )}
                      >
                        {done ? <Check className="size-3.5" /> : s.id}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block text-sm font-medium",
                            current && "text-primary",
                            !current && !done && "text-muted-foreground"
                          )}
                        >
                          {s.title}
                        </span>
                        <span className="block text-xs leading-snug text-muted-foreground">
                          {s.blurb}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
            <div className="mt-3 flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
              <AlertCircle className="size-3.5" />
              Required fields are marked *
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          {touched && stepErrors > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-danger-muted p-4">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="text-sm">
                <p className="font-medium text-destructive">
                  {stepErrors} field{stepErrors === 1 ? "" : "s"} need attention
                </p>
                <ul className="mt-1 list-inside list-disc text-muted-foreground">
                  {Object.values(errors).map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {step === 1 && (
            <StepPersonal
              draft={draft}
              set={set}
              errors={touched ? errors : {}}
            />
          )}
          {step === 2 && (
            <StepEmployment
              draft={draft}
              set={set}
              errors={touched ? errors : {}}
              employees={employees}
              departments={departments
                .filter((d) => !d.archived)
                .map((d) => d.name)}
              branches={branches.filter((b) => !b.archived).map((b) => b.name)}
            />
          )}
          {step === 3 && (
            <StepCompensation
              draft={draft}
              set={set}
              errors={touched ? errors : {}}
            />
          )}
          {step === 4 && <StepDocuments />}
          {step === 5 && <StepReview draft={draft} />}

          <div className="flex items-center justify-between rounded-xl bg-card px-5 py-3.5">
            <Button
              variant="ghost"
              size="lg"
              onClick={step === 1 ? () => router.push("/employees") : back}
            >
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Step {step} of 5
              </span>
              {step < 5 ? (
                <Button size="lg" onClick={next}>
                  Continue <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button size="lg" onClick={save}>
                  <Check className="size-4" />
                  Create record
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

function validate(d: Draft, step: number, employees: Employee[]) {
  const e: Record<string, string> = {}
  if (step === 1) {
    if (!d.firstName.trim()) e.firstName = "First name is required."
    if (!d.lastName.trim()) e.lastName = "Last name is required."
    if (!d.ghanaCard.trim()) e.ghanaCard = "Ghana Card number is required."
    else if (!/^GHA-\d{9}-\d$/.test(d.ghanaCard.trim()))
      e.ghanaCard = "Ghana Card must look like GHA-123456789-0."
    else if (employees.some((x) => x.ghanaCard === d.ghanaCard.trim()))
      e.ghanaCardDup = "That Ghana Card is already on another employee record."
    if (d.personalEmail && !/^\S+@\S+\.\S+$/.test(d.personalEmail))
      e.personalEmail = "Personal email is not a valid address."
    if (!d.phone.trim()) e.phone = "Phone number is required."
  }
  if (step === 2) {
    if (!d.jobTitle.trim()) e.jobTitle = "Job title is required."
    if (!d.startDate) e.startDate = "Start date is required."
    if (d.contractType === "fixed_term" && !d.contractEndDate)
      e.contractEndDate = "A fixed-term contract needs an end date."
    if (d.managerId && d.managerId === d.dottedLineManagerId)
      e.dotted = "Dotted-line manager must differ from the line manager."
  }
  if (step === 3) {
    if (!d.grossMonthly || Number(d.grossMonthly) <= 0)
      e.grossMonthly = "Gross monthly salary is required."
    if (!d.ssnitNumber.trim()) e.ssnitNumber = "SSNIT number is required."
    else if (!/^C\d{10}$/.test(d.ssnitNumber.trim()))
      e.ssnitFormat = "SSNIT must be C followed by 10 digits."
    if (!d.tin.trim()) e.tin = "TIN is required."
    if (d.paymentMethod === "mobile_money" && !d.momoNumber.trim())
      e.momoNumber = "Mobile money number is required."
    if (d.paymentMethod === "bank" && !d.bankAccount.trim())
      e.bankAccount = "Bank account number is required."
  }
  return e
}

type SetFn = <K extends keyof Draft>(key: K, value: Draft[K]) => void

function TextField({
  label,
  value,
  onChange,
  required,
  error,
  hint,
  type = "text",
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  error?: string
  hint?: string
  type?: string
  placeholder?: string
}) {
  const id = React.useId()
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        aria-invalid={!!error}
        onChange={(ev) => onChange(ev.target.value)}
        className="h-10"
      />
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  required?: boolean
  hint?: string
}) {
  const id = React.useId()
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function StepPersonal({
  draft,
  set,
  errors,
}: {
  draft: Draft
  set: SetFn
  errors: Record<string, string>
}) {
  return (
    <>
      <Panel
        title="Personal information"
        description="Legal identity as it appears on official documents."
      >
        <div className="mb-6 flex items-center gap-4">
          <div className="relative">
            <div className="grid size-20 place-items-center rounded-full bg-muted text-muted-foreground">
              {draft.firstName || draft.lastName ? (
                <span className="text-xl font-semibold">
                  {(draft.firstName[0] ?? "") + (draft.lastName[0] ?? "")}
                </span>
              ) : (
                <Camera className="size-6" />
              )}
            </div>
            <button
              type="button"
              className="absolute right-0 bottom-0 grid size-7 place-items-center rounded-full border bg-background transition-colors hover:bg-muted"
              aria-label="Upload photo"
            >
              <Camera className="size-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Optional. A photo helps colleagues recognise
            <br />
            each other in the directory and org chart.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="First name"
            required
            value={draft.firstName}
            onChange={(v) => set("firstName", v)}
            error={errors.firstName}
            placeholder="Abena"
          />
          <TextField
            label="Last name"
            required
            value={draft.lastName}
            onChange={(v) => set("lastName", v)}
            error={errors.lastName}
            placeholder="Mensah"
          />
          <TextField
            label="Date of birth"
            type="date"
            value={draft.dateOfBirth}
            onChange={(v) => set("dateOfBirth", v)}
          />
          <SelectField
            label="Gender"
            value={draft.gender}
            onChange={(v) => set("gender", v)}
            options={[
              { value: "female", label: "Female" },
              { value: "male", label: "Male" },
              { value: "other", label: "Prefer not to say" },
            ]}
          />
          <SelectField
            label="Nationality"
            value={draft.nationality}
            onChange={(v) => set("nationality", v)}
            options={[
              { value: "Ghanaian", label: "Ghanaian" },
              { value: "Nigerian", label: "Nigerian" },
              { value: "Ivorian", label: "Ivorian" },
              { value: "Other", label: "Other" },
            ]}
          />
          <SelectField
            label="ID type"
            value={draft.idType}
            onChange={(v) => set("idType", v)}
            options={[
              { value: "Ghana Card", label: "Ghana Card" },
              { value: "Passport", label: "Passport" },
              { value: "Voter ID", label: "Voter ID" },
            ]}
          />
          <TextField
            label="Ghana Card number"
            required
            value={draft.ghanaCard}
            onChange={(v) => set("ghanaCard", v)}
            error={errors.ghanaCard ?? errors.ghanaCardDup}
            hint="Format: GHA-123456789-0"
            placeholder="GHA-552107843-9"
          />
        </div>
      </Panel>

      <Panel
        title="Contact information"
        description="Used by HR and Payroll. The employee can update their phone, address and emergency contact themselves."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Personal email"
            type="email"
            value={draft.personalEmail}
            onChange={(v) => set("personalEmail", v)}
            error={errors.personalEmail}
            placeholder="abena.m@gmail.com"
          />
          <TextField
            label="Phone number"
            required
            value={draft.phone}
            onChange={(v) => set("phone", v)}
            error={errors.phone}
            placeholder="+233 24 456 7890"
          />
          <TextField
            label="Work email"
            value={draft.email}
            onChange={(v) => set("email", v)}
            hint="Generated from the name if left blank."
            placeholder="abena.mensah@xanthan.com"
          />
          <TextField
            label="LinkedIn"
            value={draft.linkedin}
            onChange={(v) => set("linkedin", v)}
            placeholder="linkedin.com/in/abena-mensah"
          />
          <TextField
            label="GhanaPost GPS address"
            value={draft.gpsAddress}
            onChange={(v) => set("gpsAddress", v)}
            placeholder="GA-183-4290"
          />
          <TextField
            label="Residential address"
            value={draft.residentialAddress}
            onChange={(v) => set("residentialAddress", v)}
            placeholder="12 Nii Sai Street, East Legon, Accra"
          />
        </div>

        <div className="mt-6 border-t pt-5">
          <p className="mb-4 text-sm font-medium">Emergency contact</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Full name"
              value={draft.emergencyName}
              onChange={(v) => set("emergencyName", v)}
            />
            <TextField
              label="Relationship"
              value={draft.emergencyRelationship}
              onChange={(v) => set("emergencyRelationship", v)}
              placeholder="Sibling"
            />
            <TextField
              label="Phone number"
              value={draft.emergencyPhone}
              onChange={(v) => set("emergencyPhone", v)}
            />
            <TextField
              label="Email"
              type="email"
              value={draft.emergencyEmail}
              onChange={(v) => set("emergencyEmail", v)}
            />
          </div>
        </div>
      </Panel>
    </>
  )
}

function StepEmployment({
  draft,
  set,
  errors,
  employees,
  departments,
  branches,
}: {
  draft: Draft
  set: SetFn
  errors: Record<string, string>
  employees: Employee[]
  departments: string[]
  branches: string[]
}) {
  const store = useStore()
  const manager = store.employeeById(draft.managerId)
  const chain: Employee[] = []
  let cursor = manager
  const guard = new Set<string>()
  while (cursor && !guard.has(cursor.id)) {
    guard.add(cursor.id)
    chain.unshift(cursor)
    cursor = store.employeeById(cursor.managerId)
  }

  return (
    <>
      <Panel
        title="Position"
        description="Define the role and where it sits in the organization."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Job title"
            required
            value={draft.jobTitle}
            onChange={(v) => set("jobTitle", v)}
            error={errors.jobTitle}
            placeholder="Software engineer"
          />
          <SelectField
            label="Department"
            value={draft.department}
            onChange={(v) => set("department", v)}
            options={departments.map((d) => ({ value: d, label: d }))}
          />
          <SelectField
            label="Employment type"
            value={draft.employmentType}
            onChange={(v) => set("employmentType", v as EmploymentType)}
            options={Object.entries(EMPLOYMENT_TYPE_LABEL).map(
              ([value, label]) => ({
                value,
                label,
              })
            )}
          />
          <SelectField
            label="Contract type"
            value={draft.contractType}
            onChange={(v) => set("contractType", v as ContractType)}
            options={[
              { value: "permanent", label: "Permanent" },
              { value: "fixed_term", label: "Fixed-term" },
              { value: "probationary", label: "Probationary" },
            ]}
          />
          <SelectField
            label="Work arrangement"
            value={draft.workArrangement}
            onChange={(v) => set("workArrangement", v as WorkArrangement)}
            options={[
              { value: "onsite", label: "On-site" },
              { value: "hybrid", label: "Hybrid" },
              { value: "remote", label: "Remote" },
            ]}
          />
          <SelectField
            label="Work location"
            value={draft.branch}
            onChange={(v) => set("branch", v)}
            options={branches.map((b) => ({ value: b, label: b }))}
          />
          <TextField
            label="Start date"
            type="date"
            required
            value={draft.startDate}
            onChange={(v) => set("startDate", v)}
            error={errors.startDate}
          />
          <TextField
            label="Probation end date"
            type="date"
            value={draft.probationEndDate}
            onChange={(v) => set("probationEndDate", v)}
          />
          {draft.contractType === "fixed_term" && (
            <TextField
              label="Contract end date"
              type="date"
              required
              value={draft.contractEndDate}
              onChange={(v) => set("contractEndDate", v)}
              error={errors.contractEndDate}
              hint="Expiry alerts fire 30, 15 and 7 days before this date."
            />
          )}
          <TextField
            label="Working hours"
            value={draft.workingHoursPerWeek}
            onChange={(v) => set("workingHoursPerWeek", v)}
            hint="Hours per week"
          />
          <TextField
            label="Notice period"
            value={draft.noticePeriodDays}
            onChange={(v) => set("noticePeriodDays", v)}
            hint="Days"
          />
          <TextField
            label="Pay grade"
            value={draft.payGrade}
            onChange={(v) => set("payGrade", v)}
          />
        </div>
      </Panel>

      <Panel
        title="Reporting line"
        description="Must reference an existing active employee. An employee cannot report to themselves."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <PersonPicker
            label="Reports to (line manager)"
            value={draft.managerId}
            onChange={(v) => set("managerId", v)}
            employees={employees}
            hint="An employee cannot be their own reporting line."
          />
          <PersonPicker
            label="Dotted-line manager"
            value={draft.dottedLineManagerId}
            onChange={(v) => set("dottedLineManagerId", v)}
            employees={employees.filter((e) => e.id !== draft.managerId)}
            hint={
              errors.dotted ??
              "Optional secondary manager — approves leave, no salary access."
            }
            error={!!errors.dotted}
          />
        </div>

        {chain.length > 0 && (
          <div className="mt-5 rounded-lg bg-muted/60 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Org chart preview
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm">
              {chain.map((c) => (
                <React.Fragment key={c.id}>
                  <span className="text-muted-foreground">
                    {fullName(c)}{" "}
                    <span className="text-xs">({c.jobTitle})</span>
                  </span>
                  <span className="text-muted-foreground/50">›</span>
                </React.Fragment>
              ))}
              <span className="font-medium">
                {draft.firstName || "New hire"} {draft.lastName}{" "}
                <span className="text-xs font-normal">
                  ({draft.jobTitle || "role"})
                </span>
              </span>
            </p>
          </div>
        )}
      </Panel>
    </>
  )
}

function PersonPicker({
  label,
  value,
  onChange,
  employees,
  hint,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  employees: Employee[]
  hint?: string
  error?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState("")
  const selected = employees.find((e) => e.id === value)
  const matches = employees
    .filter((e) =>
      ["active", "probation", "on_leave"].includes(e.lifecycleState)
    )
    .filter((e) => !q || fullName(e).toLowerCase().includes(q.toLowerCase()))
    .slice(0, 6)

  return (
    <div className="relative">
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={selected && !open ? fullName(selected) : q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search employees…"
          aria-invalid={error}
          className={cn(
            "h-10 w-full rounded-lg border bg-background pr-3 pl-9 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
            error && "border-destructive"
          )}
        />
      </div>
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
          {value && (
            <li>
              <button
                type="button"
                onMouseDown={() => {
                  onChange("")
                  setQ("")
                  setOpen(false)
                }}
                className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
              >
                Clear selection
              </button>
            </li>
          )}
          {matches.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onMouseDown={() => {
                  onChange(e.id)
                  setQ("")
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-muted"
              >
                <Initials person={e} size="xs" />
                <span className="min-w-0">
                  <span className="block truncate text-sm">{fullName(e)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {e.jobTitle}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {hint && (
        <p
          className={cn(
            "mt-1 text-xs",
            error ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {hint}
        </p>
      )}
    </div>
  )
}

function StepCompensation({
  draft,
  set,
  errors,
}: {
  draft: Draft
  set: SetFn
  errors: Record<string, string>
}) {
  const store = useStore()
  const [revealed, setRevealed] = React.useState(false)
  const mayReveal = canRevealStatutoryIds(store.viewer, {
    id: "new",
  } as Employee)
  const annual = (Number(draft.grossMonthly) || 0) * 12

  return (
    <>
      <Panel
        title="Compensation"
        description="All amounts are in Ghana Cedis (GHS). Visible to HR Admin and Payroll only — not to the employee themselves."
        actions={<Restricted reason="Salary is not visible to line managers" />}
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <Label className="mb-1.5 block text-sm font-medium">
              Gross monthly salary <span className="text-destructive">*</span>
            </Label>
            <div className="flex">
              <span className="grid h-10 place-items-center rounded-l-lg border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                GHS
              </span>
              <Input
                value={draft.grossMonthly}
                onChange={(e) => set("grossMonthly", e.target.value)}
                aria-invalid={!!errors.grossMonthly}
                placeholder="7,200.00"
                className="h-10 rounded-l-none"
              />
            </div>
            {errors.grossMonthly && (
              <p className="mt-1 text-xs text-destructive">
                {errors.grossMonthly}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block text-sm font-medium">
              Pay frequency <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              {(["monthly", "bi_weekly"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => set("payFrequency", f)}
                  className={cn(
                    "h-10 flex-1 rounded-lg border text-sm transition-colors",
                    draft.payFrequency === f
                      ? "border-primary bg-success-muted font-medium text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  {f === "monthly" ? "Monthly" : "Bi-weekly"}
                </button>
              ))}
            </div>
          </div>

          <SelectField
            label="Pay grade"
            value={draft.payGrade}
            onChange={(v) => set("payGrade", v)}
            options={["L1", "L2", "L3", "L4", "L5", "L6", "L7"].map((g) => ({
              value: g,
              label: g,
            }))}
          />

          <div>
            <Label className="mb-1.5 block text-sm font-medium">
              Annualised cost
            </Label>
            <div className="tabular grid h-10 items-center rounded-lg border bg-muted px-3 text-sm text-muted-foreground">
              {ghs(annual)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Auto-calculated
            </p>
          </div>

          <TextField
            label="Effective from"
            type="date"
            value={draft.effectiveFrom}
            onChange={(v) => set("effectiveFrom", v)}
          />

          <div>
            <Label className="mb-1.5 block text-sm font-medium">Currency</Label>
            <div className="grid h-10 items-center rounded-lg border bg-muted px-3 text-sm text-muted-foreground">
              GHS — Ghana Cedi
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Statutory & tax"
        description="SSNIT, TIN and Tier 2 pension provider. Numbers are masked by default and only revealed by authorised users."
        actions={
          mayReveal && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevealed((v) => !v)}
            >
              {revealed ? (
                <EyeOff className="size-3.5" />
              ) : (
                <Eye className="size-3.5" />
              )}
              {revealed ? "Hide" : "Reveal"}
            </Button>
          )
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-sm font-medium">
              SSNIT number <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={revealed ? "text" : "password"}
                value={draft.ssnitNumber}
                onChange={(e) => set("ssnitNumber", e.target.value)}
                aria-invalid={!!(errors.ssnitNumber || errors.ssnitFormat)}
                placeholder="C1234567890"
                className="h-10 pl-9"
              />
            </div>
            <p
              className={cn(
                "mt-1 text-xs",
                errors.ssnitNumber || errors.ssnitFormat
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {errors.ssnitNumber ??
                errors.ssnitFormat ??
                "Format: C followed by 10 digits"}
            </p>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm font-medium">
              TIN <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                #
              </span>
              <Input
                type={revealed ? "text" : "password"}
                value={draft.tin}
                onChange={(e) => set("tin", e.target.value)}
                aria-invalid={!!errors.tin}
                placeholder="P0012345678"
                className="h-10 pl-9"
              />
            </div>
            <p
              className={cn(
                "mt-1 text-xs",
                errors.tin ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {errors.tin ?? "Tax Identification Number"}
            </p>
          </div>

          <SelectField
            label="Tier 2 pension provider"
            required
            value={draft.tier2Provider}
            onChange={(v) => set("tier2Provider", v)}
            options={[
              { value: "Petra Trust", label: "Petra Trust" },
              { value: "Enterprise Trustees", label: "Enterprise Trustees" },
              { value: "Glico Pensions", label: "Glico Pensions" },
              { value: "Stanbic Trustees", label: "Stanbic Trustees" },
            ]}
          />
          <SelectField
            label="Tier 3 (voluntary)"
            value={draft.tier3Provider}
            onChange={(v) => set("tier3Provider", v)}
            options={[
              { value: "", label: "None" },
              { value: "Petra Trust", label: "Petra Trust" },
              { value: "Enterprise Trustees", label: "Enterprise Trustees" },
            ]}
          />
        </div>
      </Panel>

      <Panel
        title="Payment method"
        description="Choose either a bank account or mobile money. Used for payroll disbursement."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: "mobile_money",
                label: "Mobile money",
                blurb: "MTN, Telecel or AirtelTigo",
              },
              {
                value: "bank",
                label: "Bank account",
                blurb: "Any Ghanaian bank",
              },
            ] as const
          ).map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => set("paymentMethod", o.value)}
              className={cn(
                "rounded-xl bg-muted/40 p-4 text-left transition-colors",
                draft.paymentMethod === o.value
                  ? "border-primary bg-success-muted"
                  : "hover:bg-muted/50"
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-4 place-items-center rounded-full border",
                    draft.paymentMethod === o.value &&
                      "border-primary bg-primary"
                  )}
                >
                  {draft.paymentMethod === o.value && (
                    <Check className="size-2.5 text-primary-foreground" />
                  )}
                </span>
                <span className="text-sm font-medium">{o.label}</span>
              </span>
              <span className="mt-1 block pl-6 text-xs text-muted-foreground">
                {o.blurb}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {draft.paymentMethod === "mobile_money" ? (
            <>
              <SelectField
                label="Provider"
                value={draft.momoProvider}
                onChange={(v) => set("momoProvider", v)}
                options={[
                  { value: "MTN MoMo", label: "MTN MoMo" },
                  { value: "Telecel Cash", label: "Telecel Cash" },
                  { value: "AirtelTigo Money", label: "AirtelTigo Money" },
                ]}
              />
              <TextField
                label="Mobile money number"
                required
                value={draft.momoNumber}
                onChange={(v) => set("momoNumber", v)}
                error={errors.momoNumber}
                placeholder="+233 24 456 7890"
              />
            </>
          ) : (
            <>
              <SelectField
                label="Bank"
                value={draft.bankName}
                onChange={(v) => set("bankName", v)}
                options={[
                  { value: "", label: "Select a bank" },
                  { value: "GCB Bank", label: "GCB Bank" },
                  { value: "Ecobank Ghana", label: "Ecobank Ghana" },
                  { value: "Absa Ghana", label: "Absa Ghana" },
                  { value: "Fidelity Bank", label: "Fidelity Bank" },
                  { value: "Stanbic Bank", label: "Stanbic Bank" },
                ]}
              />
              <TextField
                label="Account number"
                required
                value={draft.bankAccount}
                onChange={(v) => set("bankAccount", v)}
                error={errors.bankAccount}
              />
            </>
          )}
        </div>
      </Panel>
    </>
  )
}

const REQUIRED_DOCS = [
  { name: "Signed employment contract", category: "Contract", required: true },
  { name: "Ghana Card (front & back)", category: "Identity", required: true },
  { name: "SSNIT registration", category: "Statutory", required: true },
  {
    name: "Highest qualification certificate",
    category: "Certificate",
    required: false,
  },
  { name: "Pre-employment medical", category: "Medical", required: false },
]

function StepDocuments() {
  const [uploaded, setUploaded] = React.useState<string[]>([])
  const [dragging, setDragging] = React.useState(false)

  return (
    <Panel
      title="Documents"
      description="Upload now or chase them during onboarding. Missing required documents block the move from pre-hire to active."
    >
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          toast.success("File queued for upload.")
        }}
        className={cn(
          "grid place-items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-primary bg-success-muted" : "bg-muted/30"
        )}
      >
        <Upload className="size-6 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">
          Drag files here, or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, JPG or PNG · up to 10 MB each
        </p>
      </div>

      <ul className="mt-5 divide-y rounded-xl border">
        {REQUIRED_DOCS.map((d) => {
          const done = uploaded.includes(d.name)
          return (
            <li key={d.name} className="flex items-center gap-3 px-4 py-3">
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg",
                  done
                    ? "bg-success-muted text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {done ? (
                  <Check className="size-4" />
                ) : (
                  <Upload className="size-3.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.category}</p>
              </div>
              {d.required && !done && <Pill tone="warning">Required</Pill>}
              {done && <Pill tone="success">Uploaded</Pill>}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setUploaded((u) =>
                    u.includes(d.name)
                      ? u.filter((x) => x !== d.name)
                      : [...u, d.name]
                  )
                }
              >
                {done ? "Remove" : "Upload"}
              </Button>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function StepReview({ draft }: { draft: Draft }) {
  const store = useStore()
  const rows: [string, React.ReactNode][] = [
    ["Name", `${draft.firstName} ${draft.lastName}`.trim() || "—"],
    ["Ghana Card", draft.ghanaCard || "—"],
    ["Phone", draft.phone || "—"],
    ["Job title", draft.jobTitle || "—"],
    ["Department", draft.department],
    ["Employment type", EMPLOYMENT_TYPE_LABEL[draft.employmentType]],
    ["Work location", draft.branch],
    ["Start date", draft.startDate ? formatDate(draft.startDate) : "—"],
    [
      "Contract",
      draft.contractType === "fixed_term"
        ? `Fixed-term, ends ${formatDate(draft.contractEndDate)}`
        : draft.contractType === "probationary"
          ? "Probationary"
          : "Permanent",
    ],
    ["Line manager", fullName(store.employeeById(draft.managerId))],
    [
      "Dotted-line manager",
      draft.dottedLineManagerId
        ? fullName(store.employeeById(draft.dottedLineManagerId))
        : "None",
    ],
    [
      "Gross monthly",
      draft.grossMonthly ? ghs(Number(draft.grossMonthly)) : "—",
    ],
    ["Pay grade", draft.payGrade],
    [
      "SSNIT",
      draft.ssnitNumber ? "•••••••" + draft.ssnitNumber.slice(-3) : "—",
    ],
    ["TIN", draft.tin ? "•••••••" + draft.tin.slice(-3) : "—"],
    [
      "Payment method",
      draft.paymentMethod === "mobile_money"
        ? `${draft.momoProvider} · ${draft.momoNumber || "—"}`
        : `${draft.bankName || "—"} · ${draft.bankAccount || "—"}`,
    ],
  ]

  return (
    <>
      <Panel
        title="Review & save"
        description="The record is created in Pre-hire. It moves to Active on the first day of employment."
      >
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-4 border-b pb-2"
            >
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-right text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <div className="flex items-start gap-2.5 rounded-xl border border-info/30 bg-info-muted p-4 text-sm">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-info" />
        <p className="text-muted-foreground">
          Creating this record writes an entry to the audit log attributed to
          you, and starts the onboarding checklist. Statutory IDs stay masked
          for everyone except HR Admin, Payroll and the employee.
        </p>
      </div>
    </>
  )
}
