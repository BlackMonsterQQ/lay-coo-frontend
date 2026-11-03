<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { cityApi } from '@/api'
import { useUserStore } from '@/stores/user'
import type { City } from '@/types'
import ChinaCityMap from '@/components/plan/ChinaCityMap.vue'
import defaultHero from '@/assets/images/cinematic-default.jpg'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const DEFAULT_CITY_CODE = 'cn4602'

const cities = ref<City[]>([])
const cityCode = ref(String(route.query.city || DEFAULT_CITY_CODE))
const loading = ref(true)
const search = ref('')
const searchFocused = ref(false)
const searchOpen = ref(false)
const bgImage = ref(defaultHero)
const imageLoading = ref(false)
const mapRef = ref<InstanceType<typeof ChinaCityMap> | null>(null)
let imageToken = 0

const selectedCity = computed(() => cities.value.find((city) => city.code === cityCode.value))
const provinceCount = computed(() => new Set(cities.value.map((city) => city.province)).size)
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
const featuredNames = [
  '哈尔滨', '北京', '大连', '青岛', '上海', '杭州', '黄山', '武汉', '张家界',
  '重庆', '成都', '西安', '洛阳', '丽江', '大理', '昆明', '西双版纳', '广州',
  '珠海', '厦门', '泉州', '福州', '三亚', '拉萨'
]
const featuredCodes = computed(() =>
  cities.value
    .filter((city) => featuredNames.some((name) => city.name === name || city.name.startsWith(name)))
    .map((city) => city.code)
)
const impressionActive = computed(() => {
  const code = selectedCity.value?.code || 'china'
  let hash = 0
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) >>> 0
  }
  return hash % 12
})
const nickname = computed(() => userStore.profile?.nickname || '我的行程')

const backgroundStyle = computed(() => ({ backgroundImage: `url("${bgImage.value}")` }))

function cityImageUrl(city: City): string {
  if (city.code === DEFAULT_CITY_CODE) {
    return defaultHero
  }
  return `/api/v1/city/${encodeURIComponent(city.code)}/image`
}

function loadCityBackground(city: City) {
  const token = ++imageToken
  imageLoading.value = true
  const source = cityImageUrl(city)
  const image = new Image()
  image.onload = () => {
    if (token !== imageToken) {
      return
    }
    bgImage.value = source
    imageLoading.value = false
  }
  image.onerror = () => {
    if (token !== imageToken) {
      return
    }
    bgImage.value = defaultHero
    imageLoading.value = false
  }
  image.src = source
}

function selectCity(code: string, syncQuery = true) {
  cityCode.value = code
  const city = cities.value.find((item) => item.code === code)
  if (city) {
    loadCityBackground(city)
  }
  search.value = ''
  searchFocused.value = false
  searchOpen.value = false
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
  }, 140)
}

function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (!searchOpen.value) {
    search.value = ''
  }
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
  }
})

