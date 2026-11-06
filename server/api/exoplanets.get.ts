// Every confirmed exoplanet, from the NASA Exoplanet Archive's "Planetary Systems Composite Parameters"
// table (one row per planet, best available values). Keyless TAP API:
// https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html
const TAP = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync'
const COLUMNS = [
  'pl_name', 'hostname', 'disc_year', 'discoverymethod', 'disc_facility',
  'pl_orbper', 'pl_rade', 'pl_bmasse', 'pl_eqt', 'sy_dist', 'sy_pnum',
] as const

type RawRow = { [K in (typeof COLUMNS)[number]]: string | number | null }

/** Round to `sig` significant figures to shrink the JSON without losing anything visible. */
const sig = (v: unknown, digits = 4): number | null => {
  const n = typeof v === 'number' ? v : Number(v)
  return v === null || v === undefined || !Number.isFinite(n) ? null : Number(n.toPrecision(digits))
}

export default defineCachedEventHandler(
  async (): Promise<ExoplanetCatalog> => {
    const raw = await upstreamFetch<RawRow[]>('NASA Exoplanet Archive', TAP, {
      query: `select ${COLUMNS.join(',')} from pscomppars`,
      format: 'json',
    })

    // Most common methods first, so index 0 = Transit, 1 = Radial Velocity, …
    const counts = new Map<string, number>()
    for (const r of raw) {
      const m = String(r.discoverymethod ?? 'Unknown')
      counts.set(m, (counts.get(m) ?? 0) + 1)
    }
    const methods = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m)
    const methodIndex = new Map(methods.map((m, i) => [m, i]))

    const rows: ExoplanetRow[] = []
    for (const r of raw) {
      const period = sig(r.pl_orbper)
      const radius = sig(r.pl_rade, 3)
      if (period === null || radius === null || period <= 0 || radius <= 0) continue
      rows.push([
        String(r.pl_name),
        String(r.hostname),
        Number(r.disc_year),
        methodIndex.get(String(r.discoverymethod ?? 'Unknown'))!,
        String(r.disc_facility ?? ''),
        period,
        radius,
        sig(r.pl_bmasse, 3),
        sig(r.pl_eqt, 3),
        sig(r.sy_dist),
        sig(r.sy_pnum),
      ])
    }

    return { total: raw.length, methods, rows }
  },
  // The archive updates about weekly; serve the cached copy (even if stale) while refreshing.
  { name: 'exoplanets', maxAge: 60 * 60 * 24, swr: true },
)
