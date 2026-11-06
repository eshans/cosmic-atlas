<script setup lang="ts">
useSeoMeta({
  title: 'Cosmic Atlas · Black Holes',
  description: 'A simulated black hole you can move across the sky, and every black hole collision heard in gravitational waves.',
})
</script>

<template>
  <div>
    <BlackHoleHero>
      <template #fallback>
        <div class="wrap pt-28"><div class="panel skeleton aspect-4/3 lg:w-[55%]" /></div>
      </template>
    </BlackHoleHero>

    <section class="wrap mt-32" aria-labelledby="gw-title">
      <SectionHead id="gw-title" eyebrow="LIGO · Virgo · KAGRA via GWOSC" title="Every collision we’ve heard">
        When two black holes spiral together and merge, they shake space itself. Since 2015, detectors have picked up
        those ripples, called gravitational waves, hundreds of times. Each column below is one collision: two objects
        joining into one heavier remnant, with a little mass radiated away as waves.
      </SectionHead>
      <MergerGraveyard>
        <template #fallback>
          <div class="panel skeleton h-110" />
        </template>
      </MergerGraveyard>
    </section>
  </div>
</template>
