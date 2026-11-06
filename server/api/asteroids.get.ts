// Close approaches to Earth over the next 7 days, from JPL's Small-Body Database (keyless).
// https://ssd-api.jpl.nasa.gov/doc/cad.html
const CAD = 'https://ssd-api.jpl.nasa.gov/cad.api'

const AU_MILES = 92_955_807.3
const AU_PER_LUNAR = 0.00256955529
const KMS_TO_MPH = 2236.936
const MAX_DIST_AU = 0.2 // ~78 lunar distances

interface RawCad {
  count: number | string
  fields: string[]
  data?: (string | null)[][]
}

/** Turn CAD's column-array format into objects keyed by field name. */
const rows = (raw: RawCad) =>
  (raw.data ?? []).map((r) => Object.fromEntries(raw.fields.map((f, i) => [f, r[i] ?? null])) as Record<string, string | null>)

/**
 * Size from absolute magnitude H when no measured diameter exists.
 * D(km) = 1329 / √albedo × 10^(-H/5), using albedos 0.25 (bright, small) to 0.05 (dark, large).
 */
function diameterFromH(h: number) {
  const km = (albedo: number) => (1329 / Math.sqrt(albedo)) * 10 ** (-h / 5)
  return { min: km(0.25) * 3280.84, max: km(0.05) * 3280.84 }
}

export default defineCachedEventHandler(
  async (): Promise<AsteroidFeed> => {
    const start = isoDay(0)
    const end = isoDay(7)
    const query = { 'date-min': start, 'date-max': end, 'dist-max': MAX_DIST_AU }

    const [all, pha] = await Promise.all([
      upstreamFetch<RawCad>('JPL', CAD, { ...query, diameter: true, fullname: true }),
      upstreamFetch<RawCad>('JPL', CAD, { ...query, pha: true }),
    ])
    const hazardous = new Set(rows(pha).map((r) => r.des))

    const asteroids: Asteroid[] = rows(all).flatMap((r) => {
      const des = r.des
      const dist = Number(r.dist)
      const h = Number(r.h)
      if (!des || !Number.isFinite(dist)) return []

      const measuredKm = r.diameter ? Number(r.diameter) : null
      const diameterFt = measuredKm
        ? { min: measuredKm * 3280.84, max: measuredKm * 3280.84 }
        : Number.isFinite(h) ? diameterFromH(h) : { min: 0, max: 0 }

      return [{
        id: `${des}-${r.jd}`,
        name: (r.fullname ?? des).replace(/[()]/g, '').trim(),
        hazardous: hazardous.has(des),
        diameterFt,
        approachEpoch: Math.round((Number(r.jd) - 2440587.5) * 86_400_000), // Julian date → Unix ms
        missMiles: dist * AU_MILES,
        missLunar: dist / AU_PER_LUNAR,
        speedMph: Number(r.v_rel) * KMS_TO_MPH,
        jplUrl: `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(des)}`,
      }]
    })

    asteroids.sort((a, b) => a.approachEpoch - b.approachEpoch)
    return { start, end, asteroids }
  },
  { name: 'asteroids', maxAge: 60 * 60 * 3, swr: true, getKey: () => isoDay(0) },
)
