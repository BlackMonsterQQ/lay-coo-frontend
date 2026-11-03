<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { cityApi, planApi } from '@/api'
import type { City } from '@/types'

const route = useRoute()
const router = useRouter()

const cities = ref<City[]>([])
const loadingCities = ref(true)
const submitting = ref(false)
const cityCode = ref(String(route.query.city || ''))
const extraNote = ref('')
const preferences = ref<string[]>([])
const search = ref('')

const preferenceOptions = ['美食', '人文历史', '自然风光', '拍照', '亲子', '夜游', '购物', '非遗体验', '慢节奏', '预算友好']

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const start = new Date()
start.setDate(start.getDate() + 1)
const end = new Date(start)
end.setDate(end.getDate() + 2)
const dateRange = ref<[string, string] | null>([formatDate(start), formatDate(end)])

const selectedCity = computed(() => cities.value.find((city) => city.code === cityCode.value))
const cityResults = computed(() => {
  const query = search.value.trim()
  if (!query) {
    return []
  }
  return cities.value
    .filter((city) => city.name.includes(query) || city.province.includes(query))
    .slice(0, 6)
})
const dayCount = computed(() => {
  if (!dateRange.value) {
    return 0
  }
  const first = new Date(`${dateRange.value[0]}T00:00:00`)
  const last = new Date(`${dateRange.value[1]}T00:00:00`)
  return Math.round((last.getTime() - first.getTime()) / 86400000) + 1
})
const nights = computed(() => Math.max(0, dayCount.value - 1))

function disabledDate(time: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const max = new Date(today)
  max.setDate(max.getDate() + 90)
  return time.getTime() < today.getTime() || time.getTime() > max.getTime()
}

function togglePreference(value: string) {
  if (preferences.value.includes(value)) {
    preferences.value = preferences.value.filter((item) => item !== value)
    return
  }
  if (preferences.value.length >= 5) {
    ElMessage.warning('最多选择 5 个偏好')
    return
  }
  preferences.value = [...preferences.value, value]
}

function chooseCity(city: City) {
  cityCode.value = city.code
  search.value = ''
  router.replace({ path: '/plan/new', query: { city: city.code } })
}

async function submit() {
  if (!selectedCity.value) {
    ElMessage.warning('请先选择目的地城市')
    return
  }
  if (!dateRange.value || !dateRange.value[0] || !dateRange.value[1]) {
    ElMessage.warning('请选择游玩日期')
    return
  }
  if (dayCount.value < 1) {
    ElMessage.warning('结束日期不能早于开始日期')
    return
  }
  if (dayCount.value > 7) {
    ElMessage.warning('最多规划 7 天行程')
    return
  }
  submitting.value = true
  try {
    const result = await planApi.generate({
      cityCode: selectedCity.value.code,
      startDate: dateRange.value[0],
      endDate: dateRange.value[1],
      preferences: preferences.value,
      extraNote: extraNote.value.trim() || undefined
    })
    router.push(`/plan/${result.planNo}`)
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    cities.value = await cityApi.list()
    if (!cityCode.value && cities.value.length) {
      router.replace('/')
    }
  } catch {
    ElMessage.error('城市数据加载失败，请返回首页重试')
  } finally {
    loadingCities.value = false
  }
})
</script>

