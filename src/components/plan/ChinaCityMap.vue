<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import chinaOutline from '@/assets/maps/china-outline.json'
import type { City } from '@/types'

const props = defineProps<{
  cities: City[]
  modelValue?: string
  featuredCodes?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const el = ref<HTMLDivElement | null>(null)
const mapError = ref(false)
let chart: echarts.ECharts | null = null
let observer: ResizeObserver | null = null
let mapRegistered = false
let currentZoom = 1.08

interface CityDatum {
  name: string
  value: [number, number]
  cityCode: string
  province: string
  hasContent: boolean
  featured: boolean
}

function ensureMap() {
  if (!mapRegistered) {
    echarts.registerMap('china', chinaGeoJson as never)
    mapRegistered = true
  }
}

function dataOf(params: unknown): CityDatum | undefined {
  return (params as { data?: CityDatum }).data
}

const selectedCity = computed(() => props.cities.find((city) => city.code === props.modelValue))
const featuredSet = computed(() => new Set(props.featuredCodes || []))

const OBLIQUE_LAT_BASE = 18
const OBLIQUE_LAT_SPAN = 36
const OBLIQUE_TILT = 0.78
const OBLIQUE_NARROW = 0.22
const OBLIQUE_SHIFT = 2.5

/**
 * 斜俯视投影：北部收窄、纵向压缩、轻微东移，形成从南向北俯瞰的斜角。
 * 地图轮廓与城市点使用同一个函数，因此点位不会与地图错位。
 */
function obliquePoint(point: number[]): [number, number] {
  const lon = point[0]
  const lat = point[1]
  const north = Math.max(0, Math.min(1, (lat - OBLIQUE_LAT_BASE) / OBLIQUE_LAT_SPAN))
  const width = 1 - OBLIQUE_NARROW * north
  return [
    104 + (lon - 104) * width + OBLIQUE_SHIFT * north,
    OBLIQUE_LAT_BASE + (lat - OBLIQUE_LAT_BASE) * OBLIQUE_TILT
  ]
}

const MAP_CENTER = obliquePoint([104, 36])

function transformCoordinates(coords: unknown): unknown {
  if (Array.isArray(coords) && typeof coords[0] === 'number') {
    return obliquePoint(coords as number[])
  }
  return (coords as unknown[]).map(transformCoordinates)
}

interface RawGeoJson {
  features: Array<{ geometry?: { coordinates?: unknown } } & Record<string, unknown>>
}

const rawChina = chinaOutline as unknown as RawGeoJson
const chinaGeoJson = {
  ...rawChina,
  features: rawChina.features.map((feature) => ({
    ...feature,
    geometry: feature.geometry
      ? { ...feature.geometry, coordinates: transformCoordinates(feature.geometry.coordinates) }
      : feature.geometry
  }))
}

const option = computed<EChartsOption>(() => {
  const all: CityDatum[] = props.cities.map((city) => ({
    name: city.name,
    value: obliquePoint([city.longitude, city.latitude]),
    cityCode: city.code,
    province: city.province,
    hasContent: city.hasContent === 1,
    featured: featuredSet.value.has(city.code)
  }))
  const featured = all.filter((city) => city.featured)
  const selected = props.modelValue ? all.filter((city) => city.cityCode === props.modelValue) : []

  return {
    backgroundColor: 'transparent',
    geo: {
      map: 'china',
      roam: true,
      zoom: currentZoom,
      center: MAP_CENTER,
      layoutCenter: ['50%', '50%'],
      layoutSize: '100%',
      scaleLimit: { min: 0.9, max: 14 },
      itemStyle: {
        areaColor: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(112, 181, 184, 0.36)' },
          { offset: 0.5, color: 'rgba(24, 62, 68, 0.22)' },
          { offset: 1, color: 'rgba(3, 15, 19, 0.04)' }
        ]),
        borderColor: 'rgba(235, 255, 250, 0.82)',
        borderWidth: 1.15,
        shadowColor: 'rgba(0, 0, 0, 0.55)',
        shadowBlur: 30,
        shadowOffsetY: 18
      },
      emphasis: {
        itemStyle: {
          areaColor: 'rgba(120, 190, 190, 0.2)',
          borderColor: 'rgba(255, 255, 255, 0.92)'
        },
        label: { show: false }
      },
      select: { disabled: true }
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(12, 22, 26, 0.82)',
      borderColor: 'rgba(255, 255, 255, 0.18)',
      textStyle: { color: '#f7f2e8', fontSize: 12 },
      formatter: (params: unknown) => {
        const data = dataOf(params)
        if (!data?.name) {
          return ''
        }
        return `<strong>${data.name}</strong><br/><span style="color:rgba(247,242,232,.58)">${data.province}</span>`
      }
    },
    series: [
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        data: all.filter((city) => !city.featured),
        symbolSize: 3,
        itemStyle: {
          color: 'rgba(255, 248, 230, 0.55)',
          shadowBlur: 5,
          shadowColor: 'rgba(255, 240, 200, 0.5)'
        },
        emphasis: {
          scale: 2.4,
          itemStyle: { color: '#fff0c8' }
        },
        zlevel: 1
      },
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        data: featured,
        symbolSize: (value: unknown, params: unknown) => {
          const data = dataOf(params)
          return data?.cityCode === props.modelValue ? 12 : 6
        },
        itemStyle: {
          color: (params: unknown) => {
            const data = dataOf(params)
            return data?.cityCode === props.modelValue ? '#ffe3a3' : '#f8e7bd'
          },
          shadowBlur: 12,
          shadowColor: 'rgba(255, 230, 170, 0.8)'
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{b}',
          color: '#f8f4ea',
          fontSize: 11,
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          textBorderColor: 'rgba(0, 0, 0, 0.5)',
          textBorderWidth: 2,
          distance: 5
        },
        emphasis: {
          scale: 1.6,
          itemStyle: { color: '#ffe3a3' },
          label: { color: '#fff8e8', fontWeight: 600 }
        },
        zlevel: 2
      },
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: selected,
        symbolSize: 14,
        rippleEffect: { scale: 3.6, brushType: 'stroke' },
        itemStyle: {
          color: '#fff3d2',
          shadowBlur: 18,
          shadowColor: '#ffe3a3'
        },
        zlevel: 3
      }
    ]
  }
})

