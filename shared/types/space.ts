// Shapes returned by our own /api routes (already cleaned up from the upstream responses).

/** One full-disc photo of Earth from DSCOVR's EPIC camera. */
export interface EarthImage {
  id: string
  time: string // ISO, UTC
  imageUrl: string
  thumbUrl: string
  centroid: { lat: number; lon: number } // point on Earth at the center of the frame
  distanceKm: number // DSCOVR → Earth
}

export interface EarthDay {
  date: string
  prevDate: string | null
  nextDate: string | null
  latestDate: string
  images: EarthImage[]
}

export interface Asteroid {
  id: string
  name: string
  hazardous: boolean
  diameterFt: { min: number; max: number }
  approachEpoch: number
  missMiles: number
  missLunar: number
  speedMph: number
  jplUrl: string
}

export interface AsteroidFeed {
  start: string
  end: string
  asteroids: Asteroid[]
}

export interface SolarFlare {
  id: string
  classType: string // e.g. "M3.5"
  beginTime: string
  peakTime: string
  endTime: string | null
}

export interface KpReading {
  time: string // start of the 3-hour window, ISO UTC
  kp: number
}

/** NOAA space weather scales: R = radio blackouts (flares), S = solar radiation storms, G = geomagnetic storms. */
export interface SpaceWeatherNow {
  r: number
  s: number
  g: number
}

export interface SpaceWeatherOutlook {
  date: string
  minorFlarePct: number | null // R1–R2, roughly M-class flares
  majorFlarePct: number | null // R3+, roughly X-class flares
  radiationPct: number | null // S1+
  g: number | null // expected geomagnetic storm level
}

export interface SpaceWeather {
  flares: SolarFlare[] // last 7 days, newest first
  kp: KpReading[] // last 7 days, oldest first
  now: SpaceWeatherNow
  outlook: SpaceWeatherOutlook[] // next 3 days
}

export interface IssPosition {
  latitude: number
  longitude: number
  altitudeMi: number
  speedMph: number
  visibility: string
  timestamp: number
}
