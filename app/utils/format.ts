// All times are shown in UTC so server-rendered and browser-rendered output always match.

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US')

export const fmtDec = (n: number, digits = 1) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

const asDate = (v: string | number) =>
  typeof v === 'number' ? new Date(v) : new Date(v.length === 10 ? `${v}T12:00:00Z` : v)

export const fmtDate = (v: string | number) =>
  asDate(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export const fmtShortDate = (v: string | number) =>
  asDate(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

export const fmtDateTime = (v: string | number) =>
  `${asDate(v).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' })} UTC`

export const fmtWeekday = (v: string | number) =>
  asDate(v).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })

/** Shift a YYYY-MM-DD date by whole days. */
export function shiftDay(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function errorText(err: unknown): string {
  const e = err as { statusMessage?: string; data?: { statusMessage?: string }; message?: string } | null
  return e?.data?.statusMessage || e?.statusMessage || e?.message || 'Something went wrong'
}

/** Flare class (e.g. "M5.2") → peak X-ray flux in W/m², for comparing strength. */
export function flareFlux(classType: string): number {
  const scale: Record<string, number> = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 }
  const letter = classType.charAt(0).toUpperCase()
  return (scale[letter] ?? 0) * (Number.parseFloat(classType.slice(1)) || 1)
}
