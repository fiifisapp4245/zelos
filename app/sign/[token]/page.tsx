"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import {
  CheckCircle2,
  Download,
  Printer,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react"

import { PublicMessage, PublicShell } from "@/components/public/shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useStore } from "@/lib/store"
import { TODAY } from "@/lib/format"
import {
  SIGN_PROBLEM_TEXT,
  letterIntact,
  signedCopyHtml,
  signingState,
} from "@/lib/offers"
import type { OfferSignature } from "@/lib/types"
import { cn } from "@/lib/utils"

/** A small drawing pad. The picture is optional: the typed name is what is checked. */
function Pad({ onChange }: { onChange: (png: string | null) => void }) {
  const ref = React.useRef<HTMLCanvasElement>(null)
  const drawing = React.useRef(false)
  const inked = React.useRef(false)

  function pos(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * 400,
      y: ((e.clientY - r.top) / r.height) * 120,
    }
  }
  function down(e: React.PointerEvent) {
    const c = ref.current!.getContext("2d")!
    drawing.current = true
    ref.current!.setPointerCapture(e.pointerId)
    const { x, y } = pos(e)
    c.beginPath()
    c.moveTo(x, y)
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return
    const c = ref.current!.getContext("2d")!
    c.lineWidth = 2.2
    c.lineCap = "round"
    c.strokeStyle = "#111"
    const { x, y } = pos(e)
    c.lineTo(x, y)
    c.stroke()
    inked.current = true
  }
  function up() {
    if (!drawing.current) return
    drawing.current = false
    onChange(inked.current ? ref.current!.toDataURL("image/png") : null)
  }
  function clear() {
    const c = ref.current!
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height)
    inked.current = false
    onChange(null)
  }
  return (
    <div>
      <canvas
        ref={ref}
        width={400}
        height={120}
        aria-label="Draw your signature"
        className="w-full max-w-[400px] touch-none rounded-lg border bg-white"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />
      <Button
        type="button"
        size="xs"
        variant="ghost"
        className="mt-1"
        onClick={clear}
      >
        Clear
      </Button>
    </div>
  )
}

