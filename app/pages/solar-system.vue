<script setup lang="ts">
useSeoMeta({
  title: 'Cosmic Atlas · Solar System',
  description: 'A live map of the solar system: every planet at its real position today, with time travel.',
})
</script>

<template>
  <section class="wrap pt-30" aria-labelledby="ss-title">
    <SectionHead id="ss-title" eyebrow="Live · computed in your browser" title="The solar system, right now">
      Every planet at its actual position around the Sun today, seen from above. Play time forward or backward to watch
      the inner planets lap the outer ones, or pick any date. Click a planet for details.
    </SectionHead>
    <SolarSystemMap>
      <template #fallback>
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div class="panel skeleton aspect-square" />
          <div class="panel skeleton h-140" />
        </div>
      </template>
    </SolarSystemMap>
  </section>
</template>
