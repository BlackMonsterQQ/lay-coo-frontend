<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { planApi } from '@/api'
import { useUserStore } from '@/stores/user'
import type { PlanDetail, PlanTimelineItem, PlanTransportLeg } from '@/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const detail = ref<PlanDetail | null>(null)
const loading = ref(true)
const activeDay = ref(0)
const error = ref('')
let timer: number | undefined
let startedAt = 0

const planNo = computed(() => String(route.params.planNo || ''))
const plan = computed(() => detail.value?.plan ?? null)
const days = computed(() => plan.value?.days ?? [])
const active = computed(() => days.value[activeDay.value] ?? null)
const isGenerating = computed(() => detail.value?.status === 'PENDING' || detail.value?.status === 'RUNNING')
const isFailed = computed(() => detail.value?.status === 'FAILED')
const transport = computed(() => plan.value?.intercityTransport)
const driving = computed(() => plan.value?.driving)
const isSelfDrive = computed(() =>
  detail.value?.transportPreference === 'SELF_DRIVE' || transport.value?.outbound.mode === 'SELF_DRIVE'
)
const transportLegs = computed<Array<{ key: string; label: string; leg: PlanTransportLeg }>>(() => {
  if (!transport.value) {
    return []
  }
  return [
    { key: 'outbound', label: '去程', leg: transport.value.outbound },
    { key: 'return', label: '返程', leg: transport.value.return }
  ]
})
const transportPreferenceLabel = computed(() => {
  switch (detail.value?.transportPreference) {
    case 'TRAIN':
      return '高铁优先'
    case 'FLIGHT':
      return '航班优先'
    case 'BOTH':
      return '高铁 + 航班'
    case 'SELF_DRIVE':
      return '自驾'
    default:
      return '智能选择'
  }
})

const typeLabels: Record<string, string> = {
  SPOT: '景点',
  FOOD: '餐饮',
  EXPERIENCE: '体验',
  SHOP: '购物',
  REST: '休息',
  OTHER: '安排'
}

function typeLabel(type: string): string {
  return typeLabels[type] || '安排'
}

function modeLabel(mode: string): string {
  return { TRAIN: '高铁', FLIGHT: '航班', MIXED: '高铁 / 航班', SELF_DRIVE: '自驾' }[mode] || '交通'
}

function stopPolling() {
  if (timer) {
    window.clearTimeout(timer)
    timer = undefined
  }
}

async function load() {
  try {
    const data = await planApi.detail(planNo.value)
    detail.value = data
    error.value = ''
    if (data.status === 'PENDING' || data.status === 'RUNNING') {
      if (!startedAt) {
        startedAt = Date.now()
      }
      if (Date.now() - startedAt > 300000) {
        error.value = '生成时间较长，请稍后重试'
        return
      }
      stopPolling()
      timer = window.setTimeout(load, 1800)
    } else {
      stopPolling()
      if (data.status === 'SUCCESS') {
        activeDay.value = 0
      }
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '行程加载失败'
  } finally {
    loading.value = false
  }
}

async function retry() {
  try {
    detail.value = await planApi.retry(planNo.value)
    error.value = ''
    startedAt = Date.now()
    stopPolling()
    timer = window.setTimeout(load, 1200)
  } catch {
    // http 层已提示
  }
}

async function share() {
  const url = window.location.href
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('分享链接已复制')
  } catch {
    ElMessage.info(url)
  }
}

function regenerate() {
  router.push('/')
}

function sourceLink(item: PlanTimelineItem): string {
  return item.sourceContentId ? `/content/${item.sourceContentId}` : ''
}

onMounted(load)
onBeforeUnmount(stopPolling)
</script>

