<script setup lang="ts">
// Every known exoplanet on one chart: orbital period (x) vs radius (y), both log scales, colored by how it
// was found, with our own planets overlaid for scale. Dots are drawn on a canvas (6k+ points); axes, labels,
// highlights and hover live in an SVG on top.

// Categorical slots 1–3 of the reference palette, dark steps. Validated all-pairs (scatter) against the
// panel surface #0d0b20: CVD ΔE ≥ 9.4, normal-vision ΔE ≥ 20.9, contrast ≥ 3:1. Max three for a scatter.
const GROUPS = [
  { key: 'transit', label: 'Transit', color: '#3987e5', hint: 'the star dims as the planet crosses it' },
  { key: 'rv', label: 'Radial velocity', color: '#d95926', hint: 'the star wobbles from the planet’s pull' },
  { key: 'other', label: 'Other methods', color: '#199e70', hint: 'microlensing, direct imaging, timing…' },
] as const
type GroupKey = (typeof GROUPS)[number]['key']

const X_DOMAIN = [0.1, 1e6] as const // orbital period, days
const Y_DOMAIN = [0.3, 30] as const // radius, Earth radii
const X_TICKS: [number, string][] = [[0.1, '0.1'], [1, '1'], [10, '10'], [100, '100'], [1e3, '1k'], [1e4, '10k'], [1e5, '100k'], [1e6, '1M']]
const Y_TICKS: [number, string][] = [[0.5, '0.5'], [1, '1'], [2, '2'], [4, '4'], [10, '10'], [20, '20']]
const M = { top: 16, right: 16, bottom: 46, left: 56 }
const DOT_R = 2.5
const HIT_PX = 14 // nearest-point radius: a ≥24px target around each 5px dot

interface Planet {
  i: number
  name: string
  host: string
  year: number
  method: string
  group: GroupKey
  facility: string
  period: number
  radius: number
  mass: number | null
  eqTempK: number | null
  distPc: number | null
  sysPlanets: number | null
}

// ---- data ----
const catalog = ref<ExoplanetCatalog | null>(null)
const error = ref<string | null>(null)
onMounted(async () => {
  try {
    catalog.value = await $fetch<ExoplanetCatalog>('/api/exoplanets')
  } catch (err) {
    error.value = errorText(err)
  }
})

const planets = computed<Planet[]>(() => {
  const c = catalog.value
  if (!c) return []
  return c.rows.map(([name, host, year, m, facility, period, radius, mass, eqTempK, distPc, sysPlanets], i) => {
    const method = c.methods[m] ?? 'Unknown'
    const group: GroupKey = method === 'Transit' ? 'transit' : method === 'Radial Velocity' ? 'rv' : 'other'
    return { i, name, host, year, method, group, facility, period, radius, mass, eqTempK, distPc, sysPlanets }
  })
})

const inDomain = (p: Planet) =>
  p.period >= X_DOMAIN[0] && p.period <= X_DOMAIN[1] && p.radius >= Y_DOMAIN[0] && p.radius <= Y_DOMAIN[1]

// ---- filters (one row above the chart; color always follows the group, never its position) ----
const shown = reactive<Record<GroupKey, boolean>>({ transit: true, rv: true, other: true })
const counts = computed(() => {
  const c: Record<GroupKey, number> = { transit: 0, rv: 0, other: 0 }
  for (const p of planets.value) c[p.group]++
  return c
})
const visible = computed(() => planets.value.filter((p) => shown[p.group] && inDomain(p)))
const offChart = computed(() => planets.value.filter((p) => shown[p.group] && !inDomain(p)).length)

// ---- layout ----
const box = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const width = ref(800)
const height = computed(() => Math.max(360, Math.round(width.value * 0.62)))
// Watch the element rather than using onMounted: .client components mount a placeholder first, so the
// template ref is still null when onMounted runs.
watch(box, (el, _, onCleanup) => {
  if (!el) return
  const ro = new ResizeObserver(([e]) => (width.value = Math.round(e!.contentRect.width)))
  ro.observe(el)
  onCleanup(() => ro.disconnect())
})

