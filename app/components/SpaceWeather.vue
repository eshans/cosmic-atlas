<script setup lang="ts">
// Solar flares, geomagnetic activity and NOAA's 3-day outlook (NOAA Space Weather Prediction Center).
const { data, status, error } = await useFetch<SpaceWeather>('/api/space-weather', { lazy: true })

const strongest = computed(() => {
  const flares = data.value?.flares ?? []
  return flares.length ? flares.reduce((a, b) => (flareFlux(b.classType) > flareFlux(a.classType) ? b : a)) : null
})

const kpNow = computed(() => data.value?.kp.at(-1) ?? null)
const kpPeak = computed(() => Math.max(0, ...(data.value?.kp ?? []).map((k) => k.kp)))

// NOAA G-scale from Kp
const gFromKp = (kp: number) => (kp >= 9 ? 5 : kp >= 8 ? 4 : kp >= 7 ? 3 : kp >= 6 ? 2 : kp >= 5 ? 1 : 0)
const kpColor = (kp: number) => (kp >= 5 ? 'bg-nova' : kp >= 4 ? 'bg-sol' : 'bg-ion/70')

const FLARE_COLOR: Record<string, string> = { C: 'text-flare-c', M: 'text-sol', X: 'text-nova' }
const flareColor = (c: string) => FLARE_COLOR[c.charAt(0).toUpperCase()] ?? 'text-dim'
// Flare strength bar: log scale from B1 (1e-7 W/m²) to X10 (1e-3 W/m²)
const flarePct = (c: string) => Math.min(100, Math.max(4, ((Math.log10(flareFlux(c)) + 7) / 4) * 100))

const SCALES = [
  { key: 'r', label: 'Radio blackouts', hint: 'from flares' },
  { key: 's', label: 'Radiation storms', hint: 'energetic protons' },
  { key: 'g', label: 'Geomagnetic storms', hint: 'aurora makers' },
] as const
const levelColor = (n: number) => (n >= 3 ? 'text-nova border-nova/50' : n >= 1 ? 'text-sol border-sol/50' : 'text-ion border-ion/30')

const todayIso = new Date().toISOString().slice(0, 10)
const dayLabel = (d: string) => (d === todayIso ? 'Today' : fmtWeekday(d))
const pct = (n: number | null) => (n === null ? '—' : `${n}%`)
</script>

