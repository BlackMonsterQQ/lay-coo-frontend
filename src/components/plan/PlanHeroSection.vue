<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { cityApi, planApi } from '@/api'
import type { City } from '@/types'
import WorldCityMap from '@/components/plan/WorldCityMap.vue'

const router = useRouter()

const cities = ref<City[]>([])
const cityCode = ref('')
const loadingCities = ref(true)
const submitting = ref(false)
const extraNote = ref('')
const preferences = ref<string[]>([])

const preferenceOptions = [
  '美食',
  '人文历史',
  '自然风光',
  '拍照',
  '亲子',
  '夜游',
  '购物',
  '非遗体验',
  '慢节奏',
  '预算友好'
]

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

function chooseCity(code: string) {
  cityCode.value = code
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

async function submit() {
  if (!cityCode.value) {
    ElMessage.warning('请在地图上选择目的地城市')
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
      cityCode: cityCode.value,
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
  } catch {
    ElMessage.error('城市列表加载失败，请稍后重试')
  } finally {
    loadingCities.value = false
  }
})
</script>

<template>
  <section class="plan-hero">
    <div class="plan-hero__bg serif" aria-hidden="true">游</div>
    <div class="container plan-hero__inner">
      <div class="plan-hero__copy">
        <span class="eyebrow">AI TRIP PLANNER · 多日行程</span>
        <h1>告诉我你想去哪，<br />玩几天。</h1>
        <p>
          在世界地图上点选城市，选好日期与偏好。岚途会结合本地内容与 AI，
          给你一份按天安排、可以直接照着走的行程攻略。
        </p>
      </div>

      <div class="plan-hero__grid">
        <form class="plan-form panel" @submit.prevent="submit">
          <div class="plan-form__head">
            <div>
              <span class="eyebrow">STEP 01</span>
              <h2>定制你的行程</h2>
            </div>
            <span class="plan-form__badge">{{ dayCount > 0 ? `${dayCount} 天 ${nights} 晚` : '选择日期' }}</span>
          </div>

          <div class="field">
            <label class="field-label">目的地 <em>*</em></label>
            <div class="selected-city" :class="{ 'is-empty': !selectedCity }">
              <template v-if="selectedCity">
                <span class="selected-city__seal">{{ selectedCity.name.slice(0, 1) }}</span>
                <span class="selected-city__body">
                  <strong>{{ selectedCity.name }}</strong>
                  <small>{{ selectedCity.country }} · {{ selectedCity.hasContent === 1 ? '本地精选内容' : '通用 AI 攻略' }}</small>
                </span>
                <span class="selected-city__hint">点击地图更换</span>
              </template>
              <template v-else>
                <span class="selected-city__placeholder">在右侧世界地图上点击城市标记</span>
              </template>
            </div>
          </div>

          <div class="field">
            <label class="field-label">游玩日期 <em>*</em></label>
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
            <p class="field-hint">最多 7 天；选择同一天即为单日行程</p>
          </div>

          <div class="field">
            <label class="field-label">个人偏好 <span class="field-hint">选填，最多 5 个</span></label>
            <div class="preference-grid">
              <button
                v-for="item in preferenceOptions"
                :key="item"
                type="button"
                class="preference-chip"
                :class="{ 'is-active': preferences.includes(item) }"
                @click="togglePreference(item)"
              >
                {{ item }}
              </button>
            </div>
          </div>

          <div class="field">
            <label class="field-label">补充说明 <span class="field-hint">选填</span></label>
            <el-input
              v-model="extraNote"
              type="textarea"
              :rows="2"
              maxlength="100"
              show-word-limit
              placeholder="例如：带老人，不想走太多路；喜欢喝茶；预算 3000 元"
            />
          </div>

          <button class="btn btn--primary btn--lg btn--block plan-form__submit" type="submit" :disabled="submitting">
            {{ submitting ? '正在创建行程…' : '生成我的攻略 →' }}
          </button>

          <p class="plan-form__note">
            <RouterLink to="/explore">或者先逛逛本地内容 →</RouterLink>
          </p>
        </form>

        <div class="plan-map-wrap">
          <div class="plan-map-wrap__head">
            <span class="eyebrow">STEP 02</span>
            <span class="muted">{{ loadingCities ? '城市加载中…' : `${cities.length} 个目的地` }}</span>
          </div>
          <WorldCityMap v-model="cityCode" :cities="cities" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.plan-hero {
  position: relative;
  overflow: hidden;
  padding: 46px 0 56px;
}

