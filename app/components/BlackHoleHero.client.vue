<script setup lang="ts">
// A black hole bending the starlight behind it, rendered with a WebGL fragment shader.
// Simplified physics: the background is lensed with the point-mass lens equation (β = θ − θE²/θ), which
// produces the Einstein ring; the accretion disk is drawn both directly and through the same lens mapping,
// so its far side appears bent up over the shadow. Drag (or move the pointer) to slide the hole across the sky.

const KM_PER_SUN = 2.953 // Schwarzschild radius per solar mass
const LOG_MIN = 0 // 1 Sun
const LOG_MAX = 10 // 10 billion Suns

const PRESETS = [
  { label: 'Stellar', mass: 10, note: 'a typical collapsed star' },
  { label: 'GW231123', mass: 222, note: 'heaviest merger result so far' },
  { label: 'Sgr A*', mass: 4.3e6, note: 'the center of our galaxy' },
  { label: 'M87*', mass: 6.5e9, note: 'first black hole ever imaged' },
]

const logMass = ref(Math.log10(4.3e6))
const mass = computed(() => 10 ** logMass.value)
const diameterKm = computed(() => 2 * KM_PER_SUN * mass.value)

const comparison = computed(() => {
  const d = diameterKm.value
  if (d < 100) return 'about the size of a city'
  if (d < 12_742) return 'smaller than Earth'
  if (d < 139_820) return 'smaller than Jupiter'
  if (d < 1_392_700) return 'smaller than the Sun'
  if (d < 2.99e8) return 'would fit inside Earth’s orbit'
  if (d < 9.0e9) return 'would fit inside Neptune’s orbit'
  return 'bigger than Neptune’s orbit'
})

const fmtMass = (m: number) =>
  m >= 1e9 ? `${fmtDec(m / 1e9, 1)} billion` : m >= 1e6 ? `${fmtDec(m / 1e6, 1)} million` : fmtInt(m)
const fmtKm = (km: number) =>
  km >= 1.496e8 ? `${fmtDec(km / 1.496e8, km >= 1.496e9 ? 0 : 1)} AU` : km >= 1e6 ? `${fmtDec(km / 1e6, 1)} million km` : `${fmtInt(km)} km`

// ---- WebGL ----
const canvas = ref<HTMLCanvasElement | null>(null)
const supported = ref(true)

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uTime;
uniform float uSize;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

// Procedural sky: a few layers of hashed stars plus a faint violet/amber haze (matches the site background).
vec3 sky(vec2 q){
  vec3 col = vec3(0.02, 0.016, 0.06) + 0.05 * vec3(0.38, 0.24, 0.86) * smoothstep(1.2, -0.4, q.y + q.x * 0.4);
  for (int i = 0; i < 3; i++) {
    float s = 28.0 + float(i) * 36.0;
    vec2 g = q * s + float(i) * 17.0;
    vec2 id = floor(g); vec2 f = fract(g) - 0.5;
    float h = hash(id);
    vec2 off = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
    float d = length(f - off * 0.7);
    float star = smoothstep(0.06 - float(i) * 0.012, 0.0, d) * step(0.86, h);
    vec3 tint = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.82, 0.6), hash(id + 1.3));
    col += star * tint * (0.6 + 0.4 * sin(uTime * (1.0 + h * 2.0) + h * 30.0));
  }
  return col;
}

