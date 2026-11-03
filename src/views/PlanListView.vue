<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { planApi } from '@/api'
import type { PlanSummary } from '@/types'

const router = useRouter()

const plans = ref<PlanSummary[]>([])
const total = ref(0)
const page = ref(1)
const size = 9
const loading = ref(true)

const statusLabels: Record<string, string> = {
  SUCCESS: '已完成',
  RUNNING: '生成中',
  PENDING: '排队中',
  FAILED: '生成失败'
}

const transportLabels: Record<string, string> = {
  AUTO: '智能交通',
  TRAIN: '高铁',
  FLIGHT: '航班',
  BOTH: '高铁 + 航班',
  SELF_DRIVE: '自驾'
}

function statusLabel(status: string): string {
  return statusLabels[status] || status
}

function transportLabel(value?: string): string {
  return transportLabels[value || 'AUTO'] || '智能交通'
}

async function load() {
  loading.value = true
  try {
    const result = await planApi.myPlans(page.value, size)
    plans.value = result.list
    total.value = result.total
  } catch {
    // http 层已提示
  } finally {
    loading.value = false
  }
}

function changePage(value: number) {
  page.value = value
  load()
}

function openPlan(plan: PlanSummary) {
  router.push(`/plan/${plan.planNo}`)
}

onMounted(load)
</script>

<template>
  <div class="my-plans">
    <div class="container">
      <header class="my-plans__head">
        <div>
          <span class="eyebrow">MY ITINERARIES · 已保存攻略</span>
          <h1>我的行程</h1>
          <p>生成过的 AI 攻略会自动保存在这里，随时可以回来查看。</p>
        </div>
        <RouterLink to="/" class="btn btn--primary btn--sm">再规划一段旅程 →</RouterLink>
      </header>

      <div v-if="loading" class="plans-grid">
        <el-skeleton v-for="n in 3" :key="n" animated>
          <template #template>
            <div class="plan-card plan-card--skeleton">
              <el-skeleton-item variant="text" style="width: 30%" />
              <el-skeleton-item variant="h3" style="width: 70%; margin-top: 16px" />
              <el-skeleton-item variant="text" style="width: 100%; margin-top: 12px" />
              <el-skeleton-item variant="text" style="width: 80%; margin-top: 8px" />
            </div>
          </template>
        </el-skeleton>
      </div>

      <div v-else-if="plans.length" class="plans-grid">
        <article
          v-for="plan in plans"
          :key="plan.planNo"
          class="plan-card"
          tabindex="0"
          @click="openPlan(plan)"
          @keydown.enter="openPlan(plan)"
        >
          <div class="plan-card__top">
            <span class="plan-card__route">{{ plan.originCity || '出发地' }} → {{ plan.city }}</span>
            <span class="plan-card__status" :class="`is-${plan.status.toLowerCase()}`">
              {{ statusLabel(plan.status) }}
            </span>
          </div>

          <h2>{{ plan.title || `${plan.city} ${plan.dayCount} 日行程` }}</h2>
          <p class="plan-card__summary">{{ plan.summary || '这份行程正在生成中，点击查看进度。' }}</p>

          <div class="plan-card__meta">
            <span>{{ plan.startDate }} → {{ plan.endDate }}</span>
            <span>{{ plan.dayCount }} 天 {{ plan.nights }} 晚</span>
            <span>{{ transportLabel(plan.transportPreference) }}</span>
          </div>

          <div class="plan-card__foot">
            <span class="plan-card__no">{{ plan.planNo }}</span>
            <span class="plan-card__open">查看攻略 →</span>
          </div>
        </article>
      </div>

      <div v-else class="plans-empty panel">
        <span class="plans-empty__mark serif">游</span>
        <h2>还没有保存的行程</h2>
        <p>去首页选一座城市，生成你的第一份 AI 攻略。</p>
        <RouterLink to="/" class="btn btn--primary">去选择城市</RouterLink>
      </div>

      <div v-if="total > size" class="plans-pager">
        <el-pagination
          layout="prev, pager, next"
          :current-page="page"
          :page-size="size"
          :total="total"
          background
          @current-change="changePage"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-plans {
  padding: 38px 0 60px;
}

.my-plans__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.my-plans__head h1 {
  margin-top: 12px;
  font-size: clamp(34px, 4vw, 48px);
}

.my-plans__head p {
  margin-top: 10px;
  color: var(--muted);
  font-size: 13px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.plan-card {
  display: flex;
  flex-direction: column;
  min-height: 280px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 252, 245, 0.92), rgba(243, 236, 223, 0.74));
  cursor: pointer;
  transition: transform 0.24s ease, border-color 0.24s ease, box-shadow 0.24s ease;
}

.plan-card:hover,
.plan-card:focus-visible {
  transform: translateY(-4px);
  border-color: var(--line-strong);
  box-shadow: var(--shadow-md);
  outline: none;
}

.plan-card--skeleton {
  cursor: default;
}

.plan-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.plan-card__route {
  color: var(--muted);
  font-size: 10.5px;
  letter-spacing: 0.04em;
}

.plan-card__status {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 9px;
}

.plan-card__status.is-success {
  background: rgba(47, 93, 85, 0.09);
  color: var(--jade);
}

.plan-card__status.is-running,
.plan-card__status.is-pending {
  background: rgba(176, 138, 79, 0.1);
  color: var(--gold);
}

.plan-card__status.is-failed {
  background: rgba(180, 69, 47, 0.09);
  color: var(--cinnabar);
}

.plan-card h2 {
  margin-top: 16px;
  font-size: 23px;
  line-height: 1.4;
}

.plan-card__summary {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 9px;
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.75;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.plan-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: 14px;
  color: var(--ink-soft);
  font-size: 10.5px;
}

.plan-card__meta span + span::before {
  content: '·';
  margin-right: 8px;
  color: var(--line-strong);
}

.plan-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px dashed var(--line);
}

.plan-card__no {
  color: var(--muted);
  font-family: 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 9px;
  letter-spacing: 0.08em;
}

.plan-card__open {
  color: var(--cinnabar);
  font-size: 11px;
}

.plans-empty {
  max-width: 520px;
  margin: 40px auto;
  padding: 56px 24px;
  text-align: center;
}

.plans-empty__mark {
  display: inline-block;
  color: var(--line-strong);
  font-size: 54px;
}

.plans-empty h2 {
  margin-top: 12px;
  font-size: 26px;
}

.plans-empty p {
  margin: 8px 0 20px;
  color: var(--muted);
  font-size: 12px;
}

.plans-pager {
  display: flex;
  justify-content: center;
  margin-top: 28px;
}

@media (max-width: 980px) {
  .plans-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .my-plans {
    padding-top: 24px;
  }

  .my-plans__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .plans-grid {
    grid-template-columns: 1fr;
  }

  .plan-card {
    min-height: 240px;
  }
}
</style>
