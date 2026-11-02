<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { EChartsOption } from 'echarts'
import { contentApi, recommendApi } from '@/api'
import { useUserStore } from '@/stores/user'
import type { Category, ContentCard, RecommendItem, TagCount } from '@/types'
import ContentCardView from '@/components/ContentCard.vue'
import CoverArt from '@/components/CoverArt.vue'
import BaseChart from '@/components/BaseChart.vue'
import SearchIcon from '@/components/SearchIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatCount, formatRating, categoryChar } from '@/utils/format'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)
const categories = ref<Category[]>([])
const recommendations = ref<RecommendItem[]>([])
const humanity = ref<ContentCard[]>([])
const hot = ref<RecommendItem[]>([])
const tags = ref<TagCount[]>([])
const hotKeywords = ref<string[]>([])
const keyword = ref('')
const totalContents = ref(0)
const refreshLoading = ref(false)

const hero = computed(() => recommendations.value[0])
const hotTop = computed(() => hot.value.slice(0, 5))

const hotOption = computed<EChartsOption>(() => {
  const items = hot.value.slice(0, 6)
  const labels = items.map((item) => (item.content.title.length > 10 ? `${item.content.title.slice(0, 10)}…` : item.content.title))
  const values = items.map((item) => item.content.viewCount || 0)
  return {
    grid: { left: 0, right: 16, top: 6, bottom: 0, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#fffcf5',
      borderColor: '#e2d9c8',
      textStyle: { color: '#1d211d', fontSize: 12 },
      formatter: (params: unknown) => {
        const list = params as { name: string; value: number }[]
        const item = list[0]
        return item ? `${item.name}<br/>${formatCount(item.value)} 次浏览` : ''
      }
    },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(226,217,200,0.7)' } },
      axisLabel: { color: '#82877b', fontSize: 10 }
    },
    yAxis: {
      type: 'category',
      data: labels.reverse(),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#454b43', fontSize: 11 }
    },
    series: [
      {
        type: 'bar',
        data: values.reverse(),
        barWidth: 9,
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
          color: '#c07a5e'
        }
      }
    ]
  }
})

async function loadRecommendations() {
  refreshLoading.value = true
  try {
    const result = await recommendApi.home(8)
    recommendations.value = result
  } finally {
    refreshLoading.value = false
  }
}

async function loadAll() {
  loading.value = true
  try {
    const [cats, recs, hum, hotList, tagList, keywords, firstPage] = await Promise.allSettled([
      contentApi.categories(),
      recommendApi.home(8),
      contentApi.list({ type: 'HUMANITY', size: 6, sort: 'hot' }),
      recommendApi.hot(8),
      contentApi.hotTags(10),
      contentApi.hotKeywords(),
      contentApi.list({ page: 1, size: 1 })
    ])
    if (cats.status === 'fulfilled') categories.value = cats.value
    if (recs.status === 'fulfilled') recommendations.value = recs.value
    if (hum.status === 'fulfilled') humanity.value = hum.value.list
    if (hotList.status === 'fulfilled') hot.value = hotList.value
    if (tagList.status === 'fulfilled') tags.value = tagList.value
    if (keywords.status === 'fulfilled') hotKeywords.value = keywords.value.slice(0, 5)
    if (firstPage.status === 'fulfilled') totalContents.value = firstPage.value.total
  } finally {
    loading.value = false
  }
}

function search() {
  const value = keyword.value.trim()
  router.push({ path: '/search', query: value ? { keyword: value } : {} })
}

function goCategory(code: string) {
  router.push({ path: '/explore', query: { categoryCode: code } })
}

function goTag(tag: string) {
  router.push({ path: '/explore', query: { tag } })
}

onMounted(loadAll)
</script>

