<script setup lang="ts">
defineProps<{ eyebrow: string; title: string; id: string; tone?: 'ion' | 'sol' | 'nova' }>()
</script>

<template>
  <header v-reveal class="mb-8 max-w-2xl">
    <span class="eyebrow" :class="{ 'text-sol': tone === 'sol', 'text-nova': tone === 'nova' }">{{ eyebrow }}</span>
    <h2 :id="id" class="mt-3 font-display text-[clamp(1.8rem,4vw,2.8rem)] leading-tight font-medium tracking-tight">
      {{ title }}
    </h2>
    <p v-if="$slots.default" class="mt-3 text-dim"><slot /></p>
  </header>
</template>