.plan-hero__bg {
  position: absolute;
  right: -4%;
  top: -20%;
  font-size: clamp(22rem, 38vw, 34rem);
  line-height: 1;
  color: rgba(180, 69, 47, 0.04);
  pointer-events: none;
  user-select: none;
}

.plan-hero__inner {
  position: relative;
}

.plan-hero__copy {
  max-width: 760px;
  margin-bottom: 30px;
}

.plan-hero__copy h1 {
  margin-top: 16px;
  font-size: clamp(38px, 4.6vw, 60px);
  line-height: 1.2;
}

.plan-hero__copy p {
  margin-top: 16px;
  max-width: 620px;
  color: var(--ink-soft);
  font-size: 14.5px;
  line-height: 1.9;
}

.plan-hero__grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 24px;
  align-items: start;
}

.plan-form {
  padding: 26px;
}

.plan-form__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
}

.plan-form__head h2 {
  margin-top: 6px;
  font-size: 24px;
}

.plan-form__badge {
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(47, 93, 85, 0.08);
  color: var(--jade);
  font-size: 11px;
  white-space: nowrap;
}

.field {
  margin-bottom: 18px;
}

.field-label em {
  color: var(--cinnabar);
  font-style: normal;
}

.field-hint {
  color: var(--muted);
  font-size: 10.5px;
  font-weight: 400;
}

.selected-city {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 58px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--paper-2);
  transition: border-color 0.2s ease;
}

.selected-city.is-empty {
  border-style: dashed;
}

.selected-city__seal {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: var(--cinnabar);
  color: #fff6ec;
  font-family: var(--serif);
  font-size: 18px;
  flex-shrink: 0;
}

.selected-city__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.selected-city__body strong {
  font-family: var(--serif);
  font-size: 18px;
}

.selected-city__body small {
  color: var(--muted);
  font-size: 10.5px;
}

.selected-city__hint {
  margin-left: auto;
  color: var(--cinnabar);
  font-size: 10.5px;
  white-space: nowrap;
}

.selected-city__placeholder {
  color: var(--muted);
  font-size: 12px;
}

.preference-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.preference-chip {
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 252, 245, 0.8);
  color: var(--ink-soft);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preference-chip:hover {
  border-color: var(--cinnabar-soft);
  color: var(--cinnabar);
}

.preference-chip.is-active {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--paper-2);
}

.plan-form__submit {
  margin-top: 4px;
}

.plan-form__note {
  margin-top: 14px;
  text-align: center;
  font-size: 11.5px;
}

.plan-form__note a {
  color: var(--muted);
}

.plan-form__note a:hover {
  color: var(--cinnabar);
}

.plan-map-wrap {
  position: sticky;
  top: 100px;
}

.plan-map-wrap__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 0 4px;
  font-size: 11px;
}

@media (max-width: 1020px) {
  .plan-hero__grid {
    grid-template-columns: 1fr;
  }

  .plan-map-wrap {
    position: static;
    order: -1;
  }

  .plan-form {
    padding: 22px;
  }
}

@media (max-width: 600px) {
  .plan-hero {
    padding-top: 26px;
  }

  .plan-hero__copy h1 {
    font-size: 34px;
  }

  .plan-hero__grid {
    gap: 16px;
  }

  .plan-form {
    padding: 18px;
  }

  .selected-city__hint {
    display: none;
  }
}
</style>