<template>
  <div class="home">
    <section class="hero">
      <div class="hero__bg serif" aria-hidden="true">杭</div>
      <div class="container hero__inner">
        <div class="hero__copy">
          <span class="eyebrow">HANGZHOU · 本地文旅</span>
          <h1 class="hero__title">
            在杭州，<br />
            过一种<span class="hero__accent">有文化</span>的日常
          </h1>
          <p class="hero__lead">
            从一碗片儿川到一条苏堤，从龙井茶山到良渚古城。岚途用 AI 读懂这座城，再把吃喝玩乐与人文历史，按你的兴趣慢慢铺开。
          </p>

          <form class="hero__search" @submit.prevent="search">
            <span class="hero__search-icon" aria-hidden="true"><SearchIcon :size="18" /></span>
            <input v-model="keyword" class="hero__search-input" type="search" placeholder="试试搜「西湖」「龙井」「非遗」…" aria-label="搜索本地文旅内容" />
            <button class="btn btn--primary" type="submit">开始探索</button>
          </form>

          <div class="hero__keywords">
            <span class="hero__keywords-label">大家都在搜</span>
            <button
              v-for="word in hotKeywords"
              :key="word"
              class="chip chip--sm"
              type="button"
              @click="router.push({ path: '/search', query: { keyword: word } })"
            >
              {{ word }}
            </button>
          </div>

          <div class="hero__stats">
            <div class="stat">
              <strong>{{ categories.length || 9 }}</strong>
              <span>内容分类</span>
            </div>
            <div class="stat">
              <strong>{{ totalContents || 18 }}</strong>
              <span>精选内容</span>
            </div>
            <div class="stat">
              <strong>3</strong>
              <span>人工审核环节</span>
            </div>
          </div>
        </div>

        <div v-if="hero" class="hero__feature">
          <RouterLink :to="`/content/${hero.content.id}`" class="hero-card">
            <CoverArt
              :code="hero.content.categoryCode"
              :icon="hero.content.categoryIcon"
              :desc="hero.content.coverDesc"
              variant="wide"
            />
            <div class="hero-card__info">
              <span class="badge badge--ai">今日为你推荐</span>
              <h2 class="hero-card__title">{{ hero.content.title }}</h2>
              <p class="hero-card__reason">{{ hero.reason }}</p>
              <div class="hero-card__meta">
                <span>★ {{ formatRating(hero.content.rating) }}</span>
                <span>·</span>
                <span>{{ hero.content.area }}</span>
                <span class="hero-card__go">去看看 ↗</span>
              </div>
            </div>
          </RouterLink>
          <div class="hero__seal serif" aria-hidden="true">
            <span>AI</span>
            <small>content</small>
          </div>
        </div>
      </div>
    </section>

    <section class="container category-strip">
      <div class="category-strip__head">
        <span class="eyebrow">按兴趣逛</span>
        <RouterLink to="/explore" class="link-arrow">全部内容 →</RouterLink>
      </div>
      <div class="category-strip__list">
        <button
          v-for="cat in categories"
          :key="cat.code"
          type="button"
          class="category-pill"
          @click="goCategory(cat.code)"
        >
          <span class="category-pill__char">{{ categoryChar(cat.code) }}</span>
          <span class="category-pill__body">
            <span class="category-pill__name">{{ cat.name }}</span>
            <span class="category-pill__desc">{{ cat.description }}</span>
          </span>
        </button>
        <RouterLink to="/explore" class="category-pill category-pill--all">
          <span class="category-pill__char">全</span>
          <span class="category-pill__body">
            <span class="category-pill__name">全部内容</span>
            <span class="category-pill__desc">按热度与时间浏览</span>
          </span>
          <span class="category-pill__arrow">→</span>
        </RouterLink>
      </div>
    </section>

    <section class="container section">
      <div class="section-head">
        <div>
          <span class="eyebrow">FOR YOU</span>
          <h2 class="section-title">为你挑的这几处</h2>
          <p class="section-sub">
            结合你的收藏、点赞与浏览偏好排序{{ userStore.isLoggedIn ? '，' : '；登录后可获得更懂你的推荐。' }}
          </p>
        </div>
        <button class="btn btn--ghost btn--sm" type="button" :disabled="refreshLoading" @click="loadRecommendations">
          {{ refreshLoading ? '正在换一批…' : '换一批 ↻' }}
        </button>
      </div>

      <div v-if="loading" class="recommend-grid">
        <el-skeleton v-for="n in 4" :key="n" animated>
          <template #template>
            <div class="skeleton-card">
              <el-skeleton-item variant="image" class="skeleton-card__img" />
              <el-skeleton-item variant="h3" style="width: 60%; margin-top: 16px" />
              <el-skeleton-item variant="text" style="width: 100%; margin-top: 10px" />
            </div>
          </template>
        </el-skeleton>
      </div>
      <div v-else-if="recommendations.length" class="recommend-grid">
        <ContentCardView
          v-for="item in recommendations.slice(0, 8)"
          :key="item.content.id"
          :item="item.content"
          :reason="item.reason"
        />
      </div>
      <EmptyState v-else title="推荐正在准备中" text="可以先到探索页看看全部本地内容。" mark="荐">
        <template #action>
          <RouterLink to="/explore" class="btn btn--primary btn--sm">去探索</RouterLink>
        </template>
      </EmptyState>
    </section>

    <section class="container section section--humanity">
      <div class="section-head">
        <div>
          <span class="eyebrow">HUMANITY · 人文历史</span>
          <h2 class="section-title">这座城，藏着多少故事</h2>
          <p class="section-sub">景点、古迹、非遗、民俗与历史人物，构成杭州的另一条时间线。</p>
        </div>
        <RouterLink to="/explore?type=HUMANITY" class="btn btn--ghost btn--sm">进入人文专题</RouterLink>
      </div>

      <div class="humanity-layout">
        <div class="humanity-list">
          <ContentCardView v-for="item in humanity.slice(0, 6)" :key="item.id" :item="item" compact />
        </div>

        <aside class="hot-panel panel">
          <div class="hot-panel__head">
            <div>
              <span class="eyebrow">TRENDING</span>
              <h3>本周热度榜</h3>
            </div>
            <span class="hot-panel__note">按浏览 · 收藏 · 评分</span>
          </div>

          <BaseChart v-if="hot.length" :option="hotOption" height="188px" />

          <ol class="hot-list">
            <li v-for="(item, index) in hotTop" :key="item.content.id">
              <RouterLink :to="`/content/${item.content.id}`" class="hot-item">
                <span class="hot-item__rank" :class="{ 'is-top': index < 3 }">{{ String(index + 1).padStart(2, '0') }}</span>
                <span class="hot-item__text">
                  <strong>{{ item.content.title }}</strong>
                  <small>{{ item.content.categoryName }} · {{ formatCount(item.content.viewCount) }} 浏览</small>
                </span>
                <span class="hot-item__arrow">↗</span>
              </RouterLink>
            </li>
          </ol>

          <div class="hot-tags">
            <span class="hot-tags__label">热门标签</span>
            <button v-for="tag in tags.slice(0, 8)" :key="tag.id" type="button" class="tag tag--btn" @click="goTag(tag.name)">
              #{{ tag.name }}
            </button>
          </div>
        </aside>
      </div>
    </section>

    <section class="container section">
      <div class="ai-banner">
        <div class="ai-banner__copy">
          <span class="eyebrow ai-banner__eyebrow">AI CONTENT · 内容生产</span>
          <h2 class="ai-banner__title serif">每一段介绍，<br />都先经过 AI 起草与人工复核。</h2>
          <p class="ai-banner__text">
            岚途的内容由 AI 服务按结构化模板生成：标题、摘要、正文、亮点与实用信息逐字段校验，再经敏感词与规则审核、运营人工复核后发布。看到「AI 生成」标记时，说明它已经走过完整的内容流程。
          </p>
          <div class="ai-banner__actions">
            <RouterLink v-if="userStore.isAdmin" to="/admin" class="btn btn--cinnabar">进入运营后台</RouterLink>
            <RouterLink v-else to="/explore" class="btn btn--cinnabar">去看内容</RouterLink>
            <RouterLink to="/explore?sort=new" class="btn ai-banner__ghost">最新发布 →</RouterLink>
          </div>
        </div>
        <ol class="ai-steps">
          <li>
            <span class="ai-steps__no">01</span>
            <strong>结构化生成</strong>
            <p>大模型按 JSON Schema 输出，字段缺失自动重试。</p>
          </li>
          <li>
            <span class="ai-steps__no">02</span>
            <strong>规则审核</strong>
            <p>必填字段、长度、敏感词与占位符校验。</p>
          </li>
          <li>
            <span class="ai-steps__no">03</span>
            <strong>人工复核</strong>
            <p>运营在后台预览、通过或驳回，发布后进入推荐。</p>
          </li>
        </ol>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ---------------------------------------------------------------- Hero */

