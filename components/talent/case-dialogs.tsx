"use client"

import * as React from "react"
import { FileText, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormRow, NativeSelect } from "./form"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { TODAY_ISO, formatDate, fullName } from "@/lib/format"
import { daysBetween } from "@/lib/time"
import { isOnStrength, visibleEmployees, wholeTeam } from "@/lib/selectors"
import {
  DOC_CATEGORY_LABEL,
  MIN_HEARING_NOTICE_DAYS,
  SANCTIONS_BY_SEVERITY,
  SANCTION_LABEL,
  SEVERITY_LABEL,
  newCaseId,
} from "@/lib/talent/disciplinary"
import {
  ACCEPTED_EXTENSIONS,
  MAX_UPLOAD_MB,
  fileProblem,
  rememberFile,
  sizeKb,
} from "@/lib/talent/case-files"
import type {
  CaseDocument,
  CaseDocumentCategory,
  DisciplinaryCase,
  SanctionKind,
} from "@/lib/types"

const nowStamp = () => `${TODAY_ISO}T${new Date().toTimeString().slice(0, 8)}`
const docId = () => `cd-${Math.random().toString(36).slice(2, 8)}`

/** Picks files, checks them, and turns them into document records. */
function FilePicker({
  files,
  onChange,
}: {
  files: File[]
  onChange: (f: File[]) => void
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  const [over, setOver] = React.useState(false)
  const [problems, setProblems] = React.useState<string[]>([])

  function add(list: FileList | null) {
    if (!list) return
    const incoming = [...list]
    const bad = incoming.map(fileProblem).filter((p): p is string => !!p)
    const good = incoming.filter((f) => !fileProblem(f))
    setProblems(bad)
    // The same file twice is almost always a slip, and the second is noise.
    const fresh = good.filter(
      (f) => !files.some((x) => x.name === f.name && x.size === f.size)
    )
    onChange([...files, ...fresh])
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          add(e.dataTransfer.files)
        }}
        className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
          over ? "border-primary bg-success-muted/40" : "bg-muted/20"
        }`}
      >
        <Upload className="size-5 text-muted-foreground" />
        <p className="text-sm">
          Drop files here, or{" "}
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="font-medium text-primary underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-muted-foreground">
          {ACCEPTED_EXTENSIONS.map((e) => e.toUpperCase()).join(", ")} · up to{" "}
          {MAX_UPLOAD_MB} MB each
        </p>
        <input
          ref={ref}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(",")}
          className="sr-only"
          aria-label="Choose files"
          onChange={(e) => {
            add(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {problems.length > 0 && (
        <ul role="alert" className="mt-2 space-y-0.5 text-xs text-destructive">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="tabular text-xs text-muted-foreground">
                {sizeKb(f)} KB
              </span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Turns picked files into stored records, and keeps the bytes for this session. */
function toDocuments(
  files: File[],
  category: CaseDocumentCategory,
  by: string
): CaseDocument[] {
  return files.map((f) => {
    const id = docId()
    rememberFile(id, f)
    return {
      id,
      name: f.name,
      category,
      sizeKb: sizeKb(f),
      uploadedBy: by,
      uploadedAt: nowStamp(),
    }
  })
}

export function UploadDialog({
  c,
  category: preset,
  onClose,
}: {
  c: DisciplinaryCase
  category?: CaseDocumentCategory
  onClose: () => void
}) {
  const store = useStore()
  const [files, setFiles] = React.useState<File[]>([])
  const [category, setCategory] = React.useState<CaseDocumentCategory>(
    preset ?? "evidence"
  )
  const [touched, setTouched] = React.useState(false)

  function upload() {
    setTouched(true)
    if (files.length === 0) return
    const docs = toDocuments(files, category, store.viewer.employeeId)
    store.updateCase(
      c.id,
      { documents: [...c.documents, ...docs] },
      `Uploaded ${docs.length === 1 ? docs[0].name : `${docs.length} documents`} (${DOC_CATEGORY_LABEL[category].toLowerCase()}).`
    )
    toast.success(
      docs.length === 1
        ? `${docs[0].name} uploaded.`
        : `${docs.length} documents uploaded.`
    )
    onClose()
  }

  return (
    <FormDialog
      title="Upload documents"
      description={`Added to case ${c.id}. Everything uploaded is logged with your name and the time.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={upload}>
            Upload{" "}
            {files.length > 0
              ? `${files.length} file${files.length === 1 ? "" : "s"}`
              : ""}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormRow label="What is it?" htmlFor="up-cat">
          <NativeSelect
            id="up-cat"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as CaseDocumentCategory)
            }
          >
            {(Object.keys(DOC_CATEGORY_LABEL) as CaseDocumentCategory[]).map(
              (k) => (
                <option key={k} value={k}>
                  {DOC_CATEGORY_LABEL[k]}
                </option>
              )
            )}
          </NativeSelect>
        </FormRow>
        <FilePicker files={files} onChange={setFiles} />
        {touched && files.length === 0 && (
          <p role="alert" className="text-xs text-destructive">
            Choose at least one file.
          </p>
        )}
      </div>
    </FormDialog>
  )
}

