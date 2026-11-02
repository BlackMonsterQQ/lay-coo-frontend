<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { contentApi } from '@/api'
import type { Category, ContentCard, TagCount } from '@/types'
import ContentCardView from '@/components/ContentCard.vue'
import SearchIcon from '@/components/SearchIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import { categoryChar } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const categories = ref<Category[]>([])
const areas = ref<string[]>([])
const hotTags = ref<TagCount[]>([])
const list = ref<ContentCard[]>([])
const total = ref(0)
const loading = ref(true)

const type = ref('')
const categoryCode = ref('')
const area = ref('')
const tag = ref('')
const sort = ref('hot')
const keyword = ref('')
const searchInput = ref('')
const page = ref(1)
const size = 9

const typeOptions = [
  { label: '全部内容', value: '' },
  { label: '吃喝玩乐', value: 'LIFE' },
  { label: '人文历史', value: 'HUMANITY' }
]

const sortOptions = [
  { label: '热门优先', value: 'hot' },
  { label: '最新发布', value: 'new' }
]

const visibleCategories = computed(() =>
  type.value ? categories.value.filter((item) => item.type === type.value) : categories.value
)

const pageTitle = computed(() => {
  if (type.value === 'LIFE') {
    return '吃喝玩乐，就在附近'
  }
  if (type.value === 'HUMANITY') {
    return '人文历史，慢慢读一座城'
  }
  return '探索这座城'
})

const pageSub = computed(() => {
  if (type.value === 'LIFE') {
    return '餐饮、住宿、娱乐与购物，把日常过成值得记录的一天。'
  }
  if (type.value === 'HUMANITY') {
    return '景点、古迹、非遗、民俗与历史人物，按时间线重新认识杭州。'
  }
  return '按分类、区域与标签筛选，找到此刻最想去的那个地方。'
})

const currentCategory = computed(() => categories.value.find((item) => item.code === categoryCode.value))

function readQuery() {
  const q = route.query
  type.value = typeof q.type === 'string' ? q.type : ''
  categoryCode.value = typeof q.categoryCode === 'string' ? q.categoryCode : ''
  area.value = typeof q.area === 'string' ? q.area : ''
  tag.value = typeof q.tag === 'string' ? q.tag : ''
  sort.value = typeof q.sort === 'string' ? q.sort : 'hot'
  keyword.value = typeof q.keyword === 'string' ? q.keyword : ''
  searchInput.value = keyword.value
  page.value = Number(q.page) > 0 ? Number(q.page) : 1
}

function currentQuery(): Record<string, string> {
  const query: Record<string, string> = {}
  if (type.value) query.type = type.value
  if (categoryCode.value) query.categoryCode = categoryCode.value
  if (area.value) query.area = area.value
  if (tag.value) query.tag = tag.value
  if (sort.value && sort.value !== 'hot') query.sort = sort.value
  if (keyword.value) query.keyword = keyword.value
  return query
}

function apply(patch: Record<string, string>, keepPage = false) {
  const query = { ...currentQuery(), ...patch }
  if (keepPage && page.value > 1) {
    query.page = String(page.value)
  }
  Object.keys(query).forEach((key) => {
    if (!query[key]) {
      delete query[key]
    }
  })
  router.replace({ path: '/explore', query })
}

function setType(value: string) {
  type.value = value
  categoryCode.value = ''
  apply({ type: value, categoryCode: '' })
}

function setCategory(code: string) {
  categoryCode.value = code
  apply({ categoryCode: code })
}

function setSort(value: string) {
  sort.value = value
  apply({ sort: value })
}

function setArea(value: string | null | undefined) {
  area.value = value || ''
  apply({ area: value || '' })
}

function submitSearch() {
  keyword.value = searchInput.value.trim()
  apply({ keyword: keyword.value })
}

function clearFilter(key: 'area' | 'tag' | 'keyword' | 'categoryCode') {
  if (key === 'area') {
    area.value = ''
  } else if (key === 'tag') {
    tag.value = ''
  } else if (key === 'keyword') {
    keyword.value = ''
    searchInput.value = ''
  } else {
    categoryCode.value = ''
  }
  apply({ [key]: '' })
}

