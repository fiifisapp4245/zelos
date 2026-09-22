"use client"

import * as React from "react"
import { Lock } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStore } from "@/lib/store"
import { canSelfEdit, has, isSelf } from "@/lib/rbac"
import { fullName } from "@/lib/format"
import type { Employee } from "@/lib/types"

interface EditableField {
  key: string
  label: string
  /** Fields outside SELF_EDITABLE_FIELDS need HR to change them. */
  hrOnly?: boolean
  placeholder?: string
}

const FIELDS: EditableField[] = [
  { key: "phone", label: "Phone number", placeholder: "+233 24 456 7890" },
  { key: "personalEmail", label: "Personal email" },
  { key: "residentialAddress", label: "Residential address" },
  {
    key: "gpsAddress",
    label: "GhanaPost GPS address",
    placeholder: "GA-183-4290",
  },
  { key: "emergencyContact.name", label: "Emergency contact name" },
  {
    key: "emergencyContact.relationship",
    label: "Emergency contact relationship",
  },
  { key: "emergencyContact.phone", label: "Emergency contact phone" },
  { key: "jobTitle", label: "Job title", hrOnly: true },
  { key: "department", label: "Department", hrOnly: true },
  { key: "email", label: "Work email", hrOnly: true },
  { key: "ghanaCard", label: "Ghana Card", hrOnly: true },
]

function read(employee: Employee, path: string): string {
  return String(
    path
      .split(".")
      .reduce<unknown>(
        (acc, k) => (acc as Record<string, unknown>)?.[k],
        employee
      ) ?? ""
  )
}

export function EditRecordSheet({
  employeeId,
  open,
  onOpenChange,
}: {
  employeeId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const store = useStore()
  const employee = store.employeeById(employeeId)

  if (!employee) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-[520px]">
        <EditForm employeeId={employeeId} onOpenChange={onOpenChange} />
      </SheetContent>
    </Sheet>
  )
}

/** Mounted with the sheet, so the form is seeded fresh each time it opens. */
function EditForm({
  employeeId,
  onOpenChange,
}: {
  employeeId: string
  onOpenChange: (v: boolean) => void
}) {
  const store = useStore()
  const { viewer } = store
  const employee = store.employeeById(employeeId)
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    employee
      ? Object.fromEntries(FIELDS.map((f) => [f.key, read(employee, f.key)]))
      : {}
  )

  if (!employee) return null

  const isHr = has(viewer, "hr_admin")
  const self = isSelf(viewer, employee)

  function editable(f: EditableField) {
    if (isHr) return true
    // An employee may only change the narrow self-service set on their own record.
    return self && !f.hrOnly && canSelfEdit(f.key.split(".")[0])
  }

  function save() {
    const patch: Partial<Employee> = {}
    const emergency = { ...employee!.emergencyContact }
    let touchedEmergency = false

    FIELDS.filter(editable).forEach((f) => {
      const next = values[f.key] ?? ""
      if (next === read(employee!, f.key)) return
      if (f.key.startsWith("emergencyContact.")) {
        const sub = f.key.split(".")[1] as keyof typeof emergency
        emergency[sub] = next
        touchedEmergency = true
      } else {
        ;(patch as Record<string, unknown>)[f.key] = next
      }
    })

    if (touchedEmergency) patch.emergencyContact = emergency
    if (Object.keys(patch).length === 0) {
      toast("Nothing changed.")
      onOpenChange(false)
      return
    }

    store.patchEmployee(employeeId, patch)
    toast.success("Saved. The change is attributed to you in the audit log.")
    onOpenChange(false)
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>Edit {fullName(employee)}</SheetTitle>
        <SheetDescription>
          {isHr
            ? "Every change is written to the audit log against your name."
            : "You can update your contact details. Anything else routes through HR."}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-4 overflow-y-auto px-4">
        {FIELDS.map((f) => {
          const can = editable(f)
          return (
            <div key={f.key}>
              <Label
                htmlFor={f.key}
                className="mb-1.5 flex items-center gap-1.5 text-sm"
              >
                {f.label}
                {!can && <Lock className="size-3 text-muted-foreground" />}
              </Label>
              <Input
                id={f.key}
                value={values[f.key] ?? ""}
                placeholder={f.placeholder}
                disabled={!can}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
                className="h-10"
              />
              {!can && (
                <p className="mt-1 text-xs text-muted-foreground">
                  HR Admin changes this field.
                </p>
              )}
            </div>
          )
        })}
      </div>

      <SheetFooter>
        <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button size="lg" onClick={save}>
          Save changes
        </Button>
      </SheetFooter>
    </>
  )
}