export function RaiseCaseDialog({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const { viewer, employees, cases } = store
  const isHr = has(viewer, "hr_admin")
  const people = (
    isHr ? visibleEmployees(viewer, employees) : wholeTeam(viewer, employees)
  ).filter((e) => e.id !== viewer.employeeId && isOnStrength(e))

  const [who, setWho] = React.useState(people[0]?.id ?? "")
  const [title, setTitle] = React.useState("")
  const [severity, setSeverity] =
    React.useState<DisciplinaryCase["severity"]>("minor")
  const [incident, setIncident] = React.useState(TODAY_ISO)
  const [description, setDescription] = React.useState("")
  const [files, setFiles] = React.useState<File[]>([])
  const [touched, setTouched] = React.useState(false)

  const errors = {
    who: who ? null : "Choose the employee.",
    title: title.trim().length >= 5 ? null : "Give the case a short title.",
    incident:
      incident > TODAY_ISO ? "The incident cannot be in the future." : null,
    description:
      description.trim().length >= 20
        ? null
        : "Describe what is alleged — at least a couple of sentences.",
  }
  const bad = Object.values(errors).some(Boolean)

  function raise() {
    setTouched(true)
    if (bad) {
      toast.error("Fix the highlighted fields.")
      return
    }
    const id = newCaseId(cases, TODAY_ISO.slice(0, 4))
    const at = nowStamp()
    store.raiseCase({
      id,
      employeeId: who,
      title: title.trim(),
      severity,
      state: "open",
      raisedBy: viewer.employeeId,
      raisedOn: TODAY_ISO,
      outcome: null,
      closedOn: null,
      description: description.trim(),
      incidentOn: incident,
      investigatorId: null,
      notifiedOn: null,
      hearing: null,
      sanction: null,
      appeal: null,
      documents: toDocuments(files, "evidence", viewer.employeeId),
      events: [
        {
          id: `ce-${Math.random().toString(36).slice(2, 7)}`,
          at,
          actorId: viewer.employeeId,
          text: `Case raised for ${SEVERITY_LABEL[severity].toLowerCase()}.`,
        },
      ],
    })
    toast.success(`Case ${id} raised. HR has the due-process checklist.`)
    onClose()
  }

  const show = (k: keyof typeof errors) => (touched ? errors[k] : null)

  return (
    <FormDialog
      title="Raise a disciplinary case"
      description="Opens a confidential case. The employee is not told until HR sends the allegation in writing."
      width="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={raise}>
            Raise case
          </Button>
        </>
      }
    >
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          There is nobody in your team you can raise a case about.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormRow label="Employee" htmlFor="rc-who" error={show("who")}>
              <NativeSelect
                id="rc-who"
                value={who}
                onChange={(e) => setWho(e.target.value)}
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {fullName(p)} — {p.jobTitle}
                  </option>
                ))}
              </NativeSelect>
            </FormRow>
            <FormRow label="Severity" htmlFor="rc-sev">
              <NativeSelect
                id="rc-sev"
                value={severity}
                onChange={(e) =>
                  setSeverity(e.target.value as DisciplinaryCase["severity"])
                }
              >
                {(
                  Object.keys(SEVERITY_LABEL) as DisciplinaryCase["severity"][]
                ).map((k) => (
                  <option key={k} value={k}>
                    {SEVERITY_LABEL[k]}
                  </option>
                ))}
              </NativeSelect>
            </FormRow>
            <FormRow
              label="Title"
              htmlFor="rc-title"
              error={show("title")}
              className="sm:col-span-2"
            >
              <Input
                id="rc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Repeated unexplained lateness"
              />
            </FormRow>
            <FormRow
              label="Date of the incident"
              htmlFor="rc-date"
              error={show("incident")}
            >
              <Input
                id="rc-date"
                type="date"
                max={TODAY_ISO}
                value={incident}
                onChange={(e) => setIncident(e.target.value)}
              />
            </FormRow>
          </div>
          <FormRow
            label="What is alleged"
            htmlFor="rc-desc"
            error={show("description")}
            hint="Facts, dates and what was seen. This becomes the allegation put to the employee."
          >
            <Textarea
              id="rc-desc"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormRow>
          <div>
            <p className="mb-1.5 text-sm font-medium">
              Evidence{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </p>
            <FilePicker files={files} onChange={setFiles} />
          </div>
        </div>
      )}
    </FormDialog>
  )
}