<template>
  <div class="plan-page">
    <div v-if="loading" class="container plan-loading">
      <el-skeleton :rows="8" animated />
    </div>

    <div v-else-if="!detail" class="container">
      <div class="plan-empty panel">
        <span class="plan-empty__mark serif">游</span>
        <h1>没有找到这份行程</h1>
        <p>{{ error || '链接可能已失效，或者行程已被删除。' }}</p>
        <button class="btn btn--primary" type="button" @click="router.push('/')">重新规划</button>
      </div>
    </div>

    <div v-else-if="isGenerating" class="container plan-generating">
      <span class="eyebrow">GENERATING · AI TRIP PLANNER</span>
      <h1>正在为你规划{{ detail.city }}的 {{ detail.dayCount }} 天行程</h1>
      <p class="plan-generating__lead">
        {{ detail.startDate }} 至 {{ detail.endDate }} · {{ detail.dayCount }} 天 {{ detail.nights }} 晚
      </p>

      <div class="progress-panel panel">
        <div class="progress-bar">
          <span :style="{ width: `${Math.max(8, detail.progress)}%` }" />
        </div>
        <div class="progress-steps">
          <div class="progress-step" :class="{ done: detail.progress >= 10 }">
            <span>01</span>
            <strong>理解你的需求</strong>
            <small>城市、日期、偏好</small>
          </div>
          <div class="progress-step" :class="{ done: detail.progress >= 35 }">
            <span>02</span>
            <strong>检索本地内容</strong>
            <small>匹配可用的景点与餐饮</small>
          </div>
          <div class="progress-step" :class="{ active: detail.progress >= 35 && detail.progress < 90 }">
            <span>03</span>
            <strong>生成按天行程</strong>
            <small>AI 正在排时间轴</small>
          </div>
          <div class="progress-step" :class="{ done: detail.progress >= 90 }">
            <span>04</span>
            <strong>校验并整理</strong>
            <small>检查时间、顺序与格式</small>
          </div>
        </div>
      </div>

      <p class="plan-generating__hint">多日行程通常需要 30–240 秒，请不要关闭页面。</p>
    </div>

    <div v-else-if="isFailed" class="container">
      <div class="plan-empty panel">
        <span class="plan-empty__mark serif">败</span>
        <h1>这次没有生成成功</h1>
        <p>{{ detail.error || 'AI 服务暂时不可用，请稍后重试。' }}</p>
        <div class="plan-empty__actions">
          <button class="btn btn--primary" type="button" @click="retry">重试一次</button>
          <button class="btn btn--ghost" type="button" @click="regenerate">重新填写</button>
        </div>
      </div>
    </div>

    <article v-else class="container plan-result">
      <nav class="breadcrumb">
        <RouterLink to="/">首页</RouterLink>
        <span>/</span>
        <span>AI 行程</span>
      </nav>

      <header class="plan-head">
        <span class="eyebrow">AI TRIP · {{ detail.cityCode.toUpperCase() }}</span>
        <h1>{{ plan?.title || detail.title }}</h1>
        <p class="plan-head__summary">{{ plan?.summary || detail.summary }}</p>
        <div class="plan-head__meta">
          <span>{{ detail.originCity || '出发地' }} → {{ detail.city }}</span>
          <span class="dot">·</span>
          <span>{{ detail.startDate }} → {{ detail.endDate }}</span>
          <span class="dot">·</span>
          <span>{{ detail.dayCount }} 天 {{ detail.nights }} 晚</span>
          <template v-if="detail.preferences?.length">
            <span class="dot">·</span>
            <span>{{ detail.preferences.join(' / ') }}</span>
          </template>
          <span v-if="detail.model" class="badge badge--soft">{{ detail.model }}</span>
        </div>
        <div class="plan-head__actions">
          <button class="btn btn--ghost btn--sm" type="button" @click="regenerate">重新规划</button>
          <button class="btn btn--primary btn--sm" type="button" @click="share">复制分享链接</button>
          <RouterLink v-if="userStore.isLoggedIn" to="/my-plans" class="btn btn--ghost btn--sm">我的行程</RouterLink>
        </div>
        <p v-if="userStore.isLoggedIn" class="plan-saved-note">已自动保存到「我的行程」</p>
      </header>

      <section v-if="transport" class="intercity panel">
        <div class="intercity__head">
          <div>
            <span class="eyebrow">INTERCITY TRANSFER</span>
            <h2>出发地 ↔ 目的地交通</h2>
          </div>
          <span class="badge badge--soft">{{ transportPreferenceLabel }}</span>
        </div>

        <div class="intercity__grid">
          <div v-for="item in transportLegs" :key="item.key" class="transport-leg">
            <div class="transport-leg__top">
              <span class="transport-leg__label">{{ item.label }}</span>
              <span>{{ item.leg.date }}</span>
            </div>
            <h3>{{ item.leg.title }}</h3>
            <p class="transport-leg__mode">{{ modeLabel(item.leg.mode) }} · {{ item.leg.duration }}</p>
            <div class="transport-leg__time">
              {{ item.leg.departureWindow }}
              <span>→</span>
              {{ item.leg.arrivalWindow }}
            </div>
            <div class="transport-options">
              <div v-for="option in item.leg.options" :key="`${item.key}-${option.type}-${option.label}`" class="transport-option">
                <strong>{{ option.type }}</strong>
                <span>{{ option.label }}</span>
                <small v-if="option.note">{{ option.note }}</small>
              </div>
            </div>
            <p v-if="item.leg.tip" class="transport-leg__tip">{{ item.leg.tip }}</p>
          </div>
        </div>

        <div class="intercity__foot">
          <span>{{ transport.note }}</span>
          <a v-if="!isSelfDrive" href="https://www.12306.cn/index/" target="_blank" rel="noopener noreferrer">查询实时车次 →</a>
        </div>
      </section>

      <section v-if="driving" class="driving panel">
        <div class="driving__head">
          <div>
            <span class="eyebrow">SELF DRIVE</span>
            <h2>自驾路线</h2>
          </div>
          <a href="https://www.amap.com/" target="_blank" rel="noopener noreferrer" class="badge badge--soft">打开高德地图 ↗</a>
        </div>

        <h3 class="driving__route">{{ driving.route }}</h3>
        <div class="driving__stats">
          <div><span>里程</span><strong>{{ driving.distance }}</strong></div>
          <div><span>驾驶时长</span><strong>{{ driving.duration }}</strong></div>
          <div><span>过路费</span><strong>{{ driving.tolls || '以实际路段为准' }}</strong></div>
          <div><span>油费</span><strong>{{ driving.fuel || '按车型与油价估算' }}</strong></div>
          <div class="driving__parking"><span>停车</span><strong>{{ driving.parking }}</strong></div>
        </div>

        <div class="driving__lists">
          <div>
            <h4>休息与中转</h4>
            <ul>
              <li v-for="item in driving.restStops" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div v-if="driving.tips?.length">
            <h4>自驾提示</h4>
            <ul>
              <li v-for="item in driving.tips" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
        <p class="driving__note">实际里程、路况、过路费、油费与停车请以导航和现场信息为准。</p>
      </section>

      <div class="day-tabs">
        <button
          v-for="(day, index) in days"
          :key="day.day"
          type="button"
          class="day-tab"
          :class="{ 'is-active': activeDay === index }"
          @click="activeDay = index"
        >
          <span>DAY {{ day.day }}</span>
          <small>{{ day.date }} · {{ day.theme }}</small>
        </button>
      </div>

      <div v-if="active" class="day-panel">
        <div class="day-panel__head">
          <div>
            <span class="eyebrow">DAY {{ active.day }} · {{ active.date }}</span>
            <h2>{{ active.theme }}</h2>
            <p v-if="active.summary">{{ active.summary }}</p>
          </div>
        </div>

        <div class="timeline">
          <div v-for="(item, index) in active.timeline" :key="`${item.time}-${index}`" class="timeline-item">
            <div class="timeline-time">{{ item.time }}</div>
            <div class="timeline-dot" />
            <div class="timeline-card">
              <div class="timeline-card__head">
                <span class="badge badge--soft">{{ typeLabel(item.type) }}</span>
                <span class="timeline-duration">{{ item.durationMinutes }} 分钟</span>
                <span v-if="item.area" class="timeline-area">{{ item.area }}</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
              <p v-if="item.tips" class="timeline-tips">Tips：{{ item.tips }}</p>
              <RouterLink v-if="sourceLink(item)" :to="sourceLink(item)" class="link-arrow">
                查看相关内容 →
              </RouterLink>
            </div>
          </div>
        </div>

        <div class="day-extras">
          <div v-if="active.food?.length" class="extra-card panel">
            <h3>这天吃什么</h3>
            <div v-for="food in active.food" :key="food.name" class="food-row">
              <div>
                <strong>{{ food.name }}</strong>
                <p>{{ food.reason }}</p>
              </div>
              <span>{{ food.priceRange }}</span>
            </div>
          </div>
          <div v-if="active.transport?.length" class="extra-card panel">
            <h3>怎么移动</h3>
            <div v-for="(routeItem, index) in active.transport" :key="index" class="transport-row">
              <strong>{{ routeItem.from }} → {{ routeItem.to }}</strong>
              <span>{{ routeItem.method }} · {{ routeItem.duration }}</span>
              <p v-if="routeItem.tip">{{ routeItem.tip }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="plan-extras">
        <div v-if="plan?.budget" class="extra-card panel">
          <h3>预算参考</h3>
          <p class="budget-level">{{ plan.budget.level }}</p>
          <div v-for="item in plan.budget.breakdown" :key="item.item" class="budget-row">
            <span>{{ item.item }}</span>
            <strong>{{ item.amount }}</strong>
          </div>
        </div>

        <div v-if="plan?.rainPlan" class="extra-card panel">
          <h3>天气备选</h3>
          <p>{{ plan.rainPlan }}</p>
        </div>

        <div v-if="plan?.packingTips?.length" class="extra-card panel">
          <h3>随身建议</h3>
          <div class="tip-chips">
            <span v-for="tip in plan.packingTips" :key="tip" class="tag">{{ tip }}</span>
          </div>
        </div>

        <div v-if="plan?.warnings?.length" class="extra-card panel">
          <h3>出行提醒</h3>
          <ul class="warning-list">
            <li v-for="warning in plan.warnings" :key="warning">{{ warning }}</li>
          </ul>
        </div>
      </div>

      <p class="plan-disclaimer">
        本行程由 AI 结合本地内容生成，开放时间、价格与预约政策请以官方信息为准。
      </p>
    </article>
  </div>
</template>

<style scoped>
.plan-page {
  padding-top: 30px;
}

.plan-loading {
  padding-top: 40px;
}

.plan-empty {
  margin: 40px auto;
  padding: 60px 24px;
  max-width: 560px;
  text-align: center;
}

.plan-empty__mark {
  display: inline-block;
  font-size: 56px;
  color: var(--line-strong);
  line-height: 1;
}

.plan-empty h1 {
  margin-top: 16px;
  font-size: 30px;
}

.plan-empty p {
  margin-top: 10px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.8;
}

.plan-empty__actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
}

