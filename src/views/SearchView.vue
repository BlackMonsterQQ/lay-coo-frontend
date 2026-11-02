<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { contentApi } from '@/api'
import type { ContentCard, TagCount } from '@/types'
import ContentCardView from '@/components/ContentCard.vue'
import SearchIcon from '@/components/SearchIcon.vue'
import EmptyState from '@/components/EmptyState.vue'

const route = useRoute()
const router = useRouter()

const keyword = ref('')
const input = ref('')
const hotKeywords = ref<string[]>([])
const hotTags = ref<TagCount[]>([])
const trending = ref<ContentCard[]>([])
const results = ref<ContentCard[]>([])
const total = ref(0)
const page = ref(1)
const size = 9
const loading = ref(false)
const metaLoading = ref(true)

function readKeyword() {
  keyword.value = typeof route.query.keyword === 'string' ? route.query.keyword : ''
  input.value = keyword.value
  page.value = Number(route.query.page) > 0 ? Number(route.query.page) : 1
}

function submit() {
  const value = input.value.trim()
  if (!value) {
    return
  }
  router.push({ path: '/search', query: { keyword: value } })
}

function searchTag(name: string) {
  router.push({ path: '/explore', query: { tag: name } })
}

async function loadMeta() {
  metaLoading.value = true
  try {
    const [keywords, tags, hot] = await Promise.allSettled([
      contentApi.hotKeywords(),
      contentApi.hotTags(12),
      contentApi.list({ sort: 'hot', size: 6 })
    ])
    if (keywords.status === 'fulfilled') hotKeywords.value = keywords.value
    if (tags.status === 'fulfilled') hotTags.value = tags.value
    if (hot.status === 'fulfilled') trending.value = hot.value.list
  } finally {
    metaLoading.value = false
  }
}

