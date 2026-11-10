/**
 * The company asset register: what exists, who has it, and what happens to it
 * when someone leaves. An asset has one status and one holder at a time, and
 * every change adds a line to its own history.
 */
import type { Asset, AssetKind, AssetReturn } from "./types"

export const KIND_LABEL: Record<AssetKind, string> = {
  laptop: "Laptop",
  phone: "Phone",
  sim: "SIM card",
  card: "Access card",
  vehicle: "Vehicle",
  other: "Other",
}

export const STATUS_LABEL: Record<Asset["status"], string> = {
  in_stock: "In stock",
  assigned: "Assigned",
  repair: "In repair",
  retired: "Retired",
  lost: "Lost",
}

export function assetsOf(assets: Asset[], employeeId: string) {
  return assets.filter(
    (a) => a.status === "assigned" && a.assignedTo === employeeId
  )
}

/** Only something in stock can be handed out. */
export function canAssign(a: Asset) {
  return a.status === "in_stock"
}

export function assign(
  a: Asset,
  employeeId: string,
  name: string,
  on: string
): Asset {
  if (!canAssign(a))
    throw new Error(
      `${a.tag} is ${STATUS_LABEL[a.status].toLowerCase()}, not in stock.`
    )
  return {
    ...a,
    status: "assigned",
    assignedTo: employeeId,
    assignedOn: on,
    history: [...a.history, { at: on, text: `Assigned to ${name}.` }],
  }
}

export function giveBack(
  a: Asset,
  name: string,
  on: string,
  condition: "good" | "repair" = "good"
): Asset {
  if (a.status !== "assigned") return a
  return {
    ...a,
    status: condition === "repair" ? "repair" : "in_stock",
    assignedTo: null,
    assignedOn: null,
    history: [
      ...a.history,
      {
        at: on,
        text: `Returned by ${name}${condition === "repair" ? ", needs repair" : ""}.`,
      },
    ],
  }
}

export function markLost(a: Asset, on: string, note: string): Asset {
  return {
    ...a,
    status: "lost",
    assignedTo: null,
    assignedOn: null,
    history: [
      ...a.history,
      {
        at: on,
        text: `Marked lost${a.assignedTo ? " while assigned" : ""}. ${note}`.trim(),
      },
    ],
  }
}

export function retire(a: Asset, on: string, note: string): Asset {
  if (a.status === "assigned") return a
  return {
    ...a,
    status: "retired",
    history: [...a.history, { at: on, text: `Retired. ${note}`.trim() }],
  }
}

export function validateAsset(
  d: { tag: string; name: string },
  existing: Asset[],
  selfId?: string
): Record<string, string> {
  const e: Record<string, string> = {}
  const tag = d.tag.trim()
  if (!tag) e.tag = "Give it a tag."
  else if (
    existing.some(
      (a) => a.id !== selfId && a.tag.toLowerCase() === tag.toLowerCase()
    )
  )
    e.tag = "Another asset already has that tag."
  if (d.name.trim().length < 3) e.name = "Name the asset."
  return e
}

/** What a leaver has to hand back, taken from the register instead of retyped. */
export function exitItemsFor(
  assets: Asset[],
  employeeId: string
): AssetReturn[] {
  return assetsOf(assets, employeeId).map((a) => ({
    item: a.name,
    tag: a.tag,
    assetId: a.id,
    returned: false,
  }))
}

export const nextTag = (existing: Asset[], prefix: string) => {
  const n = existing
    .map((a) => a.tag)
    .filter((t) => t.startsWith(prefix))
    .map((t) => Number(t.slice(prefix.length).replace(/\D/g, "")) || 0)
    .reduce((m, v) => Math.max(m, v), 0)
  return `${prefix}${String(n + 1).padStart(4, "0")}`
}