.hero {
  position: relative;
  overflow: hidden;
  padding: 46px 0 30px;
}

.hero__bg {
  position: absolute;
  right: -3%;
  top: -12%;
  font-size: clamp(20rem, 40vw, 36rem);
  line-height: 1;
  color: rgba(180, 69, 47, 0.045);
  pointer-events: none;
  user-select: none;
}

.hero__inner {
  position: relative;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 56px;
  align-items: center;
}

.hero__copy {
  max-width: 600px;
}

.hero__title {
  margin-top: 18px;
  font-size: clamp(38px, 4.4vw, 58px);
  line-height: 1.22;
  letter-spacing: 0.01em;
}

.hero__accent {
  position: relative;
  color: var(--cinnabar);
  white-space: nowrap;
}

.hero__accent::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 6px;
  height: 8px;
  background: rgba(180, 69, 47, 0.14);
  border-radius: 4px;
}

.hero__lead {
  margin-top: 22px;
  max-width: 480px;
  color: var(--ink-soft);
  font-size: 15px;
  line-height: 1.9;
}

.hero__search {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 30px;
  padding: 8px 8px 8px 18px;
  background: rgba(255, 252, 245, 0.9);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.hero__search:focus-within {
  border-color: var(--cinnabar-soft);
  box-shadow: 0 12px 30px rgba(180, 69, 47, 0.12);
}

.hero__search-icon {
  color: var(--muted);
  font-size: 19px;
  line-height: 1;
}

.hero__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--ink);
  font-family: inherit;
  font-size: 14px;
}