async function search() {
  if (!keyword.value) {
    results.value = []
    total.value = 0
    return
  }
  loading.value = true
  try {
    const result = await contentApi.search({ keyword: keyword.value, page: page.value, size, sort: 'hot' })
    results.value = result.list
    total.value = result.total
  } catch {
    results.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function changePage(next: number) {
  router.push({ path: '/search', query: { keyword: keyword.value, page: String(next) } })
  window.scrollTo({ top: 220, behavior: 'smooth' })
}

watch(
  () => route.query,
  () => {
    readKeyword()
    search()
  }
)

onMounted(() => {
  readKeyword()
  loadMeta()
  search()
})
</script>

<template>
  <div class="search-page">
    <section class="container search-hero">
      <span class="eyebrow">SEARCH · 全站检索</span>
      <h1>想找点什么？</h1>
      <p>搜一处地方、一道菜、一段历史，或者一种此刻的心情。</p>

      <form class="search-box" @submit.prevent="submit">
        <span class="search-box__icon" aria-hidden="true"><SearchIcon :size="19" /></span>
        <input v-model="input" class="search-box__input" type="search" placeholder="输入关键词，如「西湖」「龙井茶」「非遗」" aria-label="搜索关键词" />
        <button class="btn btn--primary" type="submit">搜索</button>
      </form>

      <div class="search-hot">
        <span class="muted">热门搜索</span>
        <button v-for="word in hotKeywords" :key="word" type="button" class="chip chip--sm" @click="router.push({ path: '/search', query: { keyword: word } })">
          {{ word }}
        </button>
      </div>
    </section>

    <section class="container section section--tight">
      <template v-if="!keyword">
        <div class="search-default">
          <div class="panel search-tags">
            <span class="eyebrow">TAGS · 标签</span>
            <h2 class="search-tags__title">顺着标签找</h2>
            <p class="search-tags__text">标签来自内容本身与 AI 抽取，是比分类更细的兴趣线索。</p>
            <div class="search-tags__list">
              <button v-for="tag in hotTags" :key="tag.id" type="button" class="tag tag--btn" @click="searchTag(tag.name)">
                #{{ tag.name }}
                <small>{{ tag.count }}</small>
              </button>
            </div>
          </div>

          <div class="search-trending">
            <div class="section-head">
              <div>
                <span class="eyebrow">TRENDING</span>
                <h2 class="section-title">大家最近在看</h2>
              </div>
              <RouterLink to="/explore" class="link-arrow">全部 →</RouterLink>
            </div>
            <div class="trending-grid">
              <ContentCardView v-for="item in trending" :key="item.id" :item="item" compact />
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="result-head">
          <div>
            <span class="eyebrow">RESULTS</span>
            <h2 class="result-title">
              “{{ keyword }}” 的搜索结果
              <span class="result-total">{{ total }} 条</span>
            </h2>
          </div>
          <RouterLink to="/search" class="link-arrow">清空关键词 ×</RouterLink>
        </div>

        <div v-if="loading" class="result-grid">
          <el-skeleton v-for="n in 3" :key="n" animated>
            <template #template>
              <div class="skeleton-card">
                <el-skeleton-item variant="image" class="skeleton-card__img" />
                <el-skeleton-item variant="h3" style="width: 60%; margin-top: 16px" />
              </div>
            </template>
          </el-skeleton>
        </div>

        <div v-else-if="results.length" class="result-grid">
          <ContentCardView v-for="item in results" :key="item.id" :item="item" />
        </div>

        <EmptyState v-else title="没有搜到相关内容" text="试试更短的关键词，或者换个说法。" mark="寻">
          <template #action>
            <RouterLink to="/explore" class="btn btn--primary btn--sm">去探索页看看</RouterLink>
          </template>
        </EmptyState>

        <el-pagination
          v-if="total > size"
          background
          layout="prev, pager, next"
          :total="Number(total)"
          :page-size="size"
          :current-page="page"
          @current-change="changePage"
        />
      </template>
    </section>
  </div>
</template>

<style scoped>
.search-hero {
  padding: 52px 0 24px;
  max-width: 860px;
}

.search-hero h1 {
  margin-top: 14px;
  font-size: clamp(34px, 4.6vw, 50px);
}

.search-hero > p {
  margin-top: 12px;
  color: var(--muted);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 28px;
  padding: 8px 8px 8px 20px;
  background: var(--paper-2);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-sm);
}

.search-box:focus-within {
  border-color: var(--cinnabar-soft);
  box-shadow: 0 14px 34px rgba(180, 69, 47, 0.12);
}

.search-box__icon {
  color: var(--muted);
  font-size: 21px;
}

.search-box__input {
  flex: 1;
  min-width: 0;
  padding: 10px 0;
  border: none;
  background: transparent;
  color: var(--ink);
  font-family: inherit;
  font-size: 15px;
}

.search-box__input:focus {
  outline: none;
}

.search-hot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  font-size: 12px;
}

.chip--sm {
  padding: 4px 11px;
  font-size: 12px;
}

.search-default {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 32px;
  align-items: start;
}

.search-tags {
  position: sticky;
  top: 100px;
  padding: 26px;
}

.search-tags__title {
  margin-top: 10px;
  font-size: 24px;
}

.search-tags__text {
  margin-top: 8px;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.8;
}

.search-tags__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.search-tags__list .tag--btn {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
  padding: 5px 11px;
  font-size: 12px;
}

.search-tags__list .tag--btn small {
  margin-left: 4px;
  color: var(--muted);
  font-size: 10px;
}

.search-tags__list .tag--btn:hover {
  border-color: var(--jade);
  background: rgba(47, 93, 85, 0.08);
  color: var(--jade);
}

.trending-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.result-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.result-title {
  margin-top: 10px;
  font-size: clamp(24px, 3vw, 32px);
}

.result-total {
  margin-left: 10px;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 400;
  color: var(--muted);
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}

.skeleton-card {
  padding: 10px 10px 20px;
  background: rgba(255, 252, 245, 0.7);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

.skeleton-card__img {
  width: 100%;
  height: 170px;
  border-radius: 16px;
}

@media (max-width: 1000px) {
  .search-default {
    grid-template-columns: 1fr;
  }

  .search-tags {
    position: static;
  }

  .result-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .search-box {
    flex-wrap: wrap;
    border-radius: 20px;
    padding: 12px;
  }

  .search-box__input {
    flex-basis: calc(100% - 34px);
  }

  .search-box .btn {
    width: 100%;
  }

  .trending-grid,
  .result-grid {
    grid-template-columns: 1fr;
  }

  .result-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
