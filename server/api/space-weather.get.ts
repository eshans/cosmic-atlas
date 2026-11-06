// Space weather from NOAA's Space Weather Prediction Center (keyless, updated every few minutes).
// https://services.swpc.noaa.gov/
const SWPC = 'https://services.swpc.noaa.gov'

interface RawFlare {
  begin_time: string
  max_time: string
  max_class: string | null
  end_time: string | null
}

interface RawKp {
  time_tag: string // "2026-10-30T00:00:00" (UTC, no zone)
  Kp: number
}

type ScaleValue = string | null
interface RawScaleDay {
  DateStamp: string
  R: { Scale: ScaleValue; MinorProb: ScaleValue; MajorProb: ScaleValue }
  S: { Scale: ScaleValue; Prob: ScaleValue }
  G: { Scale: ScaleValue }
}

const num = (v: ScaleValue) => (v === null || v === '' ? null : Number(v))
const utc = (t: string) => (/[zZ]|[+-]\d\d:?\d\d$/.test(t) ? t : `${t}Z`)

export default defineCachedEventHandler(
  async (): Promise<SpaceWeather> => {
    const [flares, kp, scales] = await Promise.all([
      upstreamFetch<RawFlare[]>('NOAA SWPC', `${SWPC}/json/goes/primary/xray-flares-7-day.json`),
      upstreamFetch<RawKp[]>('NOAA SWPC', `${SWPC}/products/noaa-planetary-k-index.json`),
      upstreamFetch<Record<string, RawScaleDay>>('NOAA SWPC', `${SWPC}/products/noaa-scales.json`),
    ])

    const today = scales['0']
    return {
      flares: flares
        .filter((f) => f.max_class)
        .map((f) => ({
          id: f.begin_time,
          classType: f.max_class!,
          beginTime: utc(f.begin_time),
          peakTime: utc(f.max_time),
          endTime: f.end_time ? utc(f.end_time) : null,
        }))
        .sort((a, b) => b.peakTime.localeCompare(a.peakTime)),
      kp: kp
        .map((k) => ({ time: utc(k.time_tag), kp: Number(k.Kp) }))
        .filter((k) => Number.isFinite(k.kp))
        .sort((a, b) => a.time.localeCompare(b.time)),
      now: {
        r: num(today?.R.Scale ?? null) ?? 0,
        s: num(today?.S.Scale ?? null) ?? 0,
        g: num(today?.G.Scale ?? null) ?? 0,
      },
      outlook: ['1', '2', '3']
        .map((k) => scales[k])
        .filter((d): d is RawScaleDay => Boolean(d))
        .map((d) => ({
          date: d.DateStamp,
          minorFlarePct: num(d.R.MinorProb),
          majorFlarePct: num(d.R.MajorProb),
          radiationPct: num(d.S.Prob),
          g: num(d.G.Scale),
        })),
    }
  },
  { name: 'space-weather', maxAge: 60 * 10, swr: true },
)
