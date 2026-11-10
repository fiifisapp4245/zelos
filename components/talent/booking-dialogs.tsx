"use client"

import * as React from "react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormRow, NativeSelect } from "./form"
import { useStore } from "@/lib/store"
import { fullName } from "@/lib/format"
import { isOnStrength } from "@/lib/selectors"
import { INTERVIEW_KIND_LABEL } from "@/lib/talent/recruitment"
import type { Availability, BookingPage, InterviewKind } from "@/lib/types"

const KINDS = Object.keys(INTERVIEW_KIND_LABEL) as InterviewKind[]
export const VIDEO_LABEL: Record<BookingPage["video"], string> = {
  zelos_meet: "TroveSuite video meeting (made for each booking)",
  external: "A fixed link (Google Meet, Teams, Zoom)",
  in_person: "In person at an address",
}
const DAYS = [
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
  [7, "Sun"],
] as const

export function BookingPageDialog({
  existing,
  onClose,
}: {
  existing?: BookingPage
  onClose: () => void
}) {
  const store = useStore()
  const people = store.employees.filter(isOnStrength)
  const [name, setName] = React.useState(existing?.name ?? "")
  const [kind, setKind] = React.useState<InterviewKind>(
    existing?.kind ?? "phone"
  )
  const [req, setReq] = React.useState(existing?.requisitionId ?? "")
  const [duration, setDuration] = React.useState(
    String(existing?.durationMin ?? 30)
  )
  const [buffer, setBuffer] = React.useState(String(existing?.bufferMin ?? 10))
  const [advance, setAdvance] = React.useState(
    String(existing?.advanceDays ?? 14)
  )
  const [notice, setNotice] = React.useState(
    String(existing?.minNoticeHours ?? 24)
  )
  const [limit, setLimit] = React.useState(String(existing?.dailyLimit ?? 6))
  const [cutoff, setCutoff] = React.useState(
    String(existing?.cancelCutoffHours ?? 12)
  )
  const [who, setWho] = React.useState<string[]>(existing?.interviewerIds ?? [])
  const [assign, setAssign] = React.useState<BookingPage["assign"]>(
    existing?.assign ?? "round_robin"
  )
  const [video, setVideo] = React.useState<BookingPage["video"]>(
    existing?.video ?? "zelos_meet"
  )
  const [link, setLink] = React.useState(existing?.videoLink ?? "")
  const [questions, setQuestions] = React.useState(
    (existing?.questions ?? []).join("\n")
  )
  const [active, setActive] = React.useState(existing?.active ?? true)
  const [touched, setTouched] = React.useState(false)

  const n = (v: string) => Number(v)
  const errors = {
    name: name.trim() ? null : "Give the page a name.",
    duration:
      n(duration) >= 10 && n(duration) <= 240
        ? null
        : "Between 10 and 240 minutes.",
    buffer:
      n(buffer) >= 0 && n(buffer) <= 120 ? null : "Between 0 and 120 minutes.",
    advance:
      n(advance) >= 1 && n(advance) <= 90 ? null : "Between 1 and 90 days.",
    notice:
      n(notice) >= 0 && n(notice) <= 336 ? null : "Between 0 and 336 hours.",
    limit: n(limit) >= 1 && n(limit) <= 50 ? null : "Between 1 and 50.",
    cutoff:
      n(cutoff) >= 0 && n(cutoff) <= 168 ? null : "Between 0 and 168 hours.",
    who: who.length > 0 ? null : "Choose at least one interviewer.",
    link:
      video === "zelos_meet" || link.trim()
        ? video === "external" && !/^https?:\/\//.test(link.trim())
          ? "Enter a full link starting with https://"
          : null
        : video === "external"
          ? "Add the meeting link."
          : "Add the address.",
  }
  const bad = Object.values(errors).some(Boolean)

  function save() {
    setTouched(true)
    if (bad) {
      toast.error("Fix the highlighted fields.")
      return
    }
    store.saveBookingPage({
      id: existing?.id ?? `bp-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      requisitionId: req || null,
      kind,
      durationMin: n(duration),
      bufferMin: n(buffer),
      advanceDays: n(advance),
      minNoticeHours: n(notice),
      dailyLimit: n(limit),
      interviewerIds: who,
      assign: who.length === 1 ? "fixed" : assign,
      video,
      videoLink: video === "zelos_meet" ? "" : link.trim(),
      questions: questions
        .split("\n")
        .map((q) => q.trim())
        .filter(Boolean),
      cancelCutoffHours: n(cutoff),
      active,
    })
    toast.success(existing ? "Booking page updated." : "Booking page created.")
    onClose()
  }

  const show = (k: keyof typeof errors) => (touched ? errors[k] : null)

  return (
    <FormDialog
      title={existing ? "Edit booking page" : "New booking page"}
      description="What candidates can book, with whom, and how. Each candidate gets a private link to it."
      width="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save}>
            {existing ? "Save changes" : "Create page"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow
            label="Name"
            htmlFor="bp-name"
            error={show("name")}
            className="sm:col-span-2"
          >
            <Input
              id="bp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Technical interview"
            />
          </FormRow>
          <FormRow label="Interview type" htmlFor="bp-kind">
            <NativeSelect
              id="bp-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as InterviewKind)}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {INTERVIEW_KIND_LABEL[k]}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          <FormRow label="For requisition" htmlFor="bp-req">
            <NativeSelect
              id="bp-req"
              value={req}
              onChange={(e) => setReq(e.target.value)}
            >
              <option value="">Any requisition</option>
              {store.requisitions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} — {r.id}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          <FormRow
            label="Length (minutes)"
            htmlFor="bp-dur"
            error={show("duration")}
          >
            <Input
              id="bp-dur"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </FormRow>
          <FormRow
            label="Break between interviews (minutes)"
            htmlFor="bp-buf"
            error={show("buffer")}
          >
            <Input
              id="bp-buf"
              type="number"
              value={buffer}
              onChange={(e) => setBuffer(e.target.value)}
            />
          </FormRow>
          <FormRow
            label="Bookable up to (days ahead)"
            htmlFor="bp-adv"
            error={show("advance")}
          >
            <Input
              id="bp-adv"
              type="number"
              value={advance}
              onChange={(e) => setAdvance(e.target.value)}
            />
          </FormRow>
          <FormRow
            label="Least notice (hours)"
            htmlFor="bp-not"
            error={show("notice")}
          >
            <Input
              id="bp-not"
              type="number"
              value={notice}
              onChange={(e) => setNotice(e.target.value)}
            />
          </FormRow>
          <FormRow
            label="Most interviews in a day"
            htmlFor="bp-lim"
            error={show("limit")}
          >
            <Input
              id="bp-lim"
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </FormRow>
          <FormRow
            label="Change or cancel until (hours before)"
            htmlFor="bp-cut"
            error={show("cutoff")}
          >
            <Input
              id="bp-cut"
              type="number"
              value={cutoff}
              onChange={(e) => setCutoff(e.target.value)}
            />
          </FormRow>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Interviewers</legend>
          <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
            {people.map((e) => (
              <label
                key={e.id}
                className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--primary)]"
                  checked={who.includes(e.id)}
                  onChange={(ev) =>
                    setWho((w) =>
                      ev.target.checked
                        ? [...w, e.id]
                        : w.filter((x) => x !== e.id)
                    )
                  }
                />
                <span className="truncate">{fullName(e)}</span>
              </label>
            ))}
          </div>
          {touched && errors.who && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {errors.who}
            </p>
          )}
        </fieldset>
        {who.length > 1 && (
          <FormRow label="Who takes each booking" htmlFor="bp-assign">
            <NativeSelect
              id="bp-assign"
              value={assign}
              onChange={(e) =>
                setAssign(e.target.value as BookingPage["assign"])
              }
            >
              <option value="round_robin">
                Take turns (whoever has had the fewest)
              </option>
              <option value="fixed">Always the first one chosen</option>
            </NativeSelect>
          </FormRow>
        )}

        <FormRow label="How they meet" htmlFor="bp-video">
          <NativeSelect
            id="bp-video"
            value={video}
            onChange={(e) => setVideo(e.target.value as BookingPage["video"])}
          >
            {(Object.keys(VIDEO_LABEL) as BookingPage["video"][]).map((v) => (
              <option key={v} value={v}>
                {VIDEO_LABEL[v]}
              </option>
            ))}
          </NativeSelect>
        </FormRow>
        {video !== "zelos_meet" && (
          <FormRow
            label={video === "external" ? "Meeting link" : "Address"}
            htmlFor="bp-link"
            error={show("link")}
          >
            <Input
              id="bp-link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={
                video === "external"
                  ? "https://meet.google.com/…"
                  : "Zelos HQ, 14 Ring Road, Accra"
              }
            />
          </FormRow>
        )}

        <FormRow
          label="Questions before booking (optional)"
          htmlFor="bp-q"
          hint="One per line. Each one is required."
        >
          <Textarea
            id="bp-q"
            rows={3}
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
          />
        </FormRow>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Open for booking
        </label>
      </div>
    </FormDialog>
  )
}

export function AvailabilityDialog({
  employeeId,
  onClose,
}: {
  employeeId: string
  onClose: () => void
}) {
  const store = useStore()
  const cur = store.availability.find((a) => a.employeeId === employeeId)
  const [days, setDays] = React.useState<number[]>(cur?.days ?? [1, 2, 3, 4, 5])
  const [start, setStart] = React.useState(cur?.start ?? "09:00")
  const [end, setEnd] = React.useState(cur?.end ?? "17:00")
  const [touched, setTouched] = React.useState(false)
  const errors = {
    days: days.length ? null : "Choose at least one day.",
    hours: start < end ? null : "The end has to be after the start.",
  }
  return (
    <FormDialog
      title={`Availability — ${fullName(store.employeeById(employeeId))}`}
      description="Weekly hours in the company's time zone (Africa/Accra). Public holidays and approved leave are taken out automatically."
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
              if (errors.days || errors.hours) return
              const a: Availability = {
                employeeId,
                days: [...days].sort(),
                start,
                end,
              }
              store.setAvailability(a)
              toast.success("Availability saved.")
              onClose()
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Days</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(([d, label]) => (
              <label
                key={d}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${days.includes(d) ? "border-primary bg-success-muted font-medium text-primary" : "hover:bg-muted"}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={days.includes(d)}
                  onChange={(e) =>
                    setDays((x) =>
                      e.target.checked ? [...x, d] : x.filter((y) => y !== d)
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
          {touched && errors.days && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {errors.days}
            </p>
          )}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="From" htmlFor="av-start">
            <Input
              id="av-start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </FormRow>
          <FormRow
            label="Until"
            htmlFor="av-end"
            error={touched ? errors.hours : null}
          >
            <Input
              id="av-end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </FormRow>
        </div>
      </div>
    </FormDialog>
  )
}
