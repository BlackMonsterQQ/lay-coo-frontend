<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import chinaGeoJson from '@/assets/maps/china.json'
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

const option = computed<EChartsOption>(() => {
  const all: CityDatum[] = props.cities.map((city) => ({
    name: city.name,
    value: [city.longitude, city.latitude],
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
      center: [104, 36],
      layoutCenter: ['50%', '50%'],
      layoutSize: '100%',
      scaleLimit: { min: 0.9, max: 14 },
      itemStyle: {
        areaColor: 'rgba(255, 255, 255, 0.018)',
        borderColor: 'rgba(255, 255, 255, 0.34)',
        borderWidth: 0.8,
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowBlur: 16
      },
      emphasis: {
        itemStyle: {
          areaColor: 'rgba(255, 255, 255, 0.07)',
          borderColor: 'rgba(255, 255, 255, 0.7)'
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
  chart?.setOption({ geo: { center: [104, 36], zoom: currentZoom } })
}

function focusSelected() {
  const city = selectedCity.value
  if (!city) {
    return
  }
  currentZoom = 3.8
  chart?.setOption({ geo: { center: [city.longitude, city.latitude], zoom: currentZoom } })
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

.atlas-map__canvas {
  width: 100%;
  height: 100%;
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
