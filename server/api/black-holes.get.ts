// Every compact-object merger detected in gravitational waves, from the Gravitational Wave Open Science
// Center (keyless): https://gwosc.org/apidocs/
const ALL_EVENTS = 'https://gwosc.org/eventapi/json/allevents/'

interface RawEvent {
  commonName: string
  GPS: number
  'catalog.shortName': string
  version: number
  mass_1_source: number | null
  mass_2_source: number | null
  final_mass_source: number | null
  luminosity_distance: number | null
  jsonurl: string
}

// Events appear once per catalog release. Prefer the newest official catalog; skip marginal candidates,
// preliminary entries and catalogs from outside the LVK collaboration.
const PRIORITY = [
  'GWTC-5.0', 'GWTC-4.1', 'GWTC-4.0', 'GWTC-3-confident', 'GWTC-2.1-confident', 'GWTC-2', 'GWTC-1-confident',
  'O4_Discovery_Papers', 'O3_Discovery_Papers',
]
const rank = (catalog: string) => {
  const i = PRIORITY.indexOf(catalog)
  return i === -1 ? Infinity : i
}

const NS_MAX = 3 // Suns: above this, treat the object as a black hole
// GPS epoch offset minus the 18 leap seconds since 1980 (17 before 2017, so pre-2017 times are 1 s early)
const GPS_TO_UNIX_S = 315_964_800 - 18

export default defineCachedEventHandler(
  async (): Promise<MergerCatalog> => {
    const raw = await upstreamFetch<{ events: Record<string, RawEvent> }>('GWOSC', ALL_EVENTS)

    const best = new Map<string, RawEvent>()
    for (const e of Object.values(raw.events)) {
      if (!e.mass_1_source || !e.mass_2_source || rank(e['catalog.shortName']) === Infinity) continue
      const cur = best.get(e.commonName)
      const better = !cur
        || rank(e['catalog.shortName']) < rank(cur['catalog.shortName'])
        || (e['catalog.shortName'] === cur['catalog.shortName'] && e.version > cur.version)
      if (better) best.set(e.commonName, e)
    }

    const mergers: Merger[] = [...best.values()].map((e) => {
      const m1 = Math.max(e.mass_1_source!, e.mass_2_source!)
      const m2 = Math.min(e.mass_1_source!, e.mass_2_source!)
      return {
        name: e.commonName,
        time: new Date((e.GPS + GPS_TO_UNIX_S) * 1000).toISOString(),
        kind: m2 > NS_MAX ? 'bbh' : m1 > NS_MAX ? 'nsbh' : 'bns',
        m1,
        m2,
        final: e.final_mass_source ?? null,
        distanceMpc: e.luminosity_distance ?? null,
        catalog: e['catalog.shortName'],
        url: e.jsonurl.replace('/eventapi/json/', '/eventapi/html/'),
      }
    })

    mergers.sort((a, b) => a.time.localeCompare(b.time))
    return { mergers }
  },
  // New catalogs land a few times a year.
  { name: 'black-holes', maxAge: 60 * 60 * 24, swr: true },
)