const log = Math.log10
const sx = (period: number) =>
  M.left + ((log(period) - log(X_DOMAIN[0])) / (log(X_DOMAIN[1]) - log(X_DOMAIN[0]))) * (width.value - M.left - M.right)
const sy = (radius: number) =>
  height.value - M.bottom - ((log(radius) - log(Y_DOMAIN[0])) / (log(Y_DOMAIN[1]) - log(Y_DOMAIN[0]))) * (height.value - M.top - M.bottom)

// Screen positions of visible dots, for drawing and nearest-point hover.
const points = computed(() => visible.value.map((p) => ({ p, x: sx(p.period), y: sy(p.radius) })))

const DRAW_ORDER: GroupKey[] = ['transit', 'rv', 'other'] // smaller groups on top so they stay visible
function draw() {
  const el = canvas.value
  const ctx = el?.getContext('2d')
  if (!el || !ctx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  el.width = width.value * dpr
  el.height = height.value * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width.value, height.value)
  ctx.globalAlpha = 0.72
  for (const g of DRAW_ORDER) {
    ctx.fillStyle = GROUPS.find((x) => x.key === g)!.color
    ctx.beginPath()
    for (const { p, x, y } of points.value) {
      if (p.group !== g) continue
      ctx.moveTo(x + DOT_R, y)
      ctx.arc(x, y, DOT_R, 0, Math.PI * 2)
    }
    ctx.fill()
  }
}
watch([points, height], () => nextTick(draw), { flush: 'post' })

// ---- our solar system, for scale ----
const LABEL_LEFT = new Set(['Venus', 'Uranus']) // their neighbors sit just to the right
const solar = PLANETS.map((p) => ({
  name: p.name,
  period: p.yearDays,
  radius: p.diameterMi / 7926,
  left: LABEL_LEFT.has(p.name),
}))

// ---- hover & selection ----
const hovered = ref<{ p: Planet; x: number; y: number } | null>(null)
const selectedIdx = ref<number | null>(null)
watch(planets, (list) => {
  if (selectedIdx.value === null) selectedIdx.value = list.find((p) => p.name === 'Proxima Cen b')?.i ?? list[0]?.i ?? null
})
const selected = computed(() => (selectedIdx.value === null ? null : (planets.value[selectedIdx.value] ?? null)))
const selectedPos = computed(() =>
  selected.value && inDomain(selected.value) ? { x: sx(selected.value.period), y: sy(selected.value.radius) } : null,
)

function onMove(e: PointerEvent) {
  const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  let best: (typeof points.value)[number] | null = null
  let bestD = HIT_PX * HIT_PX
  for (const pt of points.value) {
    const d = (pt.x - mx) ** 2 + (pt.y - my) ** 2
    if (d < bestD) {
      bestD = d
      best = pt
    }
  }
  hovered.value = best
}
function onClick() {
  if (hovered.value) selectedIdx.value = hovered.value.p.i
}

// ---- search ----
const query = ref('')
const searchOpen = ref(false)
const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return planets.value.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6)
})
function pick(p: Planet) {
  selectedIdx.value = p.i
  shown[p.group] = true
  query.value = p.name
  searchOpen.value = false
}

// ---- table view (the chart's accessible twin) ----
const showTable = ref(false)
const tableLimit = ref(25)
const tableRows = computed(() => {
  const q = query.value.trim().toLowerCase()
  return planets.value
    .filter((p) => shown[p.group] && (!q || p.name.toLowerCase().includes(q)))
    .sort((a, b) => (a.distPc ?? Infinity) - (b.distPc ?? Infinity))
})
watch([query, () => ({ ...shown })], () => (tableLimit.value = 25))