<template>
  <section id="space-weather" class="wrap mt-32" aria-labelledby="sw-title">
    <SectionHead id="sw-title" tone="sol" eyebrow="Space weather · NOAA SWPC" title="What the Sun is up to">
      Flares are bursts of X-ray light from the Sun. When it also throws charged particles at Earth they can cause
      geomagnetic storms, measured on the Kp scale (0–9), and those storms are what light up the auroras.
    </SectionHead>

    <p v-if="error" class="error-note">{{ errorText(error) }}</p>

    <div v-else-if="status === 'pending' || !data" class="grid gap-4 lg:grid-cols-3">
      <div v-for="i in 3" :key="i" class="panel skeleton h-60 lg:h-105" />
    </div>

    <div v-else class="grid gap-4 lg:grid-cols-3">
      <!-- Flares -->
      <article v-reveal="0" class="panel flex flex-col gap-2">
        <span class="mono text-sol">Solar flares · 7 days</span>
        <div class="stat-value mt-2">{{ data.flares.length }}</div>
        <p class="mono text-faint">
          Strongest:
          <b v-if="strongest" class="font-medium" :class="flareColor(strongest.classType)">{{ strongest.classType }}</b>
          <template v-else>none</template>
          <template v-if="strongest"> · {{ fmtShortDate(strongest.peakTime) }}</template>
        </p>
        <ul class="mt-4 border-t border-line">
          <li v-for="f in data.flares.slice(0, 8)" :key="f.id" class="flex items-center gap-3 border-b border-line py-2.5 text-dim">
            <span class="mono min-w-[3.4em] font-medium" :class="flareColor(f.classType)">{{ f.classType }}</span>
            <span class="h-1 flex-1 overflow-hidden rounded bg-white/6" :class="flareColor(f.classType)">
              <i class="block h-full rounded bg-current" :style="{ width: flarePct(f.classType) + '%' }" />
            </span>
            <span class="mono text-faint">{{ fmtDateTime(f.peakTime) }}</span>
          </li>
        </ul>
      </article>

      <!-- Kp -->
      <article
        v-reveal="100"
        class="panel flex flex-col gap-2"
        :class="{ 'border-nova/35 inset-shadow-glow inset-shadow-nova/8': kpPeak >= 5 }"
      >
        <span class="mono text-nova">Geomagnetic activity</span>
        <div class="stat-value mt-2">
          {{ kpNow ? fmtDec(kpNow.kp) : '—' }}<small class="ml-1 text-[0.4em] text-dim">Kp now</small>
        </div>
        <p class="mono text-faint">
          7-day peak: <b class="font-medium text-ink">Kp {{ fmtDec(kpPeak) }}</b>
          · {{ gFromKp(kpPeak) ? `G${gFromKp(kpPeak)} storm` : 'no storm' }}
        </p>

        <div class="mt-auto pt-6">
          <div class="relative flex h-36 items-end gap-px" role="img" :aria-label="`Kp index every 3 hours over 7 days, peaking at ${fmtDec(kpPeak)}`">
            <!-- storm threshold: Kp 5 of 9 -->
            <div class="pointer-events-none absolute inset-x-0 bottom-5/9 border-t border-dashed border-nova/40">
              <span class="mono absolute right-0 -top-5 text-2xs text-nova/70">storm · Kp 5</span>
            </div>
            <div
              v-for="k in data.kp"
              :key="k.time"
              class="min-h-px flex-1 rounded-t-xs"
              :class="kpColor(k.kp)"
              :style="{ height: (k.kp / 9) * 100 + '%' }"
              :title="`${fmtDateTime(k.time)} · Kp ${k.kp}`"
            />
          </div>
          <div v-if="data.kp.length" class="mono mt-2 flex justify-between text-2xs text-faint">
            <span>{{ fmtShortDate(data.kp[0]!.time) }}</span><span>now</span>
          </div>
        </div>
      </article>

      <!-- Outlook -->
      <article v-reveal="200" class="panel flex flex-col gap-2">
        <span class="mono text-ion">NOAA conditions & outlook</span>
        <ul class="mt-3 grid gap-2">
          <li v-for="s in SCALES" :key="s.key" class="flex items-center gap-3">
            <span class="mono grid size-10 shrink-0 place-items-center rounded-xl border text-sm" :class="levelColor(data.now[s.key])">
              {{ s.key.toUpperCase() }}{{ data.now[s.key] }}
            </span>
            <span class="leading-tight">{{ s.label }}<br><span class="text-sm text-faint">{{ s.hint }}</span></span>
          </li>
        </ul>

        <table class="mt-5 w-full border-t border-line text-left">
          <thead>
            <tr class="mono text-faint">
              <th class="py-2.5 font-normal">Day</th>
              <th class="py-2.5 font-normal" title="Chance of M-class flares (R1–R2)">M flare</th>
              <th class="py-2.5 font-normal" title="Chance of X-class flares (R3+)">X flare</th>
              <th class="py-2.5 text-right font-normal" title="Expected geomagnetic storm level">Storm</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in data.outlook" :key="d.date" class="mono border-t border-line">
              <td class="py-2.5 text-ion">{{ dayLabel(d.date) }}</td>
              <td class="py-2.5">{{ pct(d.minorFlarePct) }}</td>
              <td class="py-2.5">{{ pct(d.majorFlarePct) }}</td>
              <td class="py-2.5 text-right" :class="d.g ? 'text-sol' : 'text-dim'">{{ d.g ? `G${d.g}` : 'none' }}</td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  </section>
</template>