.plan-generating {
  max-width: 860px;
  padding-top: 46px;
}

.plan-generating h1 {
  margin-top: 14px;
  font-size: clamp(30px, 4vw, 44px);
}

.plan-generating__lead {
  margin-top: 10px;
  color: var(--muted);
}

.progress-panel {
  margin-top: 30px;
  padding: 28px;
}

.progress-bar {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--paper-3);
}

.progress-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--cinnabar), var(--gold));
  transition: width 0.6s ease;
}

.progress-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 24px;
}

.progress-step {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  opacity: 0.55;
}

.progress-step.done,
.progress-step.active {
  opacity: 1;
  border-color: rgba(180, 69, 47, 0.25);
  background: rgba(180, 69, 47, 0.04);
}

.progress-step span {
  font-family: var(--serif);
  color: var(--cinnabar);
  font-size: 14px;
}

.progress-step strong {
  font-size: 12.5px;
}

.progress-step small {
  color: var(--muted);
  font-size: 10.5px;
  line-height: 1.5;
}

.plan-generating__hint {
  margin-top: 18px;
  color: var(--muted);
  font-size: 11.5px;
  text-align: center;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  color: var(--muted);
  font-size: 12px;
}

.breadcrumb a:hover {
  color: var(--cinnabar);
}

.plan-head {
  max-width: 980px;
}

