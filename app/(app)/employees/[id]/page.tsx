"use client"

import * as React from "react"
import Link from "next/link"
import { notFound, useParams } from "next/navigation"
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Eye,
  EyeOff,
  Hash,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Send,
  ShieldAlert,
} from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Field,
  Initials,
  Panel,
  Pill,
  Restricted,
  SectionGrid,
} from "@/components/common"
import { DocumentBadge, LifecycleBadge } from "@/components/common/status"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStore } from "@/lib/store"
import {
  canChangeLifecycle,
  canEditRecord,
  canRevealStatutoryIds,
  canViewCompensation,
  canViewRecord,
  has,
  isDottedReport,
  isSelf,
} from "@/lib/rbac"
import {
  ARRANGEMENT_LABEL,
  CONTRACT_TYPE_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  LIFECYCLE_LABEL,
  LIFECYCLE_TRANSITIONS,
  age,
  daysUntil,
  formatDate,
  formatDateTime,
  fullName,
  ghs,
  maskId,
  relativeTime,
  yearsOfService,
} from "@/lib/format"
import { completeness } from "@/lib/selectors"
import type { LifecycleState } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ChangeStatusDialog } from "./change-status-dialog"
import { EditRecordDialog } from "./edit-record-dialog"

export default function EmployeeRecordPage() {
  const params = useParams<{ id: string }>()
  const store = useStore()
  const { viewer, employees } = store
  const employee = store.employeeById(params.id)

  const [statusOpen, setStatusOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)

  if (!employee) notFound()

  if (!canViewRecord(viewer, employee, employees)) {
    return (
      <PageShell
        crumbs={[
          { label: "Workspace", href: "/overview" },
          { label: "Employees", href: "/employees" },
          { label: "Access denied" },
        ]}
      >
        <div className="mx-auto max-w-lg rounded-xl border border-destructive/30 bg-danger-muted p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="size-5" />
          </span>
          <h1 className="mt-4 text-lg font-semibold">
            403 — You can&apos;t open this record
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {fullName(employee)} is not in your reporting line, and your current
            role does not grant organisation-wide access. This attempt has been
            written to the audit log.
          </p>
          <Button variant="outline" className="mt-5" asChild>
            <Link href="/employees">Back to directory</Link>
          </Button>
        </div>
      </PageShell>
    )
  }

  const manager = store.employeeById(employee.managerId)
  const contractEndsIn = daysUntil(employee.contractEndDate)
  const mayEdit = canEditRecord(viewer, employee)
  const mayChangeState = canChangeLifecycle(viewer)
  const record = completeness(employee)

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Employees", href: "/employees" },
        { label: fullName(employee) },
      ]}
    >
      <header className="mb-6 flex flex-wrap items-start gap-5">
        <Initials person={employee} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[26px] leading-tight font-semibold tracking-tight">
              {fullName(employee)}
            </h1>
            <LifecycleBadge state={employee.lifecycleState} />
            {contractEndsIn !== null && contractEndsIn <= 90 && (
              <Pill tone={contractEndsIn <= 7 ? "danger" : "warning"}>
                <Clock className="size-3" />
                Contract ends {formatDate(employee.contractEndDate)}
              </Pill>
            )}
            {isSelf(viewer, employee) && <Pill tone="info">This is you</Pill>}
            {isDottedReport(viewer, employee) && (
              <Pill tone="neutral">Dotted-line report</Pill>
            )}
          </div>

          <p className="mt-1.5 text-sm text-muted-foreground">
            {employee.jobTitle} · {employee.department}
            {manager && (
              <>
                {" · Reports to "}
                <Link
                  href={`/employees/${manager.id}`}
                  className="text-foreground hover:underline"
                >
                  {fullName(manager)}
                </Link>
              </>
            )}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Hash className="size-3.5" />
              <span className="font-mono text-xs">{employee.employeeId}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="size-3.5" />
              {employee.email}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="size-3.5" />
              {employee.phone}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {employee.branch}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              Joined {formatDate(employee.startDate)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {employee.lifecycleState === "pre_hire" &&
            has(viewer, "hr_admin") && (
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  toast.success(`Invite sent to ${employee.personalEmail}.`)
                }
              >
                <Send className="size-4" />
                Send invite
              </Button>
            )}
          {mayEdit && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
          {mayChangeState && (
            <Button size="lg" onClick={() => setStatusOpen(true)}>
              <RefreshCw className="size-4" />
              Change status
            </Button>
          )}
        </div>
      </header>

      {record.missing.length > 0 && has(viewer, "hr_admin") && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-warning/35 bg-warning-muted px-4 py-3">
          <AlertTriangle className="size-4 shrink-0 text-warning-foreground" />
          <p className="min-w-0 flex-1 text-sm">
            <strong className="font-medium">
              Record {record.percent}% complete.
            </strong>{" "}
            <span className="text-muted-foreground">
              {record.missing.length} field
              {record.missing.length === 1 ? "" : "s"} payroll depends on{" "}
              {record.missing.length === 1 ? "is" : "are"} still empty:{" "}
              {record.missing.join(", ")}.
            </span>
          </p>
          {mayEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditOpen(true)}
            >
              Complete now
            </Button>
          )}
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="mb-5 h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
          {[
            ["overview", "Overview"],
            ["employment", "Employment"],
            ["compensation", "Compensation"],
            ["documents", "Documents"],
            ["time", "Time & leave"],
            ["lifecycle", "Lifecycle"],
            ["audit", "Audit log"],
          ].map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="relative flex-none rounded-none border-0 border-b-2 border-transparent px-3.5 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              {label}
              {value === "compensation" &&
                !canViewCompensation(viewer, employee) && (
                  <Lock className="ml-1.5 size-3 text-muted-foreground" />
                )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            employeeId={employee.id}
            onChangeStatus={() => setStatusOpen(true)}
          />
        </TabsContent>
        <TabsContent value="employment">
          <EmploymentTab employeeId={employee.id} />
        </TabsContent>
        <TabsContent value="compensation">
          <CompensationTab employeeId={employee.id} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab employeeId={employee.id} />
        </TabsContent>
        <TabsContent value="time">
          <TimeTab employeeId={employee.id} />
        </TabsContent>
        <TabsContent value="lifecycle">
          <LifecycleTab
            employeeId={employee.id}
            onChangeStatus={() => setStatusOpen(true)}
          />
        </TabsContent>
        <TabsContent value="audit">
          <AuditTab employeeId={employee.id} />
        </TabsContent>
      </Tabs>

      <ChangeStatusDialog
        employeeId={employee.id}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />
      <EditRecordDialog
        employeeId={employee.id}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </PageShell>
  )
}

