<script setup lang="ts">
// Near-Earth asteroids passing by over the next week.
const { data, status, error } = await useFetch<AsteroidFeed>('/api/asteroids', { lazy: true })

const onlyHazardous = ref(false)
const list = computed(() => {
  const all = data.value?.asteroids ?? []
  return onlyHazardous.value ? all.filter((a) => a.hazardous) : all
})

const stats = computed(() => {
  const all = data.value?.asteroids ?? []
  if (!all.length) return null
  return {
    total: all.length,
    hazardous: all.filter((a) => a.hazardous).length,
    closest: all.reduce((a, b) => (b.missLunar < a.missLunar ? b : a)),
    biggest: all.reduce((a, b) => (b.diameterFt.max > a.diameterFt.max ? b : a)),
  }
})

// Miss-distance bar on a log scale from 0.1 to 200 lunar distances.
const barPct = (lunar: number) => {
  const lo = Math.log10(0.1)
  const hi = Math.log10(200)
  return Math.min(100, Math.max(2, ((Math.log10(Math.max(lunar, 0.1)) - lo) / (hi - lo)) * 100))
}
</script>

<template>
  <section id="asteroids" class="wrap mt-32" aria-labelledby="neo-title">
    <SectionHead id="neo-title" eyebrow="Near-Earth Objects · next 7 days" title="Asteroid flybys">
      Every rock NASA is tracking that passes Earth this week. Distances are in lunar distances (LD), so 1 LD is how far away the Moon is.
    </SectionHead>

    <p v-if="error" class="error-note">{{ errorText(error) }}</p>

    <div v-else-if="status === 'pending' || !stats" class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div v-for="i in 4" :key="i" class="panel skeleton h-32" />
    </div>

    <template v-else>
      <div class="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div v-reveal="0" class="panel">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="mono mt-2 truncate text-faint">Objects approaching</div>
        </div>
        <div v-reveal="80" class="panel">
          <div class="stat-value text-nova text-shadow-glow text-shadow-nova-glow">{{ stats.hazardous }}</div>
          <div class="mono mt-2 truncate text-faint">Potentially hazardous</div>
        </div>
        <div v-reveal="160" class="panel">
          <div class="stat-value">{{ fmtDec(stats.closest.missLunar, 2) }}<small class="ml-1 text-[0.4em] text-dim">LD</small></div>
          <div class="mono mt-2 truncate text-faint">Closest · {{ stats.closest.name }}</div>
        </div>
        <div v-reveal="240" class="panel">
          <div class="stat-value">{{ fmtInt(stats.biggest.diameterFt.max) }}<small class="ml-1 text-[0.4em] text-dim">ft</small></div>
          <div class="mono mt-2 truncate text-faint">Largest · {{ stats.biggest.name }}</div>
        </div>
      </div>

      <div v-reveal class="panel p-0">
        <div class="flex items-center justify-between gap-4 border-b border-line px-panel py-4">
          <span class="mono text-faint">{{ list.length }} shown · sorted by approach time</span>
          <button
            class="btn aria-pressed:border-sol aria-pressed:bg-sol/8 aria-pressed:text-sol"
            :aria-pressed="onlyHazardous"
            @click="onlyHazardous = !onlyHazardous"
          >
            Hazardous only
          </button>
        </div>

        <ul class="max-h-140 overflow-y-auto">
          <li
            v-for="a in list"
            :key="a.id"
            class="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 border-b border-line px-panel py-3.5 transition-colors hover:bg-panel-hover lg:grid-cols-[150px_minmax(0,1.4fr)_130px_120px_minmax(160px,1fr)]"
          >
            <div class="col-span-full flex gap-2.5 font-mono text-2xs tracking-wider text-faint uppercase lg:col-span-1 lg:flex-col lg:gap-0">
              <b class="font-medium text-ion">{{ fmtWeekday(a.approachEpoch) }}</b>
              <span>{{ fmtDateTime(a.approachEpoch) }}</span>
            </div>
            <a :href="a.jplUrl" target="_blank" rel="noopener" class="flex items-center gap-2.5 font-medium hover:text-sol">
              {{ a.name }}
              <span v-if="a.hazardous" class="mono rounded-full border border-nova/45 px-2 py-0.5 text-2xs text-nova">hazardous</span>
            </a>
            <div class="mono text-dim">{{ fmtInt(a.diameterFt.min) }}–{{ fmtInt(a.diameterFt.max) }} ft</div>
            <div class="mono hidden text-dim lg:block">{{ fmtInt(a.speedMph) }} mph</div>
            <div class="col-span-full flex items-center gap-3 lg:col-span-1">
              <div class="h-1 flex-1 overflow-hidden rounded bg-white/6">
                <i
                  class="block h-full rounded bg-linear-to-r"
                  :class="a.hazardous ? 'from-nova to-nova/30' : 'from-ion to-ion/30'"
                  :style="{ width: barPct(a.missLunar) + '%' }"
                />
              </div>
              <span class="mono min-w-16 text-right">{{ fmtDec(a.missLunar, a.missLunar < 10 ? 2 : 1) }} LD</span>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