onMounted(async () => {
  try {
    cities.value = await cityApi.list()
    if (!selectedCity.value) {
      cityCode.value = DEFAULT_CITY_CODE
    }
    if (selectedCity.value) {
      await loadCityBackground(selectedCity.value)
    }
  } catch {
    ElMessage.error('城市数据加载失败，请刷新重试')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="atlas">
    <div class="atlas__bg" :class="{ 'is-loading': imageLoading }" :style="backgroundStyle" />
    <div class="atlas__shade" />
    <div class="atlas__vignette" />
    <div class="atlas__grain" />

    <header class="atlas__top">
      <RouterLink to="/" class="atlas__brand" aria-label="岚途 LayCoo 首页">
        <span class="atlas__seal">岚</span>
        <span class="atlas__brand-text">
          <strong>岚途</strong>
          <small>LAYCOO · CINEMATIC ATLAS</small>
        </span>
      </RouterLink>

      <nav class="atlas__nav" aria-label="顶部导航">
        <RouterLink to="/me">我的行程</RouterLink>
        <button type="button" @click="toggleSearch">搜索</button>
        <RouterLink v-if="!userStore.isLoggedIn" to="/login">登录</RouterLink>
        <RouterLink v-else to="/me">{{ nickname }}</RouterLink>
      </nav>
    </header>

    <Transition name="search-fade">
      <div v-if="searchOpen" class="atlas__search">
        <span class="atlas__search-icon">⌕</span>
        <input
          v-model="search"
          type="search"
          placeholder="搜索城市 / 省份"
          aria-label="搜索城市"
          autofocus
          @focus="searchFocused = true"
          @blur="onSearchBlur"
        />
        <button type="button" class="atlas__search-close" @click="toggleSearch">×</button>
        <div v-if="searchFocused && search.trim()" class="atlas__results">
          <button
            v-for="city in searchResults"
            :key="city.code"
            type="button"
            class="atlas__result"
            @mousedown.prevent="selectFromSearch(city)"
          >
            <span>
              <strong>{{ city.name }}</strong>
              <small>{{ city.province }}</small>
            </span>
            <span>{{ city.hasContent === 1 ? '精选' : 'AI' }}</span>
          </button>
          <p v-if="!searchResults.length" class="atlas__results-empty">没有找到这座城市</p>
        </div>
      </div>
    </Transition>

    <main class="atlas__stage">
      <div class="atlas__copy">
        <span class="atlas__eyebrow">EXPLORE CHINA WITH CINEMATIC ATLAS</span>
        <h1>下一段旅程，<br />从哪里开始？</h1>
        <p>轻抚山河，选一座心动的城市。</p>
      </div>

      <div class="atlas__map-wrap">
        <div v-if="loading" class="atlas__map-loading">
          <span />
          <p>正在展开山河地图…</p>
        </div>
        <ChinaCityMap
          v-else
          ref="mapRef"
          v-model="cityCode"
          :cities="cities"
          :featured-codes="featuredCodes"
        />

        <div class="atlas__zoom">
          <button type="button" aria-label="放大" @click="mapRef?.zoomIn()">+</button>
          <button type="button" aria-label="缩小" @click="mapRef?.zoomOut()">−</button>
          <button type="button" aria-label="重置地图" class="atlas__zoom-reset" @click="mapRef?.resetView()">↺</button>
        </div>

        <div class="atlas__hint">拖动探索 · 点击光点选择目的地</div>
      </div>

      <div class="atlas__selected">
        <template v-if="selectedCity">
          <span class="atlas__selected-label">SELECTED DESTINATION</span>
          <div class="atlas__selected-name">
            <h2>{{ selectedCity.name }}</h2>
            <span>等你出发</span>
          </div>
          <p>
            {{ selectedCity.province }} · {{ selectedCity.hasContent === 1 ? '本地精选内容' : '通用 AI 攻略' }}<br />
            山河风华，步步皆景。
          </p>
          <button type="button" class="atlas__go" @click="goPlanner">
            去哪里 <span>→</span>
          </button>
        </template>
        <template v-else>
          <span class="atlas__selected-label">SELECTED DESTINATION</span>
          <h2>选一座城</h2>
          <p>点击地图光点，或搜索城市名称。</p>
        </template>
      </div>
    </main>

    <footer class="atlas__bottom">
      <div class="atlas__impression">
        <strong>{{ selectedCity?.name || '中国' }}</strong>
        <span class="atlas__divider">|</span>
        <span>城市印象</span>
        <div class="atlas__dots">
          <i v-for="n in 12" :key="n" :class="{ 'is-active': n - 1 === impressionActive }" />
        </div>
      </div>
      <span class="atlas__count">CHINA / {{ cities.length || 339 }} CITIES · {{ provinceCount || 33 }} PROVINCES</span>
    </footer>
  </section>
</template>

<style scoped>
.atlas {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  color: #f8f4ea;
  background: #071416;
}

.atlas__bg {
  position: absolute;
  inset: -2%;
  background-position: center;
  background-size: cover;
  opacity: 0.94;
  transform: scale(1.02);
  filter: saturate(0.96) brightness(0.9) contrast(1.02);
  transition: opacity 0.8s ease;
}

.atlas__bg.is-loading {
  opacity: 0.42;
}

.atlas__shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(5, 17, 19, 0.68) 0%, rgba(5, 17, 19, 0.32) 38%, rgba(5, 17, 19, 0.02) 68%, rgba(5, 17, 19, 0.26) 100%),
    linear-gradient(180deg, rgba(4, 15, 17, 0.58) 0%, transparent 26%, transparent 66%, rgba(4, 15, 17, 0.82) 100%);
}

.atlas__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 60% 48%, transparent 30%, rgba(3, 12, 14, 0.28) 100%);
  pointer-events: none;
}

.atlas__grain {
  position: absolute;
  inset: 0;
  opacity: 0.12;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E");
  mix-blend-mode: soft-light;
}

.atlas__top {
  position: absolute;
  z-index: 10;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26px 42px;
}

.atlas__brand {
  display: inline-flex;
  align-items: center;
  gap: 13px;
  color: #f8f4ea;
}

.atlas__seal {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(248, 244, 234, 0.45);
  border-radius: 50%;
  color: #f8f4ea;
  font-family: var(--serif);
  font-size: 19px;
}

.atlas__brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.atlas__brand-text strong {
  font-family: var(--serif);
  font-size: 23px;
  font-weight: 500;
  letter-spacing: 0.12em;
}

.atlas__brand-text small {
  color: rgba(248, 244, 234, 0.46);
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 8px;
  letter-spacing: 0.18em;
}

