"use client"

import * as React from "react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { FilePicker } from "@/components/common/file-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormRow, NativeSelect } from "@/components/talent/form"
import { useStore } from "@/lib/store"
import { has, isSelf } from "@/lib/rbac"
import { TODAY_ISO, fullName, formatDateTime } from "@/lib/format"
import { visibleEmployees } from "@/lib/selectors"
import { fileFor, rememberFile, sizeKb } from "@/lib/talent/case-files"
import type { EmployeeDocument } from "@/lib/types"

export const DOC_CATEGORY_LABEL: Record<EmployeeDocument["category"], string> =
  {
    contract: "Contract",
    identity: "Identity",
    certificate: "Certificate",
    statutory: "Statutory",
    medical: "Medical",
    other: "Other",
  }
export const DOC_CATEGORIES = Object.keys(
  DOC_CATEGORY_LABEL
) as EmployeeDocument["category"][]

/** Categories whose documents lapse, so the date is asked for rather than optional. */
const EXPIRING: EmployeeDocument["category"][] = [
  "identity",
  "certificate",
  "medical",
]

const docId = () => `doc-${Math.random().toString(36).slice(2, 8)}`

/**
 * Upload, or replace, a document. An employee can only add to their own
 * file; HR can add to anyone's. Whatever is uploaded waits for HR to verify
 * it, so an upload is never mistaken for a checked document.
 */
export function UploadDocumentDialog({
  employeeId,
  category: presetCategory,
  replace,
  onClose,
}: {
  employeeId?: string
  category?: EmployeeDocument["category"]
  replace?: EmployeeDocument
  onClose: () => void
}) {
  const store = useStore()
  const { viewer, employees } = store
  const isHr = has(viewer, "hr_admin")
  const people = isHr
    ? visibleEmployees(viewer, employees)
    : employees.filter((e) => isSelf(viewer, e))

  const [who, setWho] = React.useState(
    replace?.employeeId ?? employeeId ?? (isHr ? "" : (people[0]?.id ?? ""))
  )
  const [category, setCategory] = React.useState<EmployeeDocument["category"]>(
    replace?.category ?? presetCategory ?? "contract"
  )
  const [files, setFiles] = React.useState<File[]>([])
  const [name, setName] = React.useState(replace?.name ?? "")
  const [expires, setExpires] = React.useState(replace?.expiresOn ?? "")
  const [confidential, setConfidential] = React.useState(
    replace?.confidential ?? (presetCategory ?? "contract") === "medical"
  )
  const [touched, setTouched] = React.useState(false)

  const errors = {
    who: who ? null : "Choose whose document this is.",
    file: files.length > 0 ? null : "Choose a file.",
    expires:
      EXPIRING.includes(category) && !expires
        ? "Add the expiry date so the alert can fire."
        : expires && expires < TODAY_ISO && !replace
          ? "That date has already passed."
          : null,
  }

  function save() {
    setTouched(true)
    if (errors.who || errors.file || errors.expires) return
    const file = files[0]
    const id = replace?.id ?? docId()
    rememberFile(id, file)
    const display = name.trim() || file.name
    if (replace) {
      store.updateDocument(replace.id, {
        name: display,
        sizeKb: sizeKb(file),
        uploadedAt: new Date().toISOString(),
        uploadedBy: viewer.employeeId,
        expiresOn: expires || null,
        status: "pending",
      })
      toast.success(`${display} replaced. It is waiting to be verified.`)
    } else {
      store.addDocuments([
        {
          id,
          employeeId: who,
          name: display,
          category,
          status: "pending",
          uploadedAt: new Date().toISOString(),
          uploadedBy: viewer.employeeId,
          expiresOn: expires || null,
          sizeKb: sizeKb(file),
          confidential: confidential || category === "medical",
        },
      ])
      toast.success(
        `${display} uploaded for ${fullName(store.employeeById(who))}.`
      )
    }
    onClose()
  }

  return (
    <FormDialog
      title={replace ? `Replace ${replace.name}` : "Upload a document"}
      description={
        replace
          ? "The new file replaces the old one and goes back to being verified."
          : "Added to the employee's file, and verified by HR before it counts."
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save}>
            {replace ? "Replace" : "Upload"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!replace && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormRow
              label="Employee"
              htmlFor="ud-who"
              error={touched ? errors.who : null}
            >
              <NativeSelect
                id="ud-who"
                value={who}
                disabled={!!employeeId || !isHr}
                onChange={(e) => setWho(e.target.value)}
              >
                {isHr && !employeeId && <option value="">Choose…</option>}
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {fullName(p)}
                  </option>
                ))}
              </NativeSelect>
            </FormRow>
            <FormRow label="Category" htmlFor="ud-cat">
              <NativeSelect
                id="ud-cat"
                value={category}
                onChange={(e) => {
                  const c = e.target.value as EmployeeDocument["category"]
                  setCategory(c)
                  if (c === "medical") setConfidential(true)
                }}
              >
                {DOC_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {DOC_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </NativeSelect>
            </FormRow>
          </div>
        )}
        <div>
          <FilePicker files={files} onChange={setFiles} multiple={false} />
          {touched && errors.file && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {errors.file}
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow
            label="Name"
            htmlFor="ud-name"
            hint="Defaults to the file name."
          >
            <Input
              id="ud-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormRow>
          <FormRow
            label={`Expires on${EXPIRING.includes(category) ? "" : " (optional)"}`}
            htmlFor="ud-exp"
            error={touched ? errors.expires : null}
          >
            <Input
              id="ud-exp"
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </FormRow>
        </div>
        {!replace && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--primary)]"
              checked={confidential || category === "medical"}
              disabled={category === "medical"}
              onChange={(e) => setConfidential(e.target.checked)}
            />
            <span>
              Confidential
              <span className="block text-xs text-muted-foreground">
                Only HR and the employee can see it. Medical documents are
                always confidential.
              </span>
            </span>
          </label>
        )}
      </div>
    </FormDialog>
  )
}

