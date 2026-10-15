<script setup lang="ts">
export interface ChartBar {
  label: string
  value: number
  highlighted: boolean
  detail: string
}
const props = defineProps<{ bars: ChartBar[]; maximum?: number; label: string; caption: string }>()
const width = ref(600)
const container = ref<HTMLElement>()
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver((entries) => {
    width.value = Math.max(250, entries[0]?.contentRect.width ?? 600)
  })
  if (container.value) observer.observe(container.value)
})
onBeforeUnmount(() => observer?.disconnect())
const ceiling = computed(() => props.maximum ?? 1)
const plotWidth = computed(() => width.value - 58)
const step = computed(() => plotWidth.value / Math.max(1, props.bars.length))
const barWidth = computed(() => Math.max(1, Math.min(60, step.value * 0.72)))
</script>
<template>
  <figure ref="container" class="evidence-chart">
    <svg :viewBox="`0 0 ${width} 230`" role="img" :aria-label="label" width="100%" height="230">
      <g v-for="fraction in [0, 0.5, 1]" :key="fraction">
        <line
          x1="44"
          :x2="width - 14"
          :y1="180 - fraction * 150"
          :y2="180 - fraction * 150"
          class="chart-gridline"
        />
        <text x="35" :y="184 - fraction * 150" text-anchor="end" class="chart-tick">
          {{ maximum ? Math.round(ceiling * fraction) : fraction.toFixed(1) }}
        </text>
      </g>
      <g v-for="(bar, index) in bars" :key="index">
        <rect
          :x="44 + step * index + (step - barWidth) / 2"
          :y="180 - (bar.value / ceiling) * 150"
          :width="barWidth"
          :height="Math.max(0, (bar.value / ceiling) * 150)"
          rx="2"
          :class="bar.highlighted ? 'chart-bar-positive' : 'chart-bar-unknown'"
        >
          <title>{{ bar.detail }}</title>
        </rect>
        <text
          v-if="
            bars.length <= 12 ||
            index % Math.ceil(bars.length / 8) === 0 ||
            index === bars.length - 1
          "
          :x="44 + step * (index + 0.5)"
          y="204"
          text-anchor="middle"
          class="chart-tick"
        >
          {{ bar.label }}
        </text>
      </g>
    </svg>
    <figcaption>{{ caption }}</figcaption>
  </figure>
</template>
