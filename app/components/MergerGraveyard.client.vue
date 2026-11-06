<script setup lang="ts">
// "Stellar graveyard": every merger heard in gravitational waves, sorted by the mass of what it left behind.
// Each column is one event: two objects (small dots) joined by lines to the single remnant (larger dot).

// Categorical slots 1–3 of the reference palette, dark steps, validated all-pairs against the panel surface
// #0d0b20 (CVD ΔE ≥ 9.4, normal-vision ΔE ≥ 20.9, contrast ≥ 3:1). Same three as the Exoplanets chart.
const KINDS = [
  { key: 'bbh', label: 'Two black holes', color: '#3987e5' },
  { key: 'nsbh', label: 'Black hole + neutron star', color: '#d95926' },
  { key: 'bns', label: 'Two neutron stars', color: '#199e70' },
] as const
type Kind = Merger['kind']

const Y_DOMAIN = [0.8, 300] as const // Suns, log
const Y_TICKS = [1, 3, 10, 30, 100, 300]
const M = { top: 18, right: 16, bottom: 34, left: 52 }
const HEIGHT = 440
const NOTABLE: Record<string, string> = {
  GW150914: 'First ever detection',
  GW170817: 'Also seen in light',
}

// ---- data ----
const data = ref<MergerCatalog | null>(null)
const error = ref<string | null>(null)
onMounted(async () => {
  try {
    data.value = await $fetch<MergerCatalog>('/api/black-holes')
  } catch (err) {
    error.value = errorText(err)
  }
})
const all = computed(() => data.value?.mergers ?? [])

const shown = reactive<Record<Kind, boolean>>({ bbh: true, nsbh: true, bns: true })
const counts = computed(() => {
  const c: Record<Kind, number> = { bbh: 0, nsbh: 0, bns: 0 }
  for (const m of all.value) c[m.kind]++
  return c
})
const resultMass = (m: Merger) => m.final ?? m.m1 + m.m2
const visible = computed(() =>
  all.value.filter((m) => shown[m.kind]).sort((a, b) => resultMass(a) - resultMass(b)),
)

// ---- headline numbers (all events, independent of filters) ----
const stats = computed(() => {
  const list = all.value
  if (!list.length) return null
  const heaviest = list.reduce((a, b) => (resultMass(b) > resultMass(a) ? b : a))
  const farthest = list.reduce((a, b) => ((b.distanceMpc ?? 0) > (a.distanceMpc ?? 0) ? b : a))
  const radiated = list.reduce((s, m) => s + (m.final ? Math.max(0, m.m1 + m.m2 - m.final) : 0), 0)
  return { total: list.length, heaviest, farthest, radiated }
})

// ---- layout ----
const box = ref<HTMLElement | null>(null)
const width = ref(800)
watch(box, (el, _, onCleanup) => {
  if (!el) return
  const ro = new ResizeObserver(([e]) => (width.value = Math.round(e!.contentRect.width)))
  ro.observe(el)
  onCleanup(() => ro.disconnect())
})

const step = computed(() => (width.value - M.left - M.right) / Math.max(visible.value.length, 1))
const sx = (i: number) => M.left + (i + 0.5) * step.value
const sy = (mass: number) => {
  const l = Math.log10
  return HEIGHT - M.bottom - ((l(mass) - l(Y_DOMAIN[0])) / (l(Y_DOMAIN[1]) - l(Y_DOMAIN[0]))) * (HEIGHT - M.top - M.bottom)
}
const colorOf = (k: Kind) => KINDS.find((x) => x.key === k)!.color

const columns = computed(() =>
  visible.value.map((m, i) => ({ m, x: sx(i), y1: sy(m.m1), y2: sy(m.m2), yf: sy(resultMass(m)) })),
)
const notableCols = computed(() => columns.value.filter((c) => NOTABLE[c.m.name]))

// ---- hover (crosshair snaps to the nearest column) & selection ----
const hoverIdx = ref<number | null>(null)
const hovered = computed(() => (hoverIdx.value === null ? null : (columns.value[hoverIdx.value] ?? null)))
function onMove(e: PointerEvent) {
  const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * width.value
  const i = Math.round((x - M.left) / step.value - 0.5)
  hoverIdx.value = i >= 0 && i < columns.value.length ? i : null
}
const selectedName = ref('GW150914')
const selected = computed(() => all.value.find((m) => m.name === selectedName.value) ?? all.value[0] ?? null)
const selectedCol = computed(() => columns.value.find((c) => c.m.name === selectedName.value) ?? null)
function onClick() {
  if (hovered.value) selectedName.value = hovered.value.m.name
}

