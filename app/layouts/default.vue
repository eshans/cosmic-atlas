<script setup lang="ts">
const sections = [
  { label: 'Today', to: '/' },
  { label: 'Solar System', to: '/solar-system' },
  { label: 'Exoplanets', to: '/exoplanets' },
  { label: 'Black Holes', soon: true },
]

// live UTC clock (client only, so there's no server/browser mismatch)
const clock = ref('--:--:--')
onMounted(() => {
  const tick = () => (clock.value = new Date().toISOString().slice(11, 19))
  tick()
  const id = setInterval(tick, 1000)
  onBeforeUnmount(() => clearInterval(id))
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <Starfield />

    <header
      class="fixed top-3.5 left-1/2 z-50 flex w-[min(calc(100%-24px),1100px)] -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-void/55 py-2 pr-2.5 pl-4 shadow-2xl shadow-black/35 backdrop-blur-xl backdrop-saturate-150 sm:gap-4"
    >
      <NuxtLink
        to="/"
        aria-label="Cosmic Atlas home"
        class="flex items-center gap-2 font-display text-[0.95rem] font-light tracking-wide text-ion no-underline"
      >
        <svg viewBox="0 0 32 32" class="size-6.5" aria-hidden="true">
          <ellipse cx="16" cy="16" rx="13" ry="5" fill="none" stroke="currentColor" stroke-width="1.4" transform="rotate(-25 16 16)" />
          <circle cx="16" cy="16" r="5" class="fill-sol" />
        </svg>
        <span class="hidden text-ink sm:inline">Cosmic<b class="font-bold">Atlas</b></span>
      </NuxtLink>

      <nav class="ml-auto flex gap-0.5 md:mx-auto" aria-label="Sections">
        <template v-for="s in sections" :key="s.label">
          <NuxtLink
            v-if="s.to"
            :to="s.to"
            class="rounded-full px-3.5 py-1.5 text-sm font-medium text-dim no-underline transition-colors hover:text-ink aria-[current=page]:bg-sol aria-[current=page]:text-void"
          >
            {{ s.label }}
          </NuxtLink>
          <span
            v-else
            aria-disabled="true"
            class="hidden cursor-default rounded-full px-3.5 py-1.5 text-sm font-medium text-faint md:inline"
          >
            {{ s.label }}<i class="ml-1 align-super font-mono text-2xs tracking-widest text-ion/70 uppercase not-italic">soon</i>
          </span>
        </template>
      </nav>

      <div class="mono hidden items-center gap-2 rounded-full bg-ion/6 px-3.5 py-1.5 whitespace-nowrap text-ion tabular-nums sm:flex" aria-label="Current UTC time">
        <span class="size-1.75 animate-ping-soft rounded-full bg-ion" />
        {{ clock }} <span class="hidden text-faint sm:inline">UTC</span>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="wrap mt-24 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-16 pb-12 text-faint">
      <div class="font-display text-2xl font-light text-dim">Cosmic<b class="font-bold">Atlas</b></div>
      <p class="mono">
        Data:
        <a href="https://epic.gsfc.nasa.gov" target="_blank" rel="noopener" class="text-dim hover:text-sol">NASA EPIC</a> ·
        <a href="https://ssd-api.jpl.nasa.gov" target="_blank" rel="noopener" class="text-dim hover:text-sol">JPL SSD</a> ·
        <a href="https://www.swpc.noaa.gov" target="_blank" rel="noopener" class="text-dim hover:text-sol">NOAA SWPC</a> ·
        <a href="https://wheretheiss.at" target="_blank" rel="noopener" class="text-dim hover:text-sol">wheretheiss.at</a>
      </p>
    </footer>
  </div>
</template>