/** Edit what is recorded about a document, not the file itself. */
export function EditDocumentDialog({
  doc,
  onClose,
}: {
  doc: EmployeeDocument
  onClose: () => void
}) {
  const store = useStore()
  const [name, setName] = React.useState(doc.name)
  const [category, setCategory] = React.useState(doc.category)
  const [expires, setExpires] = React.useState(doc.expiresOn ?? "")
  const [confidential, setConfidential] = React.useState(doc.confidential)
  const [touched, setTouched] = React.useState(false)
  const nameError = name.trim() ? null : "A document needs a name."
  const expError =
    EXPIRING.includes(category) && !expires ? "Add the expiry date." : null

  return (
    <FormDialog
      title="Edit document details"
      description="Changes are logged. To change the file itself, replace it."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={() => {
              setTouched(true)
              if (nameError || expError) return
              const patch: Partial<EmployeeDocument> = {
                name: name.trim(),
                category,
                expiresOn: expires || null,
                confidential: confidential || category === "medical",
              }
              const changed = (
                Object.keys(patch) as (keyof typeof patch)[]
              ).some((k) => patch[k] !== doc[k])
              if (!changed) {
                toast("Nothing changed.")
                onClose()
                return
              }
              store.updateDocument(doc.id, patch)
              toast.success("Details updated.")
              onClose()
            }}
          >
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormRow
          label="Name"
          htmlFor="ed-name"
          error={touched ? nameError : null}
        >
          <Input
            id="ed-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormRow>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Category" htmlFor="ed-cat">
            <NativeSelect
              id="ed-cat"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as EmployeeDocument["category"])
              }
            >
              {DOC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {DOC_CATEGORY_LABEL[c]}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          <FormRow
            label="Expires on"
            htmlFor="ed-exp"
            error={touched ? expError : null}
          >
            <Input
              id="ed-exp"
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </FormRow>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={confidential || category === "medical"}
            disabled={category === "medical"}
            onChange={(e) => setConfidential(e.target.checked)}
          />
          Confidential
        </label>
      </div>
    </FormDialog>
  )
}

export function RemoveDocumentDialog({
  doc,
  onClose,
}: {
  doc: EmployeeDocument
  onClose: () => void
}) {
  const store = useStore()
  const emp = store.employeeById(doc.employeeId)
  return (
    <FormDialog
      title="Remove this document?"
      description={`${doc.name} will be taken off ${fullName(emp)}'s file.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Keep it
          </Button>
          <Button
            variant="destructive"
            size="lg"
            onClick={() => {
              store.deleteDocument(doc.id)
              toast.success(`${doc.name} removed. Logged in the audit trail.`)
              onClose()
            }}
          >
            Remove document
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        The removal is recorded with your name and the time. It cannot be undone
        from here; upload the document again if it was removed by mistake.
      </p>
    </FormDialog>
  )
}

/** History of one document, read from the audit log. */
export function DocumentHistoryDialog({
  doc,
  onClose,
}: {
  doc: EmployeeDocument
  onClose: () => void
}) {
  const store = useStore()
  const entries = store.auditLog
    .filter(
      (a) =>
        a.employeeId === doc.employeeId &&
        (a.action.includes(doc.name) || a.before === doc.name)
    )
    .slice(0, 12)
  return (
    <FormDialog
      title={doc.name}
      description="Who uploaded it, and what has happened to it since."
      onClose={onClose}
      footer={
        <Button size="lg" variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <dl className="mb-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Employee</dt>
          <dd>{fullName(store.employeeById(doc.employeeId))}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Uploaded by</dt>
          <dd>{fullName(store.employeeById(doc.uploadedBy))}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Uploaded</dt>
          <dd>{formatDateTime(doc.uploadedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Size</dt>
          <dd>{doc.sizeKb} KB</dd>
        </div>
      </dl>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No changes recorded since it was added.
        </p>
      ) : (
        <ol className="space-y-3 border-l pl-4">
          {entries.map((e) => (
            <li key={e.id} className="text-sm">
              <p>{e.action}</p>
              <p className="text-xs text-muted-foreground">
                {fullName(store.employeeById(e.actorId))} ·{" "}
                {formatDateTime(e.at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </FormDialog>
  )
}

/**
 * Opens the real file when this tab still holds it. For a document that was
 * seeded, the prototype has no file, so what it hands over is the record of
 * the document — and says so, rather than pretending to be the file.
 */
export function downloadDocument(doc: EmployeeDocument, ownerName: string) {
  const file = fileFor(doc.id)
  if (file) {
    const url = URL.createObjectURL(file)
    const a = document.createElement("a")
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success(`${file.name} downloaded.`)
    return
  }
  const text = [
    `Document record: ${doc.name}`,
    `Employee: ${ownerName}`,
    `Category: ${DOC_CATEGORY_LABEL[doc.category]}`,
    `Status: ${doc.status}`,
    `Uploaded: ${doc.uploadedAt}`,
    `Expires: ${doc.expiresOn ?? "does not expire"}`,
    "",
    "The prototype holds no file for this document, so this is its record.",
  ].join("\r\n")
  const blob = new Blob([text], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${doc.name.replace(/[^\w.-]+/g, "-")}-record.txt`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  toast(
    "No file is held for this document in the prototype. Downloaded its record instead."
  )
}