// Thin accretion disk seen ~13° above its plane. Brighter on the side rotating toward us (Doppler beaming).
vec3 disk(vec2 q, float rs){
  vec2 e = vec2(q.x, q.y / 0.22);
  float d = length(e);
  float inner = rs * 1.5, outer = rs * 4.6;
  if (d < inner * 0.8 || d > outer * 1.2) return vec3(0.0);
  float band = smoothstep(inner * 0.85, inner * 1.1, d) * smoothstep(outer * 1.15, outer * 0.7, d);
  float ang = atan(e.y, e.x) - uTime * 0.6 * (inner / d);
  // gentle spiral bands (low frequency so they don't alias into moiré)
  float streak = 0.78 + 0.22 * sin(ang * 5.0 + log(d / rs) * 9.0);
  float doppler = 1.0 + 0.75 * (q.x / max(d, 1e-4));
  float heat = pow(inner / d, 1.6);
  vec3 c = mix(vec3(1.0, 0.42, 0.12), vec3(1.0, 0.86, 0.6), clamp(heat, 0.0, 1.0));
  return c * band * streak * heat * doppler * 1.6;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 p = uv - uCenter;
  float r = length(p);
  float rs = uSize;                 // shadow radius on screen
  float thetaE = rs * 1.45;         // Einstein radius
  vec2 beta = p - p / max(r, 1e-4) * (thetaE * thetaE / max(r, 1e-4)); // point-lens mapping

  vec3 col = sky(beta + uCenter);
  float outside = smoothstep(rs * 0.98, rs * 1.02, r);
  col *= outside;

  // far side of the disk, bent over the top by the lens; near side drawn directly (in front of the shadow)
  col += disk(beta, rs) * outside * 0.9;
  if (p.y < 0.0 || r > rs) col += disk(p, rs);

  // photon ring
  col += vec3(1.0, 0.62, 0.3) * exp(-abs(r - rs * 1.04) / (rs * 0.035)) * 0.55 * outside;

  col = col / (1.0 + col);          // soft tone map
  gl_FragColor = vec4(pow(col, vec3(0.9)), 1.0);
}`

let gl: WebGLRenderingContext | null = null
let raf = 0
const uni: Record<string, WebGLUniformLocation | null> = {}
const center = { x: 0, y: 0, tx: 0, ty: 0 }
let still = false
let ro: ResizeObserver | undefined

function compile(type: number, src: string) {
  const s = gl!.createShader(type)!
  gl!.shaderSource(s, src)
  gl!.compileShader(s)
  if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) ?? 'shader error')
  return s
}

function resize() {
  const el = canvas.value
  if (!el || !gl) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  el.width = Math.round(el.clientWidth * dpr)
  el.height = Math.round(el.clientHeight * dpr)
  gl.viewport(0, 0, el.width, el.height)
}

// Visual size grows with log(mass) so the slider has a visible effect across 10 orders of magnitude.
const visualSize = () => 0.07 + ((logMass.value - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 0.09

function render(t: number) {
  if (!gl || !canvas.value) return
  center.x += (center.tx - center.x) * 0.06
  center.y += (center.ty - center.y) * 0.06
  gl.uniform2f(uni.uRes!, canvas.value.width, canvas.value.height)
  gl.uniform2f(uni.uCenter!, center.x, center.y)
  gl.uniform1f(uni.uTime!, still ? 0 : t / 1000)
  gl.uniform1f(uni.uSize!, visualSize())
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  if (!still) raf = requestAnimationFrame(render)
}
const redrawIfStill = () => still && requestAnimationFrame(render)
watch(logMass, redrawIfStill)

// The canvas is rendered by this component's real template, which .client components mount after
// onMounted runs, so set up GL when the element appears.
watch(canvas, (el, _, onCleanup) => {
  if (!el) return
  gl = el.getContext('webgl', { antialias: false, premultipliedAlpha: false })
  if (!gl) {
    supported.value = false
    return
  }
  try {
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW) // one big triangle
    const loc = gl.getAttribLocation(prog, 'a')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    for (const n of ['uRes', 'uCenter', 'uTime', 'uSize']) uni[n] = gl.getUniformLocation(prog, n)
  } catch {
    supported.value = false
    return
  }
  still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ro = new ResizeObserver(() => {
    resize()
    redrawIfStill()
  })
  ro.observe(el)
  resize()
  raf = requestAnimationFrame(render)
  onCleanup(() => {
    cancelAnimationFrame(raf)
    ro?.disconnect()
  })
})
onBeforeUnmount(() => cancelAnimationFrame(raf))

function onPointer(e: PointerEvent) {
  const el = canvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  center.tx = ((e.clientX - rect.left) / rect.width - 0.5) * (rect.width / rect.height) * 0.6
  center.ty = -((e.clientY - rect.top) / rect.height - 0.5) * 0.6
  redrawIfStill()
}
function onLeave() {
  center.tx = 0
  center.ty = 0
  redrawIfStill()
}
</script>

<template>
  <section class="wrap pt-28" aria-labelledby="bh-title">
    <div class="grid items-center gap-[clamp(24px,4vw,56px)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div class="panel relative aspect-square overflow-hidden p-0 sm:aspect-4/3">
        <canvas
          v-if="supported"
          ref="canvas"
          class="size-full cursor-grab touch-none"
          role="img"
          aria-label="Simulated black hole bending the light of the stars behind it, with a glowing accretion disk"
          @pointermove="onPointer"
          @pointerleave="onLeave"
        />
        <div v-else class="grid size-full place-items-center bg-void">
          <div class="size-32 rounded-full bg-black shadow-[0_0_0_6px_var(--color-sol),0_0_60px_10px_var(--color-sol-glow)]" />
        </div>
        <p class="mono pointer-events-none absolute bottom-3 left-4 text-2xs text-faint">Simulation · move your pointer to slide it across the sky</p>
      </div>

      <div>
        <span class="eyebrow text-sol">Black holes</span>
        <h1 id="bh-title" class="mt-4 font-display text-[clamp(2rem,4.6vw,3.6rem)] leading-[1.02] font-medium tracking-tighter">
          Where light<br><span class="text-sol">can’t escape</span>
        </h1>
        <p class="mt-5 max-w-xl text-dim">
          A black hole is mass squeezed so tightly that, inside its event horizon, nothing gets out, not even light.
          You can’t see one directly, but you can see what it does: it bends the light of everything behind it into
          rings, and it lights up the gas spiraling into it.
        </p>

        <div class="mt-7 rounded-2xl border border-line bg-void/60 p-5">
          <label for="bh-mass" class="mono flex justify-between text-faint">
            <span>Mass</span><span class="text-ink">{{ fmtMass(mass) }} Suns</span>
          </label>
          <input
            id="bh-mass"
            v-model.number="logMass"
            type="range"
            :min="LOG_MIN"
            :max="LOG_MAX"
            step="0.01"
            class="mt-3 h-1 w-full cursor-pointer accent-sol"
            :aria-valuetext="`${fmtMass(mass)} times the mass of the Sun`"
          >
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="p in PRESETS"
              :key="p.label"
              class="btn aria-pressed:border-sol aria-pressed:text-sol"
              :aria-pressed="Math.abs(logMass - Math.log10(p.mass)) < 0.005"
              :title="p.note"
              @click="logMass = Math.log10(p.mass)"
            >
              {{ p.label }}
            </button>
          </div>
          <dl class="mt-5 border-t border-line pt-4">
            <dt class="mono text-faint">Event horizon diameter</dt>
            <dd class="mt-1 font-display text-2xl font-light">{{ fmtKm(diameterKm) }}</dd>
            <dd class="mt-1 text-sm text-dim">{{ comparison }}</dd>
          </dl>
        </div>
      </div>
    </div>
  </section>
</template>