<template>
  <div class="planner-page">
    <div class="planner-page__grid" />
    <div class="planner-page__glow planner-page__glow--one" />
    <div class="planner-page__glow planner-page__glow--two" />

    <div class="container planner-page__inner">
      <RouterLink to="/" class="planner-back">← 返回城市网络</RouterLink>

      <div class="planner-layout">
        <aside class="planner-aside">
          <span class="hud-label">TRIP CONFIG / STEP 02</span>
          <template v-if="selectedCity">
            <span class="planner-aside__code">{{ selectedCity.code.toUpperCase() }}</span>
            <h1>{{ selectedCity.name }}</h1>
            <p class="planner-aside__province">{{ selectedCity.province }} · 目的地已锁定</p>
            <div class="planner-aside__line" />
            <p class="planner-aside__desc">
              {{ selectedCity.hasContent === 1
                ? '这座城市有本地精选内容，AI 会优先结合本地景点、餐饮与人文故事。'
                : '这座城市目前使用通用 AI 攻略，会基于城市常识与你的偏好生成行程。' }}
            </p>
            <div class="planner-aside__meta">
              <div><strong>{{ dayCount || '—' }}</strong><span>天数</span></div>
              <div><strong>{{ nights }}</strong><span>晚数</span></div>
              <div><strong>{{ preferences.length }}</strong><span>偏好</span></div>
            </div>
            <RouterLink to="/" class="planner-aside__change">更换城市 ↺</RouterLink>
          </template>
          <template v-else>
            <h1>选择城市</h1>
            <p class="planner-aside__desc">还没有选择目的地，请先搜索或返回城市地图。</p>
          </template>
        </aside>

        <form class="planner-form" @submit.prevent="submit">
          <div class="planner-form__head">
            <div>
              <span class="hud-label">AI ITINERARY ENGINE</span>
              <h2>配置你的行程</h2>
            </div>
            <span class="planner-form__badge">{{ dayCount > 0 ? `${dayCount}D / ${nights}N` : 'STANDBY' }}</span>
          </div>

          <div class="p-field">
            <label>目的地 <em>*</em></label>
            <div v-if="selectedCity" class="p-city-locked">
              <span class="p-city-locked__seal">{{ selectedCity.name.slice(0, 1) }}</span>
              <span>
                <strong>{{ selectedCity.name }}</strong>
                <small>{{ selectedCity.province }} · {{ selectedCity.hasContent === 1 ? '本地精选内容' : '通用 AI 攻略' }}</small>
              </span>
              <button type="button" @click="router.push('/')">更换</button>
            </div>
            <div v-else class="p-city-search">
              <input v-model="search" type="search" placeholder="输入城市名，例如：成都" />
              <button v-for="city in cityResults" :key="city.code" type="button" @click="chooseCity(city)">
                {{ city.name }} <small>{{ city.province }}</small>
              </button>
            </div>
          </div>

          <div class="p-field">
            <label>游玩日期 <em>*</em></label>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              range-separator="→"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              :disabled-date="disabledDate"
              size="large"
              style="width: 100%"
            />
            <p class="p-hint">最多 7 天；同一天即单日行程</p>
          </div>

          <div class="p-field">
            <label>个人偏好 <span>选填，最多 5 个</span></label>
            <div class="p-preferences">
              <button
                v-for="item in preferenceOptions"
                :key="item"
                type="button"
                :class="{ 'is-active': preferences.includes(item) }"
                @click="togglePreference(item)"
              >
                {{ item }}
              </button>
            </div>
          </div>

          <div class="p-field">
            <label>补充说明 <span>选填</span></label>
            <el-input
              v-model="extraNote"
              type="textarea"
              :rows="3"
              maxlength="100"
              show-word-limit
              placeholder="例如：带老人，不想走太多路；喜欢喝茶；预算 3000 元"
            />
          </div>

          <button class="btn-plan-submit" type="submit" :disabled="submitting || loadingCities">
            <span v-if="submitting">正在启动 AI 引擎…</span>
            <span v-else>生成我的行程攻略 <b>→</b></span>
          </button>
          <p class="p-note">生成通常需要 30–240 秒，结果页会自动轮询。</p>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.planner-page {
  position: relative;
  min-height: calc(100vh - 78px);
  overflow: hidden;
  color: #dffcf6;
  background: #030b12;
}

.planner-page__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(94, 234, 212, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(94, 234, 212, 0.04) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.5), transparent 72%);
  pointer-events: none;
}

