<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import chinaGeoJson from '@/assets/maps/china.json'
import type { City } from '@/types'

const props = defineProps<{
  cities: City[]
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const el = ref<HTMLDivElement | null>(null)
const mapError = ref(false)
let chart: echarts.ECharts | null = null
let observer: ResizeObserver | null = null
let mapRegistered = false

interface CityDatum {
  name: string
  value: [number, number]
  cityCode: string
  province: string
  hasContent: boolean
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

const option = computed<EChartsOption>(() => {
  const all = props.cities.map((city) => ({
    name: city.name,
    value: [city.longitude, city.latitude] as [number, number],
    cityCode: city.code,
    province: city.province,
    hasContent: city.hasContent === 1
  }))
  const selected = props.modelValue ? all.filter((city) => city.cityCode === props.modelValue) : []

  return {
    backgroundColor: 'transparent',
    geo: {
      map: 'china',
      roam: true,
      zoom: 1.12,
      center: [104, 36],
      layoutCenter: ['50%', '52%'],
      layoutSize: '98%',
      scaleLimit: { min: 0.9, max: 12 },
      itemStyle: {
        areaColor: 'rgba(6, 24, 38, 0.78)',
        borderColor: 'rgba(94, 234, 212, 0.26)',
        borderWidth: 0.7,
        shadowColor: 'rgba(0, 0, 0, 0.55)',
        shadowBlur: 18
      },
      emphasis: {
        itemStyle: {
          areaColor: 'rgba(20, 62, 82, 0.86)',
          borderColor: 'rgba(94, 234, 212, 0.72)'
        },
        label: { show: false }
      },
      select: { disabled: true }
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(4, 14, 22, 0.94)',
      borderColor: 'rgba(94, 234, 212, 0.35)',
      textStyle: { color: '#dffcf6', fontSize: 12 },
      formatter: (params: unknown) => {
        const data = dataOf(params)
        if (!data?.name) {
          return ''
        }
        return `<strong>${data.name}</strong><br/><span style="color:#7dd3c7">${data.province}</span><br/>`
          + `<span style="color:${data.hasContent ? '#ffb454' : '#7dd3c7'}">${data.hasContent ? '本地精选内容' : '通用 AI 攻略'}</span>`
      }
    },
    series: [
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        data: all,
        symbolSize: (_value: unknown, params: unknown) => {
          const data = dataOf(params)
          if (!data) {
            return 6
          }
          if (data.cityCode === props.modelValue) {
            return 20
          }
          return data.hasContent ? 10 : 6
        },
        itemStyle: {
          color: (params: unknown) => {
            const data = dataOf(params)
            if (!data) {
              return '#5eead4'
            }
            if (data.cityCode === props.modelValue) {
              return '#ffb454'
            }
            return data.hasContent ? '#ffb454' : 'rgba(94, 234, 212, 0.72)'
          },
          shadowBlur: 10,
          shadowColor: 'rgba(94, 234, 212, 0.5)'
        },
        emphasis: {
          scale: 1.8,
          itemStyle: { color: '#ffcf70' }
        },
        zlevel: 1
      },
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: selected,
        symbolSize: 22,
        rippleEffect: { scale: 3.4, brushType: 'stroke' },
        itemStyle: { color: '#ffb454', shadowBlur: 18, shadowColor: '#ffb454' },
        zlevel: 2
      }
    ]
  }
})

function render() {
  chart?.setOption(option.value, true)
}

function onClick(params: unknown) {
  const data = dataOf(params)
  if (data?.cityCode) {
    emit('update:modelValue', data.cityCode)
  }
}

function resetView() {
  chart?.setOption({ geo: { center: [104, 36], zoom: 1.12 } })
}

function focusSelected() {
  const city = selectedCity.value
  if (!city) {
    return
  }
  chart?.setOption({ geo: { center: [city.longitude, city.latitude], zoom: 4.2 } })
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
  <div class="china-map">
    <div ref="el" class="china-map__canvas" />

    <div class="china-map__hud china-map__hud--tl" />
    <div class="china-map__hud china-map__hud--tr" />
    <div class="china-map__hud china-map__hud--bl" />
    <div class="china-map__hud china-map__hud--br" />

    <div class="china-map__legend">
      <span><i class="dot dot--local" /> 本地精选</span>
      <span><i class="dot dot--ai" /> 通用 AI 攻略</span>
    </div>

    <div class="china-map__actions">
      <button type="button" @click="resetView">重置</button>
      <button type="button" :disabled="!modelValue" @click="focusSelected">聚焦</button>
    </div>

    <div v-if="mapError" class="china-map__fallback">
      <span>地图加载失败，请使用左侧搜索选择城市</span>
    </div>
  </div>
</template>

<style scoped>
.china-map {
  position: relative;
  height: 620px;
  border-radius: 22px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 48%, rgba(25, 96, 106, 0.24), transparent 55%),
    linear-gradient(145deg, rgba(3, 16, 26, 0.84), rgba(2, 8, 14, 0.92));
  border: 1px solid rgba(94, 234, 212, 0.18);
  box-shadow:
    inset 0 0 80px rgba(0, 0, 0, 0.55),
    0 30px 80px rgba(0, 0, 0, 0.35);
}

.china-map::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(94, 234, 212, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(94, 234, 212, 0.045) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at 50% 50%, black, transparent 78%);
  pointer-events: none;
}

.china-map__canvas {
  width: 100%;
  height: 100%;
}

.china-map__hud {
  position: absolute;
  width: 22px;
  height: 22px;
  border-color: rgba(94, 234, 212, 0.7);
  border-style: solid;
  pointer-events: none;
}

.china-map__hud--tl {
  left: 14px;
  top: 14px;
  border-width: 1px 0 0 1px;
}

.china-map__hud--tr {
  right: 14px;
  top: 14px;
  border-width: 1px 1px 0 0;
}

.china-map__hud--bl {
  left: 14px;
  bottom: 14px;
  border-width: 0 0 1px 1px;
}

.china-map__hud--br {
  right: 14px;
  bottom: 14px;
  border-width: 0 1px 1px 0;
}

.china-map__legend {
  position: absolute;
  left: 22px;
  top: 44px;
  display: flex;
  gap: 14px;
  color: rgba(215, 245, 240, 0.64);
  font-size: 11px;
}

.china-map__legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.dot--local {
  background: #ffb454;
  box-shadow: 0 0 6px #ffb454;
}

.dot--ai {
  background: #5eead4;
  box-shadow: 0 0 6px #5eead4;
}

.china-map__actions {
  position: absolute;
  right: 18px;
  top: 16px;
  display: flex;
  gap: 7px;
}

.china-map__actions button {
  padding: 5px 10px;
  border: 1px solid rgba(94, 234, 212, 0.22);
  border-radius: 999px;
  background: rgba(2, 14, 22, 0.7);
  color: rgba(215, 245, 240, 0.72);
  font-size: 10px;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.china-map__actions button:hover {
  border-color: rgba(94, 234, 212, 0.65);
  color: #5eead4;
}

.china-map__actions button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.china-map__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(215, 245, 240, 0.6);
  font-size: 12px;
  background: rgba(2, 8, 14, 0.86);
}

@media (max-width: 1000px) {
  .china-map {
    height: 440px;
  }
}

@media (max-width: 620px) {
  .china-map {
    height: 320px;
  }

  .china-map__legend {
    display: none;
  }
}
</style>
