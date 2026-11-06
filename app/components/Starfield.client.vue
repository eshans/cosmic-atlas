<script setup lang="ts">
// Twinkling, slowly drifting starfield painted behind the whole site.
const canvas = ref<HTMLCanvasElement | null>(null)

interface Star { x: number; y: number; z: number; r: number; phase: number; speed: number; hue: string }

const HUES = ['255,255,255', '255,255,255', '255,255,255', '200,220,255', '255,214,160', '190,180,255']

let stars: Star[] = []
let raf = 0
let width = 0
let height = 0
let dpr = 1

function build() {
  const el = canvas.value
  if (!el) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = window.innerWidth
  height = window.innerHeight
  el.width = width * dpr
  el.height = height * dpr
  const count = Math.round((width * height) / 2600)
  stars = Array.from({ length: count }, () => {
    const z = Math.random() // depth: 0 = far, 1 = near
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      z,
      r: 0.25 + z * z * 1.4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.6,
      hue: HUES[Math.floor(Math.random() * HUES.length)]!,
    }
  })
}

function draw(t: number) {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  const scroll = window.scrollY

  for (const s of stars) {
    // parallax: nearer stars move more as you scroll
    const y = (((s.y - scroll * s.z * 0.25) % height) + height) % height
    const twinkle = 0.55 + 0.45 * Math.sin(t * 0.001 * s.speed + s.phase)
    ctx.globalAlpha = (0.25 + s.z * 0.75) * twinkle
    ctx.fillStyle = `rgb(${s.hue})`
    ctx.beginPath()
    ctx.arc(s.x, y, s.r, 0, Math.PI * 2)
    ctx.fill()
    if (s.r > 1.2) {
      ctx.globalAlpha *= 0.15
      ctx.beginPath()
      ctx.arc(s.x, y, s.r * 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

onMounted(() => {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  build()
  const loop = (t: number) => {
    draw(t)
    raf = requestAnimationFrame(loop)
  }
  if (still) draw(0)
  else raf = requestAnimationFrame(loop)

  const onResize = () => {
    build()
    if (still) draw(0)
  }
  window.addEventListener('resize', onResize)
  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', onResize)
  })
})
</script>

<template>
  <canvas ref="canvas" class="pointer-events-none fixed inset-0 -z-10 h-screen w-screen" aria-hidden="true" />
</template>
