"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, MapPin } from "lucide-react"

import { PublicMessage, PublicShell } from "@/components/public/shell"
import { FilePicker } from "@/components/common/file-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormRow } from "@/components/talent/form"
import { useStore } from "@/lib/store"
import { EMPLOYMENT_TYPE_LABEL, TODAY_ISO, formatDate } from "@/lib/format"
import {
  CV_EXTENSIONS,
  hasErrors,
  isListed,
  validateApplication,
  type FieldErrors,
} from "@/lib/careers"
import { rememberFile } from "@/lib/talent/case-files"

export default function RolePage() {
  const { id } = useParams<{ id: string }>()
  const store = useStore()
  const company = store.company.tradingName || store.company.legalName
  const req = store.requisitions.find((r) => r.id === id)

  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [files, setFiles] = React.useState<File[]>([])
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [consent, setConsent] = React.useState(false)
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [sent, setSent] = React.useState<string | null>(null)

  if (!store.ready)
    return (
      <PublicShell company={company}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PublicShell>
    )

  if (!req || !isListed(req, TODAY_ISO) || !req.careers)
    return (
      <PublicShell company={company}>
        <PublicMessage
          title="This role is not open"
          body="It may have been filled or closed. Have a look at what else is open."
        />
        <p className="mt-4 text-center text-sm">
          <Link href="/careers" className="underline">
            See open roles
          </Link>
        </p>
      </PublicShell>
    )

  const listing = req.careers

  if (sent)
    return (
      <PublicShell company={company}>
        <div className="rounded-xl border p-8 text-center">
          <CheckCircle2 className="mx-auto size-8 text-primary" />
          <h1 className="mt-3 text-lg font-semibold">Thank you, {sent}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We have your application for {req.title}. A confirmation is on its
            way to your email, and the team will be in touch.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/careers">See other roles</Link>
          </Button>
        </div>
      </PublicShell>
    )

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const input = {
      name,
      email,
      phone,
      cvName: files[0]?.name ?? "",
      answers,
      consent,
    }
    const found = validateApplication(input, req!)
    setErrors(found)
    if (hasErrors(found)) return
    const r = store.applyToJob(req!.id, input)
    if (!r.ok) {
      setFormError(r.reason)
      return
    }
    if (files[0]) rememberFile(`cv-${r.candidateId}`, files[0])
    setSent(name.trim().split(/\s+/)[0])
  }

  return (
    <PublicShell company={company}>
      <Link
        href="/careers"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All roles
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">{req.title}</h1>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
        <span>{req.department}</span>
        <span className="flex items-center gap-1">
          <MapPin className="size-3.5" />
          {req.branch}
        </span>
        <span>{EMPLOYMENT_TYPE_LABEL[req.employmentType]}</span>
        {listing.closesOn && (
          <span>Apply by {formatDate(listing.closesOn)}</span>
        )}
      </p>

      <section className="mt-6 space-y-5 text-sm">
        <p className="leading-relaxed">{listing.summary}</p>
        {listing.responsibilities.length > 0 && (
          <div>
            <h2 className="mb-2 font-medium">What you will do</h2>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {listing.responsibilities.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        )}
        {listing.requirements.length > 0 && (
          <div>
            <h2 className="mb-2 font-medium">What we are looking for</h2>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {listing.requirements.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <form
        onSubmit={submit}
        noValidate
        className="mt-10 space-y-5 border-t pt-8"
        aria-label="Apply"
      >
        <h2 className="text-lg font-semibold">Apply for this role</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Full name" htmlFor="ap-name" error={errors.name}>
            <Input
              id="ap-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormRow>
          <FormRow label="Email" htmlFor="ap-email" error={errors.email}>
            <Input
              id="ap-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormRow>
          <FormRow
            label="Phone (optional)"
            htmlFor="ap-phone"
            error={errors.phone}
          >
            <Input
              id="ap-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </FormRow>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium">CV</p>
          <FilePicker
            files={files}
            onChange={setFiles}
            multiple={false}
            extensions={CV_EXTENSIONS}
          />
          {errors.cv && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {errors.cv}
            </p>
          )}
        </div>

        {listing.questions.map((q, i) => (
          <FormRow
            key={q}
            label={q}
            htmlFor={`ap-q-${i}`}
            error={errors.answers?.[q]}
          >
            <Textarea
              id={`ap-q-${i}`}
              rows={4}
              value={answers[q] ?? ""}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [q]: e.target.value }))
              }
            />
          </FormRow>
        ))}

        <div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--primary)]"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I agree that {company} may keep my details and CV to consider me
              for this role.
            </span>
          </label>
          {errors.consent && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {errors.consent}
            </p>
          )}
        </div>

        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-danger-muted/40 px-3 py-2 text-sm"
          >
            {formError}
          </p>
        )}
        <Button type="submit" size="lg">
          Submit application
        </Button>
      </form>
    </PublicShell>
  )
}