.plan-head h1 {
  margin-top: 16px;
  font-size: clamp(32px, 4.4vw, 52px);
  line-height: 1.22;
}

.plan-head__summary {
  margin-top: 16px;
  max-width: 860px;
  color: var(--ink-soft);
  font-size: 15.5px;
  line-height: 1.9;
}

.plan-head__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  color: var(--muted);
  font-size: 12.5px;
}

.plan-head__actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.plan-saved-note {
  margin-top: 10px;
  color: var(--jade);
  font-size: 10px;
}

.intercity {
  margin-top: 28px;
  padding: 24px 26px;
  background: linear-gradient(135deg, rgba(47, 93, 85, 0.06), rgba(255, 252, 245, 0.78));
}

.intercity__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px dashed var(--line);
}

.intercity__head h2 {
  margin-top: 6px;
  font-size: 22px;
}

.intercity__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.transport-leg {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(255, 252, 245, 0.7);
}

.transport-leg__top {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 10.5px;
}

.transport-leg__label {
  color: var(--cinnabar);
  letter-spacing: 0.12em;
}

.transport-leg h3 {
  margin-top: 9px;
  font-size: 18px;
}

.transport-leg__mode {
  margin-top: 5px;
  color: var(--muted);
  font-size: 11px;
}

.transport-leg__time {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding: 9px 11px;
  border-radius: 8px;
  background: rgba(47, 93, 85, 0.07);
  color: var(--jade);
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 13px;
}

