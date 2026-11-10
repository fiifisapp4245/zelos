"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { AlertTriangle, CheckCircle2, Circle, Trash2 } from "lucide-react"

import { PublicMessage, PublicShell } from "@/components/public/shell"
import { FilePicker } from "@/components/common/file-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormRow, NativeSelect } from "@/components/talent/form"
import { useStore } from "@/lib/store"
import { TODAY_ISO, formatDate } from "@/lib/format"
import { newId } from "@/lib/ids"
import { rememberFile, sizeKb } from "@/lib/talent/case-files"
import {
  BANKS,
  ID_EXTENSIONS,
  MOMO_PROVIDERS,
  SECTIONS,
  SECTION_TITLE,
  TIER2_PROVIDERS,
  changesRequested,
  maskTail,
  sectionDone,
  validateSection,
  type Ctx,
} from "@/lib/portal"
import type { PortalData, PortalSection, PreHirePortal } from "@/lib/types"
import { cn } from "@/lib/utils"

type StepKey = PortalSection | "review"

export default function WelcomePage() {
  const { token } = useParams<{ token: string }>()
  const store = useStore()
  const company = store.company.tradingName || store.company.legalName
  const portal = store.portals.find((p) => p.token === token)
  const employee = portal && store.employeeById(portal.employeeId)

  if (!store.ready)
    return (
      <PublicShell company={company}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PublicShell>
    )
  if (!portal || !employee)
    return (
      <PublicShell company={company}>
        <PublicMessage
          title="This link cannot be used"
          body="This link is not valid. Please ask HR to send it again."
        />
      </PublicShell>
    )
  if (portal.status === "approved")
    return (
      <PublicShell company={company}>
        <div className="rounded-xl border p-8 text-center">
          <CheckCircle2 className="mx-auto size-8 text-primary" />
          <h1 className="mt-3 text-lg font-semibold">
            You are all set, {employee.firstName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your details are checked and on your record. See you on{" "}
            {formatDate(employee.startDate)}.
          </p>
        </div>
      </PublicShell>
    )
  if (portal.status === "submitted")
    return (
      <PublicShell company={company}>
        <div className="rounded-xl border p-8 text-center">
          <CheckCircle2 className="mx-auto size-8 text-primary" />
          <h1 className="mt-3 text-lg font-semibold">
            Thank you, {employee.firstName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We have your details and the team is checking them. If anything
            needs fixing we will email you. You can close this page.
          </p>
        </div>
      </PublicShell>
    )
  if (portal.expiresOn.slice(0, 10) < TODAY_ISO)
    return (
      <PublicShell company={company}>
        <PublicMessage
          title="This link has expired"
          body="Please ask HR to send you a new one."
        />
      </PublicShell>
    )

  return <Form key={portal.id} portal={portal} />
}

function Form({ portal }: { portal: PreHirePortal }) {
  const store = useStore()
  const company = store.company.tradingName || store.company.legalName
  const employee = store.employeeById(portal.employeeId)!
  const token = portal.token
  const ctx: Ctx = React.useMemo(
    () => ({
      today: TODAY_ISO,
      takenCards: store.employees
        .filter((e) => e.id !== employee.id && e.ghanaCard)
        .map((e) => e.ghanaCard),
      fullName: `${employee.firstName} ${employee.lastName}`,
    }),
    [store.employees, employee]
  )

  const [data, setData] = React.useState<PortalData>(portal.data)
  const sent = changesRequested(portal)
  const flagged = new Set(sent.map((s) => s.section))
  const keys: StepKey[] = [...SECTIONS.map((s) => s.key), "review"]
  const firstOpen = (): StepKey =>
    sent[0]?.section ??
    SECTIONS.find((s) => !sectionDone(s.key, portal.data, ctx))?.key ??
    "review"
  const [step, setStep] = React.useState<StepKey>(firstOpen)
  const [shown, setShown] = React.useState<Set<StepKey>>(new Set())
  const [confirmed, setConfirmed] = React.useState(false)
  const [problem, setProblem] = React.useState<string | null>(null)
  const dirty = React.useRef(false)

  const set = <K extends keyof PortalData>(k: K, v: PortalData[K]) => {
    dirty.current = true
    setData((d) => ({ ...d, [k]: v }))
  }

  /* Saves a moment after the last change, so closing the tab loses almost nothing. */
  React.useEffect(() => {
    if (!dirty.current) return
    const t = setTimeout(() => {
      store.savePortalDraft(token, data)
      dirty.current = false
    }, 600)
    return () => clearTimeout(t)
  }, [data, store, token])

  const errors = step === "review" ? {} : validateSection(step, data, ctx)
  const show = (k: string) => (shown.has(step) ? errors[k] : undefined)
  const idx = keys.indexOf(step)

  function next() {
    if (step !== "review" && Object.keys(errors).length > 0) {
      setShown((s) => new Set(s).add(step))
      return
    }
    store.savePortalDraft(token, data)
    dirty.current = false
    setStep(keys[Math.min(keys.length - 1, idx + 1)])
  }

  function submit() {
    setProblem(null)
    store.savePortalDraft(token, data)
    const r = store.submitPortal(token)
    if (!r.ok) {
      setProblem(r.reason)
      if (r.sections[0]) {
        setStep(r.sections[0])
        setShown((s) => new Set(s).add(r.sections[0]))
      }
    }
  }

  function addIds(files: File[]) {
    const ups = files.slice(0, 3).map((f) => {
      const id = newId("up")
      rememberFile(id, f)
      return { id, name: f.name, sizeKb: sizeKb(f) }
    })
    set("idDocuments", [...data.idDocuments, ...ups].slice(0, 3))
  }

  const field = (
    id: string,
    label: string,
    k: keyof PortalData,
    props: React.ComponentProps<typeof Input> = {},
    hint?: string
  ) => (
    <FormRow label={label} htmlFor={id} error={show(k as string)} hint={hint}>
      <Input
        id={id}
        value={data[k] as string}
        onChange={(e) => set(k, e.target.value as never)}
        aria-invalid={!!show(k as string)}
        {...props}
      />
    </FormRow>
  )

  return (
    <PublicShell company={company} width="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome, {employee.firstName}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        You start as {employee.jobTitle} on {formatDate(employee.startDate)}.
        These details let us set up your pay, your pension and your record
        before day one. It takes about ten minutes, and you can stop and come
        back.
      </p>

      {sent.length > 0 && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-warning/40 bg-warning-muted/40 p-4 text-sm"
        >
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4" />A few things need another look
          </p>
          <ul className="mt-2 space-y-1">
            {sent.map((s) => (
              <li key={s.section}>
                <strong className="font-medium">
                  {SECTION_TITLE[s.section]}:
                </strong>{" "}
                {s.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <nav aria-label="Steps" className="mt-6">
        <ol className="flex flex-wrap gap-2">
          {keys.map((k, i) => {
            const done =
              k !== "review" && sectionDone(k, data, ctx) && !flagged.has(k)
            return (
              <li key={k}>
                <button
                  type="button"
                  aria-current={k === step ? "step" : undefined}
                  onClick={() => setStep(k)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    k === step
                      ? "border-primary bg-success-muted font-medium text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  {flagged.has(k as PortalSection) ? (
                    <AlertTriangle className="size-3.5 text-warning" />
                  ) : done ? (
                    <CheckCircle2 className="size-3.5 text-primary" />
                  ) : (
                    <Circle className="size-3.5 text-muted-foreground" />
                  )}
                  {i + 1}. {k === "review" ? "Review" : SECTION_TITLE[k]}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <section
        className="mt-6 rounded-xl border p-6"
        aria-label={step === "review" ? "Review" : SECTION_TITLE[step]}
      >
        {step !== "review" && (
          <>
            <h2 className="text-lg font-semibold">{SECTION_TITLE[step]}</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              {SECTIONS.find((s) => s.key === step)?.blurb}
            </p>
          </>
        )}

        {step === "personal" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {field("p-dob", "Date of birth", "dateOfBirth", {
              type: "date",
              max: TODAY_ISO,
            })}
            <FormRow label="Gender" htmlFor="p-gender" error={show("gender")}>
              <NativeSelect
                id="p-gender"
                value={data.gender}
                onChange={(e) =>
                  set("gender", e.target.value as PortalData["gender"])
                }
              >
                <option value="">Choose…</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </NativeSelect>
            </FormRow>
            {field("p-nat", "Nationality", "nationality")}
            {field("p-phone", "Phone", "phone", {
              type: "tel",
              autoComplete: "tel",
            })}
            <div className="sm:col-span-2">
              {field("p-mail", "Personal email", "personalEmail", {
                type: "email",
                autoComplete: "email",
              })}
            </div>
            <div className="sm:col-span-2">
              {field("p-addr", "Home address", "residentialAddress", {
                autoComplete: "street-address",
              })}
            </div>
            {field("p-gps", "GhanaPost GPS (optional)", "gpsAddress", {
              placeholder: "GA-123-4567",
            })}
          </div>
        )}

        {step === "identity" && (
          <div className="space-y-4">
            {field("i-card", "Ghana Card number", "ghanaCard", {
              placeholder: "GHA-123456789-0",
            })}
            <div>
              <p className="mb-1.5 text-sm font-medium">
                Photo or scan of your Ghana Card (front and back)
              </p>
              <FilePicker
                files={[]}
                onChange={addIds}
                extensions={ID_EXTENSIONS}
              />
              {show("idDocuments") && (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {show("idDocuments")}
                </p>
              )}
              {data.idDocuments.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {data.idDocuments.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">{u.name}</span>
                      <span className="tabular text-xs text-muted-foreground">
                        {u.sizeKb} KB
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${u.name}`}
                        onClick={() =>
                          set(
                            "idDocuments",
                            data.idDocuments.filter((x) => x.id !== u.id)
                          )
                        }
                        className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {step === "statutory" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {field(
              "s-ssnit",
              "SSNIT number",
              "ssnitNumber",
              { placeholder: "C1234567890" },
              "A C followed by 10 digits."
            )}
            {field("s-tin", "Tax Identification Number (TIN)", "tin", {
              placeholder: "P0123456789",
            })}
            <FormRow
              label="Tier 2 pension provider"
              htmlFor="s-t2"
              error={show("tier2Provider")}
            >
              <NativeSelect
                id="s-t2"
                value={data.tier2Provider}
                onChange={(e) => set("tier2Provider", e.target.value)}
              >
                <option value="">Choose…</option>
                {TIER2_PROVIDERS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </NativeSelect>
            </FormRow>
            <FormRow label="Tier 3 provider (optional)" htmlFor="s-t3">
              <NativeSelect
                id="s-t3"
                value={data.tier3Provider}
                onChange={(e) => set("tier3Provider", e.target.value)}
              >
                <option value="">None</option>
                {TIER2_PROVIDERS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </NativeSelect>
            </FormRow>
          </div>
        )}

        {step === "pay" && (
          <div className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">
                How would you like to be paid?
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    [
                      "mobile_money",
                      "Mobile money",
                      "MTN, Telecel or AirtelTigo",
                    ],
                    ["bank", "Bank account", "Paid straight into your account"],
                  ] as const
                ).map(([v, label, blurb]) => (
                  <label
                    key={v}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm",
                      data.paymentMethod === v &&
                        "border-primary bg-success-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="pm"
                      className="mt-0.5 size-4 accent-[var(--primary)]"
                      checked={data.paymentMethod === v}
                      onChange={() => set("paymentMethod", v)}
                    />
                    <span>
                      <span className="block font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">
                        {blurb}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {show("paymentMethod") && (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {show("paymentMethod")}
                </p>
              )}
            </fieldset>
            {data.paymentMethod === "mobile_money" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormRow
                  label="Network"
                  htmlFor="m-prov"
                  error={show("momoProvider")}
                >
                  <NativeSelect
                    id="m-prov"
                    value={data.momoProvider}
                    onChange={(e) => set("momoProvider", e.target.value)}
                  >
                    <option value="">Choose…</option>
                    {MOMO_PROVIDERS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </NativeSelect>
                </FormRow>
                {field(
                  "m-num",
                  "Mobile money number",
                  "momoNumber",
                  { type: "tel", placeholder: "024 123 4567" },
                  "It must be registered in your own name."
                )}
              </div>
            )}
            {data.paymentMethod === "bank" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormRow label="Bank" htmlFor="b-name" error={show("bankName")}>
                  <NativeSelect
                    id="b-name"
                    value={data.bankName}
                    onChange={(e) => set("bankName", e.target.value)}
                  >
                    <option value="">Choose…</option>
                    {BANKS.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </NativeSelect>
                </FormRow>
                {field("b-acc", "Account number", "bankAccount", {
                  inputMode: "numeric",
                })}
                <div className="sm:col-span-2">
                  {field(
                    "b-holder",
                    "Name on the account",
                    "accountName",
                    {},
                    "Has to be your own name."
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === "emergency" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {field("e-name", "Their full name", "emergencyName")}
            {field("e-rel", "Relationship to you", "emergencyRelationship", {
              placeholder: "e.g. Sister",
            })}
            {field("e-phone", "Phone", "emergencyPhone", { type: "tel" })}
            {field("e-mail", "Email (optional)", "emergencyEmail", {
              type: "email",
            })}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Check and send</h2>
              <p className="text-sm text-muted-foreground">
                Make sure everything is right. HR checks it before it goes on
                your record.
              </p>
            </div>
            <dl className="divide-y rounded-lg border text-sm">
              {(
                [
                  [
                    "personal",
                    "Date of birth",
                    data.dateOfBirth && formatDate(data.dateOfBirth),
                  ],
                  ["personal", "Phone", data.phone],
                  ["personal", "Address", data.residentialAddress],
                  ["identity", "Ghana Card", data.ghanaCard],
                  [
                    "identity",
                    "Photos attached",
                    String(data.idDocuments.length),
                  ],
                  [
                    "statutory",
                    "SSNIT",
                    data.ssnitNumber && maskTail(data.ssnitNumber, 3),
                  ],
                  ["statutory", "TIN", data.tin && maskTail(data.tin, 3)],
                  ["statutory", "Tier 2 provider", data.tier2Provider],
                  [
                    "pay",
                    data.paymentMethod === "bank"
                      ? "Bank account"
                      : "Mobile money",
                    data.paymentMethod === "bank"
                      ? `${data.bankName} ${maskTail(data.bankAccount)}`
                      : `${data.momoProvider} ${maskTail(data.momoNumber)}`,
                  ],
                  [
                    "emergency",
                    "Emergency contact",
                    `${data.emergencyName}, ${data.emergencyRelationship}`,
                  ],
                ] as [PortalSection, string, string][]
              ).map(([sec, label, value]) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <dt className="w-40 shrink-0 text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="min-w-0 flex-1 truncate">{value || "—"}</dd>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setStep(sec)}
                  >
                    Change
                  </button>
                </div>
              ))}
            </dl>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--primary)]"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>
                I confirm these details are correct, and I agree that {company}{" "}
                may keep them to employ and pay me.
              </span>
            </label>
            {problem && (
              <p role="alert" className="text-sm text-destructive">
                {problem}
              </p>
            )}
            <Button size="lg" disabled={!confirmed} onClick={submit}>
              Send my details
            </Button>
          </div>
        )}

        {step !== "review" && (
          <div className="mt-6 flex justify-between border-t pt-4">
            <Button
              variant="ghost"
              disabled={idx === 0}
              onClick={() => setStep(keys[idx - 1])}
            >
              Back
            </Button>
            <Button onClick={next}>Save and continue</Button>
          </div>
        )}
      </section>
      <p className="mt-4 text-xs text-muted-foreground">
        Your answers save as you go. Nobody sees them until you send them.
      </p>
    </PublicShell>
  )
}