.planner-page__glow {
  position: absolute;
  width: 460px;
  height: 460px;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.25;
  pointer-events: none;
}

.planner-page__glow--one {
  right: 2%;
  top: 8%;
  background: #0e7490;
}

.planner-page__glow--two {
  left: 8%;
  bottom: -16%;
  background: #9a3412;
}

.planner-page__inner {
  position: relative;
  z-index: 2;
  padding-top: 26px;
  padding-bottom: 40px;
}

.planner-back {
  display: inline-block;
  margin-bottom: 24px;
  color: rgba(205, 235, 230, 0.45);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.planner-back:hover {
  color: #5eead4;
}

.planner-layout {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 26px;
  align-items: start;
}

.planner-aside {
  padding: 26px;
  border: 1px solid rgba(94, 234, 212, 0.16);
  border-radius: 20px;
  background: linear-gradient(160deg, rgba(5, 22, 32, 0.82), rgba(3, 12, 19, 0.64));
  backdrop-filter: blur(18px);
}

.hud-label {
  color: rgba(94, 234, 212, 0.6);
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 9px;
  letter-spacing: 0.2em;
}

.planner-aside__code {
  display: block;
  margin-top: 32px;
  color: rgba(94, 234, 212, 0.42);
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 10px;
  letter-spacing: 0.18em;
}

.planner-aside h1 {
  margin-top: 4px;
  color: #f1fffb;
  font-family: var(--sans);
  font-size: 52px;
  font-weight: 700;
  letter-spacing: -0.05em;
}

.planner-aside__province {
  margin-top: 6px;
  color: rgba(205, 235, 230, 0.44);
  font-size: 11px;
}

.planner-aside__line {
  width: 34px;
  height: 1px;
  margin: 26px 0 18px;
  background: linear-gradient(90deg, #5eead4, transparent);
}

.planner-aside__desc {
  color: rgba(205, 235, 230, 0.48);
  font-size: 11.5px;
  line-height: 1.9;
}

.planner-aside__meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px solid rgba(94, 234, 212, 0.12);
}

.planner-aside__meta strong {
  display: block;
  color: #5eead4;
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 24px;
  font-weight: 500;
}

.planner-aside__meta span {
  color: rgba(205, 235, 230, 0.35);
  font-size: 9px;
}

.planner-aside__change {
  display: inline-block;
  margin-top: 26px;
  color: #ffb454;
  font-size: 10.5px;
}

.planner-form {
  padding: 26px 28px;
  border: 1px solid rgba(94, 234, 212, 0.16);
  border-radius: 20px;
  background: linear-gradient(160deg, rgba(5, 22, 32, 0.8), rgba(3, 12, 19, 0.58));
  backdrop-filter: blur(18px);
}

.planner-form__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(94, 234, 212, 0.12);
}

.planner-form__head h2 {
  margin-top: 5px;
  color: #f1fffb;
  font-size: 25px;
  font-weight: 600;
}

.planner-form__badge {
  padding: 5px 9px;
  border: 1px solid rgba(255, 180, 84, 0.3);
  border-radius: 999px;
  color: #ffb454;
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 9px;
  letter-spacing: 0.1em;
}

.p-field {
  margin-top: 20px;
}

.p-field label {
  display: block;
  margin-bottom: 8px;
  color: rgba(234, 255, 251, 0.8);
  font-size: 11.5px;
}

.p-field label em {
  color: #ffb454;
  font-style: normal;
}

.p-field label span {
  color: rgba(205, 235, 230, 0.32);
  font-size: 9.5px;
}

.p-hint {
  margin-top: 6px;
  color: rgba(205, 235, 230, 0.3);
  font-size: 9.5px;
}

.p-city-locked {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid rgba(94, 234, 212, 0.22);
  border-radius: 10px;
  background: rgba(2, 14, 22, 0.5);
}

.p-city-locked__seal {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 180, 84, 0.45);
  border-radius: 6px;
  color: #ffb454;
  font-family: var(--serif);
  font-size: 17px;
}

