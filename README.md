# Cosmic Atlas

Live space data, built with Nuxt 4 and Tailwind CSS v4. Every data source is public and keyless.

| Section | Source |
|---|---|
| **Earth today**: full-disc photos from a million miles away, playable as a day-long rotation | [NASA EPIC](https://epic.gsfc.nasa.gov/about/api) (DSCOVR satellite) |
| **ISS tracker**: live position on a world map, polled every 5s | [wheretheiss.at](https://wheretheiss.at/w/developer) |
| **Asteroid flybys**: close approaches within ~78 lunar distances over the next 7 days | [JPL close-approach API](https://ssd-api.jpl.nasa.gov/doc/cad.html) |
| **Space weather**: 7 days of solar flares, the Kp index, and NOAA's 3-day outlook | [NOAA SWPC](https://services.swpc.noaa.gov/) |

## Setup

```bash
npm install
npm run dev   # http://localhost:3000
```

No API keys or `.env` needed.

## Structure

- `server/api/*`: cached proxies to each source that return clean shapes (`shared/types/space.ts`). `server/utils/upstream.ts` turns upstream failures into readable errors.
- `app/components/*`: one component per page section
- `app/assets/css/main.css`: Tailwind entry, design tokens (`@theme`) and a few shared component classes (`panel`, `btn`, `eyebrow`…)

## Notes

- EPIC imagery usually appears 2–3 days after capture, so "latest" is rarely today.
- Asteroid sizes are estimated from brightness (absolute magnitude H) unless JPL has a measured diameter, so they're shown as a range.
- The NASA APOD API (`api.nasa.gov/planetary/apod`) was dropped in Nov 2026 because it was returning errors and placeholder entries after APOD moved to science.nasa.gov.

## Scripts

`npm run dev` · `npm run build` · `npm run preview` · `npx nuxi typecheck`
