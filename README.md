# Cosmic Atlas

Live space data, built with Nuxt 4 and Tailwind CSS v4. Every data source is public and keyless.

| Section | Source |
|---|---|
| **Earth today**: full-disc photos from a million miles away, playable as a day-long rotation | [NASA EPIC](https://epic.gsfc.nasa.gov/about/api) (DSCOVR satellite) |
| **ISS tracker**: live position on a world map, polled every 5s | [wheretheiss.at](https://wheretheiss.at/w/developer) |
| **Asteroid flybys**: close approaches within ~78 lunar distances over the next 7 days | [JPL close-approach API](https://ssd-api.jpl.nasa.gov/doc/cad.html) |
| **Space weather**: 7 days of solar flares, the Kp index, and NOAA's 3-day outlook | [NOAA SWPC](https://services.swpc.noaa.gov/) |
| **Solar System**: live top-down map of real planet positions with time travel | computed in the browser ([astronomy-engine](https://github.com/cosinekitty/astronomy)) |
| **Exoplanets**: every confirmed exoplanet on a size-vs-orbit chart | [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/) |
| **Black Holes**: a WebGL lensing simulation and every gravitational-wave merger heard | [GWOSC](https://gwosc.org/) |

## Setup

```bash
npm install
npm run dev   # http://localhost:3000
```

No API keys or `.env` needed.

## Deploy (Cloudflare Workers)

Live at https://cosmic-atlas.shans-projects.workers.dev

```bash
npx wrangler login   # once
npm run deploy       # builds with the cloudflare_module preset, then wrangler deploy
```

`wrangler.jsonc` binds a Workers KV namespace (`CACHE`). Slow-changing API routes opt into it with
`base: 'kv'`, so their cache is shared across Worker instances and keeps serving the last good data if a source
goes down. The ISS route stays in memory (it refreshes every 5s, too often for KV's write limits).
`npm run build` / `npm run preview` still produce a plain Node server for local use.

## Structure

- `server/api/*`: cached proxies to each source that return clean shapes (`shared/types/space.ts`). `server/utils/upstream.ts` turns upstream failures into readable errors.
- `app/components/*`: one component per page section
- `app/assets/css/main.css`: Tailwind entry, design tokens (`@theme`) and a few shared component classes (`panel`, `btn`, `eyebrow`…)

## Notes

- EPIC imagery usually appears 2–3 days after capture, so "latest" is rarely today.
- Asteroid sizes are estimated from brightness (absolute magnitude H) unless JPL has a measured diameter, so they're shown as a range.
- The NASA APOD API (`api.nasa.gov/planetary/apod`) was dropped in Nov 2026 because it was returning errors and placeholder entries after APOD moved to science.nasa.gov.

## Scripts

`npm run dev` · `npm run build` · `npm run preview` · `npm run deploy` · `npx nuxi typecheck`