.hero__search-input:focus {
  outline: none;
}

.hero__search-input::placeholder {
  color: #a9ad9f;
}

.hero__keywords {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.hero__keywords-label {
  margin-right: 2px;
  color: var(--muted);
  font-size: 12px;
}

.chip--sm {
  padding: 4px 11px;
  font-size: 12px;
}

.hero__stats {
  display: flex;
  gap: 40px;
  margin-top: 38px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat strong {
  font-family: var(--serif);
  font-size: 30px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1;
}

.stat span {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.06em;
}

/* Hero feature card */

.hero__feature {
  position: relative;
}

.hero-card {
  position: relative;
  display: block;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  transition: transform 0.35s ease;
}

.hero-card:hover {
  transform: translateY(-4px) rotate(-0.4deg);
}

.hero-card :deep(.cover) {
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.hero-card__info {
  padding: 20px 24px 22px;
  background: var(--paper-2);
  border: 1px solid var(--line);
  border-top: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.hero-card__title {
  margin-top: 10px;
  font-size: 24px;
  color: var(--ink);
}

.hero-card__reason {
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
}

.hero-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  color: var(--muted);
  font-size: 12px;
}

.hero-card__go {
  margin-left: auto;
  color: var(--cinnabar);
  font-weight: 500;
}

.hero__seal {
  position: absolute;
  right: -22px;
  top: -22px;
  width: 84px;
  height: 84px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--ink);
  color: #f6f1e7;
  box-shadow: var(--shadow-md);
  transform: rotate(8deg);
}

.hero__seal span {
  font-size: 24px;
  line-height: 1;
  letter-spacing: 0.05em;
}

.hero__seal small {
  margin-top: 4px;
  font-family: var(--sans);
  font-size: 8px;
  letter-spacing: 0.24em;
  opacity: 0.6;
}

/* ---------------------------------------------------------------- 分类 */

.category-strip {
  margin-top: 26px;
}

.category-strip__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.category-strip__list {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.category-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255, 252, 245, 0.66);
  text-align: left;
  cursor: pointer;
  transition: all 0.25s ease;
}

.category-pill:hover {
  border-color: var(--cinnabar-soft);
  background: var(--paper-2);
  transform: translateY(-3px);
  box-shadow: var(--shadow-sm);
}

.category-pill__char {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: var(--paper-3);
  color: var(--cinnabar);
  font-family: var(--serif);
  font-size: 18px;
}

.category-pill__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.category-pill__name {
  font-family: var(--serif);
  font-size: 15px;
  color: var(--ink);
}

.category-pill__desc {
  font-size: 10.5px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.category-pill--all {
  justify-content: flex-start;
  background: linear-gradient(135deg, rgba(180, 69, 47, 0.1), rgba(255, 252, 245, 0.7));
  border-color: rgba(180, 69, 47, 0.22);
}

.category-pill--all .category-pill__char {
  background: var(--cinnabar);
  color: #fff6ec;
}

.category-pill--all:hover .category-pill__arrow {
  transform: translateX(4px);
}

.category-pill__arrow {
  margin-left: auto;
  color: var(--cinnabar);
  font-size: 16px;
  transition: transform 0.2s ease;
}

/* ---------------------------------------------------------------- 推荐 */

.recommend-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.skeleton-card {
  padding: 10px 10px 20px;
  background: rgba(255, 252, 245, 0.7);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

.skeleton-card__img {
  width: 100%;
  height: 150px;
  border-radius: 16px;
}

/* ---------------------------------------------------------------- 人文 */

.section--humanity {
  position: relative;
}

.humanity-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 28px;
  align-items: start;
}

.humanity-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.hot-panel {
  position: sticky;
  top: 100px;
  padding: 24px;
}

.hot-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.hot-panel__head h3 {
  margin-top: 6px;
  font-size: 22px;
}

.hot-panel__note {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
  text-align: right;
}

.hot-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
}

.hot-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 10px;
  transition: background 0.2s ease;
}