.transport-leg__time span {
  color: var(--gold);
}

.transport-options {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 10px;
}

.transport-option {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 2px 8px;
  padding-top: 7px;
  border-top: 1px dashed var(--line);
}

.transport-option strong {
  grid-row: span 2;
  color: var(--gold);
  font-size: 10.5px;
  font-weight: 500;
}

.transport-option span {
  color: var(--ink-soft);
  font-size: 11.5px;
}

.transport-option small {
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.5;
}

.transport-leg__tip {
  margin-top: 9px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.65;
}

.intercity__foot {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed var(--line);
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.6;
}

.intercity__foot a {
  flex-shrink: 0;
  color: var(--cinnabar);
  font-size: 10.5px;
}

.driving {
  margin-top: 16px;
  padding: 24px 26px;
  background: linear-gradient(135deg, rgba(176, 138, 79, 0.08), rgba(255, 252, 245, 0.8));
}

.driving__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px dashed var(--line);
}

.driving__head h2 {
  margin-top: 6px;
  font-size: 22px;
}

.driving__route {
  margin-top: 16px;
  font-size: 20px;
}

.driving__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.driving__stats > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(255, 252, 245, 0.6);
}

.driving__stats span {
  color: var(--muted);
  font-size: 9.5px;
}

.driving__stats strong {
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.5;
}

.driving__stats .driving__parking {
  grid-column: span 2;
}

.driving__lists {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 16px;
}

.driving__lists h4 {
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 600;
}

.driving__lists ul {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 7px;
  color: var(--muted);
  font-size: 10.5px;
  line-height: 1.65;
}

.driving__lists li::before {
  content: '·';
  margin-right: 5px;
  color: var(--gold);
}

.driving__note {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
  color: var(--muted);
  font-size: 9.5px;
}