.atlas__nav {
  display: flex;
  align-items: center;
  gap: 26px;
  color: rgba(248, 244, 234, 0.68);
  font-size: 12px;
}

.atlas__nav a,
.atlas__nav button {
  color: inherit;
  background: transparent;
  border: none;
  font: inherit;
  cursor: pointer;
  transition: color 0.2s ease;
}

.atlas__nav a:hover,
.atlas__nav button:hover {
  color: #f8f4ea;
}

.atlas__search {
  position: absolute;
  z-index: 30;
  top: 84px;
  right: 42px;
  width: 320px;
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 13px;
  border: 1px solid rgba(248, 244, 234, 0.26);
  border-radius: 4px;
  background: rgba(8, 22, 24, 0.72);
  backdrop-filter: blur(14px);
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.22);
}

.atlas__search-icon {
  color: rgba(248, 244, 234, 0.5);
  font-size: 17px;
}

.atlas__search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: #f8f4ea;
  font-size: 12px;
}

.atlas__search input::placeholder {
  color: rgba(248, 244, 234, 0.4);
}

.atlas__search-close {
  border: none;
  background: transparent;
  color: rgba(248, 244, 234, 0.5);
  font-size: 18px;
  cursor: pointer;
}

.atlas__results {
  position: absolute;
  top: 48px;
  left: 0;
  right: 0;
  padding: 5px;
  border: 1px solid rgba(248, 244, 234, 0.2);
  border-radius: 4px;
  background: rgba(8, 22, 24, 0.94);
  backdrop-filter: blur(16px);
}

.atlas__result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: #f8f4ea;
  text-align: left;
  cursor: pointer;
}

.atlas__result:hover {
  background: rgba(255, 255, 255, 0.08);
}

.atlas__result span:first-child {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.atlas__result strong {
  font-size: 12.5px;
  font-weight: 500;
}

.atlas__result small {
  color: rgba(248, 244, 234, 0.42);
  font-size: 9.5px;
}

.atlas__result > span:last-child {
  color: rgba(248, 238, 206, 0.62);
  font-size: 9px;
}

.atlas__results-empty {
  padding: 14px;
  color: rgba(248, 244, 234, 0.4);
  font-size: 11px;
  text-align: center;
}

.atlas__stage {
  position: absolute;
  inset: 0;
}

.atlas__copy {
  position: absolute;
  z-index: 4;
  top: 20%;
  left: 6.5%;
  max-width: 520px;
}

.atlas__eyebrow {
  display: block;
  color: rgba(248, 244, 234, 0.5);
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 9px;
  letter-spacing: 0.26em;
}

.atlas__copy h1 {
  margin-top: 18px;
  color: #fbf7ed;
  font-family: var(--serif);
  font-size: clamp(40px, 4.4vw, 64px);
  font-weight: 400;
  line-height: 1.28;
  letter-spacing: 0.04em;
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.24);
}

.atlas__copy p {
  margin-top: 18px;
  color: rgba(248, 244, 234, 0.62);
  font-size: 12px;
  letter-spacing: 0.12em;
}

.atlas__map-wrap {
  position: absolute;
  z-index: 2;
  top: 7%;
  left: 27%;
  right: 2%;
  bottom: 9%;
}

.atlas__map-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(248, 244, 234, 0.5);
  font-size: 11px;
}

.atlas__map-loading span {
  width: 30px;
  height: 30px;
  border: 1px solid rgba(248, 244, 234, 0.18);
  border-top-color: rgba(248, 244, 234, 0.8);
  border-radius: 50%;
  animation: spin 1.1s linear infinite;
}

.atlas__map-loading p {
  margin-top: 12px;
}

.atlas__zoom {
  position: absolute;
  z-index: 12;
  right: 22px;
  top: 48%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transform: translateY(-50%);
}

.atlas__zoom button {
  width: 33px;
  height: 33px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(248, 244, 234, 0.32);
  border-radius: 50%;
  background: rgba(8, 22, 24, 0.3);
  color: rgba(248, 244, 234, 0.8);
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
}

.atlas__zoom button:hover {
  border-color: rgba(248, 244, 234, 0.8);
  background: rgba(8, 22, 24, 0.56);
}

.atlas__zoom-reset {
  font-size: 14px !important;
}

.atlas__hint {
  position: absolute;
  z-index: 5;
  left: 50%;
  bottom: -3%;
  transform: translateX(-50%);
  color: rgba(248, 244, 234, 0.42);
  font-size: 10px;
  letter-spacing: 0.12em;
  white-space: nowrap;
}

.atlas__selected {
  position: absolute;
  z-index: 6;
  left: 6.5%;
  bottom: 11%;
  max-width: 330px;
}

