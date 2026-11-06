// Full-disc photos of Earth from the EPIC camera on NOAA's DSCOVR satellite, parked at the
// Sun–Earth L1 point about a million miles away. Public, keyless API: https://epic.gsfc.nasa.gov/about/api
const EPIC = 'https://epic.gsfc.nasa.gov'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

interface RawEpic {
  identifier: string
  image: string
  date: string // "2026-11-03 00:31:45" (UTC)
  centroid_coordinates: { lat: number; lon: number }
  dscovr_j2000_position: { x: number; y: number; z: number }
}

// The list of days with imagery changes at most a few times a day.
const availableDays = defineCachedFunction(
  () => upstreamFetch<string[]>('NASA EPIC', `${EPIC}/api/natural/available`).then((d) => [...d].sort()),
  { base: 'kv', name: 'epic-available', maxAge: 60 * 60, swr: true },
)

export default defineCachedEventHandler(
  async (event): Promise<EarthDay> => {
    const { date: asked } = getQuery(event)
    if (asked !== undefined && (typeof asked !== 'string' || !DATE_RE.test(asked))) {
      throw createError({ statusCode: 400, statusMessage: 'date must be YYYY-MM-DD' })
    }

    const days = await availableDays()
    const latestDate = days.at(-1)
    if (!latestDate) throw createError({ statusCode: 502, statusMessage: 'NASA EPIC returned no dates' })

    const date = asked ?? latestDate
    const idx = days.indexOf(date)
    if (idx === -1) throw createError({ statusCode: 404, statusMessage: `No EPIC imagery for ${date}` })

    const raw = await upstreamFetch<RawEpic[]>('NASA EPIC', `${EPIC}/api/natural/date/${date}`)
    const folder = `${EPIC}/archive/natural/${date.replaceAll('-', '/')}`

    return {
      date,
      prevDate: days[idx - 1] ?? null,
      nextDate: days[idx + 1] ?? null,
      latestDate,
      images: raw
        .map((r) => {
          const p = r.dscovr_j2000_position
          return {
            id: r.identifier,
            time: `${r.date.replace(' ', 'T')}Z`,
            imageUrl: `${folder}/jpg/${r.image}.jpg`,
            thumbUrl: `${folder}/thumbs/${r.image}.jpg`,
            centroid: r.centroid_coordinates,
            distanceKm: Math.hypot(p.x, p.y, p.z),
          }
        })
        .sort((a, b) => a.time.localeCompare(b.time)),
    }
  },
  {
    name: 'earth',
    base: 'kv',
    maxAge: 60 * 60,
    swr: true,
    getKey: (event) => String(getQuery(event).date ?? 'latest'),
  },
)