function OverviewTab({
  employeeId,
  onChangeStatus,
}: {
  employeeId: string
  onChangeStatus: () => void
}) {
  const store = useStore()
  const { viewer, employees, lifecycleEvents, auditLog } = store
  const employee = store.employeeById(employeeId)!
  const reports = employees.filter((e) => e.managerId === employeeId)
  const dottedReports = employees.filter(
    (e) => e.dottedLineManagerId === employeeId
  )
  const events = lifecycleEvents
    .filter((e) => e.employeeId === employeeId)
    .sort((a, b) => a.at.localeCompare(b.at))
  const activity = auditLog
    .filter((a) => a.employeeId === employeeId)
    .slice(0, 5)

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        <Panel title="Personal">
          <SectionGrid>
            <Field label="Full name" value={fullName(employee)} />
            <Field
              label="Date of birth"
              value={formatDate(employee.dateOfBirth)}
              hint={`${age(employee.dateOfBirth)} years old`}
            />
            <Field
              label="Gender"
              value={<span className="capitalize">{employee.gender}</span>}
            />
            <Field label="Nationality" value={employee.nationality} />
            <Field
              label="Ghana Card"
              value={<span className="font-mono">{employee.ghanaCard}</span>}
            />
            <Field label="Personal email" value={employee.personalEmail} />
            <Field
              label="GhanaPost GPS"
              value={<span className="font-mono">{employee.gpsAddress}</span>}
            />
            <Field
              label="Residential address"
              value={employee.residentialAddress}
            />
          </SectionGrid>
        </Panel>

        <Panel title="Emergency contact">
          <SectionGrid>
            <Field label="Name" value={employee.emergencyContact.name} />
            <Field
              label="Relationship"
              value={employee.emergencyContact.relationship}
            />
            <Field label="Phone" value={employee.emergencyContact.phone} />
            <Field label="Email" value={employee.emergencyContact.email} />
          </SectionGrid>
        </Panel>

        <Panel title="Employment">
          <SectionGrid>
            <Field
              label="Employee ID"
              value={<span className="font-mono">{employee.employeeId}</span>}
            />
            <Field label="Job title" value={employee.jobTitle} />
            <Field label="Department" value={employee.department} />
            <Field
              label="Employment type"
              value={EMPLOYMENT_TYPE_LABEL[employee.employmentType]}
            />
            <Field
              label="Contract"
              value={CONTRACT_TYPE_LABEL[employee.contractType]}
            />
            <Field
              label="Start date"
              value={formatDate(employee.startDate)}
              hint={`${yearsOfService(employee.startDate)} years of service`}
            />
            <Field
              label="Work arrangement"
              value={ARRANGEMENT_LABEL[employee.workArrangement]}
            />
            <Field
              label="Notice period"
              value={`${employee.noticePeriodDays} days`}
            />
          </SectionGrid>
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel
          title="Lifecycle"
          actions={
            canChangeLifecycle(viewer) && (
              <Button variant="outline" size="sm" onClick={onChangeStatus}>
                <RefreshCw className="size-3.5" />
                Change
              </Button>
            )
          }
        >
          <LifecycleBadge state={employee.lifecycleState} />
          <ol className="mt-4 space-y-3.5">
            {events.map((e, i) => (
              <li key={e.id} className="relative flex gap-3 pl-1">
                {i < events.length - 1 && (
                  <span className="absolute top-4 left-[7px] h-full w-px bg-border" />
                )}
                <span
                  className={cn(
                    "relative z-10 mt-1 size-2.5 shrink-0 rounded-full ring-4 ring-card",
                    i === events.length - 1 ? "bg-primary" : "bg-primary/35"
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {LIFECYCLE_LABEL[e.to]}
                    {i === events.length - 1 && (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        (current)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(e.effectiveDate)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Reporting">
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Line manager
              </p>
              {employee.managerId ? (
                <PersonLink id={employee.managerId} />
              ) : (
                <p className="mt-1.5 text-muted-foreground">
                  No line manager set.
                </p>
              )}
            </div>
            <div>
              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Dotted-line manager
              </p>
              {employee.dottedLineManagerId ? (
                <PersonLink id={employee.dottedLineManagerId} />
              ) : (
                <p className="mt-1.5 text-muted-foreground">None.</p>
              )}
            </div>
            <div>
              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Direct reports ({reports.length})
              </p>
              {reports.length === 0 ? (
                <p className="mt-1.5 text-muted-foreground">
                  {employee.firstName} doesn&apos;t manage anyone yet.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {reports.map((r) => (
                    <li key={r.id}>
                      <PersonLink id={r.id} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {dottedReports.length > 0 && (
              <div>
                <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Dotted-line reports ({dottedReports.length})
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {dottedReports.map((r) => (
                    <li key={r.id}>
                      <PersonLink id={r.id} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Recent activity" bodyClassName="px-5 py-4">
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing recorded yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-2.5">
                  <Initials
                    person={store.employeeById(a.actorId) ?? "System"}
                    size="xs"
                  />
                  <div className="min-w-0 text-sm">
                    <p className="leading-snug">
                      <span className="font-medium">
                        {fullName(store.employeeById(a.actorId))}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {a.action.toLowerCase()}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(a.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

function PersonLink({ id }: { id: string }) {
  const store = useStore()
  const person = store.employeeById(id)
  if (!person) return <span className="text-muted-foreground">—</span>
  return (
    <Link
      href={`/employees/${person.id}`}
      className="mt-1.5 flex items-center gap-2 transition-colors hover:text-primary"
    >
      <Initials person={person} size="xs" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {fullName(person)}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {person.jobTitle}
        </span>
      </span>
    </Link>
  )
}

function EmploymentTab({ employeeId }: { employeeId: string }) {
  const store = useStore()
  const employee = store.employeeById(employeeId)!

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Position">
        <SectionGrid>
          <Field label="Job title" value={employee.jobTitle} />
          <Field label="Department" value={employee.department} />
          <Field label="Work location" value={employee.branch} />
          <Field
            label="Work arrangement"
            value={ARRANGEMENT_LABEL[employee.workArrangement]}
          />
          <Field
            label="Employment type"
            value={EMPLOYMENT_TYPE_LABEL[employee.employmentType]}
          />
          <Field
            label="Contract type"
            value={CONTRACT_TYPE_LABEL[employee.contractType]}
          />
          <Field
            label="Working hours"
            value={`${employee.workingHoursPerWeek} hrs / week`}
          />
          <Field label="Pay grade" value={employee.compensation.payGrade} />
        </SectionGrid>
      </Panel>

      <Panel title="Dates">
        <SectionGrid>
          <Field
            label="Start date"
            value={formatDate(employee.startDate)}
            hint={`${yearsOfService(employee.startDate)} years of service`}
          />
          <Field
            label="Probation ends"
            value={
              employee.probationEndDate
                ? formatDate(employee.probationEndDate)
                : "N/A"
            }
          />
          <Field
            label="Contract ends"
            value={
              employee.contractEndDate ? (
                <span
                  className={cn(
                    (daysUntil(employee.contractEndDate) ?? 999) <= 30 &&
                      "text-destructive"
                  )}
                >
                  {formatDate(employee.contractEndDate)}
                </span>
              ) : (
                "No end date — permanent"
              )
            }
            hint={
              employee.contractEndDate
                ? relativeTime(employee.contractEndDate)
                : undefined
            }
          />
          <Field
            label="Notice period"
            value={`${employee.noticePeriodDays} days`}
          />
        </SectionGrid>
      </Panel>

      <Panel title="Reporting line" className="lg:col-span-2">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Reports to (line manager)
            </p>
            {employee.managerId ? (
              <PersonLink id={employee.managerId} />
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">—</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Approves leave and timesheets. Cannot see salary.
            </p>
          </div>
          <div>
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Dotted-line manager
            </p>
            {employee.dottedLineManagerId ? (
              <PersonLink id={employee.dottedLineManagerId} />
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">None.</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Secondary/matrix line. Can also approve leave; no salary access.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  )
}

function CompensationTab({ employeeId }: { employeeId: string }) {
  const store = useStore()
  const { viewer } = store
  const employee = store.employeeById(employeeId)!
  const [revealed, setRevealed] = React.useState(false)
  const [purpose, setPurpose] = React.useState("")

  if (!canViewCompensation(viewer, employee)) {
    return (
      <Panel>
        <EmptyState
          icon={Lock}
          title="Compensation is not visible to your role"
          description="Salary is restricted to the employee, HR Admin, Payroll and the Owner. Line managers route compensation conversations through HR — this is a deliberate boundary, not a missing permission."
        />
      </Panel>
    )
  }

  const c = employee.compensation
  const mayReveal = canRevealStatutoryIds(viewer, employee)

  function reveal() {
    if (!revealed && purpose.trim().length < 8) {
      toast.error("State a purpose before revealing statutory IDs.")
      return
    }
    if (!revealed) {
      store.log({
        employeeId: employee.id,
        action: "Revealed statutory IDs",
        field: "ssnitNumber, tin",
        purpose: purpose.trim(),
      })
      toast.success("Revealed. This access is recorded in the audit log.")
    }
    setRevealed((v) => !v)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel
        title="Compensation"
        description="All amounts in Ghana Cedis (GHS)."
        actions={
          <Restricted reason="Visible to employee, HR Admin and Payroll only" />
        }
      >
        <SectionGrid>
          <Field
            label="Gross monthly"
            value={<span className="tabular">{ghs(c.grossMonthly)}</span>}
          />
          <Field
            label="Annualised cost"
            value={<span className="tabular">{ghs(c.grossMonthly * 12)}</span>}
          />
          <Field
            label="Pay frequency"
            value={c.payFrequency === "monthly" ? "Monthly" : "Bi-weekly"}
          />
          <Field label="Pay grade" value={c.payGrade} />
          <Field label="Effective from" value={formatDate(c.effectiveFrom)} />
          <Field label="Currency" value="GHS — Ghana Cedi" />
        </SectionGrid>
      </Panel>

      <Panel
        title="Statutory & tax"
        description="Revealing these numbers is logged against your name with the purpose you state."
        actions={
          mayReveal && (
            <Button variant="outline" size="sm" onClick={reveal}>
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
        {!revealed && mayReveal && (
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Purpose for access
            </label>
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. September payroll run reconciliation"
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            />
          </div>
        )}
        <SectionGrid>
          <Field
            label="SSNIT number"
            value={
              <span className="font-mono">
                {revealed ? c.ssnitNumber : maskId(c.ssnitNumber)}
              </span>
            }
          />
          <Field
            label="TIN"
            value={
              <span className="font-mono">
                {revealed ? c.tin : maskId(c.tin)}
              </span>
            }
          />
          <Field label="Tier 2 provider" value={c.tier2Provider} />
          <Field label="Tier 3 (voluntary)" value={c.tier3Provider ?? "None"} />
        </SectionGrid>
      </Panel>

      <Panel title="Payment method" className="lg:col-span-2">
        <SectionGrid cols={3}>
          <Field
            label="Method"
            value={
              c.paymentMethod === "mobile_money"
                ? "Mobile money"
                : "Bank transfer"
            }
          />
          {c.paymentMethod === "mobile_money" ? (
            <>
              <Field label="Provider" value={c.momoProvider ?? "—"} />
              <Field label="Number" value={c.momoNumber ?? "—"} />
            </>
          ) : (
            <>
              <Field label="Bank" value={c.bankName ?? "—"} />
              <Field
                label="Account"
                value={
                  <span className="font-mono">{c.bankAccount ?? "—"}</span>
                }
              />
            </>
          )}
        </SectionGrid>
      </Panel>
    </div>
  )
}

function DocumentsTab({ employeeId }: { employeeId: string }) {
  const store = useStore()
  const { viewer, documents } = store
  const employee = store.employeeById(employeeId)!
  const mine = documents.filter((d) => d.employeeId === employeeId)
  const canSeeConfidential = has(viewer, "hr_admin") || isSelf(viewer, employee)
  const visible = mine.filter((d) => !d.confidential || canSeeConfidential)
  const hidden = mine.length - visible.length

  return (
    <Panel
      title="Documents"
      description={`${visible.length} on file${hidden > 0 ? ` · ${hidden} withheld from your role` : ""}`}
      bodyClassName="p-0"
      actions={
        (has(viewer, "hr_admin") || isSelf(viewer, employee)) && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast("Choose a file to upload.")}
          >
            Upload
          </Button>
        )
      }
    >
      {visible.length === 0 ? (
        <EmptyState icon={Lock} title="No documents on file" />
      ) : (
        <ul className="divide-y">
          {visible.map((d) => {
            const expires = daysUntil(d.expiresOn)
            return (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-3 px-5 py-3.5"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M14 3v5h5M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {d.name}
                    {d.confidential && (
                      <Lock className="ml-1.5 inline size-3 text-muted-foreground" />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {d.category} · {d.sizeKb} KB · uploaded{" "}
                    {formatDate(d.uploadedAt)}
                  </p>
                </div>
                {d.expiresOn && (
                  <span
                    className={cn(
                      "tabular text-xs",
                      expires !== null && expires <= 60
                        ? "font-medium text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    expires {formatDate(d.expiresOn)}
                  </span>
                )}
                <DocumentBadge status={d.status} />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toast("Download started.")}
                >
                  Download
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      {hidden > 0 && (
        <div className="border-t px-5 py-3 text-xs text-muted-foreground">
          {hidden} medical document{hidden === 1 ? "" : "s"} withheld. Medical
          records use purpose-based access — HR must state a reason, and
          seniority alone does not grant it.
        </div>
      )}
    </Panel>
  )
}

function TimeTab({ employeeId }: { employeeId: string }) {
  const store = useStore()
  const { attendance, leaveRequests, leaveBalances } = store
  const records = attendance
    .filter((a) => a.employeeId === employeeId && a.status !== "weekend")
    .slice(-10)
    .reverse()
  const requests = leaveRequests.filter((r) => r.employeeId === employeeId)
  const balance = leaveBalances.find((b) => b.employeeId === employeeId)
  const remaining = balance
    ? balance.annualEntitlement +
      balance.carriedOver -
      balance.annualTaken -
      balance.annualPending
    : 0

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Leave balance">
        <SectionGrid>
          <Field
            label="Annual entitlement"
            value={`${balance?.annualEntitlement ?? 0} days`}
          />
          <Field
            label="Carried over"
            value={`${balance?.carriedOver ?? 0} days`}
          />
          <Field label="Taken" value={`${balance?.annualTaken ?? 0} days`} />
          <Field
            label="Pending"
            value={`${balance?.annualPending ?? 0} days`}
          />
          <Field
            label="Remaining"
            value={<span className="text-primary">{remaining} days</span>}
          />
          <Field
            label="Sick leave used"
            value={`${balance?.sickTaken ?? 0} of ${balance?.sickEntitlement ?? 0} days`}
          />
        </SectionGrid>
      </Panel>

      <Panel title="Recent attendance" bodyClassName="p-0">
        {records.length === 0 ? (
          <EmptyState icon={Clock} title="No attendance recorded" />
        ) : (
          <ul className="divide-y text-sm">
            {records.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="tabular w-24 shrink-0 text-muted-foreground">
                  {formatDate(r.date)}
                </span>
                <span className="tabular flex-1 text-xs text-muted-foreground">
                  {r.clockIn ? `${r.clockIn} – ${r.clockOut}` : "—"}
                </span>
                <span className="tabular w-14 text-right text-xs">
                  {r.hours > 0 ? `${r.hours}h` : "—"}
                </span>
                <span className="w-24 text-right">
                  <Pill
                    tone={
                      r.status === "present" || r.status === "remote"
                        ? "success"
                        : r.status === "late"
                          ? "warning"
                          : r.status === "absent"
                            ? "danger"
                            : "neutral"
                    }
                  >
                    {r.status === "on_leave" ? "On leave" : r.status}
                  </Pill>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Leave history"
        className="lg:col-span-2"
        bodyClassName="p-0"
      >
        {requests.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No leave requests" />
        ) : (
          <ul className="divide-y">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 px-5 py-3.5"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {r.id}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium capitalize">
                    {r.type} · {r.days} {r.days === 1 ? "day" : "days"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.startDate)} – {formatDate(r.endDate)} ·{" "}
                    {r.reason}
                  </p>
                </div>
                <Pill
                  tone={
                    r.status === "approved"
                      ? "success"
                      : r.status === "pending"
                        ? "warning"
                        : r.status === "rejected"
                          ? "danger"
                          : "neutral"
                  }
                >
                  {r.status}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function LifecycleTab({
  employeeId,
  onChangeStatus,
}: {
  employeeId: string
  onChangeStatus: () => void
}) {
  const store = useStore()
  const { viewer, lifecycleEvents } = store
  const employee = store.employeeById(employeeId)!
  const events = lifecycleEvents
    .filter((e) => e.employeeId === employeeId)
    .sort((a, b) => b.at.localeCompare(a.at))

  return (
    <Panel
      title="Lifecycle history"
      description="Every state change is logged with actor, timestamp and reason. Records cannot be deleted."
      bodyClassName="p-0"
      actions={
        canChangeLifecycle(viewer) && (
          <Button size="sm" onClick={onChangeStatus}>
            <RefreshCw className="size-3.5" />
            Change status
          </Button>
        )
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-3">
        <span className="flex items-center gap-2.5 text-sm">
          <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
            Current state
          </span>
          <LifecycleBadge state={employee.lifecycleState} />
        </span>
        <AllowedTransitions state={employee.lifecycleState} />
      </div>

      {events.length === 0 ? (
        <EmptyState icon={RefreshCw} title="No state changes recorded" />
      ) : (
        <ul className="divide-y">
          {events.map((e) => (
            <li key={e.id} className="flex gap-3.5 px-5 py-4">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-success-muted text-primary">
                <RefreshCw className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm">
                  {e.from && (
                    <>
                      <LifecycleBadge state={e.from} />
                      <span className="text-muted-foreground/50">›</span>
                    </>
                  )}
                  <LifecycleBadge state={e.to} />
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  by {fullName(store.employeeById(e.actorId))} ·{" "}
                  {formatDateTime(e.at)} · effective{" "}
                  {formatDate(e.effectiveDate)}
                </p>
                {e.reason && (
                  <p className="mt-2 rounded-lg border-l-2 border-border bg-muted/50 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Reason:</span>{" "}
                    {e.reason}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function AllowedTransitions({ state }: { state: LifecycleState }) {
  const next = LIFECYCLE_TRANSITIONS[state]
  if (next.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        This is an end state — no further transitions are permitted.
      </span>
    )
  }
  return (
    <span className="text-xs text-muted-foreground">
      From{" "}
      <strong className="font-medium text-foreground">
        {LIFECYCLE_LABEL[state]}
      </strong>
      , allowed transitions:{" "}
      {next.map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 && ", "}
          <strong className="font-medium text-foreground">
            {LIFECYCLE_LABEL[n]}
          </strong>
        </React.Fragment>
      ))}
    </span>
  )
}

function AuditTab({ employeeId }: { employeeId: string }) {
  const store = useStore()
  const { viewer, auditLog } = store

  if (!has(viewer, "hr_admin")) {
    return (
      <Panel>
        <EmptyState
          icon={Lock}
          title="The audit log is restricted to HR Admin"
          description="Attribution exists so that every edit is answerable to a person. Read access to the full log is narrower than write access to the record."
        />
      </Panel>
    )
  }

  const entries = auditLog.filter((a) => a.employeeId === employeeId)

  return (
    <Panel
      title="Audit log"
      description="Immutable. Every entry is attributed to an individual and cannot be edited or removed."
      bodyClassName="p-0"
    >
      {entries.length === 0 ? (
        <EmptyState icon={Clock} title="No entries yet" />
      ) : (
        <ul className="divide-y">
          {entries.map((a) => (
            <li key={a.id} className="flex gap-3 px-5 py-3.5">
              <Initials
                person={store.employeeById(a.actorId) ?? "System"}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">
                    {fullName(store.employeeById(a.actorId))}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {a.action.toLowerCase()}
                  </span>
                  {a.field && (
                    <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                      {a.field}
                    </span>
                  )}
                </p>
                {(a.before || a.after) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.before && (
                      <span className="line-through">{a.before}</span>
                    )}
                    {a.before && a.after && " → "}
                    {a.after && (
                      <span className="text-foreground">{a.after}</span>
                    )}
                  </p>
                )}
                {a.purpose && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Stated purpose: <em>{a.purpose}</em>
                  </p>
                )}
              </div>
              <span className="tabular shrink-0 text-xs text-muted-foreground">
                {formatDateTime(a.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