// ---- formatting ----
const ly = (pc: number) => pc * 3.26156
const fmtPeriod = (d: number) => (d < 2 ? `${fmtDec(d * 24, 1)} hours` : d < 1000 ? `${fmtDec(d, d < 10 ? 2 : 1)} days` : `${fmtDec(d / 365.25, 1)} years`)
const fmtRadius = (r: number) => (r >= 6 ? `${fmtDec(r / 11.21, 2)}× Jupiter` : `${fmtDec(r, 2)}× Earth`)
const fmtTempF = (k: number) => `${fmtInt((k - 273.15) * 1.8 + 32)}°F`
const fmtDist = (pc: number) => `${ly(pc) < 10 ? fmtDec(ly(pc), 2) : fmtInt(ly(pc))} light-years`
const groupOf = (g: GroupKey) => GROUPS.find((x) => x.key === g)!

const tooltipStyle = computed(() => {
  const h = hovered.value
  if (!h) return {}
  const flip = h.x > width.value - 220
  return { left: `${flip ? h.x - 14 : h.x + 14}px`, top: `${h.y}px`, transform: `translate(${flip ? '-100%' : '0'}, -50%)` }
})
</script>

<template>
  <div>
    <!-- filter row: legend + method toggles + search -->
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <button
        v-for="g in GROUPS"
        :key="g.key"
        class="btn normal-case aria-pressed:border-line-strong aria-[pressed=false]:opacity-45"
        :aria-pressed="shown[g.key]"
        :title="g.hint"
        @click="shown[g.key] = !shown[g.key]"
      >
        <span class="size-2.5 rounded-full" :style="{ background: g.color }" />
        <span class="text-ink">{{ g.label }}</span>
        <span class="text-faint tabular-nums">{{ fmtInt(counts[g.key]) }}</span>
      </button>

      <div class="relative ml-auto w-full sm:w-64">
        <input
          v-model="query"
          type="search"
          placeholder="Find a planet…"
          aria-label="Find a planet by name"
          class="w-full rounded-full border border-line-strong bg-void/45 px-4 py-2 text-sm text-ink placeholder:text-faint"
          @focus="searchOpen = true"
          @blur="searchOpen = false"
          @keydown.enter.prevent="matches[0] && pick(matches[0])"
        >
        <ul
          v-if="searchOpen && matches.length"
          class="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-line-strong bg-night/95 backdrop-blur-xl"
        >
          <li v-for="m in matches" :key="m.i">
            <button class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-panel-hover" @mousedown.prevent="pick(m)">
              <span class="size-2 shrink-0 rounded-full" :style="{ background: groupOf(m.group).color }" />
              {{ m.name }}
              <span class="mono ml-auto text-2xs text-faint">{{ m.year }}</span>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <!-- chart -->
      <div class="panel p-3">
        <p v-if="error" class="error-note m-3">{{ error }}</p>
        <div v-else ref="box" class="relative w-full" :style="{ height: `${height}px` }">
          <div v-if="!catalog" class="skeleton absolute inset-0" />
          <canvas ref="canvas" class="absolute inset-0 size-full" aria-hidden="true" />
          <svg
            v-if="catalog"
            :viewBox="`0 0 ${width} ${height}`"
            class="absolute inset-0 size-full cursor-crosshair touch-none"
            role="img"
            :aria-label="`Scatter chart of ${fmtInt(visible.length)} exoplanets by orbital period and radius. Use the table view or search for individual planets.`"
            @pointermove="onMove"
            @pointerleave="hovered = null"
            @click="onClick"
          >
            <!-- grid (solid hairlines) + ticks -->
            <g class="font-mono text-[11px]">
              <g v-for="[v, label] in X_TICKS" :key="`x${v}`">
                <line :x1="sx(v)" :x2="sx(v)" :y1="M.top" :y2="height - M.bottom" class="stroke-line" />
                <text :x="sx(v)" :y="height - M.bottom + 16" text-anchor="middle" class="fill-faint">{{ label }}</text>
              </g>
              <g v-for="[v, label] in Y_TICKS" :key="`y${v}`">
                <line :x1="M.left" :x2="width - M.right" :y1="sy(v)" :y2="sy(v)" class="stroke-line" />
                <text :x="M.left - 8" :y="sy(v) + 4" text-anchor="end" class="fill-faint">{{ label }}</text>
              </g>
              <text :x="(M.left + width - M.right) / 2" :y="height - 6" text-anchor="middle" class="fill-dim tracking-wider uppercase">
                Orbital period · days (log)
              </text>
              <text :transform="`translate(14 ${(M.top + height - M.bottom) / 2}) rotate(-90)`" text-anchor="middle" class="fill-dim tracking-wider uppercase">
                Radius · × Earth (log)
              </text>
            </g>

            <!-- population annotations (muted, sparing) -->
            <g class="label-halo pointer-events-none fill-dim text-[12px] italic">
              <text :x="sx(0.13)" :y="sy(14)">Hot Jupiters →</text>
              <text :x="sx(0.13)" :y="sy(3)">Sub-Neptunes →</text>
              <text :x="sx(0.13)" :y="sy(1.3)">Super-Earths →</text>
            </g>

            <!-- our solar system, in neutral ink so it doesn't compete with the data colors -->
            <g class="pointer-events-none">
              <g v-for="s in solar" :key="s.name" :transform="`translate(${sx(s.period)} ${sy(s.radius)})`">
                <circle r="5" class="fill-void stroke-ink" stroke-width="1.5" />
                <text :x="s.left ? -8 : 8" y="4" :text-anchor="s.left ? 'end' : 'start'" class="label-halo fill-ink font-mono text-[11px]">{{ s.name }}</text>
              </g>
            </g>

            <!-- selected + hovered -->
            <circle v-if="selectedPos" :cx="selectedPos.x" :cy="selectedPos.y" r="8" fill="none" class="stroke-sol" stroke-width="2" />
            <circle v-if="hovered" :cx="hovered.x" :cy="hovered.y" r="6" fill="none" class="stroke-ink" stroke-width="2" />
          </svg>

          <!-- tooltip: values lead, names follow -->
          <div
            v-if="hovered"
            class="pointer-events-none absolute z-10 w-max max-w-56 rounded-xl border border-line-strong bg-night/95 px-3 py-2 text-sm shadow-xl backdrop-blur"
            :style="tooltipStyle"
          >
            <div class="font-medium text-ink tabular-nums">{{ fmtRadius(hovered.p.radius) }} · {{ fmtPeriod(hovered.p.period) }}</div>
            <div class="mt-0.5 flex items-center gap-2 text-dim">
              <span class="h-0.5 w-3 rounded" :style="{ background: groupOf(hovered.p.group).color }" />
              {{ hovered.p.name }}
            </div>
            <div class="mono mt-1 text-2xs text-faint">click for details</div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-2 pt-3 pb-1">
          <span class="mono text-faint">
            <template v-if="catalog">
              {{ fmtInt(visible.length) }} plotted
              <template v-if="offChart"> · {{ offChart }} off-scale</template>
              · {{ fmtInt(catalog.total - planets.length) }} lack a radius or period
            </template>
          </span>
          <span class="mono flex items-center gap-1.5 text-faint">
            <svg viewBox="0 0 12 12" class="size-3"><circle cx="6" cy="6" r="4.5" class="fill-void stroke-ink" stroke-width="1.5" /></svg>
            our solar system
          </span>
          <button class="btn ml-auto" :aria-pressed="showTable" @click="showTable = !showTable">
            {{ showTable ? 'Hide table' : 'Table view' }}
          </button>
        </div>
      </div>

      <!-- details -->
      <aside class="panel flex flex-col" aria-live="polite">
        <template v-if="selected">
          <div class="flex items-center gap-2">
            <span class="size-3 rounded-full" :style="{ background: groupOf(selected.group).color }" />
            <span class="mono text-faint">{{ selected.method }} · {{ selected.year }}</span>
          </div>
          <h3 class="mt-3 font-display text-2xl font-medium tracking-tight wrap-break-word">{{ selected.name }}</h3>
          <p class="mt-1 text-sm text-dim">
            Orbits {{ selected.host }}<template v-if="selected.sysPlanets && selected.sysPlanets > 1">, one of {{ selected.sysPlanets }} known planets there</template>.
          </p>

          <dl class="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
            <div class="col-span-2 bg-void/70 p-4">
              <dt class="mono text-faint">Distance from us</dt>
              <dd class="mt-1 font-display text-lg font-light">{{ selected.distPc ? fmtDist(selected.distPc) : 'unknown' }}</dd>
            </div>
            <div class="bg-void/70 p-4">
              <dt class="mono text-faint">Size</dt>
              <dd class="mt-1 tabular-nums">{{ fmtRadius(selected.radius) }}</dd>
            </div>
            <div class="bg-void/70 p-4">
              <dt class="mono text-faint">Mass</dt>
              <dd class="mt-1 tabular-nums">{{ selected.mass ? `${fmtDec(selected.mass, selected.mass < 10 ? 2 : 0)}× Earth` : '—' }}</dd>
            </div>
            <div class="bg-void/70 p-4">
              <dt class="mono text-faint">Year</dt>
              <dd class="mt-1 tabular-nums">{{ fmtPeriod(selected.period) }}</dd>
            </div>
            <div class="bg-void/70 p-4">
              <dt class="mono text-faint">Temperature</dt>
              <dd class="mt-1 tabular-nums">{{ selected.eqTempK ? fmtTempF(selected.eqTempK) : '—' }}</dd>
            </div>
            <div class="col-span-2 bg-void/70 p-4">
              <dt class="mono text-faint">Discovered by</dt>
              <dd class="mt-1">{{ selected.facility || '—' }}</dd>
            </div>
          </dl>
          <p class="mt-auto pt-5 text-xs text-faint">
            Temperature is the estimated equilibrium temperature, ignoring any atmosphere. Many sizes and masses are
            estimated from one another.
          </p>
        </template>
        <div v-else-if="!error" class="skeleton h-full min-h-80" />
      </aside>
    </div>

    <!-- table view -->
    <div v-if="showTable && catalog" class="panel mt-4 p-0">
      <div class="max-h-130 overflow-auto">
        <table class="w-full text-left text-sm">
          <caption class="mono border-b border-line px-panel py-3 text-left text-faint">
            {{ fmtInt(tableRows.length) }} planets{{ query.trim() ? ` matching “${query.trim()}”` : '' }}, nearest first
          </caption>
          <thead class="mono sticky top-0 bg-night text-faint">
            <tr>
              <th class="px-panel py-2.5 font-normal">Planet</th>
              <th class="px-3 py-2.5 font-normal">Method</th>
              <th class="px-3 py-2.5 text-right font-normal">Found</th>
              <th class="px-3 py-2.5 text-right font-normal">Radius (× Earth)</th>
              <th class="px-3 py-2.5 text-right font-normal">Period (days)</th>
              <th class="px-panel py-2.5 text-right font-normal">Distance (ly)</th>
            </tr>
          </thead>
          <tbody class="tabular-nums">
            <tr
              v-for="p in tableRows.slice(0, tableLimit)"
              :key="p.i"
              class="cursor-pointer border-t border-line hover:bg-panel-hover"
              :class="{ 'bg-sol/8': p.i === selectedIdx }"
              @click="selectedIdx = p.i"
            >
              <td class="px-panel py-2">
                <button class="text-left hover:text-sol" @click.stop="selectedIdx = p.i">{{ p.name }}</button>
              </td>
              <td class="px-3 py-2 text-dim">{{ p.method }}</td>
              <td class="px-3 py-2 text-right text-dim">{{ p.year }}</td>
              <td class="px-3 py-2 text-right">{{ fmtDec(p.radius, 2) }}</td>
              <td class="px-3 py-2 text-right">{{ p.period < 10 ? fmtDec(p.period, 2) : fmtInt(p.period) }}</td>
              <td class="px-panel py-2 text-right">{{ p.distPc ? fmtDec(ly(p.distPc), ly(p.distPc) < 10 ? 2 : 0) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="tableRows.length > tableLimit" class="border-t border-line px-panel py-3">
        <button class="btn" @click="tableLimit += 100">Show 100 more</button>
      </div>
    </div>
  </div>
</template>
