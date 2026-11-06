<script setup lang="ts">
// Hero: the whole sunlit face of Earth, photographed by DSCOVR/EPIC from ~1 million miles away.
// Each day has a dozen or so frames, so we can play them back and watch Earth turn.
const date = ref<string | null>(null) // null = latest available
const query = computed(() => (date.value ? { date: date.value } : {}))

const { data: day, status, error } = await useFetch<EarthDay>('/api/earth', { query, lazy: true })

const frame = ref(0)
const playing = ref(false)
const images = computed(() => day.value?.images ?? [])
const current = computed(() => images.value[frame.value] ?? images.value[0] ?? null)

// New day: start on the frame nearest local noon-ish (middle of the set) and preload the rest.
watch(
  () => day.value?.date,
  () => {
    frame.value = Math.floor(images.value.length / 2)
    if (import.meta.client) for (const img of images.value) new Image().src = img.imageUrl
  },
  { immediate: true },
)

let timer: ReturnType<typeof setInterval> | undefined
watch(playing, (on) => {
  clearInterval(timer)
  if (on && images.value.length > 1) {
    timer = setInterval(() => (frame.value = (frame.value + 1) % images.value.length), 700)
  }
})
onBeforeUnmount(() => clearInterval(timer))

function go(to: string | null) {
  if (!to) return
  playing.value = false
  date.value = to === day.value?.latestDate ? null : to
}

const coord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(1)}° ${v >= 0 ? pos : neg}`
const timeOf = (iso: string) => `${iso.slice(11, 16)} UTC`
</script>

<template>
  <section class="wrap pt-28" aria-labelledby="earth-title">
    <div class="grid items-center gap-[clamp(24px,4vw,64px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <!-- Earth -->
      <div class="relative mx-auto aspect-square w-full max-w-160">
        <div class="absolute inset-[12%] rounded-full bg-ion/10 blur-3xl" aria-hidden="true" />
        <div v-if="status === 'pending' && !day" class="skeleton absolute inset-[9%] rounded-full" />
        <p v-else-if="error" class="error-note absolute inset-x-6 top-1/2 -translate-y-1/2">{{ errorText(error) }}</p>
        <img
          v-else-if="current"
          :src="current.imageUrl"
          :alt="`Earth from DSCOVR, centered over ${coord(current.centroid.lat, 'N', 'S')}, ${coord(current.centroid.lon, 'E', 'W')}`"
          class="relative size-full object-contain mix-blend-screen transition-opacity duration-300"
          :class="{ 'opacity-50': status === 'pending' }"
          fetchpriority="high"
        >
      </div>

      <!-- Copy + controls -->
      <div>
        <span class="eyebrow">Earth from a million miles · DSCOVR EPIC</span>
        <h1 id="earth-title" class="mt-4 font-display text-[clamp(2rem,4.6vw,3.6rem)] leading-[1.02] font-medium tracking-tighter">
          The whole planet,<br><span class="text-ion">{{ day ? fmtDate(day.date) : 'loading…' }}</span>
        </h1>
        <p class="mt-5 max-w-xl text-dim">
          NASA's EPIC camera rides on the DSCOVR satellite at the L1 point, where it always sees Earth's sunlit side.
          It takes a photo every hour or two, so stepping through a day's frames shows the planet turning beneath it.
          New photos usually appear two to three days after they're taken.
        </p>

        <!-- Columns size to their content, with the middle one taking the slack. Values stay on one line except at
             lg (1024–1279px), where the copy column is narrowest and they may wrap rather than overflow. -->
        <dl
          v-if="current"
          class="mt-7 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-[auto_1fr_auto]"
        >
          <div class="bg-void/70 p-4">
            <dt class="mono whitespace-nowrap text-faint">Frame time</dt>
            <dd class="mt-1 font-display text-lg font-light tabular-nums sm:whitespace-nowrap lg:whitespace-normal xl:whitespace-nowrap">{{ timeOf(current.time) }}</dd>
          </div>
          <div class="bg-void/70 p-4">
            <dt class="mono whitespace-nowrap text-faint">Centered over</dt>
            <dd class="mt-1 font-display text-lg font-light tabular-nums sm:whitespace-nowrap lg:whitespace-normal xl:whitespace-nowrap">
              {{ coord(current.centroid.lat, 'N', 'S') }}<br class="sm:hidden">
              <span class="hidden sm:inline">, </span>{{ coord(current.centroid.lon, 'E', 'W') }}
            </dd>
          </div>
          <div class="bg-void/70 p-4">
            <dt class="mono whitespace-nowrap text-faint">Distance</dt>
            <dd class="mt-1 font-display text-lg font-light tabular-nums sm:whitespace-nowrap lg:whitespace-normal xl:whitespace-nowrap">{{ fmtInt(current.distanceKm * 0.621371) }} mi</dd>
          </div>
        </dl>

        <!-- frame scrubber -->
        <div v-if="images.length > 1" class="mt-5 flex items-center gap-3">
          <button class="btn shrink-0" :aria-label="playing ? 'Pause rotation' : 'Play rotation'" @click="playing = !playing">
            {{ playing ? '❚❚ Pause' : '▶ Play' }}
          </button>
          <input
            v-model.number="frame"
            type="range"
            min="0"
            :max="images.length - 1"
            class="h-1 flex-1 cursor-pointer accent-ion"
            aria-label="Frame"
            @input="playing = false"
          >
          <span class="mono w-14 shrink-0 text-right text-faint tabular-nums">{{ frame + 1 }}/{{ images.length }}</span>
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <button class="btn" :disabled="!day?.prevDate || status === 'pending'" @click="go(day!.prevDate)">← Prev day</button>
          <button class="btn" :disabled="!day?.nextDate || status === 'pending'" @click="go(day!.nextDate)">Next day →</button>
          <button v-if="date" class="btn" @click="go(day?.latestDate ?? null)">Latest</button>
          <a v-if="current" :href="current.imageUrl" target="_blank" rel="noopener" class="btn">Full image ↗</a>
        </div>
      </div>
    </div>
  </section>
</template>