.day-tabs {
  display: flex;
  gap: 10px;
  margin: 32px 0 22px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.day-tab {
  flex: 0 0 auto;
  min-width: 190px;
  padding: 12px 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(255, 252, 245, 0.7);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.day-tab span {
  display: block;
  font-family: var(--serif);
  font-size: 16px;
  color: var(--ink);
}

.day-tab small {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 10.5px;
}

.day-tab.is-active {
  border-color: var(--ink);
  background: var(--ink);
}

.day-tab.is-active span,
.day-tab.is-active small {
  color: var(--paper-2);
}

.day-panel {
  padding: 26px 28px;
  border: 1px solid var(--line);
  border-radius: 24px;
  background: rgba(255, 252, 245, 0.72);
}

.day-panel__head h2 {
  margin-top: 8px;
  font-size: 28px;
}

.day-panel__head p {
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.8;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 26px;
}

.timeline-item {
  display: grid;
  grid-template-columns: 62px 18px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.timeline-time {
  padding-top: 16px;
  font-family: var(--serif);
  font-size: 16px;
  color: var(--cinnabar);
  text-align: right;
}

.timeline-dot {
  position: relative;
  height: 100%;
  min-height: 110px;
}

.timeline-dot::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 22px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--cinnabar);
  box-shadow: 0 0 0 4px rgba(180, 69, 47, 0.12);
  z-index: 1;
}

.timeline-dot::after {
  content: '';
  position: absolute;
  left: 12px;
  top: 31px;
  bottom: -8px;
  width: 1px;
  background: var(--line);
}

.timeline-item:last-child .timeline-dot::after {
  display: none;
}

.timeline-card {
  margin-bottom: 16px;
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--paper-2);
}

.timeline-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 10.5px;
}

.timeline-duration {
  color: var(--gold);
}

.timeline-area {
  margin-left: auto;
}

.timeline-card h3 {
  margin-top: 8px;
  font-size: 20px;
}

.timeline-card p {
  margin-top: 6px;
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 1.8;
}

.timeline-tips {
  padding-left: 10px;
  border-left: 2px solid var(--gold);
  color: var(--muted) !important;
  font-size: 11.5px !important;
}

.timeline-card .link-arrow {
  margin-top: 10px;
}

.day-extras,
.plan-extras {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 22px;
}

.extra-card {
  padding: 20px 22px;
}

.extra-card h3 {
  margin-bottom: 12px;
  font-size: 18px;
}

.food-row,
.transport-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px dashed var(--line);
}

.food-row:first-of-type,
.transport-row:first-of-type {
  border-top: none;
}

.food-row strong,
.transport-row strong {
  font-size: 13px;
}

.food-row p,
.transport-row p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.7;
}

.food-row > span {
  flex-shrink: 0;
  color: var(--gold);
  font-size: 11px;
}

.transport-row {
  flex-direction: column;
  gap: 3px;
}

.transport-row span {
  color: var(--muted);
  font-size: 11px;
}

.budget-level {
  margin-bottom: 8px;
  color: var(--cinnabar);
  font-family: var(--serif);
  font-size: 20px;
}

.budget-row {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  border-top: 1px dashed var(--line);
  color: var(--ink-soft);
  font-size: 12px;
}

.extra-card > p {
  color: var(--ink-soft);
  font-size: 12.5px;
  line-height: 1.8;
}

.tip-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.warning-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: var(--ink-soft);
  font-size: 12.5px;
  line-height: 1.7;
}

.warning-list li::before {
  content: '·';
  margin-right: 6px;
  color: var(--cinnabar);
}

.plan-disclaimer {
  margin: 28px 0 10px;
  padding-top: 16px;
  border-top: 1px dashed var(--line);
  color: var(--muted);
  font-size: 10.5px;
  text-align: center;
}

@media (max-width: 900px) {
  .progress-steps {
    grid-template-columns: repeat(2, 1fr);
  }

  .day-extras,
  .plan-extras {
    grid-template-columns: 1fr;
  }

  .intercity__grid {
    grid-template-columns: 1fr;
  }

  .driving__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .driving__lists {
    grid-template-columns: 1fr;
  }

  .intercity__foot {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 620px) {
  .plan-page {
    padding-top: 16px;
  }

  .plan-head h1 {
    font-size: 32px;
  }

  .plan-head__actions {
    flex-wrap: wrap;
  }

  .day-panel {
    padding: 18px;
  }

  .timeline-item {
    grid-template-columns: 48px 16px minmax(0, 1fr);
    gap: 8px;
  }

  .timeline-time {
    font-size: 13px;
  }

  .timeline-card {
    padding: 14px;
  }

  .timeline-card h3 {
    font-size: 17px;
  }
}
</style>
