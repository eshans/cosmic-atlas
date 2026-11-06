<script setup lang="ts">
useSeoMeta({
  title: 'Cosmic Atlas · Exoplanets',
  description: 'Every confirmed planet beyond our solar system on one chart, with our own planets for scale.',
})
</script>

<template>
  <section class="wrap pt-30" aria-labelledby="exo-title">
    <SectionHead id="exo-title" eyebrow="NASA Exoplanet Archive · updated daily" title="Worlds around other stars">
      Every confirmed planet beyond our solar system, plotted by how long its year is and how big it is. Our own eight
      planets are marked for scale, and most of what's out there looks nothing like them. Hover for a name, click for
      details.
    </SectionHead>
    <ExoplanetExplorer>
      <template #fallback>
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div class="panel skeleton aspect-[1/0.62]" />
          <div class="panel skeleton h-140" />
        </div>
      </template>
    </ExoplanetExplorer>
  </section>
</template>
