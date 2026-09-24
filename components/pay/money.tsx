"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Pill, type Tone } from "@/components/common"
import { maskedMoney, money, signedMoney } from "@/lib/pay/money"
import type { Currency } from "@/lib/pay/types"
import type { ChangeStatus, PayGroup, VersionStatus } from "@/lib/pay/types"
import { cn } from "@/lib/utils"

/**
 * Pay is hidden until someone asks for it.
 *
 * The reveal is per screen rather than per row: a page of masked figures
 * with one number showing is worse than either state, and the point of
 * masking is that salary does not appear over somebody's shoulder.
 */
const RevealContext = React.createContext(false)

export function RevealProvider({
  revealed,
  children,
}: {
  revealed: boolean
  children: React.ReactNode
}) {
  return (
    <RevealContext.Provider value={revealed}>{children}</RevealContext.Provider>
  )
}

export function useRevealed() {
  return React.useContext(RevealContext)
}

/** The control that flips the whole screen. */
export function RevealToggle({
  revealed,
  onChange,
  className,
}: {
  revealed: boolean
  onChange: (v: boolean) => void
  className?: string
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("h-9", className)}
      aria-pressed={revealed}
      onClick={() => onChange(!revealed)}
    >
      {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      {revealed ? "Hide amounts" : "Reveal amounts"}
    </Button>
  )
}

/**
 * An amount, masked unless the screen has been revealed. The currency
 * code shows either way, because which currency it is was never the
 * private part.
 */
export function Amount({
  value,
  currency,
  signed,
  className,
}: {
  value: number
  currency: Currency
  signed?: boolean
  className?: string
}) {
  const revealed = useRevealed()
  return (
    <span className={cn("tabular", className)}>
      {revealed
        ? signed
          ? signedMoney(value, currency)
          : money(value, currency)
        : maskedMoney(currency)}
    </span>
  )
}

/** Country first, in a form that reads without the flag as well. */
const FLAG: Record<string, string> = {
  Ghana: "🇬🇭",
  Nigeria: "🇳🇬",
  Kenya: "🇰🇪",
  "United Kingdom": "🇬🇧",
}

export function PayGroupLabel({ group }: { group: PayGroup | undefined }) {
  if (!group) return <span className="text-muted-foreground">Unassigned</span>
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden>{FLAG[group.country] ?? "🌍"}</span>
      <span>{group.name}</span>
    </span>
  )
}

export function CountryLabel({ country }: { country: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden>{FLAG[country] ?? "🌍"}</span>
      <span>{country}</span>
    </span>
  )
}

/* ── Status, always in words ─────────────────────────────────────────── */

export const VERSION_STATUS_LABEL: Record<VersionStatus, string> = {
  pending: "Pending approval",
  scheduled: "Scheduled",
  effective: "In force",
  superseded: "Superseded",
  rejected: "Rejected",
  cancelled: "Cancelled",
}

const VERSION_TONE: Record<VersionStatus, Tone> = {
  pending: "warning",
  scheduled: "info",
  effective: "success",
  superseded: "neutral",
  rejected: "danger",
  cancelled: "neutral",
}

export function VersionStatusPill({ status }: { status: VersionStatus }) {
  return <Pill tone={VERSION_TONE[status]}>{VERSION_STATUS_LABEL[status]}</Pill>
}

export const CHANGE_STATUS_LABEL: Record<ChangeStatus, string> = {
  pending: "Awaiting approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
}

const CHANGE_TONE: Record<ChangeStatus, Tone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
}

export function ChangeStatusPill({ status }: { status: ChangeStatus }) {
  return <Pill tone={CHANGE_TONE[status]}>{CHANGE_STATUS_LABEL[status]}</Pill>
}