function SignedView({
  sig,
  candidateName,
  company,
}: {
  sig: OfferSignature
  candidateName: string
  company: string
}) {
  const [intact, setIntact] = React.useState<boolean | null>(null)
  React.useEffect(() => {
    let live = true
    letterIntact(sig).then((ok) => live && setIntact(ok))
    return () => {
      live = false
    }
  }, [sig])

  function download() {
    const html = signedCopyHtml(sig, { candidateName, company })
    const url = URL.createObjectURL(
      new Blob([html], { type: "text/html;charset=utf-8" })
    )
    const a = document.createElement("a")
    a.href = url
    a.download = `signed-offer-${candidateName.toLowerCase().replace(/[^a-z]+/g, "-")}.html`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <PublicShell company={company} width="max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <p className="flex flex-1 items-center gap-2 text-sm font-medium text-primary">
          <CheckCircle2 className="size-4" />
          Signed, thank you {candidateName.split(" ")[0]}
        </p>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" />
          Print
        </Button>
        <Button variant="outline" size="sm" onClick={download}>
          <Download className="size-4" />
          Download signed copy
        </Button>
      </div>
      <article className="rounded-xl border p-8">
        <pre className="font-serif text-[15px] leading-relaxed whitespace-pre-wrap">
          {sig.letter}
        </pre>
        <div className="mt-8 border-t pt-4">
          {sig.signatureImage?.startsWith("data:image/png;base64,") && (
            // A drawn signature is a data URL made on this page, not a remote image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sig.signatureImage}
              alt="Drawn signature"
              className="max-h-20"
            />
          )}
          <p className="font-serif text-2xl italic">{sig.signedName}</p>
          <p className="text-xs text-muted-foreground">
            {candidateName} · signed{" "}
            {sig.signedOn?.slice(0, 16).replace("T", " ")} UTC
          </p>
        </div>
      </article>
      <section className="mt-6 rounded-xl border p-5 text-sm">
        <h2 className="mb-3 flex items-center gap-2 font-medium">
          {intact === false ? (
            <ShieldAlert className="size-4 text-destructive" />
          ) : (
            <ShieldCheck className="size-4 text-primary" />
          )}
          Signing record
        </h2>
        <p
          className={cn(
            "mb-3 text-xs",
            intact === false ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {intact === null
            ? "Checking the letter…"
            : intact
              ? "The letter is exactly as it was when you signed."
              : "This letter does not match its checksum."}
        </p>
        <ol className="space-y-1.5 text-xs text-muted-foreground">
          {sig.trail.map((t, i) => (
            <li key={i}>
              <span className="tabular">
                {t.at.slice(0, 16).replace("T", " ")} UTC
              </span>{" "}
              — {t.text}
            </li>
          ))}
        </ol>
        <p className="mt-3 font-mono text-[11px] break-all text-muted-foreground">
          SHA-256 {sig.letterHash}
        </p>
      </section>
    </PublicShell>
  )
}

export default function SignPage() {
  const { token } = useParams<{ token: string }>()
  const store = useStore()
  const company = store.company.tradingName || store.company.legalName
  const sig = store.offerSignatures.find((o) => o.token === token)
  const candidate =
    sig && store.candidates.find((c) => c.id === sig.candidateId)

  const [name, setName] = React.useState("")
  const [agreed, setAgreed] = React.useState(false)
  const [image, setImage] = React.useState<string | null>(null)
  const [declining, setDeclining] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const viewed = React.useRef(false)

  const live = sig && !signingState(sig, TODAY)
  React.useEffect(() => {
    if (store.ready && sig && live && !viewed.current) {
      viewed.current = true
      store.markOfferViewed(token)
    }
  }, [store, sig, live, token])

  if (!store.ready)
    return (
      <PublicShell company={company}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PublicShell>
    )

  if (sig?.status === "signed" && candidate)
    return (
      <SignedView sig={sig} candidateName={candidate.name} company={company} />
    )

  const problem = signingState(sig, TODAY)
  if (problem || !sig || !candidate) {
    const t = SIGN_PROBLEM_TEXT[problem ?? "not_found"]
    return (
      <PublicShell company={company}>
        <PublicMessage title={t.title} body={t.body} />
      </PublicShell>
    )
  }

  return (
    <PublicShell company={company}>
      <h1 className="mb-1 text-xl font-semibold">Your offer letter</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Please read it carefully, then sign at the bottom. You can also decline.
      </p>

      <article className="rounded-xl border p-8">
        <pre className="font-serif text-[15px] leading-relaxed whitespace-pre-wrap">
          {sig.letter}
        </pre>
      </article>

      {!declining ? (
        <form
          className="mt-6 space-y-4 rounded-xl border p-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            const r = store.signOffer(token, { name, image, agreed })
            if (!r.ok) setError(r.reason)
          }}
        >
          <h2 className="font-medium">Sign this letter</h2>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--primary)]"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              I have read this letter, and I agree that typing my name below is
              my legally binding electronic signature.
            </span>
          </label>
          <div>
            <label
              htmlFor="sg-name"
              className="mb-1.5 block text-sm font-medium"
            >
              Type your full name
            </label>
            <Input
              id="sg-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={candidate.name}
            />
            {name.trim() && (
              <p className="mt-2 font-serif text-2xl italic">{name}</p>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">
              Draw your signature{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </p>
            <Pad onChange={setImage} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="lg">
              Sign and accept the offer
            </Button>
            <Button
              type="button"
              size="lg"
              variant="ghost"
              onClick={() => setDeclining(true)}
            >
              Decline the offer
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-6 space-y-4 rounded-xl border p-6">
          <h2 className="font-medium">Decline this offer</h2>
          <p className="text-sm text-muted-foreground">
            We are sorry to hear it. A short reason helps us.
          </p>
          <Textarea
            aria-label="Reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                setError(null)
                const r = store.declineOffer(token, reason)
                if (!r.ok) setError(r.reason)
              }}
            >
              Decline the offer
            </Button>
            <Button variant="ghost" onClick={() => setDeclining(false)}>
              Go back
            </Button>
          </div>
        </div>
      )}
    </PublicShell>
  )
}
