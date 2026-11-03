<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import worldGeoJson from '@/assets/maps/world.json'
import type { City } from '@/types'

const props = defineProps<{
  cities: City[]
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

interface CityDatum {
  name: string
  value: [number, number]
  cityCode: string
  hasContent: boolean
}

function dataOf(params: unknown): CityDatum | undefined {
  return (params as { data?: CityDatum }).data
}

const el = ref<HTMLDivElement | null>(null)
const mapError = ref(false)
let chart: echarts.ECharts | null = null
let observer: ResizeObserver | null = null
let mapRegistered = false

function ensureMap() {
  if (!mapRegistered) {
    echarts.registerMap('world', worldGeoJson as never)
    mapRegistered = true
  }
}

const selectedCity = computed(() => props.cities.find((city) => city.code === props.modelValue))

const option = computed<echarts.EChartsOption>(() => {
  const all = props.cities.map((city) => ({
    name: city.name,
    value: [city.longitude, city.latitude],
    cityCode: city.code,
    hasContent: city.hasContent === 1
  }))
  const selected = props.modelValue
    ? all.filter((city) => city.cityCode === props.modelValue)
    : []

  return {
    geo: {
      map: 'world',
      roam: true,
      zoom: 1.05,
      center: [18, 22],
      scaleLimit: { min: 0.8, max: 8 },
      itemStyle: {
        areaColor: '#efe7d8',
        borderColor: '#cfc2aa',
        borderWidth: 0.6
      },
      emphasis: {
        itemStyle: { areaColor: '#e5d8c2' },
        label: { show: false }
      },
      select: { disabled: true }
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fffcf5',
      borderColor: '#e2d9c8',
      textStyle: { color: '#1d211d', fontSize: 12 },
      formatter: (params: unknown) => {
        const data = (params as { data?: { name?: string; hasContent?: boolean } }).data
        if (!data?.name) {
          return ''
        }
        return `${data.name}<br/><span style="color:#82877b">${data.hasContent ? '本地精选内容' : '通用 AI 攻略'}</span>`
      }
    },
    series: [
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        data: all,
        symbolSize: (_value: unknown, params: unknown) => {
          const data = dataOf(params)
          return data?.cityCode === props.modelValue ? 16 : 9
        },
        itemStyle: {
          color: (params: unknown) => {
            const data = dataOf(params)
            if (!data) {
              return '#b08a4f'
            }
            return data.cityCode === props.modelValue || data.hasContent ? '#b4452f' : '#b08a4f'
          },
          borderColor: '#fff8ee',
          borderWidth: 1.5,
          shadowBlur: 8,
          shadowColor: 'rgba(90, 60, 35, 0.25)'
        },
        emphasis: {
          scale: 1.4,
          itemStyle: { color: '#b4452f' }
        }
      },
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: selected,
        symbolSize: 18,
        rippleEffect: { scale: 2.8, brushType: 'stroke' },
        itemStyle: { color: '#b4452f' },
        zlevel: 1
      }
    ]
  }
})

function render() {
  if (!chart) {
    return
  }
  chart.setOption(option.value, true)
}

function onClick(params: unknown) {
  const data = (params as { data?: { cityCode?: string } }).data
  if (data?.cityCode) {
    emit('update:modelValue', data.cityCode)
  }
}

function resetView() {
  chart?.setOption({ geo: { center: [18, 22], zoom: 1.05 } })
}

function focusSelected() {
  const city = selectedCity.value
  if (!city) {
    return
  }
  chart?.setOption({ geo: { center: [city.longitude, city.latitude], zoom: 3.2 } })
}

onMounted(() => {
  if (!el.value) {
    return
  }
  try {
    ensureMap()
    chart = echarts.init(el.value)
    render()
    chart.on('click', onClick)
    observer = new ResizeObserver(() => chart?.resize())
    observer.observe(el.value)
  } catch (error) {
    console.error('world map init failed', error)
    mapError.value = true
  }
})

watch(
  () => [props.cities, props.modelValue],
  () => render(),
  { deep: true }
)

onBeforeUnmount(() => {
  observer?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div class="map-panel">
    <div ref="el" class="map-canvas" />

    <div class="map-legend">
      <span><i class="dot dot--local" /> 本地精选内容</span>
      <span><i class="dot dot--general" /> 通用 AI 攻略</span>
    </div>

    <div class="map-actions">
      <button type="button" class="map-action" @click="resetView">重置视图</button>
      <button type="button" class="map-action" :disabled="!modelValue" @click="focusSelected">聚焦所选</button>
    </div>

    <div class="map-selected">
      <template v-if="selectedCity">
        <span class="map-selected__label">已选城市</span>
        <strong>{{ selectedCity.name }}</strong>
        <span v-if="selectedCity.hasContent !== 1" class="badge badge--gold">通用攻略</span>
        <span v-else class="badge badge--soft">本地精选</span>
      </template>
      <template v-else>
        <span class="map-selected__hint">点击地图上的城市标记选择目的地</span>
      </template>
    </div>

    <div v-if="mapError" class="map-fallback">
      <p>地图加载失败，可直接选择城市：</p>
      <button v-for="city in cities" :key="city.code" type="button" class="chip" @click="emit('update:modelValue', city.code)">
        {{ city.name }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.map-panel {
  position: relative;
  min-height: 480px;
  border-radius: 26px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: radial-gradient(600px 300px at 70% 10%, rgba(180, 69, 47, 0.06), transparent 60%),
    linear-gradient(160deg, #fffdf7, #f3ecdf);
  box-shadow: var(--shadow-sm);
}

.map-canvas {
  width: 100%;
  height: 480px;
}

.map-legend {
  position: absolute;
  left: 18px;
  top: 16px;
  display: flex;
  gap: 14px;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(255, 252, 245, 0.88);
  border: 1px solid var(--line);
  color: var(--muted);
  font-size: 11px;
  backdrop-filter: blur(6px);
}

.map-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot--local {
  background: var(--cinnabar);
}

.dot--general {
  background: var(--gold);
}

.map-actions {
  position: absolute;
  right: 16px;
  top: 14px;
  display: flex;
  gap: 8px;
}

.map-action {
  padding: 6px 11px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 252, 245, 0.9);
  color: var(--ink-soft);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.map-action:hover {
  border-color: var(--cinnabar-soft);
  color: var(--cinnabar);
}

.map-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.map-selected {
  position: absolute;
  left: 18px;
  bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border-radius: 999px;
  background: rgba(255, 252, 245, 0.92);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-sm);
  font-size: 12px;
  backdrop-filter: blur(6px);
}

.map-selected__label {
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.1em;
}

.map-selected strong {
  font-family: var(--serif);
  font-size: 16px;
  color: var(--ink);
}

.map-selected__hint {
  color: var(--muted);
}

.map-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  background: rgba(255, 252, 245, 0.94);
  text-align: center;
}

.map-fallback p {
  width: 100%;
  color: var(--muted);
  font-size: 13px;
}

@media (max-width: 900px) {
  .map-panel,
  .map-canvas {
    min-height: 320px;
    height: 320px;
  }

  .map-legend {
    display: none;
  }
}
</style>