.atlas__selected-label {
  display: block;
  color: rgba(248, 244, 234, 0.45);
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 8px;
  letter-spacing: 0.2em;
}

.atlas__selected-name {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-top: 8px;
}

.atlas__selected-name h2,
.atlas__selected > h2 {
  color: #fbf7ed;
  font-family: var(--serif);
  font-size: clamp(40px, 4vw, 58px);
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0.06em;
}

.atlas__selected-name span {
  color: rgba(248, 244, 234, 0.52);
  font-size: 11px;
  letter-spacing: 0.12em;
}

.atlas__selected p {
  margin-top: 14px;
  color: rgba(248, 244, 234, 0.54);
  font-size: 11px;
  line-height: 1.9;
  letter-spacing: 0.05em;
}

.atlas__go {
  display: inline-flex;
  align-items: center;
  gap: 28px;
  margin-top: 18px;
  padding: 0;
  border: none;
  background: transparent;
  color: #f8f4ea;
  font-size: 12px;
  letter-spacing: 0.22em;
  cursor: pointer;
}

.atlas__go span {
  font-size: 19px;
  font-weight: 300;
  transition: transform 0.25s ease;
}

.atlas__go:hover span {
  transform: translateX(7px);
}

.atlas__selected--empty {
  opacity: 0.7;
}

.atlas__bottom {
  position: absolute;
  z-index: 8;
  left: 42px;
  right: 42px;
  bottom: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  color: rgba(248, 244, 234, 0.46);
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 9px;
  letter-spacing: 0.1em;
}

.atlas__impression {
  display: flex;
  align-items: center;
  gap: 10px;
}

.atlas__impression strong {
  color: rgba(248, 244, 234, 0.8);
  font-family: var(--serif);
  font-size: 18px;
  font-weight: 400;
  letter-spacing: 0.1em;
}

.atlas__divider {
  color: rgba(248, 244, 234, 0.22);
}

.atlas__dots {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: 8px;
}

.atlas__dots i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(248, 244, 234, 0.28);
}

.atlas__dots i.is-active {
  width: 4px;
  height: 4px;
  background: #f8e7bd;
  box-shadow: 0 0 6px rgba(248, 231, 189, 0.8);
}

.atlas__count {
  color: rgba(248, 244, 234, 0.34);
  font-size: 8px;
}

.search-fade-enter-active,
.search-fade-leave-active,
.city-fade-enter-active,
.city-fade-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.search-fade-enter-from,
.search-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.city-fade-enter-from,
.city-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1100px) {
  .atlas__copy {
    top: 17%;
  }

  .atlas__copy h1 {
    font-size: 46px;
  }

  .atlas__map-wrap {
    left: 24%;
  }

  .atlas__selected-name h2,
  .atlas__selected > h2 {
    font-size: 46px;
  }
}

@media (max-width: 760px) {
  .atlas {
    min-height: 100vh;
  }

  .atlas__top {
    padding: 18px 20px;
  }

  .atlas__brand-text small {
    display: none;
  }

  .atlas__nav {
    gap: 14px;
    font-size: 11px;
  }

  .atlas__copy {
    top: 13%;
    left: 20px;
    right: 20px;
  }

  .atlas__copy h1 {
    margin-top: 12px;
    font-size: 34px;
    line-height: 1.35;
  }

  .atlas__copy p {
    margin-top: 10px;
    font-size: 11px;
  }

  .atlas__map-wrap {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    bottom: auto;
    height: 48vh;
    min-height: 340px;
    margin: 180px 8px 0;
  }

  .atlas__zoom {
    right: 0;
    top: 50%;
  }

  .atlas__zoom button {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }

  .atlas__hint {
    bottom: -18px;
    font-size: 9px;
  }

  .atlas__selected {
    left: 20px;
    bottom: 78px;
    max-width: 280px;
  }

  .atlas__selected-name h2,
  .atlas__selected > h2 {
    font-size: 36px;
  }

  .atlas__selected p {
    margin-top: 9px;
    font-size: 10px;
  }

  .atlas__go {
    margin-top: 10px;
    font-size: 11px;
  }

  .atlas__bottom {
    left: 20px;
    right: 20px;
    bottom: 16px;
  }

  .atlas__count {
    display: none;
  }

  .atlas__search {
    top: 64px;
    left: 20px;
    right: 20px;
    width: auto;
  }
}

@media (max-width: 420px) {
  .atlas__nav a:nth-child(2),
  .atlas__nav button {
    display: none;
  }

  .atlas__copy h1 {
    font-size: 29px;
  }

  .atlas__map-wrap {
    margin-top: 150px;
    height: 44vh;
  }

  .atlas__selected {
    bottom: 68px;
  }

  .atlas__selected p br {
    display: none;
  }
}
</style>
