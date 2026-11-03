<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { cityApi } from '@/api'
import type { City } from '@/types'
import ChinaCityMap from '@/components/plan/ChinaCityMap.vue'

const route = useRoute()
const router = useRouter()

const cities = ref<City[]>([])
const cityCode = ref(String(route.query.city || ''))
const loading = ref(true)
const search = ref('')
const searchFocused = ref(false)
const bgImage = ref('')
const imageLoading = ref(false)
const imageError = ref(false)
let imageToken = 0

const imageCache = new Map<string, string>()

const selectedCity = computed(() => cities.value.find((city) => city.code === cityCode.value))
const provinceCount = computed(() => new Set(cities.value.map((city) => city.province)).size)
const selectedProvinceCount = computed(() => {
  if (!selectedCity.value) {
    return 0
  }
  return cities.value.filter((city) => city.province === selectedCity.value?.province).length
})

const searchResults = computed(() => {
  const query = search.value.trim()
  if (!query) {
    return []
  }
  const lower = query.toLowerCase()
  return cities.value
    .filter((city) => city.name.includes(query) || city.province.includes(query) || city.code.toLowerCase().includes(lower))
    .slice(0, 8)
})

const popularCodes = ['beijing', 'shanghai', 'hangzhou', 'chengdu', 'xian', 'chongqing', 'guangzhou', 'shenzhen', 'nanjing', 'suzhou']
const popularCities = computed(() =>
  popularCodes.map((code) => cities.value.find((city) => city.code === code)).filter((city): city is City => Boolean(city))
)

const backgroundStyle = computed(() => {
  if (!bgImage.value) {
    return {}
  }
  return { backgroundImage: `url("${bgImage.value}")` }
})

function isBadImage(url: string): boolean {
  return /(subdivisions|location[_-]?map|locator|map_of|flag|coat[_-]?of[_-]?arms|logo|seal|\.svg)/i.test(url)
}

async function pageImage(name: string): Promise<string> {
  const url = 'https://zh.wikipedia.org/w/api.php?action=query&format=json&origin=*'
    + `&prop=pageimages&pithumbsize=1800&titles=${encodeURIComponent(name)}`
  const response = await fetch(url, { mode: 'cors' })
  if (!response.ok) {
    return ''
  }
  const data = await response.json()
  const pages = data?.query?.pages
  if (!pages) {
    return ''
  }
  for (const page of Object.values<Record<string, unknown>>(pages)) {
    const source = (page as { thumbnail?: { source?: string } }).thumbnail?.source
    if (source && !isBadImage(source)) {
      return source
    }
  }
  return ''
}

