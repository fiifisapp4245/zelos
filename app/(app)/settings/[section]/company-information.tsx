"use client"

import * as React from "react"
import Link from "next/link"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Field, Panel, Pill, SectionGrid } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useStore } from "@/lib/store"
import { isOnStrength } from "@/lib/selectors"
import type { CompanyProfile } from "@/lib/types"

interface FieldSpec {
  key: keyof CompanyProfile
  label: string
  hint?: string
}

const PROFILE_FIELDS: FieldSpec[] = [
  { key: "legalName", label: "Legal name" },
  { key: "tradingName", label: "Trading name" },
  { key: "industry", label: "Industry" },
  { key: "companySize", label: "Company size" },
]

const REGISTRATION_FIELDS: FieldSpec[] = [
  { key: "registrationNumber", label: "Business registration number" },
  { key: "tin", label: "TIN", hint: "Ghana Revenue Authority" },
  {
    key: "ssnitEmployerNumber",
    label: "SSNIT employer number",
    hint: "Appears on every statutory filing",
  },
  { key: "incorporatedOn", label: "Date of incorporation" },
]

const CONTACT_FIELDS: FieldSpec[] = [
  { key: "companyEmail", label: "Company email" },
  { key: "website", label: "Website" },
  { key: "mainLine", label: "Main line" },
  { key: "postalAddress", label: "Postal address" },
]

export function CompanyInformation() {
  const { company } = useStore()
  const [editing, setEditing] = React.useState(false)

  return (
    <div className="space-y-5">
      <ProfileCard onEdit={() => setEditing(true)} />

      <Panel
        title="Registration"
        actions={
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
        }
      >
        <SectionGrid>
          {REGISTRATION_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} value={company[f.key]} />
          ))}
        </SectionGrid>
      </Panel>

      <Panel
        title="Contact"
        actions={
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
        }
      >
        <SectionGrid>
          {CONTACT_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} value={company[f.key]} />
          ))}
        </SectionGrid>
      </Panel>

      <Offices />

      {editing && <EditCompanySheet onClose={() => setEditing(false)} />}
    </div>
  )
}

function ProfileCard({ onEdit }: { onEdit: () => void }) {
  const { company } = useStore()
  const initial = company.tradingName.trim().charAt(0).toUpperCase() || "?"

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="relative h-36 overflow-hidden bg-success-muted">
        <svg
          viewBox="0 0 800 160"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 size-full text-primary"
          aria-hidden
        >
          <path
            d="M0 96c90-52 150 34 250 10s130-86 230-70 150 96 240 74v50H0Z"
            fill="currentColor"
            opacity=".16"
          />
          <ellipse cx="690" cy="34" rx="130" ry="76" fill="currentColor" opacity=".2" />
          <ellipse cx="120" cy="-10" rx="90" ry="60" fill="currentColor" opacity=".14" />
          <path
            d="M150 -20c46 54 6 108 92 150M420 -30c-24 64 44 86 32 172M640 -16c12 56-64 76-30 164"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            opacity=".22"
          />
        </svg>
      </div>

      {/* Positioned so the logo tile sits above the banner, which is relative. */}
      <div className="relative z-10 px-6 pb-6">
        <div className="-mt-12 mb-5 grid size-24 place-items-center rounded-xl border-4 border-card bg-card shadow-sm">
          <span className="grid size-14 place-items-center rounded-lg bg-primary text-xl font-semibold text-primary-foreground">
            {initial}
          </span>
        </div>

        <SectionGrid>
          {PROFILE_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} value={company[f.key]} />
          ))}
        </SectionGrid>

        <Button size="lg" className="mt-6" onClick={onEdit}>
          <Pencil className="size-4" />
          Edit profile
        </Button>
      </div>
    </section>
  )
}

/**
 * Offices are the branches configured under Organizational structure, so the
 * two screens can never drift apart.
 */
function Offices() {
  const { branches, employees } = useStore()
  const active = branches.filter((b) => !b.archived)

  return (
    <Panel
      title="Offices"
      description="Managed under Organizational structure — adding or archiving one happens there."
      bodyClassName="space-y-3 p-4"
      actions={
        <Button size="sm" variant="outline" asChild>
          <Link href="/structure">Manage offices</Link>
        </Button>
      }
    >
      {active.map((branch, i) => (
        <div
          key={branch.id}
          className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {/* "Accra HQ" already reads as an office; "Kumasi" does not. */}
                {/office|hq/i.test(branch.name) ? branch.name : `${branch.name} Office`}
              </span>
              {i === 0 && <Pill tone="success">Head office</Pill>}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ghana &bull; {branch.city} &bull; +233 24 ****4567 &bull;{" "}
              {employees.filter((e) => e.branch === branch.name && isOnStrength(e)).length}{" "}
              people
            </p>
          </div>
          <Link
            href="/structure"
            aria-label={`Edit ${branch.name}`}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-4" />
          </Link>
          <button
            type="button"
            aria-label={`Remove ${branch.name}`}
            onClick={() => toast("Archive a branch from Organizational structure.")}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
    </Panel>
  )
}

const GROUPS: { title: string; fields: FieldSpec[] }[] = [
  { title: "Profile", fields: PROFILE_FIELDS },
  { title: "Registration", fields: REGISTRATION_FIELDS },
  { title: "Contact", fields: CONTACT_FIELDS },
]

/** Mounted only while open, so the form seeds fresh each time. */
function EditCompanySheet({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const [values, setValues] = React.useState<CompanyProfile>({ ...store.company })

  const changed = (Object.keys(values) as (keyof CompanyProfile)[]).filter(
    (k) => values[k] !== store.company[k]
  )

  function save() {
    const blank = [...PROFILE_FIELDS, ...REGISTRATION_FIELDS, ...CONTACT_FIELDS].find(
      (f) => !values[f.key].trim()
    )
    if (blank) {
      toast.error(`${blank.label} cannot be empty.`)
      return
    }
    if (changed.length === 0) {
      toast("Nothing changed.")
      onClose()
      return
    }
    store.updateCompany(
      Object.fromEntries(changed.map((k) => [k, values[k].trim()]))
    )
    toast.success(
      `Saved ${changed.length} change${changed.length === 1 ? "" : "s"}. Recorded in the audit log.`
    )
    onClose()
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex w-full flex-col sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle>Edit company information</SheetTitle>
          <SheetDescription>
            These details appear on pay slips and statutory filings. Every change is
            written to the audit log against your name.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {group.title}
              </p>
              <div className="space-y-4">
                {group.fields.map((f) => (
                  <div key={f.key}>
                    <Label htmlFor={f.key} className="mb-1.5 block text-sm">
                      {f.label}
                    </Label>
                    <Input
                      id={f.key}
                      value={values[f.key]}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [f.key]: e.target.value }))
                      }
                      className="h-10"
                    />
                    {f.hint && (
                      <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <SheetFooter>
          <p className="mr-auto self-center text-xs text-muted-foreground">
            {changed.length === 0
              ? "No changes yet"
              : `${changed.length} field${changed.length === 1 ? "" : "s"} changed`}
          </p>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save}>
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
