<script setup lang="ts">
// Top-down view of the solar system with every planet at its real position for the chosen date.
// Positions are computed in the browser (astronomy-engine, VSOP87), so there is no API to fail.
import { Body, GeoVector, HelioVector, RotateVector, Rotation_EQJ_ECL } from 'astronomy-engine'

const SIZE = 1000
const R_MIN = 70 // where Mercury's orbit sits on screen
const R_MAX = 470 // where Neptune's orbit sits
const AU_MIN = 0.3
const AU_MAX = 30.4
const ORBIT_SAMPLES = 180

const toEcliptic = Rotation_EQJ_ECL()

/**
 * Real distances span 0.3 → 30 AU, which would crush the inner planets into a dot.
 * A square-root scale keeps every orbit readable while preserving order and direction.
 */
const scale = (au: number) => {
  const f = (Math.sqrt(Math.max(au, AU_MIN)) - Math.sqrt(AU_MIN)) / (Math.sqrt(AU_MAX) - Math.sqrt(AU_MIN))
  return R_MIN + f * (R_MAX - R_MIN)
}

/** Heliocentric ecliptic position in AU (x toward the March equinox, y 90° ahead). */
function helio(name: PlanetName, date: Date) {
  const v = RotateVector(toEcliptic, HelioVector(Body[name], date))
  return { x: v.x, y: v.y }
}

/** Project to screen: north ecliptic pole toward the viewer, so planets orbit counter-clockwise. */
function project(p: { x: number; y: number }) {
  const r = Math.hypot(p.x, p.y)
  const k = r === 0 ? 0 : scale(r) / r
  return { x: SIZE / 2 + p.x * k, y: SIZE / 2 - p.y * k }
}

// ---- time ----
const now = Date.now()
const time = ref(now)
const date = computed(() => new Date(time.value))

const SPEEDS = [
  { label: '1 day/s', days: 1 },
  { label: '1 week/s', days: 7 },
  { label: '1 month/s', days: 30 },
  { label: '1 year/s', days: 365 },
]
const speed = ref(SPEEDS[1]!.days)
const direction = ref<1 | -1>(1)
const playing = ref(false)

