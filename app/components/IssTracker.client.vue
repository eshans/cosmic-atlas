<script setup lang="ts">
// Live ISS position on a world map, polled every few seconds, with a trail of where it has been.
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import landTopo from 'world-atlas/land-110m.json'

const W = 960
const H = 500
const POLL_MS = 5000
const TRAIL_MAX = 720 // ~1 hour of points, about two-thirds of an orbit

const projection = geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: 'Sphere' })
const path = geoPath(projection)

const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>
const landPath = path(feature(topo, topo.objects.land)) ?? ''
const spherePath = path({ type: 'Sphere' }) ?? ''
const gratPath = path(geoGraticule10()) ?? ''

const iss = ref<IssPosition | null>(null)
const trail = ref<[number, number][]>([])
const error = ref<string | null>(null)

const trailPath = computed(() =>
  trail.value.length > 1 ? (path({ type: 'LineString', coordinates: trail.value }) ?? '') : '',
)
const marker = computed(() => (iss.value ? projection([iss.value.longitude, iss.value.latitude]) : null))

async function poll() {
  try {
    const p = await $fetch<IssPosition>('/api/iss')
    iss.value = p
    error.value = null
    const last = trail.value.at(-1)
    if (!last || last[0] !== p.longitude || last[1] !== p.latitude) {
      trail.value = [...trail.value, [p.longitude, p.latitude] as [number, number]].slice(-TRAIL_MAX)
    }
  } catch (err) {
    error.value = errorText(err)
  }
}

let timer: ReturnType<typeof setInterval> | undefined
const start = () => {
  stop()
  poll()
  timer = setInterval(poll, POLL_MS)
}
const stop = () => clearInterval(timer)
// Pause polling while the tab is hidden.
const onVisibility = () => (document.hidden ? stop() : start())

onMounted(() => {
  start()
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  stop()
  document.removeEventListener('visibilitychange', onVisibility)
})

const coord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
    <div class="panel p-3">
      <svg :viewBox="`0 0 ${W} ${H}`" class="block h-auto w-full" role="img" :aria-label="iss ? `ISS over ${coord(iss.latitude, 'N', 'S')}, ${coord(iss.longitude, 'E', 'W')}` : 'World map'">
        <defs>
          <radialGradient id="iss-glow">
            <stop offset="0%" stop-color="var(--color-sol)" stop-opacity="0.55" />
            <stop offset="100%" stop-color="var(--color-sol)" stop-opacity="0" />
          </radialGradient>
        </defs>
        <path :d="spherePath" class="fill-night/60 stroke-line-strong" />
        <path :d="gratPath" class="fill-none stroke-line" stroke-width="0.6" />
        <path :d="landPath" class="fill-dim/18 stroke-dim/35" stroke-width="0.6" />
        <path :d="trailPath" class="fill-none stroke-ion" stroke-width="1.8" stroke-dasharray="3 4" stroke-linecap="round" opacity="0.8" />
        <g v-if="marker" :transform="`translate(${marker[0]} ${marker[1]})`" class="transition-transform duration-4800 ease-linear">
          <circle r="34" fill="url(#iss-glow)" />
          <circle r="11" class="fill-none stroke-sol" stroke-width="1.2">
            <animate attributeName="r" values="6;20" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle r="5.5" class="fill-sol stroke-void" stroke-width="1.5" />
        </g>
      </svg>
    </div>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-1">
      <p v-if="error" class="error-note col-span-full">{{ error }}</p>
      <template v-if="iss">
        <div class="panel">
          <div class="mono mb-2 text-faint">Position</div>
          <div class="font-display text-lg font-light tabular-nums">{{ coord(iss.latitude, 'N', 'S') }}</div>
          <div class="font-display text-lg font-light tabular-nums">{{ coord(iss.longitude, 'E', 'W') }}</div>
        </div>
        <div class="panel">
          <div class="stat-value text-3xl">{{ fmtInt(iss.speedMph) }}<small class="ml-1 text-[0.45em] text-dim">mph</small></div>
          <div class="mono mt-2 text-faint">Orbital speed</div>
        </div>
        <div class="panel">
          <div class="stat-value text-3xl">{{ fmtDec(iss.altitudeMi) }}<small class="ml-1 text-[0.45em] text-dim">mi</small></div>
          <div class="mono mt-2 text-faint">Altitude</div>
        </div>
        <div class="panel">
          <div class="stat-value text-3xl capitalize" :class="iss.visibility === 'daylight' ? 'text-sol' : 'text-ion'">
            {{ iss.visibility === 'daylight' ? 'Sunlit' : 'In shadow' }}
          </div>
          <div class="mono mt-2 text-faint">Updated {{ fmtDateTime(iss.timestamp * 1000) }}</div>
        </div>
      </template>
      <template v-else-if="!error">
        <div v-for="i in 4" :key="i" class="panel skeleton h-28" />
      </template>
    </div>
  </div>
</template>