export function AssignInvestigatorDialog({
  c,
  onClose,
}: {
  c: DisciplinaryCase
  onClose: () => void
}) {
  const store = useStore()
  // Independent of the person who raised it, and of course of the accused.
  const options = store.employees.filter(
    (e) => isOnStrength(e) && e.id !== c.employeeId && e.id !== c.raisedBy
  )
  const [who, setWho] = React.useState(c.investigatorId ?? options[0]?.id ?? "")
  return (
    <FormDialog
      title="Assign an investigator"
      description="Someone independent of the person who raised the case."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            disabled={!who}
            onClick={() => {
              store.updateCase(
                c.id,
                { investigatorId: who },
                `${fullName(store.employeeById(who))} assigned as investigator.`
              )
              toast.success("Investigator assigned.")
              onClose()
            }}
          >
            Assign
          </Button>
        </>
      }
    >
      <FormRow label="Investigator" htmlFor="ai-who">
        <NativeSelect
          id="ai-who"
          value={who}
          onChange={(e) => setWho(e.target.value)}
        >
          {options.map((e) => (
            <option key={e.id} value={e.id}>
              {fullName(e)} — {e.jobTitle}
            </option>
          ))}
        </NativeSelect>
      </FormRow>
    </FormDialog>
  )
}

export function HearingDialog({
  c,
  onClose,
}: {
  c: DisciplinaryCase
  onClose: () => void
}) {
  const store = useStore()
  const h = c.hearing
  const panelPool = store.employees.filter(
    (e) => isOnStrength(e) && e.id !== c.employeeId
  )
  const [when, setWhen] = React.useState(h?.scheduledFor ?? "")
  const [venue, setVenue] = React.useState(h?.venue ?? "")
  const [notice, setNotice] = React.useState(h?.noticeGivenOn ?? TODAY_ISO)
  const [panel, setPanel] = React.useState<string[]>(
    h?.panelIds ?? [store.viewer.employeeId].filter((id) => id !== c.employeeId)
  )
  const [touched, setTouched] = React.useState(false)

  const gap = when ? daysBetween(notice, when) : 0
  const errors = {
    when: !when
      ? "Choose the hearing date."
      : gap < MIN_HEARING_NOTICE_DAYS
        ? `The employee needs at least ${MIN_HEARING_NOTICE_DAYS} days' notice. This gives ${Math.max(0, gap)}.`
        : null,
    venue: venue.trim() ? null : "Say where it will be held.",
    panel: panel.length >= 2 ? null : "A panel is at least two people.",
  }

  function toggle(id: string) {
    setPanel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  function save() {
    setTouched(true)
    if (errors.when || errors.venue || errors.panel) return
    store.updateCase(
      c.id,
      {
        hearing: {
          scheduledFor: when,
          venue: venue.trim(),
          noticeGivenOn: notice,
          panelIds: panel,
          companion: h?.companion ?? null,
          held: false,
          minutes: "",
        },
      },
      h
        ? `Hearing rescheduled to ${formatDate(when)}.`
        : `Hearing scheduled for ${formatDate(when)}. Notice given ${formatDate(notice)}.`
    )
    toast.success(
      "Hearing scheduled. Upload the notice letter to keep the file complete."
    )
    onClose()
  }

  return (
    <FormDialog
      title={h ? "Reschedule the hearing" : "Schedule the hearing"}
      description="The employee must have time to prepare, and the right to bring a colleague."
      width="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save}>
            {h ? "Reschedule" : "Schedule hearing"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Notice given on" htmlFor="hr-notice">
            <Input
              id="hr-notice"
              type="date"
              value={notice}
              onChange={(e) => setNotice(e.target.value)}
            />
          </FormRow>
          <FormRow
            label="Hearing date"
            htmlFor="hr-when"
            error={touched ? errors.when : null}
          >
            <Input
              id="hr-when"
              type="date"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </FormRow>
        </div>
        <FormRow
          label="Venue"
          htmlFor="hr-venue"
          error={touched ? errors.venue : null}
        >
          <Input
            id="hr-venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Room, address or video link"
          />
        </FormRow>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Panel</legend>
          <div className="grid max-h-44 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
            {panelPool.map((e) => (
              <label
                key={e.id}
                className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={panel.includes(e.id)}
                  onChange={() => toggle(e.id)}
                  className="size-4 accent-[var(--primary)]"
                />
                <span className="truncate">{fullName(e)}</span>
              </label>
            ))}
          </div>
          {touched && errors.panel && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {errors.panel}
            </p>
          )}
        </fieldset>
      </div>
    </FormDialog>
  )
}

export function HeldDialog({
  c,
  onClose,
}: {
  c: DisciplinaryCase
  onClose: () => void
}) {
  const store = useStore()
  const [companion, setCompanion] = React.useState("")
  const [minutes, setMinutes] = React.useState(c.hearing?.minutes ?? "")
  const [touched, setTouched] = React.useState(false)
  if (!c.hearing) return null
  const h = c.hearing
  const short = minutes.trim().length < 20
  return (
    <FormDialog
      title="Record the hearing"
      description="What was said and decided. The minutes are part of the record the employee can later see."
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
              if (short) return
              store.updateCase(
                c.id,
                {
                  hearing: {
                    ...h,
                    held: true,
                    minutes: minutes.trim(),
                    companion: companion.trim() || h.companion,
                  },
                },
                "Hearing held. Minutes recorded."
              )
              toast.success("Hearing recorded.")
              onClose()
            }}
          >
            Save minutes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormRow
          label="Who accompanied the employee"
          htmlFor="hd-comp"
          hint="Leave blank if they came alone."
        >
          <Input
            id="hd-comp"
            value={companion}
            onChange={(e) => setCompanion(e.target.value)}
          />
        </FormRow>
        <FormRow
          label="Minutes"
          htmlFor="hd-min"
          error={touched && short ? "Write what was said and decided." : null}
        >
          <Textarea
            id="hd-min"
            rows={7}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </FormRow>
      </div>
    </FormDialog>
  )
}

