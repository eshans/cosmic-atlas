interface RawIss {
  latitude: number
  longitude: number
  altitude: number
  velocity: number
  visibility: string
  timestamp: number
}

/** Live ISS position (wheretheiss.at; NORAD id 25544). */
export default defineCachedEventHandler(
  async (): Promise<IssPosition> => {
    try {
      const raw = await $fetch<RawIss>('https://api.wheretheiss.at/v1/satellites/25544', {
        query: { units: 'miles' },
        timeout: 10_000,
      })
      return {
        latitude: raw.latitude,
        longitude: raw.longitude,
        altitudeMi: raw.altitude,
        speedMph: raw.velocity,
        visibility: raw.visibility,
        timestamp: raw.timestamp,
      }
    } catch {
      throw createError({ statusCode: 502, statusMessage: 'Could not reach the ISS tracker' })
    }
  },
  { name: 'iss', maxAge: 5 },
)