async function summaryImage(name: string): Promise<string> {
  const response = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`, {
    mode: 'cors'
  })
  if (!response.ok) {
    return ''
  }
  const data = await response.json()
  const source = data?.originalimage?.source || data?.thumbnail?.source || ''
  return source && !isBadImage(source) ? source : ''
}

async function resolveImage(city: City): Promise<string> {
  if (imageCache.has(city.code)) {
    return imageCache.get(city.code) || ''
  }
  const cached = sessionStorage.getItem(`laycoo:city-image:${city.code}`)
  if (cached) {
    imageCache.set(city.code, cached)
    return cached
  }
  let source = ''
  try {
    source = await pageImage(city.name)
    if (!source && !city.name.endsWith('市')) {
      source = await pageImage(`${city.name}市`)
    }
    if (!source) {
      source = await summaryImage(city.name)
    }
  } catch {
    source = ''
  }
  if (source) {
    imageCache.set(city.code, source)
    try {
      sessionStorage.setItem(`laycoo:city-image:${city.code}`, source)
    } catch {
      // 忽略隐私模式下的存储异常
    }
  }
  return source
}

async function loadCityBackground(city: City) {
  const token = ++imageToken
  imageLoading.value = true
  imageError.value = false
  bgImage.value = ''
  const source = await resolveImage(city)
  if (token !== imageToken) {
    return
  }
  bgImage.value = source
  imageError.value = !source
  imageLoading.value = false
}

async function loadDefaultBackground() {
  const token = ++imageToken
  try {
    const source = await summaryImage('长城')
    if (token === imageToken && source) {
      bgImage.value = source
    }
  } catch {
    // 保留赛博地貌渐变背景
  }
}

function selectCity(code: string, syncQuery = true) {
  cityCode.value = code
  search.value = ''
  searchFocused.value = false
  if (syncQuery) {
    router.replace({ path: '/', query: { city: code } })
  }
}

function selectFromSearch(city: City) {
  selectCity(city.code)
}

function onSearchBlur() {
  window.setTimeout(() => {
    searchFocused.value = false
  }, 120)
}

function goPlanner() {
  if (!selectedCity.value) {
    ElMessage.warning('请先选择一座城市')
    return
  }
  router.push({ path: '/plan/new', query: { city: selectedCity.value.code } })
}

watch(selectedCity, (city) => {
  if (city) {
    loadCityBackground(city)
  } else {
    imageToken++
    bgImage.value = ''
    imageLoading.value = false
  }
})

onMounted(async () => {
  try {
    cities.value = await cityApi.list()
    if (!selectedCity.value) {
      await loadDefaultBackground()
    }
  } catch {
    ElMessage.error('城市数据加载失败，请刷新重试')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="city-explorer">
    <div class="city-explorer__bg" :class="{ 'is-loading': imageLoading }" :style="backgroundStyle" />
    <div class="city-explorer__veil" />
    <div class="city-explorer__grid" />
    <div class="city-explorer__glow city-explorer__glow--one" />
    <div class="city-explorer__glow city-explorer__glow--two" />
    <div class="city-explorer__scan" />

    <div class="container city-explorer__inner">
      <header class="city-explorer__head">
        <div>
          <span class="hud-label">CHINA · CITY NETWORK / {{ cities.length || 339 }}</span>
          <h1>选择一座城，<br /><em>开始一段旅程。</em></h1>
          <p>
            从北国雪原到南海之滨，覆盖全国地级及以上城市。
            点选城市，AI 会结合当地内容与你的偏好，生成可以照着走的多日行程。
          </p>
        </div>

        <div class="city-search-wrap">
          <div class="city-search" :class="{ 'is-focused': searchFocused }">
            <span class="city-search__icon">⌖</span>
            <input
              v-model="search"
              type="search"
              placeholder="搜索城市 / 省份，例如：杭州、四川"
              aria-label="搜索城市"
              @focus="searchFocused = true"
              @blur="onSearchBlur"
            />
            <span v-if="loading" class="city-search__hint">LOADING</span>
            <span v-else class="city-search__hint">{{ cities.length }} CITIES</span>
          </div>

          <Transition name="result-fade">
            <div v-if="searchFocused && search.trim()" class="city-results">
              <button
                v-for="city in searchResults"
                :key="city.code"
                type="button"
                class="city-result"
                @mousedown.prevent="selectFromSearch(city)"
              >
                <span>
                  <strong>{{ city.name }}</strong>
                  <small>{{ city.province }}</small>
                </span>
                <span class="city-result__tag">{{ city.hasContent === 1 ? '精选' : 'AI' }}</span>
              </button>
              <p v-if="!searchResults.length" class="city-results__empty">没有找到这座城市，试试省份名称。</p>
            </div>
          </Transition>
        </div>
      </header>

      <div class="city-explorer__body">
        <aside class="city-console">
          <div class="console-head">
            <span class="hud-label">CITY INDEX</span>
            <span class="console-head__count">{{ cities.length }} 座</span>
          </div>

          <div class="console-stats">
            <div class="console-stat">
              <strong>{{ cities.length }}</strong>
              <span>城市节点</span>
            </div>
            <div class="console-stat">
              <strong>{{ provinceCount }}</strong>
              <span>省级区域</span>
            </div>
            <div class="console-stat">
              <strong>AI</strong>
              <span>实时行程</span>
            </div>
          </div>

          <Transition name="panel-fade" mode="out-in">
            <div v-if="selectedCity" :key="selectedCity.code" class="selected-city">
              <div class="selected-city__top">
                <span class="hud-label">SELECTED NODE</span>
                <span class="selected-city__status">ONLINE</span>
              </div>
              <div class="selected-city__name">
                <span class="selected-city__code">{{ selectedCity.code.toUpperCase() }}</span>
                <h2>{{ selectedCity.name }}</h2>
                <p>{{ selectedCity.province }} · {{ selectedProvinceCount }} 个城市节点</p>
              </div>

              <div class="selected-city__signal">
                <span v-for="n in 18" :key="n" :style="{ height: `${8 + ((n * 7) % 26)}px` }" />
              </div>

              <div class="selected-city__meta">
                <span>{{ selectedCity.hasContent === 1 ? '本地精选内容' : '通用 AI 攻略' }}</span>
                <span>经纬度 {{ Number(selectedCity.longitude).toFixed(1) }}, {{ Number(selectedCity.latitude).toFixed(1) }}</span>
              </div>

              <button class="btn-plan" type="button" @click="goPlanner">
                进入行程规划 <span>↗</span>
              </button>
            </div>

            <div v-else class="console-empty">
              <span class="console-empty__mark">⌖</span>
              <h3>等待选择城市</h3>
              <p>点击右侧地图上的光点，或使用上方搜索框定位城市。</p>
            </div>
          </Transition>

          <div class="console-tip">
            <span class="console-tip__line" />
            <p>拖拽地图可平移，滚轮缩放。选中城市后背景会自动切换为该城市影像。</p>
          </div>
        </aside>

        <div class="map-shell">
          <div class="map-shell__head">
            <div>
              <span class="hud-label">NATIONAL GRID / DOMESTIC ONLY</span>
              <h2>中国城市网络</h2>
            </div>
            <div class="map-shell__live">
              <i />
              LIVE MAP
            </div>
          </div>

          <div v-if="loading" class="map-loading">
            <span />
            <p>正在接入全国城市节点…</p>
          </div>
          <ChinaCityMap v-else v-model="cityCode" :cities="cities" />

          <div class="map-shell__foot">
            <span>DATA / 中国地级及以上城市</span>
            <span v-if="selectedCity">CURRENT / {{ selectedCity.name }} · {{ selectedCity.province }}</span>
            <span v-else>CURRENT / 未选择</span>
          </div>
        </div>
      </div>

      <footer class="city-explorer__foot">
        <span>HOVER TO EXPLORE</span>
        <div class="popular-row">
          <button
            v-for="city in popularCities"
            :key="city.code"
            type="button"
            class="popular-chip"
            :class="{ 'is-active': city.code === cityCode }"
            @click="selectCity(city.code)"
          >
            {{ city.name }}
          </button>
        </div>
        <span>CHINA / {{ cities.length || 339 }} NODES</span>
      </footer>

      <p v-if="imageError" class="image-credit">该城市暂无可用地标影像，已启用赛博地貌视图。</p>
    </div>
  </section>
</template>

<style scoped>
.city-explorer {
  position: relative;
  min-height: calc(100vh - 78px);
  overflow: hidden;
  color: #dffcf6;
  background: #030b12;
}

.city-explorer__bg {
  position: absolute;
  inset: -2%;
  background-position: center;
  background-size: cover;
  opacity: 0;
  transform: scale(1.04);
  transition: opacity 0.9s ease, transform 1.4s ease;
  filter: saturate(0.92) brightness(0.7);
  z-index: 0;
}

.city-explorer__bg[style] {
  opacity: 0.72;
}

.city-explorer__bg.is-loading {
  opacity: 0.16;
}

.city-explorer__veil {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(90deg, rgba(3, 11, 18, 0.96) 0%, rgba(3, 11, 18, 0.7) 38%, rgba(3, 11, 18, 0.28) 68%, rgba(3, 11, 18, 0.7) 100%),
    linear-gradient(180deg, rgba(3, 11, 18, 0.68), transparent 24%, transparent 70%, rgba(3, 11, 18, 0.94));
}

.city-explorer__grid {
  position: absolute;
  inset: 0;
  z-index: 2;
  background-image:
    linear-gradient(rgba(94, 234, 212, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(94, 234, 212, 0.045) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.6), transparent 70%);
  pointer-events: none;
  animation: grid-drift 18s linear infinite;
}

.city-explorer__glow {
  position: absolute;
  z-index: 2;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.32;
  pointer-events: none;
}

.city-explorer__glow--one {
  right: 8%;
  top: 10%;
  background: #0e7490;
}

.city-explorer__glow--two {
  left: 18%;
  bottom: -10%;
  background: #9a3412;
  opacity: 0.22;
}

.city-explorer__scan {
  position: absolute;
  inset: 0;
  z-index: 3;
  background: linear-gradient(180deg, transparent 0%, rgba(94, 234, 212, 0.05) 48%, transparent 52%);
  background-size: 100% 220%;
  animation: scanline 9s linear infinite;
  pointer-events: none;
  opacity: 0.5;
}

.city-explorer__inner {
  position: relative;
  z-index: 4;
  padding-top: 34px;
  padding-bottom: 24px;
}

.city-explorer__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 28px;
  margin-bottom: 28px;
}

.hud-label {
  display: inline-block;
  color: rgba(94, 234, 212, 0.66);
  font-family: 'Bahnschrift', 'DIN Alternate', 'Segoe UI', sans-serif;
  font-size: 10px;
  letter-spacing: 0.22em;
}

.city-explorer__head h1 {
  margin-top: 12px;
  font-family: var(--sans);
  font-size: clamp(40px, 4.8vw, 68px);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.035em;
  color: #f1fffb;
  text-shadow: 0 0 36px rgba(94, 234, 212, 0.16);
}

.city-explorer__head h1 em {
  font-style: normal;
  color: transparent;
  background: linear-gradient(90deg, #5eead4, #9ff7e5 44%, #ffb454 100%);
  background-clip: text;
  -webkit-background-clip: text;
}

.city-explorer__head p {
  max-width: 660px;
  margin-top: 14px;
  color: rgba(205, 235, 230, 0.58);
  font-size: 13px;
  line-height: 1.9;
}

.city-search-wrap {
  position: relative;
  width: min(360px, 100%);
  flex-shrink: 0;
  padding-bottom: 6px;
}

.city-search {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 14px;
  border: 1px solid rgba(94, 234, 212, 0.26);
  border-radius: 12px;
  background: rgba(4, 19, 29, 0.72);
  box-shadow: inset 0 0 24px rgba(94, 234, 212, 0.04);
  transition: all 0.25s ease;
}

.city-search.is-focused {
  border-color: rgba(94, 234, 212, 0.76);
  box-shadow: 0 0 0 3px rgba(94, 234, 212, 0.08), inset 0 0 24px rgba(94, 234, 212, 0.08);
}

.city-search__icon {
  color: #5eead4;
  font-size: 18px;
}

.city-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: #eafffb;
  font-size: 12px;
}

.city-search input::placeholder {
  color: rgba(205, 235, 230, 0.38);
}

.city-search__hint {
  color: rgba(94, 234, 212, 0.46);
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 9px;
  letter-spacing: 0.1em;
  white-space: nowrap;
}

.city-results {
  position: absolute;
  top: 54px;
  left: 0;
  right: 0;
  z-index: 20;
  padding: 6px;
  border: 1px solid rgba(94, 234, 212, 0.28);
  border-radius: 12px;
  background: rgba(3, 14, 22, 0.96);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(18px);
}

.city-result {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #eafffb;
  text-align: left;
  cursor: pointer;
}

.city-result:hover {
  background: rgba(94, 234, 212, 0.09);
}

.city-result span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.city-result strong {
  font-size: 13px;
  font-weight: 600;
}

.city-result small {
  color: rgba(205, 235, 230, 0.45);
  font-size: 10px;
}

.city-result__tag {
  color: #ffb454;
  font-size: 9px;
  letter-spacing: 0.08em;
}

.city-results__empty {
  padding: 14px;
  color: rgba(205, 235, 230, 0.5);
  font-size: 11px;
  text-align: center;
}

.city-explorer__body {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  gap: 18px;
  align-items: stretch;
}

.city-console {
  display: flex;
  flex-direction: column;
  padding: 20px;
  border: 1px solid rgba(94, 234, 212, 0.18);
  border-radius: 22px;
  background: linear-gradient(160deg, rgba(5, 22, 32, 0.8), rgba(3, 12, 19, 0.68));
  backdrop-filter: blur(18px);
  box-shadow: inset 0 0 40px rgba(94, 234, 212, 0.035), 0 24px 60px rgba(0, 0, 0, 0.22);
}

.console-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.console-head__count {
  color: rgba(215, 245, 240, 0.54);
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 10px;
}

.console-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 18px;
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(94, 234, 212, 0.12);
}

.console-stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.console-stat strong {
  color: #5eead4;
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 22px;
  font-weight: 500;
}

.console-stat span {
  color: rgba(205, 235, 230, 0.4);
  font-size: 9px;
  letter-spacing: 0.06em;
}

.selected-city {
  padding-top: 18px;
}

.selected-city__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-city__status {
  color: #5eead4;
  font-size: 9px;
  letter-spacing: 0.14em;
}

.selected-city__status::before {
  content: '';
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-right: 5px;
  border-radius: 50%;
  background: #5eead4;
  box-shadow: 0 0 8px #5eead4;
}

.selected-city__code {
  display: block;
  margin-top: 24px;
  color: rgba(94, 234, 212, 0.44);
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 10px;
  letter-spacing: 0.18em;
}

.selected-city__name h2 {
  margin-top: 4px;
  color: #f1fffb;
  font-family: var(--sans);
  font-size: 46px;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.selected-city__name p {
  margin-top: 6px;
  color: rgba(205, 235, 230, 0.48);
  font-size: 10.5px;
}

.selected-city__signal {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 40px;
  margin-top: 20px;
}

.selected-city__signal span {
  flex: 1;
  min-width: 2px;
  border-radius: 2px;
  background: linear-gradient(180deg, #5eead4, rgba(94, 234, 212, 0.08));
  animation: signal 1.8s ease-in-out infinite alternate;
}

.selected-city__signal span:nth-child(3n) {
  animation-delay: 0.25s;
}

.selected-city__signal span:nth-child(3n + 1) {
  animation-delay: 0.5s;
}

.selected-city__meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 16px;
  color: rgba(205, 235, 230, 0.38);
  font-size: 9.5px;
  letter-spacing: 0.02em;
}

.btn-plan {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 22px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 180, 84, 0.55);
  border-radius: 10px;
  background: linear-gradient(100deg, rgba(255, 180, 84, 0.16), rgba(255, 180, 84, 0.04));
  color: #ffcf70;
  font-size: 12px;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.25s ease;
}

.btn-plan:hover {
  background: #ffb454;
  color: #07131c;
  box-shadow: 0 0 26px rgba(255, 180, 84, 0.36);
}

.btn-plan span {
  font-size: 16px;
}

.console-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 240px;
  text-align: center;
}

.console-empty__mark {
  color: rgba(94, 234, 212, 0.42);
  font-size: 48px;
}

.console-empty h3 {
  margin-top: 12px;
  color: rgba(234, 255, 251, 0.75);
  font-size: 16px;
  font-weight: 500;
}

.console-empty p {
  margin: 7px auto 0;
  max-width: 210px;
  color: rgba(205, 235, 230, 0.36);
  font-size: 10.5px;
  line-height: 1.8;
}

.console-tip {
  margin-top: auto;
  padding-top: 20px;
}

.console-tip__line {
  display: block;
  width: 24px;
  height: 1px;
  margin-bottom: 9px;
  background: rgba(94, 234, 212, 0.42);
}

.console-tip p {
  color: rgba(205, 235, 230, 0.32);
  font-size: 9.5px;
  line-height: 1.8;
}

.map-shell {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(94, 234, 212, 0.14);
  border-radius: 24px;
  background: linear-gradient(160deg, rgba(4, 18, 27, 0.64), rgba(2, 9, 15, 0.38));
  backdrop-filter: blur(12px);
}

.map-shell__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 4px 4px 14px;
}

.map-shell__head h2 {
  margin-top: 4px;
  color: #f1fffb;
  font-size: 19px;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.map-shell__live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(94, 234, 212, 0.62);
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 9px;
  letter-spacing: 0.12em;
}

.map-shell__live i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #5eead4;
  box-shadow: 0 0 8px #5eead4;
  animation: blink 1.6s ease-in-out infinite;
}

.map-loading {
  display: grid;
  place-items: center;
  height: 620px;
  border: 1px dashed rgba(94, 234, 212, 0.18);
  border-radius: 22px;
  color: rgba(205, 235, 230, 0.45);
  font-size: 12px;
}

.map-loading span {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(94, 234, 212, 0.18);
  border-top-color: #5eead4;
  border-radius: 50%;
  animation: spin 1.1s linear infinite;
}

.map-loading p {
  margin-top: 12px;
}

.map-shell__foot {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 4px 2px;
  color: rgba(205, 235, 230, 0.3);
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 8.5px;
  letter-spacing: 0.08em;
}

.city-explorer__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 20px;
  color: rgba(205, 235, 230, 0.28);
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 8.5px;
  letter-spacing: 0.12em;
}

.popular-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}

.popular-chip {
  padding: 5px 10px;
  border: 1px solid rgba(94, 234, 212, 0.14);
  border-radius: 999px;
  background: transparent;
  color: rgba(205, 235, 230, 0.55);
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.popular-chip:hover,
.popular-chip.is-active {
  border-color: rgba(255, 180, 84, 0.55);
  color: #ffb454;
  background: rgba(255, 180, 84, 0.07);
}

.image-credit {
  margin-top: 10px;
  color: rgba(205, 235, 230, 0.24);
  font-size: 9px;
  text-align: right;
}

.result-fade-enter-active,
.result-fade-leave-active,
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.result-fade-enter-from,
.result-fade-leave-to,
.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@keyframes grid-drift {
  from {
    background-position: 0 0, 0 0;
  }
  to {
    background-position: 64px 64px, 64px 64px;
  }
}

@keyframes scanline {
  from {
    background-position: 0 -100%;
  }
  to {
    background-position: 0 200%;
  }
}

@keyframes signal {
  from {
    opacity: 0.35;
    transform: scaleY(0.5);
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

@keyframes blink {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1180px) {
  .city-explorer__body {
    grid-template-columns: 290px minmax(0, 1fr);
  }

  .city-explorer__head h1 {
    font-size: 48px;
  }
}

@media (max-width: 980px) {
  .city-explorer__inner {
    padding-top: 24px;
  }

  .city-explorer__head {
    flex-direction: column;
    align-items: stretch;
  }

  .city-search-wrap {
    width: 100%;
  }

  .city-explorer__body {
    grid-template-columns: 1fr;
  }

  .city-console {
    order: 2;
  }

  .map-shell {
    order: 1;
  }

  .console-empty {
    min-height: 150px;
  }

  .city-explorer__foot {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .popular-row {
    justify-content: flex-start;
  }
}

@media (max-width: 620px) {
  .city-explorer {
    min-height: calc(100vh - 106px);
  }

  .city-explorer__head h1 {
    font-size: 38px;
  }

  .city-explorer__head p {
    font-size: 12px;
  }

  .city-explorer__body {
    gap: 12px;
  }

  .map-shell {
    padding: 10px;
  }

  .map-shell__head h2 {
    font-size: 16px;
  }

  .selected-city__name h2 {
    font-size: 38px;
  }

  .selected-city__signal {
    height: 28px;
  }

  .city-explorer__foot > span {
    display: none;
  }
}
</style>
