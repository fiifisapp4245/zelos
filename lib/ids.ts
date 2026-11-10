/** A short random id with a readable prefix, e.g. `q-3k9x2`. */
export function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 7)}`
}