function render() {
  chart?.setOption(option.value, true)
}

function onClick(params: unknown) {
  const data = dataOf(params)
  const name = (params as { name?: string }).name
  const code = data?.cityCode || props.cities.find((city) => city.name === name)?.code
  if (code) {
    emit('update:modelValue', code)
  }
}

function zoomIn() {
  currentZoom = Math.min(currentZoom * 1.35, 8)
  chart?.setOption({ geo: { zoom: currentZoom } })
}

function zoomOut() {
  currentZoom = Math.max(currentZoom / 1.35, 1)
  chart?.setOption({ geo: { zoom: currentZoom } })
}

function resetView() {
  currentZoom = 1.08
  chart?.setOption({ geo: { center: MAP_CENTER, zoom: currentZoom } })
}

function focusSelected() {
  const city = selectedCity.value
  if (!city) {
    return
  }
  currentZoom = 3.8
  chart?.setOption({ geo: { center: obliquePoint([city.longitude, city.latitude]), zoom: currentZoom } })
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
    console.error('china map init failed', error)
    mapError.value = true
  }
})

watch(
  () => [props.cities, props.modelValue, props.featuredCodes],
  () => render(),
  { deep: true }
)

onBeforeUnmount(() => {
  observer?.disconnect()
  chart?.dispose()
  chart = null
})

defineExpose({ zoomIn, zoomOut, resetView, focusSelected })
</script>

<template>
  <div class="atlas-map">
    <div ref="el" class="atlas-map__canvas" />
    <div v-if="mapError" class="atlas-map__fallback">地图加载失败，请使用搜索选择城市</div>
  </div>
</template>

<style scoped>
.atlas-map {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.atlas-map::before {
  content: '';
  position: absolute;
  z-index: 0;
  left: 10%;
  right: 10%;
  bottom: 0.5%;
  height: 18%;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.52), transparent 70%);
  filter: blur(24px);
  pointer-events: none;
}

.atlas-map__canvas {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 26px 22px rgba(0, 0, 0, 0.34));
}

.atlas-map__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
  background: rgba(8, 18, 20, 0.4);
}

@media (max-width: 760px) {
  .atlas-map {
    position: relative;
    height: 56vh;
    min-height: 360px;
  }
}
</style>
