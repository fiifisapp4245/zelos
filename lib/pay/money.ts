import type { Currency } from "./types"

/**
 * Money always says what it is.
 *
 * Every amount carries its currency code, and totals are kept per
 * currency — adding GHS to NGN produces a number nobody can act on, so
 * this module makes that sum awkward to write rather than easy.
 */

const LOCALE: Record<string, string> = {
  GHS: "en-GH",
  NGN: "en-NG",
  USD: "en-US",
  GBP: "en-GB",
  KES: "en-KE",
}

export function money(amount: number, currency: Currency) {
  const formatted = amount.toLocaleString(LOCALE[currency] ?? "en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${currency} ${formatted}`
}

/** Rounded to the nearest unit, for totals where pesewas are noise. */
export function moneyShort(amount: number, currency: Currency) {
  return `${currency} ${Math.round(amount).toLocaleString(LOCALE[currency] ?? "en-GB")}`
}

export function signedMoney(amount: number, currency: Currency) {
  if (amount === 0) return money(0, currency)
  return `${amount > 0 ? "+" : "−"}${money(Math.abs(amount), currency)}`
}

export function percent(value: number) {
  const rounded = Math.round(value * 10) / 10
  return `${rounded > 0 ? "+" : ""}${rounded}%`
}

export interface CurrencyTotal {
  currency: Currency
  amount: number
}

/**
 * Sums per currency. The return is a list rather than a number, because
 * there is no single number to return.
 */
export function totalPerCurrency(
  rows: { amount: number; currency: Currency }[]
): CurrencyTotal[] {
  const map = new Map<Currency, number>()
  for (const r of rows)
    map.set(r.currency, (map.get(r.currency) ?? 0) + r.amount)
  return [...map.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency))
}

/** The masked form. Same width whatever the number, so nothing leaks. */
export function maskedMoney(currency: Currency) {
  return `${currency} ••••••`
}