let raf = 0
let last = 0
function frame(ts: number) {
  if (last) time.value += ((ts - last) / 1000) * speed.value * direction.value * 86_400_000
  last = ts
  raf = requestAnimationFrame(frame)
}
watch(playing, (on) => {
  cancelAnimationFrame(raf)
  last = 0
  if (on) raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => cancelAnimationFrame(raf))

function play(dir: 1 | -1) {
  if (playing.value && direction.value === dir) playing.value = false
  else {
    direction.value = dir
    playing.value = true
  }
}
function resetToNow() {
  playing.value = false
  time.value = Date.now()
}

// <input type="date"> binding (UTC)
const dateInput = computed({
  get: () => date.value.toISOString().slice(0, 10),
  set: (v: string) => {
    const t = Date.parse(`${v}T12:00:00Z`)
    if (Number.isFinite(t)) {
      playing.value = false
      time.value = t
    }
  },
})

// ---- geometry ----
// Orbit outlines: sample each planet's real (elliptical) path once, over one full period.
const orbits = PLANETS.map((p) => {
  const step = (p.yearDays * 86_400_000) / ORBIT_SAMPLES
  const pts = Array.from({ length: ORBIT_SAMPLES }, (_, i) => project(helio(p.name, new Date(now + i * step))))
  return { name: p.name, d: `M${pts.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L')}Z` }
})

const bodies = computed(() =>
  PLANETS.map((p) => {
    const h = helio(p.name, date.value)
    return { ...p, au: Math.hypot(h.x, h.y), ...project(h) }
  }),
)

// ---- selection ----
const selectedName = ref<PlanetName>('Earth')
const selected = computed(() => bodies.value.find((b) => b.name === selectedName.value)!)
const fromEarthAu = computed(() =>
  selected.value.name === 'Earth' ? null : GeoVector(Body[selected.value.name], date.value, true).Length(),
)

const isNow = computed(() => Math.abs(time.value - Date.now()) < 86_400_000 / 2)

const fmtLight = (au: number) => {
  const s = au * LIGHT_SECONDS_PER_AU
  return s < 3600 ? `${fmtDec(s / 60, 1)} light-min` : `${fmtDec(s / 3600, 2)} light-hr`
}
const fmtDuration = (hours: number) => (hours < 72 ? `${fmtDec(hours, 1)} hours` : `${fmtInt(hours / 24)} Earth days`)
const fmtYear = (days: number) => (days < 1000 ? `${fmtDec(days, 0)} days` : `${fmtDec(days / 365.25, 1)} years`)
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
    <!-- map -->
    <div class="panel p-3">
      <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" class="block h-auto w-full" role="group" aria-label="Map of the solar system, viewed from above">
        <defs>
          <radialGradient id="sun-glow">
            <stop offset="0%" stop-color="var(--color-sol)" stop-opacity="0.6" />
            <stop offset="35%" stop-color="var(--color-sol)" stop-opacity="0.15" />
            <stop offset="100%" stop-color="var(--color-sol)" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- orbits -->
        <path
          v-for="o in orbits"
          :key="o.name"
          :d="o.d"
          fill="none"
          class="transition-colors"
          :class="o.name === selectedName ? 'stroke-ion/60' : 'stroke-line-strong'"
          :stroke-width="o.name === selectedName ? 1.5 : 1"
        />

        <!-- Sun -->
        <circle :cx="SIZE / 2" :cy="SIZE / 2" r="60" fill="url(#sun-glow)" />
        <circle :cx="SIZE / 2" :cy="SIZE / 2" r="15" class="fill-sol" />

        <!-- planets -->
        <g
          v-for="b in bodies"
          :key="b.name"
          :transform="`translate(${b.x} ${b.y})`"
          role="button"
          tabindex="0"
          :aria-label="`${b.name}, ${fmtDec(b.au, 2)} AU from the Sun`"
          :aria-pressed="b.name === selectedName"
          class="group cursor-pointer outline-none"
          @click="selectedName = b.name"
          @keydown.enter.prevent="selectedName = b.name"
          @keydown.space.prevent="selectedName = b.name"
        >
          <!-- larger invisible hit area -->
          <circle :r="b.dotRadius + 12" fill="transparent" />
          <circle
            v-if="b.name === selectedName"
            :r="b.dotRadius + 7"
            fill="none"
            class="stroke-ion"
            stroke-width="1.5"
          />
          <circle :r="b.dotRadius + 7" fill="none" class="stroke-ion opacity-0 group-focus-visible:opacity-100" stroke-width="2" />
          <ellipse v-if="b.name === 'Saturn'" :rx="b.dotRadius * 1.9" :ry="b.dotRadius * 0.55" fill="none" :stroke="b.color" stroke-width="2" opacity="0.7" transform="rotate(-20)" />
          <circle :r="b.dotRadius" :fill="b.color" />
          <text
            :y="-(b.dotRadius + 12)"
            text-anchor="middle"
            class="font-mono text-[15px] tracking-wider uppercase transition-colors"
            :class="b.name === selectedName ? 'fill-ink' : 'fill-dim group-hover:fill-ink'"
          >
            {{ b.name }}
          </text>
        </g>
      </svg>

      <!-- time controls -->
      <div class="flex flex-wrap items-center gap-2 border-t border-line px-2 pt-3 pb-1">
        <button class="btn" :aria-pressed="playing && direction === -1" aria-label="Play backwards" @click="play(-1)">
          {{ playing && direction === -1 ? '❚❚' : '◀' }}
        </button>
        <button class="btn" :aria-pressed="playing && direction === 1" aria-label="Play forwards" @click="play(1)">
          {{ playing && direction === 1 ? '❚❚' : '▶' }}
        </button>
        <select
          v-model.number="speed"
          class="mono cursor-pointer rounded-full border border-line-strong bg-void/45 px-3 py-2 text-ink"
          aria-label="Playback speed"
        >
          <option v-for="s in SPEEDS" :key="s.days" :value="s.days">{{ s.label }}</option>
        </select>
        <input
          v-model="dateInput"
          type="date"
          class="mono rounded-full border border-line-strong bg-void/45 px-3 py-1.5 text-ink scheme-dark"
          aria-label="Date"
        >
        <button class="btn" :disabled="isNow" @click="resetToNow">Now</button>
        <span class="mono ml-auto text-faint">
          <span v-if="isNow" class="text-ion">● live · </span>{{ fmtDate(time) }}
        </span>
      </div>
    </div>

    <!-- details -->
    <aside class="panel flex flex-col" aria-live="polite">
      <div class="flex items-center gap-3">
        <span class="size-4 rounded-full" :style="{ background: selected.color, boxShadow: `0 0 16px ${selected.color}` }" />
        <span class="mono text-faint">{{ selected.kind }} planet</span>
      </div>
      <h3 class="mt-3 font-display text-3xl font-medium tracking-tight">{{ selected.name }}</h3>
      <p class="mt-3 text-sm text-dim">{{ selected.blurb }}</p>

      <dl class="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        <div class="col-span-2 bg-void/70 p-4">
          <dt class="mono text-faint">From the Sun · {{ isNow ? 'now' : fmtShortDate(time) }}</dt>
          <dd class="mt-1 font-display text-lg font-light tabular-nums">
            {{ fmtDec(selected.au, 2) }} AU
            <span class="text-sm text-dim">· {{ fmtDec((selected.au * MILES_PER_AU) / 1e6, 0) }}M mi</span>
          </dd>
        </div>
        <div class="col-span-2 bg-void/70 p-4">
          <dt class="mono text-faint">From Earth</dt>
          <dd class="mt-1 font-display text-lg font-light tabular-nums">
            <template v-if="fromEarthAu !== null">
              {{ fmtDec(fromEarthAu, 2) }} AU <span class="text-sm text-dim">· {{ fmtLight(fromEarthAu) }}</span>
            </template>
            <template v-else>You are here</template>
          </dd>
        </div>
        <div class="bg-void/70 p-4">
          <dt class="mono text-faint">Year</dt>
          <dd class="mt-1 tabular-nums">{{ fmtYear(selected.yearDays) }}</dd>
        </div>
        <div class="bg-void/70 p-4">
          <dt class="mono text-faint">Day</dt>
          <dd class="mt-1 tabular-nums">{{ fmtDuration(selected.dayHours) }}</dd>
        </div>
        <div class="bg-void/70 p-4">
          <dt class="mono text-faint">Diameter</dt>
          <dd class="mt-1 tabular-nums">{{ fmtInt(selected.diameterMi) }} mi</dd>
        </div>
        <div class="bg-void/70 p-4">
          <dt class="mono text-faint">Moons</dt>
          <dd class="mt-1 tabular-nums">{{ selected.moons }}</dd>
        </div>
        <div class="col-span-2 bg-void/70 p-4">
          <dt class="mono text-faint">Mean temperature</dt>
          <dd class="mt-1 tabular-nums">{{ fmtInt(selected.meanTempF) }}°F</dd>
        </div>
      </dl>

      <p class="mt-auto pt-5 text-xs text-faint">
        Distances are compressed (square-root scale) and planet sizes are not to scale. Positions are accurate to within about
        an arcminute.
      </p>
    </aside>
  </div>
</template>