.hot-item:hover {
  background: rgba(180, 69, 47, 0.05);
}

.hot-item__rank {
  width: 26px;
  font-family: var(--serif);
  font-size: 16px;
  color: var(--line-strong);
  font-style: italic;
}

.hot-item__rank.is-top {
  color: var(--cinnabar);
}

.hot-item__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.hot-item__text strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}

.hot-item__text small {
  color: var(--muted);
  font-size: 10.5px;
}

.hot-item__arrow {
  color: var(--line-strong);
  font-size: 12px;
}

.hot-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  margin-top: 14px;
  padding-top: 16px;
  border-top: 1px dashed var(--line);
}

.hot-tags__label {
  width: 100%;
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 0.1em;
}

.tag--btn {
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag--btn:hover {
  border-color: rgba(47, 93, 85, 0.25);
  background: rgba(47, 93, 85, 0.12);
}

/* ---------------------------------------------------------------- AI 说明 */

.ai-banner {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 40px;
  padding: 46px;
  border-radius: 32px;
  background: radial-gradient(600px 300px at 90% -10%, rgba(180, 69, 47, 0.34), transparent 60%),
    linear-gradient(150deg, #242a21, #171a13);
  color: rgba(246, 241, 231, 0.82);
  box-shadow: var(--shadow-md);
}

.ai-banner__eyebrow {
  color: #d99a82;
}

.ai-banner__title {
  margin-top: 14px;
  font-size: clamp(26px, 3vw, 38px);
  line-height: 1.42;
  color: #f8f4ec;
}

.ai-banner__text {
  margin-top: 16px;
  max-width: 560px;
  font-size: 13.5px;
  line-height: 1.9;
  color: rgba(246, 241, 231, 0.62);
}

.ai-banner__actions {
  display: flex;
  gap: 12px;
  margin-top: 26px;
}

.ai-banner__ghost {
  color: rgba(246, 241, 231, 0.8);
  border: 1px solid rgba(246, 241, 231, 0.22);
}

.ai-banner__ghost:hover {
  color: #fff6ec;
  border-color: rgba(246, 241, 231, 0.5);
}

.ai-steps {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-self: center;
}

.ai-steps li {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 2px 12px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(246, 241, 231, 0.1);
}

.ai-steps li:last-child {
  border-bottom: none;
}

.ai-steps__no {
  grid-row: span 2;
  font-family: var(--serif);
  font-size: 20px;
  color: rgba(217, 154, 130, 0.85);
  font-style: italic;
}

.ai-steps strong {
  font-size: 14px;
  color: #f6f1e7;
}

.ai-steps p {
  font-size: 12px;
  color: rgba(246, 241, 231, 0.5);
  line-height: 1.7;
}

@media (max-width: 1080px) {
  .recommend-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .humanity-layout {
    grid-template-columns: 1fr;
  }

  .hot-panel {
    position: static;
  }

  .hot-panel :deep(.base-chart) {
    max-width: 560px;
  }
}

@media (max-width: 900px) {
  .hero__inner {
    grid-template-columns: 1fr;
    gap: 36px;
  }

  .hero__copy {
    max-width: none;
  }

  .hero__bg {
    top: -6%;
    opacity: 0.7;
  }

  .ai-banner {
    grid-template-columns: 1fr;
    padding: 32px;
    gap: 20px;
  }

  .recommend-grid,
  .humanity-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .hero {
    padding-top: 26px;
  }

  .hero__title {
    font-size: 32px;
  }

  .hero__lead {
    font-size: 14px;
  }

  .hero__search {
    flex-wrap: wrap;
    border-radius: 20px;
    padding: 12px;
  }

  .hero__search-input {
    flex-basis: calc(100% - 34px);
    height: 32px;
  }

  .hero__search .btn {
    width: 100%;
  }

  .hero__stats {
    gap: 26px;
  }

  .hero__seal {
    width: 66px;
    height: 66px;
    right: -8px;
    top: -14px;
  }

  .recommend-grid,
  .humanity-list {
    grid-template-columns: 1fr;
  }

  .category-strip__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ai-banner {
    padding: 24px;
    border-radius: 24px;
  }

  .ai-banner__actions {
    flex-direction: column;
  }

  .ai-banner__actions .btn {
    width: 100%;
  }
}
</style>