function resetAll() {
  type.value = ''
  categoryCode.value = ''
  area.value = ''
  tag.value = ''
  keyword.value = ''
  searchInput.value = ''
  sort.value = 'hot'
  router.replace({ path: '/explore' })
}

function changePage(next: number) {
  page.value = next
  apply({ page: String(next) }, true)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function load() {
  loading.value = true
  try {
    const result = await contentApi.list({
      type: type.value || undefined,
      categoryCode: categoryCode.value || undefined,
      area: area.value || undefined,
      tag: tag.value || undefined,
      keyword: keyword.value || undefined,
      sort: sort.value,
      page: page.value,
      size
    })
    list.value = result.list
    total.value = result.total
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function loadMeta() {
  const [cats, areaList, tags] = await Promise.allSettled([contentApi.categories(), contentApi.areas(), contentApi.hotTags(12)])
  if (cats.status === 'fulfilled') categories.value = cats.value
  if (areaList.status === 'fulfilled') areas.value = areaList.value
  if (tags.status === 'fulfilled') hotTags.value = tags.value
}

watch(
  () => route.query,
  () => {
    readQuery()
    load()
  }
)

onMounted(async () => {
  readQuery()
  await Promise.all([loadMeta(), load()])
})
</script>

<template>
  <div class="explore">
    <section class="container page-hero">
      <span class="eyebrow">EXPLORE · {{ type === 'HUMANITY' ? 'HUMANITY' : type === 'LIFE' ? 'LIFE' : 'ALL' }}</span>
      <h1>{{ pageTitle }}</h1>
      <p>{{ pageSub }}</p>
    </section>

    <section class="container">
      <div class="filter-panel panel">
        <div class="filter-row filter-row--type">
          <span class="filter-label">类型</span>
          <div class="segmented">
            <button
              v-for="option in typeOptions"
              :key="option.value"
              type="button"
              class="segmented__item"
              :class="{ 'is-active': type === option.value }"
              @click="setType(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="filter-row">
          <span class="filter-label">分类</span>
          <div class="chip-row">
            <button
              type="button"
              class="chip"
              :class="{ 'chip--active': !categoryCode }"
              @click="setCategory('')"
            >
              全部分类
            </button>
            <button
              v-for="cat in visibleCategories"
              :key="cat.code"
              type="button"
              class="chip"
              :class="{ 'chip--active': categoryCode === cat.code }"
              @click="setCategory(cat.code)"
            >
              <span class="chip-char">{{ categoryChar(cat.code) }}</span>
              {{ cat.name }}
            </button>
          </div>
        </div>

        <div class="filter-row filter-row--controls">
          <span class="filter-label">筛选</span>
          <div class="control-group">
            <el-select
              :model-value="area"
              placeholder="全部区域"
              clearable
              style="width: 150px"
              @update:model-value="setArea"
            >
              <el-option v-for="item in areas" :key="item" :label="item" :value="item" />
            </el-select>

            <el-select :model-value="sort" style="width: 140px" @update:model-value="setSort">
              <el-option v-for="item in sortOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>

            <form class="inline-search" @submit.prevent="submitSearch">
              <input v-model="searchInput" class="inline-search__input" type="search" placeholder="搜索标题、标签、正文…" />
              <button class="inline-search__btn" type="submit" aria-label="搜索"><SearchIcon :size="15" /></button>
            </form>

            <button class="btn btn--ghost btn--sm" type="button" @click="resetAll">重置</button>
          </div>
        </div>

        <div class="filter-row filter-row--tags">
          <span class="filter-label">标签</span>
          <div class="chip-row">
            <button
              v-for="hotTag in hotTags"
              :key="hotTag.id"
              type="button"
              class="tag tag--btn"
              :class="{ 'tag--active': tag === hotTag.name }"
              @click="tag === hotTag.name ? clearFilter('tag') : apply({ tag: hotTag.name })"
            >
              #{{ hotTag.name }}
            </button>
          </div>
        </div>
      </div>

      <div class="result-bar">
        <div class="result-bar__left">
          <span class="result-count">共 <strong>{{ total }}</strong> 条内容</span>
          <button v-if="currentCategory" class="filter-chip" type="button" @click="clearFilter('categoryCode')">
            {{ categoryChar(currentCategory.code) }} {{ currentCategory.name }} <span>×</span>
          </button>
          <button v-if="area" class="filter-chip" type="button" @click="clearFilter('area')">
            {{ area }} <span>×</span>
          </button>
          <button v-if="tag" class="filter-chip" type="button" @click="clearFilter('tag')">
            #{{ tag }} <span>×</span>
          </button>
          <button v-if="keyword" class="filter-chip" type="button" @click="clearFilter('keyword')">
            “{{ keyword }}” <span>×</span>
          </button>
        </div>
        <span class="result-bar__hint">按{{ sort === 'new' ? '发布时间' : '热度' }}排序</span>
      </div>

      <div v-if="loading" class="explore-grid">
        <el-skeleton v-for="n in 6" :key="n" animated>
          <template #template>
            <div class="skeleton-card">
              <el-skeleton-item variant="image" class="skeleton-card__img" />
              <el-skeleton-item variant="h3" style="width: 55%; margin-top: 16px" />
              <el-skeleton-item variant="text" style="width: 100%; margin-top: 10px" />
            </div>
          </template>
        </el-skeleton>
      </div>

      <div v-else-if="list.length" class="explore-grid">
        <ContentCardView v-for="item in list" :key="item.id" :item="item" />
      </div>

      <EmptyState v-else title="没有找到匹配的内容" text="试试减少筛选条件，或换一个关键词。" mark="寻">
        <template #action>
          <button class="btn btn--ghost btn--sm" type="button" @click="resetAll">清空筛选</button>
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
    </section>
  </div>
</template>

<style scoped>
.filter-panel {
  padding: 22px 26px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-row {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.filter-row + .filter-row {
  padding-top: 16px;
  border-top: 1px dashed var(--line);
}

.filter-label {
  width: 42px;
  flex-shrink: 0;
  padding-top: 7px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.08em;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.segmented {
  display: inline-flex;
  padding: 4px;
  background: var(--paper-3);
  border-radius: 999px;
}

.segmented__item {
  padding: 7px 18px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-soft);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.segmented__item.is-active {
  background: var(--paper-2);
  color: var(--ink);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.control-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.inline-search {
  display: flex;
  align-items: center;
  width: 250px;
  padding: 2px 4px 2px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-2);
}

.inline-search:focus-within {
  border-color: var(--cinnabar-soft);
}

.inline-search__input {
  flex: 1;
  min-width: 0;
  padding: 8px 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  color: var(--ink);
}

.inline-search__input:focus {
  outline: none;
}

.inline-search__btn {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: var(--ink);
  color: var(--paper-2);
  cursor: pointer;
}

.chip-char {
  font-family: var(--serif);
  color: var(--cinnabar);
}

.chip--active .chip-char {
  color: var(--paper-2);
}

.filter-row--tags .tag--btn {
  background: transparent;
  border: 1px solid var(--line);
  color: var(--ink-soft);
  cursor: pointer;
}

.filter-row--tags .tag--btn:hover,
.filter-row--tags .tag--active {
  border-color: var(--jade);
  background: rgba(47, 93, 85, 0.1);
  color: var(--jade);
}

.result-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 26px 0 18px;
}

.result-bar__left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.result-count {
  margin-right: 8px;
  color: var(--muted);
  font-size: 13px;
}

.result-count strong {
  font-family: var(--serif);
  font-size: 20px;
  color: var(--ink);
}

.result-bar__hint {
  color: var(--muted);
  font-size: 12px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 252, 245, 0.8);
  color: var(--ink-soft);
  font-size: 12px;
  cursor: pointer;
}

.filter-chip span {
  color: var(--muted);
}

.filter-chip:hover {
  border-color: var(--cinnabar-soft);
  color: var(--cinnabar);
}

.explore-grid {
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
  .explore-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .filter-row {
    flex-direction: column;
    gap: 10px;
  }

  .filter-label {
    padding-top: 0;
  }

  .filter-panel {
    padding: 18px;
  }

  .inline-search {
    width: 100%;
  }

  .control-group {
    width: 100%;
  }

  .result-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .explore-grid {
    grid-template-columns: 1fr;
  }
}
</style>
