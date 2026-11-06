<script setup lang="ts">
useSeoMeta({
  title: 'Cosmic Atlas · Today',
  ogTitle: 'Cosmic Atlas',
  description: 'Live space data: Earth from a million miles away, the ISS, near-Earth asteroids and space weather.',
})
</script>

<template>
  <div>
    <EarthHero />

    <section id="iss" class="wrap mt-32" aria-labelledby="iss-title">
      <SectionHead id="iss-title" eyebrow="Live · updates every 5s" title="Where is the ISS right now?">
        The International Space Station circles Earth about every 92 minutes. The dashed line is the path it has taken
        since you opened this page.
      </SectionHead>
      <IssTracker>
        <template #fallback>
          <div class="panel skeleton aspect-960/500" />
        </template>
      </IssTracker>
    </section>

    <AsteroidWatch />
    <SpaceWeather />
  </div>
</template>