const showTable = ref(false)
const tableRows = computed(() => [...visible.value].reverse())

// ---- formatting ----
const LY_PER_MPC = 3.2616e6
const fmtDistance = (mpc: number | null) => {
  if (mpc === null) return '—'
  const ly = mpc * LY_PER_MPC
  return ly >= 1e9 ? `${fmtDec(ly / 1e9, 1)} billion light-years` : `${fmtInt(ly / 1e6)} million light-years`
}
const fmtMass = (m: number) => (m < 10 ? fmtDec(m, 2) : fmtDec(m, 1))
const kindLabel = (k: Kind) => KINDS.find((x) => x.key === k)!.label
const radiatedOf = (m: Merger) => (m.final ? Math.max(0, m.m1 + m.m2 - m.final) : null)

const tooltipStyle = computed(() => {
  const h = hovered.value
  if (!h) return {}
  const flip = h.x > width.value - 230
  return { left: `${flip ? h.x - 12 : h.x + 12}px`, top: `${Math.max(h.yf, 60)}px`, transform: `translate(${flip ? '-100%' : '0'}, -50%)` }
})
</script>

<template>
  <div>
    <p v-if="error" class="error-note">{{ error }}</p>

    <!-- headline numbers -->
    <div class="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <template v-if="stats">
        <div v-reveal="0" class="panel">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="mono mt-2 text-faint">Collisions heard</div>
        </div>
        <div v-reveal="80" class="panel">
          <div class="stat-value">{{ fmtInt(resultMass(stats.heaviest)) }}<small class="ml-1 text-[0.4em] text-dim">Suns</small></div>
          <div class="mono mt-2 truncate text-faint">Heaviest result · {{ stats.heaviest.name }}</div>
        </div>
        <div v-reveal="160" class="panel">
          <div class="stat-value">{{ fmtDec((stats.farthest.distanceMpc ?? 0) * LY_PER_MPC / 1e9, 1) }}<small class="ml-1 text-[0.4em] text-dim">B ly</small></div>
          <div class="mono mt-2 truncate text-faint">Farthest · {{ stats.farthest.name }}</div>
        </div>
        <div v-reveal="240" class="panel">
          <div class="stat-value">{{ fmtInt(stats.radiated) }}<small class="ml-1 text-[0.4em] text-dim">Suns</small></div>
          <div class="mono mt-2 truncate text-faint">Mass turned into gravitational waves</div>
        </div>
      </template>
      <template v-else-if="!error">
        <div v-for="i in 4" :key="i" class="panel skeleton h-32" />
      </template>
    </div>

    <!-- filter row -->
    <div class="mb-4 flex flex-wrap gap-2">
      <button
        v-for="k in KINDS"
        :key="k.key"
        class="btn normal-case aria-[pressed=false]:opacity-45"
        :aria-pressed="shown[k.key]"
        @click="shown[k.key] = !shown[k.key]"
      >
        <span class="size-2.5 rounded-full" :style="{ background: k.color }" />
        <span class="text-ink">{{ k.label }}</span>
        <span class="text-faint tabular-nums">{{ counts[k.key] }}</span>
      </button>
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <!-- chart -->
      <div class="panel p-3">
        <div ref="box" class="relative w-full" :style="{ height: `${HEIGHT}px` }">
          <div v-if="!data && !error" class="skeleton absolute inset-0" />
          <svg
            v-if="data"
            :viewBox="`0 0 ${width} ${HEIGHT}`"
            class="absolute inset-0 size-full cursor-crosshair touch-none"
            role="img"
            :aria-label="`${visible.length} gravitational-wave mergers sorted by remnant mass, from ${fmtMass(resultMass(visible[0] ?? all[0]!))} to ${fmtInt(resultMass(visible.at(-1) ?? all[0]!))} Suns. Table view lists every event.`"
            @pointermove="onMove"
            @pointerleave="hoverIdx = null"
            @click="onClick"
          >
            <!-- neutron-star mass range -->
            <rect :x="M.left" :y="sy(3)" :width="width - M.left - M.right" :height="sy(Y_DOMAIN[0]) - sy(3)" class="fill-ion/5" />
            <text :x="width - M.right - 6" :y="sy(3) + 14" text-anchor="end" class="mono fill-faint text-2xs">neutron stars</text>
            <text :x="width - M.right - 6" :y="sy(3) - 6" text-anchor="end" class="mono fill-faint text-2xs">black holes</text>

            <!-- grid -->
            <g class="font-mono text-[11px]">
              <g v-for="v in Y_TICKS" :key="v">
                <line :x1="M.left" :x2="width - M.right" :y1="sy(v)" :y2="sy(v)" class="stroke-line" />
                <text :x="M.left - 8" :y="sy(v) + 4" text-anchor="end" class="fill-faint">{{ v }}</text>
              </g>
              <text :transform="`translate(14 ${(M.top + HEIGHT - M.bottom) / 2}) rotate(-90)`" text-anchor="middle" class="fill-dim tracking-wider uppercase">
                Mass · Suns (log)
              </text>
              <text :x="(M.left + width - M.right) / 2" :y="HEIGHT - 10" text-anchor="middle" class="fill-dim tracking-wider uppercase">
                {{ width < 520 ? 'Collisions · lightest → heaviest' : 'Each column is one collision · lightest → heaviest' }}
              </text>
            </g>

            <!-- crosshair -->
            <line v-if="hovered" :x1="hovered.x" :x2="hovered.x" :y1="M.top" :y2="HEIGHT - M.bottom" class="stroke-line-strong" />

            <!-- mergers -->
            <g v-for="c in columns" :key="c.m.name" :opacity="hovered && hovered.m.name !== c.m.name ? 0.45 : 1">
              <line :x1="c.x" :x2="c.x" :y1="c.y1" :y2="c.yf" :stroke="colorOf(c.m.kind)" stroke-width="1" opacity="0.5" />
              <line :x1="c.x" :x2="c.x" :y1="c.y2" :y2="c.yf" :stroke="colorOf(c.m.kind)" stroke-width="1" opacity="0.5" />
              <circle :cx="c.x" :cy="c.y1" r="2" :fill="colorOf(c.m.kind)" />
              <circle :cx="c.x" :cy="c.y2" r="2" :fill="colorOf(c.m.kind)" />
              <circle :cx="c.x" :cy="c.yf" r="3.5" :fill="colorOf(c.m.kind)" class="stroke-void" stroke-width="1" />
            </g>

            <!-- selective direct labels -->
            <g v-for="c in notableCols" :key="`n-${c.m.name}`" class="pointer-events-none">
              <line :x1="c.x" :x2="c.x" :y1="c.yf - 8" :y2="c.yf - 30" class="stroke-dim" stroke-width="1" />
              <text :x="c.x" :y="c.yf - 36" :text-anchor="c.x > width / 2 ? 'end' : 'start'" class="label-halo fill-ink text-[11px]">
                {{ NOTABLE[c.m.name] }} · {{ c.m.name }}
              </text>
            </g>

            <!-- selected -->
            <circle v-if="selectedCol" :cx="selectedCol.x" :cy="selectedCol.yf" r="7" fill="none" class="stroke-sol" stroke-width="2" />
          </svg>

          <!-- tooltip: values first -->
          <div
            v-if="hovered"
            class="pointer-events-none absolute z-10 w-max max-w-60 rounded-xl border border-line-strong bg-night/95 px-3 py-2 text-sm shadow-xl backdrop-blur"
            :style="tooltipStyle"
          >
            <div class="font-medium text-ink tabular-nums">
              {{ fmtMass(hovered.m.m1) }} + {{ fmtMass(hovered.m.m2) }} → {{ hovered.m.final ? fmtMass(hovered.m.final) : '?' }} Suns
            </div>
            <div class="mt-0.5 flex items-center gap-2 text-dim">
              <span class="h-0.5 w-3 rounded" :style="{ background: colorOf(hovered.m.kind) }" />
              {{ hovered.m.name }} · {{ fmtDate(hovered.m.time) }}
            </div>
            <div class="mono mt-1 text-2xs text-faint">click for details</div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-2 pt-3 pb-1">
          <span class="mono flex items-center gap-2 text-faint">
            <svg viewBox="0 0 16 30" class="h-6 w-3" aria-hidden="true">
              <line x1="8" x2="8" y1="6" y2="24" class="stroke-dim" />
              <circle cx="8" cy="24" r="2" class="fill-dim" /><circle cx="8" cy="18" r="2" class="fill-dim" />
              <circle cx="8" cy="6" r="3.5" class="fill-ink" />
            </svg>
            two objects → one remnant
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
            <span class="size-3 rounded-full" :style="{ background: colorOf(selected.kind) }" />
            <span class="mono text-faint">{{ kindLabel(selected.kind) }}</span>
          </div>
          <h3 class="mt-3 font-display text-2xl font-medium tracking-tight wrap-break-word">{{ selected.name }}</h3>
          <p class="mt-1 text-sm text-dim">
            Heard {{ fmtDate(selected.time) }}, {{ selected.time.slice(11, 16) }} UTC<template v-if="NOTABLE[selected.name]"> · {{ NOTABLE[selected.name] }}</template>
          </p>

          <dl class="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
            <div class="col-span-2 bg-void/70 p-4">
              <dt class="mono text-faint">Collision</dt>
              <dd class="mt-1 font-display text-lg font-light">
                {{ fmtMass(selected.m1) }} + {{ fmtMass(selected.m2) }} → {{ selected.final ? fmtMass(selected.final) : '?' }}
                <span class="text-sm text-dim">Suns</span>
              </dd>
            </div>
            <div class="col-span-2 bg-void/70 p-4">
              <dt class="mono text-faint">Turned into gravitational waves</dt>
              <dd class="mt-1">
                <template v-if="radiatedOf(selected) !== null">{{ fmtDec(radiatedOf(selected)!, 2) }} Suns of mass, in a fraction of a second</template>
                <template v-else>—</template>
              </dd>
            </div>
            <div class="col-span-2 bg-void/70 p-4">
              <dt class="mono text-faint">Distance</dt>
              <dd class="mt-1">{{ fmtDistance(selected.distanceMpc) }}</dd>
            </div>
          </dl>
          <a :href="selected.url" target="_blank" rel="noopener" class="btn mt-5 self-start">Event data on GWOSC ↗</a>
          <p class="mt-auto pt-5 text-xs text-faint">
            Masses are the catalog’s best estimates, which carry real uncertainty. Objects above about 3 Suns are treated
            as black holes.
          </p>
        </template>
        <div v-else-if="!error" class="skeleton h-full min-h-80" />
      </aside>
    </div>

    <!-- table view -->
    <div v-if="showTable && data" class="panel mt-4 p-0">
      <div class="max-h-130 overflow-auto">
        <table class="w-full text-left text-sm">
          <caption class="mono border-b border-line px-panel py-3 text-left text-faint">
            {{ tableRows.length }} collisions, heaviest first
          </caption>
          <thead class="mono sticky top-0 bg-night text-faint">
            <tr>
              <th class="px-panel py-2.5 font-normal">Event</th>
              <th class="px-3 py-2.5 font-normal">Type</th>
              <th class="px-3 py-2.5 font-normal">Date</th>
              <th class="px-3 py-2.5 text-right font-normal">Masses (Suns)</th>
              <th class="px-3 py-2.5 text-right font-normal">Result</th>
              <th class="px-panel py-2.5 text-right font-normal">Distance (M ly)</th>
            </tr>
          </thead>
          <tbody class="tabular-nums">
            <tr
              v-for="m in tableRows"
              :key="m.name"
              class="cursor-pointer border-t border-line hover:bg-panel-hover"
              :class="{ 'bg-sol/8': m.name === selectedName }"
              @click="selectedName = m.name"
            >
              <td class="px-panel py-2"><button class="text-left hover:text-sol" @click.stop="selectedName = m.name">{{ m.name }}</button></td>
              <td class="px-3 py-2 text-dim">{{ kindLabel(m.kind) }}</td>
              <td class="px-3 py-2 text-dim">{{ fmtDate(m.time) }}</td>
              <td class="px-3 py-2 text-right">{{ fmtMass(m.m1) }} + {{ fmtMass(m.m2) }}</td>
              <td class="px-3 py-2 text-right">{{ m.final ? fmtMass(m.final) : '—' }}</td>
              <td class="px-panel py-2 text-right">{{ m.distanceMpc ? fmtInt((m.distanceMpc * LY_PER_MPC) / 1e6) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