export function OutcomeDialog({
  c,
  onClose,
}: {
  c: DisciplinaryCase
  onClose: () => void
}) {
  const store = useStore()
  const emp = store.employeeById(c.employeeId)
  const options = SANCTIONS_BY_SEVERITY[c.severity]
  const [sanction, setSanction] = React.useState<SanctionKind>(options[0])
  const [reasons, setReasons] = React.useState("")
  const [touched, setTouched] = React.useState(false)
  const short = reasons.trim().length < 20

  function decide() {
    setTouched(true)
    if (short) return
    const outcome = `${SANCTION_LABEL[sanction]}. ${reasons.trim()}`
    store.updateCase(
      c.id,
      {
        state: "finalised",
        sanction,
        outcome,
        closedOn: TODAY_ISO,
      },
      `Finalised: ${SANCTION_LABEL[sanction].toLowerCase()}.`
    )
    // A suspension was a holding position. Anything short of dismissal or a
    // suspension as the sanction itself lets the person back.
    if (
      emp?.lifecycleState === "suspended" &&
      sanction !== "dismissal" &&
      sanction !== "suspension"
    ) {
      store.changeLifecycle(
        emp.id,
        "active",
        `Suspension lifted: ${c.id} concluded`,
        TODAY_ISO
      )
    }
    toast.success(
      sanction === "dismissal"
        ? "Outcome recorded. Terminate the employment from the case file."
        : "Outcome recorded. Upload the outcome letter to complete the file."
    )
    onClose()
  }

  return (
    <FormDialog
      title="Decide the outcome"
      description={`The sanction has to be proportionate to ${SEVERITY_LABEL[c.severity].toLowerCase()}. The employee and their line manager can see the outcome once it is recorded.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant={sanction === "dismissal" ? "destructive" : "default"}
            onClick={decide}
          >
            Record outcome
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormRow label="Sanction" htmlFor="oc-s">
          <NativeSelect
            id="oc-s"
            value={sanction}
            onChange={(e) => setSanction(e.target.value as SanctionKind)}
          >
            {options.map((s) => (
              <option key={s} value={s}>
                {SANCTION_LABEL[s]}
              </option>
            ))}
          </NativeSelect>
        </FormRow>
        <FormRow
          label="Reasons"
          htmlFor="oc-r"
          hint="What the panel found and why this sanction follows."
          error={
            touched && short ? "Give the reasons — at least a sentence." : null
          }
        >
          <Textarea
            id="oc-r"
            rows={5}
            value={reasons}
            onChange={(e) => setReasons(e.target.value)}
          />
        </FormRow>
        {sanction === "dismissal" && (
          <p className="rounded-lg border border-destructive/30 bg-danger-muted/40 px-3 py-2.5 text-sm">
            Dismissal ends employment. After you record it, terminate the record
            from the case file to open the offboarding checklist.
          </p>
        )}
      </div>
    </FormDialog>
  )
}

export function DismissDialog({
  c,
  onClose,
}: {
  c: DisciplinaryCase
  onClose: () => void
}) {
  const store = useStore()
  const [reason, setReason] = React.useState("")
  const [touched, setTouched] = React.useState(false)
  const short = reason.trim().length < 10
  return (
    <FormDialog
      title="Dismiss the case"
      description="No case to answer. The employee is told, and the record says so."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Keep it open
          </Button>
          <Button
            size="lg"
            onClick={() => {
              setTouched(true)
              if (short) return
              store.updateCase(
                c.id,
                {
                  state: "dismissed",
                  outcome: `No case to answer. ${reason.trim()}`,
                  closedOn: TODAY_ISO,
                },
                "Case dismissed: no case to answer."
              )
              const emp = store.employeeById(c.employeeId)
              if (emp?.lifecycleState === "suspended")
                store.changeLifecycle(
                  emp.id,
                  "active",
                  `Suspension lifted: ${c.id} dismissed`,
                  TODAY_ISO
                )
              toast.success("Case dismissed.")
              onClose()
            }}
          >
            Dismiss case
          </Button>
        </>
      }
    >
      <FormRow
        label="Why"
        htmlFor="dm-r"
        error={touched && short ? "Give a reason." : null}
      >
        <Textarea
          id="dm-r"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </FormRow>
    </FormDialog>
  )
}

export function AppealDialog({
  c,
  onClose,
}: {
  c: DisciplinaryCase
  onClose: () => void
}) {
  const store = useStore()
  const [grounds, setGrounds] = React.useState("")
  const [touched, setTouched] = React.useState(false)
  const short = grounds.trim().length < 20
  return (
    <FormDialog
      title="Lodge an appeal"
      description="Against the outcome of this case. It is decided by someone who was not on the hearing panel."
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
              if (short) return
              store.updateCase(
                c.id,
                {
                  appeal: {
                    lodgedOn: TODAY_ISO,
                    grounds: grounds.trim(),
                    decision: "pending",
                    decidedOn: null,
                  },
                },
                "Appeal lodged."
              )
              toast.success("Appeal lodged. HR will arrange who decides it.")
              onClose()
            }}
          >
            Lodge appeal
          </Button>
        </>
      }
    >
      <FormRow
        label="Grounds"
        htmlFor="ap-g"
        hint="Why the outcome should change: unfair process, new evidence, or a sanction out of proportion."
        error={touched && short ? "Explain the grounds." : null}
      >
        <Textarea
          id="ap-g"
          rows={5}
          value={grounds}
          onChange={(e) => setGrounds(e.target.value)}
        />
      </FormRow>
    </FormDialog>
  )
}