.p-city-locked > span:nth-child(2) {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.p-city-locked strong {
  color: #f1fffb;
  font-size: 14px;
}

.p-city-locked small {
  color: rgba(205, 235, 230, 0.4);
  font-size: 9.5px;
}

.p-city-locked button {
  margin-left: auto;
  border: none;
  background: transparent;
  color: #5eead4;
  font-size: 10px;
  cursor: pointer;
}

.p-city-search {
  position: relative;
}

.p-city-search input {
  width: 100%;
  height: 46px;
  padding: 0 13px;
  border: 1px solid rgba(94, 234, 212, 0.22);
  border-radius: 10px;
  background: rgba(2, 14, 22, 0.5);
  color: #eafffb;
  outline: none;
  font-size: 12px;
}

.p-city-search button {
  display: block;
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(94, 234, 212, 0.12);
  border-top: none;
  background: rgba(3, 14, 22, 0.95);
  color: #dffcf6;
  text-align: left;
  font-size: 12px;
  cursor: pointer;
}

.p-city-search small {
  margin-left: 8px;
  color: rgba(205, 235, 230, 0.4);
  font-size: 9.5px;
}

.p-preferences {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.p-preferences button {
  padding: 6px 12px;
  border: 1px solid rgba(94, 234, 212, 0.18);
  border-radius: 999px;
  background: transparent;
  color: rgba(205, 235, 230, 0.55);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.p-preferences button:hover,
.p-preferences button.is-active {
  border-color: rgba(255, 180, 84, 0.6);
  background: rgba(255, 180, 84, 0.1);
  color: #ffb454;
}

.btn-plan-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 24px;
  padding: 15px;
  border: 1px solid rgba(255, 180, 84, 0.65);
  border-radius: 10px;
  background: linear-gradient(100deg, #ffb454, #ffcf70);
  color: #07131c;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.25s ease;
}

.btn-plan-submit:hover {
  box-shadow: 0 0 30px rgba(255, 180, 84, 0.32);
  transform: translateY(-1px);
}

.btn-plan-submit:disabled {
  opacity: 0.55;
  cursor: wait;
  transform: none;
}

.btn-plan-submit b {
  margin-left: 6px;
  font-weight: 400;
}

.p-note {
  margin-top: 10px;
  color: rgba(205, 235, 230, 0.3);
  font-size: 9.5px;
  text-align: center;
}

:deep(.el-date-editor.el-input__wrapper),
:deep(.el-range-editor.el-input__wrapper) {
  background: rgba(2, 14, 22, 0.5);
  box-shadow: 0 0 0 1px rgba(94, 234, 212, 0.22) inset;
}

:deep(.el-range-input),
:deep(.el-range-separator) {
  color: #dffcf6;
  font-size: 11px;
}

:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  background: rgba(2, 14, 22, 0.5);
  color: #dffcf6;
  box-shadow: 0 0 0 1px rgba(94, 234, 212, 0.22) inset;
}

:deep(.el-textarea__inner::placeholder),
:deep(.el-input__inner::placeholder),
:deep(.el-range-input::placeholder) {
  color: rgba(205, 235, 230, 0.3);
}

:deep(.el-input__count) {
  background: transparent;
  color: rgba(205, 235, 230, 0.3);
}

@media (max-width: 980px) {
  .planner-layout {
    grid-template-columns: 1fr;
  }

  .planner-aside {
    order: 2;
  }

  .planner-form {
    order: 1;
  }

  .planner-aside h1 {
    font-size: 40px;
  }
}

@media (max-width: 620px) {
  .planner-page {
    min-height: calc(100vh - 106px);
  }

  .planner-page__inner {
    padding-top: 16px;
  }

  .planner-form {
    padding: 18px;
  }

  .planner-form__head h2 {
    font-size: 21px;
  }
}
</style>
