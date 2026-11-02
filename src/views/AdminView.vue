<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { EChartsOption } from 'echarts'
import { adminApi, aiApi, contentApi } from '@/api'
import type { AdminStats, AiStats, AiTask, Category, ContentCard, ContentDetail } from '@/types'
import BaseChart from '@/components/BaseChart.vue'
import CoverArt from '@/components/CoverArt.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatCount, formatDate, formatRating, statusText, taskStatusText, categoryChar } from '@/utils/format'

const route = useRoute()
const activeTab = ref(['pending', 'ai', 'library'].includes(String(route.query.tab)) ? String(route.query.tab) : 'pending')
const stats = ref<AdminStats | null>(null)
const aiStats = ref<AiStats | null>(null)
const categories = ref<Category[]>([])

const pending = ref<ContentCard[]>([])
const pendingTotal = ref(0)
const pendingPage = ref(1)
const pendingLoading = ref(false)

const library = ref<ContentCard[]>([])
const libraryTotal = ref(0)
const libraryPage = ref(1)
const libraryStatus = ref('')
const libraryLoading = ref(false)

const tasks = ref<AiTask[]>([])
const taskTotal = ref(0)
const taskPage = ref(1)
const taskLoading = ref(false)

const previewVisible = ref(false)
const previewDetail = ref<ContentDetail | null>(null)
const previewLoading = ref(false)

const taskVisible = ref(false)
const currentTask = ref<AiTask | null>(null)

const creating = ref(false)
const taskForm = reactive({
  categoryCode: '',
  area: '西湖区',
  count: 2,
  keywords: ''
})

let pollTimer: number | undefined

const pieOption = computed<EChartsOption>(() => {
  const data = (stats.value?.byCategory || [])
    .filter((item) => item.count > 0)
    .map((item) => ({ name: item.name, value: item.count }))
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fffcf5',
      borderColor: '#e2d9c8',
      textStyle: { color: '#1d211d', fontSize: 12 }
    },
    legend: {
      orient: 'vertical',
      right: 0,
      top: 'center',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: '#454b43', fontSize: 11 }
    },
    series: [
      {
        type: 'pie',
        radius: ['54%', '78%'],
        center: ['32%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#fffcf5', borderWidth: 3, borderRadius: 5 },
        label: { show: false },
        emphasis: { scale: true, scaleSize: 4 },
        data,
        color: ['#b4452f', '#2f5d55', '#b08a4f', '#7d8c5a', '#a07f9f', '#c76a4d', '#7186a6', '#9b7a54', '#c1636f']
      }
    ]
  }
})

const hasActiveTask = computed(() =>
  tasks.value.some((task) => task.status === 'PENDING' || task.status === 'RUNNING')
)

function statusTagType(status?: string): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'PUBLISHED' || status === 'SUCCESS') {
    return 'success'
  }
  if (status === 'PENDING' || status === 'RUNNING') {
    return 'warning'
  }
  if (status === 'REJECTED' || status === 'FAILED') {
    return 'danger'
  }
  return 'info'
}

function taskSummary(task: AiTask): string {
  if (task.result) {
    try {
      const data = JSON.parse(task.result) as { created?: number }
      return `入库 ${data.created ?? 0} 条`
    } catch {
      return '已完成'
    }
  }
  if (task.error) {
    return task.error.length > 36 ? `${task.error.slice(0, 36)}…` : task.error
  }
  return '—'
}

async function loadStats() {
  try {
    stats.value = await adminApi.stats()
  } catch {
    // 保持上一次数据
  }
}

async function loadAiStats() {
  try {
    aiStats.value = await aiApi.stats()
  } catch {
    // ignore
  }
}

async function loadCategories() {
  try {
    categories.value = await contentApi.categories()
    if (!taskForm.categoryCode && categories.value.length) {
      taskForm.categoryCode = categories.value[0].code
    }
  } catch {
    // ignore
  }
}

async function loadPending(page = 1) {
  pendingLoading.value = true
  try {
    const result = await adminApi.contents({ status: 'PENDING', page, size: 8 })
    pending.value = result.list
    pendingTotal.value = result.total
    pendingPage.value = page
  } catch {
    pending.value = []
  } finally {
    pendingLoading.value = false
  }
}

async function loadLibrary(page = libraryPage.value) {
  libraryLoading.value = true
  try {
    const result = await adminApi.contents({
      status: libraryStatus.value || undefined,
      page,
      size: 10
    })
    library.value = result.list
    libraryTotal.value = result.total
    libraryPage.value = page
  } catch {
    library.value = []
  } finally {
    libraryLoading.value = false
  }
}

async function loadTasks(page = taskPage.value, silent = false) {
  if (!silent) {
    taskLoading.value = true
  }
  try {
    const result = await aiApi.tasks({ page, size: 8 })
    tasks.value = result.list
    taskTotal.value = result.total
    taskPage.value = page
  } catch {
    if (!silent) {
      tasks.value = []
    }
  } finally {
    taskLoading.value = false
  }
}

async function refreshAll() {
  await Promise.all([
    loadStats(),
    loadAiStats(),
    loadPending(pendingPage.value),
    loadLibrary(libraryPage.value),
    loadTasks(taskPage.value)
  ])
}

async function openPreview(item: ContentCard) {
  previewVisible.value = true
  previewDetail.value = null
  previewLoading.value = true
  try {
    previewDetail.value = await adminApi.contentDetail(item.id)
  } catch {
    previewVisible.value = false
  } finally {
    previewLoading.value = false
  }
}

async function refreshAfterAudit() {
  await Promise.all([loadStats(), loadPending(pendingPage.value), loadAiStats()])
  if (activeTab.value === 'library') {
    await loadLibrary(libraryPage.value)
  }
}

async function approve(item: ContentCard | ContentDetail) {
  try {
    await ElMessageBox.confirm(`确认通过《${item.title}》并发布？`, '审核通过', {
      confirmButtonText: '通过并发布',
      cancelButtonText: '再看看',
      type: 'success'
    })
  } catch {
    return
  }
  await adminApi.audit({ id: item.id, action: 'APPROVE', remark: '审核通过' })
  ElMessage.success('已发布，将进入推荐与搜索')
  previewVisible.value = false
  await refreshAfterAudit()
}

async function reject(item: ContentCard | ContentDetail) {
  let remark = ''
  try {
    const result = await ElMessageBox.prompt('请填写驳回原因，便于后续修订。', '驳回内容', {
      confirmButtonText: '确认驳回',
      cancelButtonText: '取消',
      inputPlaceholder: '如：信息不准确 / 缺少实用信息 / 描述与分类不符',
      inputValue: '内容信息需要补充核实',
      inputValidator: (value: string) => (value && value.trim().length > 0 ? true : '请填写驳回原因')
    })
    remark = result.value
  } catch {
    return
  }
  await adminApi.audit({ id: item.id, action: 'REJECT', remark: remark || '内容不符合发布规范' })
  ElMessage.success('已驳回')
  previewVisible.value = false
  await refreshAfterAudit()
}

async function removeContent(item: ContentCard) {
  try {
    await ElMessageBox.confirm(`确认删除《${item.title}》？删除后无法恢复。`, '删除内容', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  await adminApi.remove(item.id)
  ElMessage.success('已删除')
  await refreshAfterAudit()
}

async function createTask() {
  if (!taskForm.categoryCode) {
    ElMessage.warning('请选择内容分类')
    return
  }
  creating.value = true
  try {
    const task = await aiApi.createTask({
      categoryCode: taskForm.categoryCode,
      area: taskForm.area.trim() || undefined,
      count: taskForm.count,
      keywords: taskForm.keywords.trim() || undefined
    })
    ElMessage.success(`生成任务 #${task.id} 已创建，正在排队执行`)
    await Promise.all([loadTasks(1), loadAiStats()])
    // 内置生成器通常很快完成，稍后刷新待审队列，让新内容立刻可见
    window.setTimeout(() => {
      loadPending(1)
      loadStats()
    }, 1200)
  } finally {
    creating.value = false
  }
}

async function retryTask(task: AiTask) {
  await aiApi.retry(task.id)
  ElMessage.success('已重新提交生成任务')
  await Promise.all([loadTasks(taskPage.value), loadAiStats()])
}

function viewTask(task: AiTask) {
  currentTask.value = task
  taskVisible.value = true
}

function startPolling() {
  if (pollTimer) {
    return
  }
  pollTimer = window.setInterval(async () => {
    if (activeTab.value !== 'ai' || !hasActiveTask.value) {
      return
    }
    await loadTasks(taskPage.value, true)
    await Promise.all([loadAiStats(), loadStats(), loadPending(pendingPage.value)])
  }, 4000)
}

watch(activeTab, (value) => {
  if (value === 'library' && library.value.length === 0) {
    loadLibrary(1)
  }
  if (value === 'ai' && tasks.value.length === 0) {
    loadTasks(1)
  }
})

watch(libraryStatus, () => {
  loadLibrary(1)
})

onMounted(async () => {
  await Promise.all([loadStats(), loadAiStats(), loadCategories(), loadPending(1), loadTasks(1), loadLibrary(1)])
  startPolling()
})

onBeforeUnmount(() => {
  if (pollTimer) {
    window.clearInterval(pollTimer)
    pollTimer = undefined
  }
})
</script>

<template>
  <div class="admin container">
    <header class="admin-head">
      <div>
        <span class="eyebrow">ADMIN · 运营后台</span>
        <h1>内容与 AI 供给</h1>
        <p>审核 AI 生成内容、发起生成任务、管理内容库。所有对外内容都从这里走出去。</p>
      </div>
      <div class="admin-head__actions">
        <span v-if="aiStats" class="model-pill">
          <span class="model-dot" :class="{ 'is-live': aiStats.llmEnabled }" />
          {{ aiStats.llmEnabled ? aiStats.model : '内置生成器（未配置 Key）' }}
        </span>
        <button class="btn btn--ghost btn--sm" type="button" @click="refreshAll">刷新数据</button>
      </div>
    </header>

    <section class="admin-stats">
      <div class="admin-stat">
        <span>内容总数</span>
        <strong>{{ stats?.total ?? '—' }}</strong>
        <small>含待审与已发布</small>
      </div>
      <div class="admin-stat admin-stat--accent">
        <span>待审核</span>
        <strong>{{ stats?.pending ?? '—' }}</strong>
        <small>需要人工复核</small>
      </div>
      <div class="admin-stat">
        <span>已发布</span>
        <strong>{{ stats?.published ?? '—' }}</strong>
        <small>对外可见</small>
      </div>
      <div class="admin-stat">
        <span>累计浏览</span>
        <strong>{{ formatCount(Number(stats?.totalViews ?? 0)) }}</strong>
        <small>内容详情页</small>
      </div>
      <div class="admin-stat">
        <span>AI 任务</span>
        <strong>{{ aiStats?.total ?? 0 }}</strong>
        <small>进行中 {{ (aiStats?.pending ?? 0) + (aiStats?.running ?? 0) }} 个</small>
      </div>
    </section>

    <section class="admin-charts">
      <div class="panel chart-card">
        <div class="chart-card__head">
          <div>
            <span class="eyebrow">DISTRIBUTION</span>
            <h3>内容分类分布</h3>
          </div>
          <span class="muted">共 {{ stats?.total ?? 0 }} 条</span>
        </div>
        <BaseChart v-if="stats && stats.byCategory.some((item) => item.count > 0)" :option="pieOption" height="230px" />
        <div v-else class="chart-empty">暂无内容分布数据</div>
      </div>

      <div class="panel ai-card">
        <div class="chart-card__head">
          <div>
            <span class="eyebrow">AI PIPELINE</span>
            <h3>内容供给状态</h3>
          </div>
          <span class="badge" :class="aiStats?.llmEnabled ? 'badge--ai' : 'badge--soft'">
            {{ aiStats?.llmEnabled ? '大模型在线' : '离线模板模式' }}
          </span>
        </div>
        <ul class="ai-card__list">
          <li><span>生成渠道</span><strong>{{ aiStats?.provider || 'deepseek' }}</strong></li>
          <li><span>当前模型</span><strong>{{ aiStats?.model || 'mock-tourism-v1' }}</strong></li>
          <li><span>已消耗 Token</span><strong>{{ formatCount(Number(aiStats?.costTokens ?? 0)) }}</strong></li>
          <li><span>成功 / 失败</span><strong>{{ aiStats?.success ?? 0 }} / {{ aiStats?.failed ?? 0 }}</strong></li>
        </ul>
        <p class="ai-card__hint">
          未配置 <code>AI_API_KEY</code> 时，系统使用内置文旅模板生成结构化内容，完整走通「生成 → 审核 → 入库」流程；配置后自动切换为真实大模型。
        </p>
      </div>
    </section>

    <el-tabs v-model="activeTab" class="admin-tabs">
      <el-tab-pane name="pending">
        <template #label>待审核 <span class="tab-count">{{ pendingTotal }}</span></template>

        <div class="tab-toolbar">
          <p class="tab-toolbar__text">AI 生成或运营提交的内容会先进入待审核队列，通过后才会出现在前台与推荐中。</p>
          <button class="btn btn--ghost btn--sm" type="button" :disabled="pendingLoading" @click="loadPending(pendingPage)">
            {{ pendingLoading ? '加载中…' : '刷新' }}
          </button>
        </div>

        <el-table v-if="pending.length" v-loading="pendingLoading" :data="pending" class="admin-table">
          <el-table-column label="内容" min-width="330">
            <template #default="{ row }">
              <div class="content-cell" @click="openPreview(row)">
                <CoverArt :code="row.categoryCode" :icon="row.categoryIcon" variant="mini" :label="false" />
                <div class="content-cell__text">
                  <strong>{{ row.title }}</strong>
                  <span>{{ row.area }} · {{ row.categoryName }}</span>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="来源" width="105">
            <template #default="{ row }">
              <span class="badge" :class="row.source === 'AI' ? 'badge--ai' : 'badge--soft'">
                {{ row.source === 'AI' ? 'AI 生成' : '运营手记' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="标签" min-width="160">
            <template #default="{ row }">
              <span v-for="tag in row.tags?.slice(0, 2)" :key="tag" class="table-tag">#{{ tag }}</span>
            </template>
          </el-table-column>
          <el-table-column label="提交时间" width="130">
            <template #default="{ row }">
              <span class="table-muted">{{ formatDate(row.createTime) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <el-button size="small" text @click="openPreview(row)">预览</el-button>
              <el-button size="small" type="primary" plain @click="approve(row)">通过</el-button>
              <el-button size="small" type="danger" text @click="reject(row)">驳回</el-button>
            </template>
          </el-table-column>
        </el-table>

        <EmptyState v-else title="待审核队列已清空" text="新的 AI 生成内容会自动出现在这里。" mark="审" />

        <el-pagination
          v-if="pendingTotal > 8"
          background
          layout="prev, pager, next"
          :total="Number(pendingTotal)"
          :page-size="8"
          :current-page="pendingPage"
          @current-change="loadPending"
        />
      </el-tab-pane>

      <el-tab-pane name="ai">
        <template #label>AI 内容生成 <span class="tab-count">{{ (aiStats?.pending ?? 0) + (aiStats?.running ?? 0) }}</span></template>

        <div class="ai-layout">
          <div class="panel ai-form">
            <span class="eyebrow">GENERATE</span>
            <h3>发起一次内容生成</h3>
            <p class="ai-form__lead">指定分类、区域与关键词，AI 服务会生成结构化内容并提交审核。</p>

            <div class="ai-form__fields">
              <div>
                <label class="field-label">内容分类</label>
                <el-select v-model="taskForm.categoryCode" style="width: 100%" placeholder="选择分类">
                  <el-option v-for="cat in categories" :key="cat.code" :label="`${categoryChar(cat.code)} ${cat.name}`" :value="cat.code" />
                </el-select>
              </div>
              <div>
                <label class="field-label">区域</label>
                <el-input v-model="taskForm.area" placeholder="如：西湖区 / 拱墅区" />
              </div>
              <div>
                <label class="field-label">生成数量</label>
                <el-select v-model="taskForm.count" style="width: 100%">
                  <el-option v-for="n in 5" :key="n" :label="`${n} 条`" :value="n" />
                </el-select>
              </div>
              <div>
                <label class="field-label">关键词（选填）</label>
                <el-input v-model="taskForm.keywords" placeholder="如：茶文化、亲子、夜游" maxlength="60" />
              </div>
            </div>

            <button class="btn btn--primary btn--block" type="button" :disabled="creating" @click="createTask">
              {{ creating ? '提交中…' : '开始生成' }}
            </button>
            <p class="ai-form__note">生成的内容默认进入待审核，不会直接对外发布。</p>
          </div>

          <div class="ai-tasks">
            <div class="tab-toolbar">
              <div>
                <span class="eyebrow">TASKS</span>
                <h3 class="ai-tasks__title">生成任务</h3>
              </div>
              <button class="btn btn--ghost btn--sm" type="button" :disabled="taskLoading" @click="loadTasks(taskPage)">
                {{ taskLoading ? '加载中…' : '刷新任务' }}
              </button>
            </div>

            <el-table v-if="tasks.length" v-loading="taskLoading" :data="tasks" class="admin-table">
              <el-table-column label="任务" width="70">
                <template #default="{ row }">
                  <span class="task-id">#{{ row.id }}</span>
                </template>
              </el-table-column>
              <el-table-column label="分类 / 区域" min-width="150">
                <template #default="{ row }">
                  <div class="task-cell">
                    <strong>{{ row.categoryCode }}</strong>
                    <span>{{ row.area || '不限区域' }} · {{ row.targetCount }} 条</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="95">
                <template #default="{ row }">
                  <el-tag :type="statusTagType(row.status)" size="small" effect="light" round disable-transitions>
                    {{ taskStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="模型" min-width="140">
                <template #default="{ row }">
                  <span class="table-muted">{{ row.model }}</span>
                </template>
              </el-table-column>
              <el-table-column label="结果" min-width="130">
                <template #default="{ row }">
                  <span class="table-muted">{{ taskSummary(row) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="创建时间" width="130">
                <template #default="{ row }">
                  <span class="table-muted">{{ formatDate(row.createTime) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="135" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" text @click="viewTask(row)">详情</el-button>
                  <el-button
                    v-if="row.status === 'FAILED'"
                    size="small"
                    type="primary"
                    text
                    @click="retryTask(row)"
                  >
                    重试
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <EmptyState v-else title="还没有生成任务" text="在左侧选择分类与区域，发起第一次 AI 内容生成。" mark="AI" />

            <el-pagination
              v-if="taskTotal > 8"
              background
              layout="prev, pager, next"
              :total="Number(taskTotal)"
              :page-size="8"
              :current-page="taskPage"
              @current-change="loadTasks"
            />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane name="library">
        <template #label>内容库 <span class="tab-count">{{ libraryTotal }}</span></template>

        <div class="tab-toolbar">
          <div class="library-filter">
            <span class="field-label">状态</span>
            <el-select v-model="libraryStatus" placeholder="全部状态" clearable style="width: 150px">
              <el-option label="全部状态" value="" />
              <el-option label="已发布" value="PUBLISHED" />
              <el-option label="待审核" value="PENDING" />
              <el-option label="已驳回" value="REJECTED" />
            </el-select>
          </div>
          <span class="muted">共 {{ libraryTotal }} 条</span>
        </div>

        <el-table v-if="library.length" v-loading="libraryLoading" :data="library" class="admin-table">
          <el-table-column label="内容" min-width="320">
            <template #default="{ row }">
              <div class="content-cell" @click="openPreview(row)">
                <CoverArt :code="row.categoryCode" :icon="row.categoryIcon" variant="mini" :label="false" />
                <div class="content-cell__text">
                  <strong>{{ row.title }}</strong>
                  <span>{{ row.categoryName }} · {{ row.area }}</span>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="95">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small" round disable-transitions>{{ statusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="来源" width="95">
            <template #default="{ row }">
              <span class="badge" :class="row.source === 'AI' ? 'badge--ai' : 'badge--soft'">
                {{ row.source === 'AI' ? 'AI' : '手记' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="浏览" width="80">
            <template #default="{ row }">{{ formatCount(row.viewCount) }}</template>
          </el-table-column>
          <el-table-column label="评分" width="80">
            <template #default="{ row }">{{ formatRating(row.rating) }}</template>
          </el-table-column>
          <el-table-column label="发布时间" width="120">
            <template #default="{ row }">
              <span class="table-muted">{{ formatDate(row.publishTime) || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button size="small" text @click="openPreview(row)">查看</el-button>
              <el-button v-if="row.status !== 'PUBLISHED'" size="small" type="primary" text @click="approve(row)">
                发布
              </el-button>
              <el-button size="small" type="danger" text @click="removeContent(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <EmptyState v-else title="内容库为空" text="切换筛选条件，或先去发起一次 AI 生成。" mark="库" />

        <el-pagination
          v-if="libraryTotal > 10"
          background
          layout="prev, pager, next"
          :total="Number(libraryTotal)"
          :page-size="10"
          :current-page="libraryPage"
          @current-change="loadLibrary"
        />
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="previewVisible" title="内容预览与审核" width="min(820px, 92vw)" destroy-on-close>
      <div v-if="previewLoading" class="preview-loading">
        <el-skeleton :rows="6" animated />
      </div>
      <div v-else-if="previewDetail" class="preview">
        <CoverArt
          :code="previewDetail.categoryCode"
          :icon="previewDetail.categoryIcon"
          :desc="previewDetail.coverDesc"
          variant="wide"
        />
        <div class="preview__meta">
          <span class="badge badge--soft">{{ previewDetail.categoryName }}</span>
          <span class="badge" :class="previewDetail.source === 'AI' ? 'badge--ai' : 'badge--soft'">
            {{ previewDetail.source === 'AI' ? 'AI 生成' : '运营手记' }}
          </span>
          <el-tag :type="statusTagType(previewDetail.status)" size="small" round disable-transitions>{{ statusText(previewDetail.status) }}</el-tag>
          <span class="muted">{{ previewDetail.area }} · {{ formatDate(previewDetail.createTime) }}</span>
        </div>
        <h3 class="preview__title">{{ previewDetail.title }}</h3>
        <p class="preview__summary">{{ previewDetail.summary }}</p>
        <div v-if="previewDetail.highlights?.length" class="preview__highlights">
          <span v-for="item in previewDetail.highlights" :key="item">{{ item }}</span>
        </div>
        <MarkdownBody :source="previewDetail.body" />
        <div class="preview__info">
          <span>地址：{{ previewDetail.address || '—' }}</span>
          <span>时间：{{ previewDetail.openingHours || '—' }}</span>
          <span>价格：{{ previewDetail.priceRange || '—' }}</span>
        </div>
        <p v-if="previewDetail.auditRemark" class="preview__audit">审核备注：{{ previewDetail.auditRemark }}</p>
      </div>

      <template #footer>
        <button class="btn btn--ghost btn--sm" type="button" @click="previewVisible = false">关闭</button>
        <template v-if="previewDetail && previewDetail.status !== 'PUBLISHED'">
          <button class="btn btn--ghost btn--sm" type="button" @click="reject(previewDetail)">驳回</button>
          <button class="btn btn--primary btn--sm" type="button" @click="approve(previewDetail)">通过并发布</button>
        </template>
      </template>
    </el-dialog>

    <el-dialog v-model="taskVisible" title="生成任务详情" width="min(680px, 92vw)" destroy-on-close>
      <div v-if="currentTask" class="task-detail">
        <div class="task-detail__head">
          <span class="task-id">#{{ currentTask.id }}</span>
          <el-tag :type="statusTagType(currentTask.status)" size="small" round disable-transitions>{{ taskStatusText(currentTask.status) }}</el-tag>
          <span class="muted">{{ currentTask.model }}</span>
        </div>
        <dl class="task-detail__meta">
          <div><dt>分类</dt><dd>{{ currentTask.categoryCode }}</dd></div>
          <div><dt>区域</dt><dd>{{ currentTask.area || '不限' }}</dd></div>
          <div><dt>数量</dt><dd>{{ currentTask.targetCount }}</dd></div>
          <div><dt>关键词</dt><dd>{{ currentTask.keywords || '—' }}</dd></div>
          <div><dt>Token</dt><dd>{{ currentTask.costTokens }}</dd></div>
          <div><dt>创建</dt><dd>{{ formatDate(currentTask.createTime) }}</dd></div>
        </dl>
        <div v-if="currentTask.result" class="task-detail__block">
          <span class="field-label">执行结果</span>
          <pre>{{ currentTask.result }}</pre>
        </div>
        <div v-if="currentTask.error" class="task-detail__block task-detail__block--error">
          <span class="field-label">错误信息</span>
          <pre>{{ currentTask.error }}</pre>
        </div>
        <div v-if="currentTask.prompt" class="task-detail__block">
          <span class="field-label">使用 Prompt</span>
          <pre>{{ currentTask.prompt }}</pre>
        </div>
      </div>
      <template #footer>
        <button class="btn btn--ghost btn--sm" type="button" @click="taskVisible = false">关闭</button>
        <button
          v-if="currentTask && currentTask.status === 'FAILED'"
          class="btn btn--primary btn--sm"
          type="button"
          @click="retryTask(currentTask); taskVisible = false"
        >
          重试任务
        </button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin {
  padding-top: 40px;
}

.admin-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.admin-head h1 {
  margin-top: 12px;
  font-size: clamp(30px, 4vw, 42px);
}

.admin-head p {
  margin-top: 10px;
  max-width: 620px;
  color: var(--muted);
  font-size: 13.5px;
}

.admin-head__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.model-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 252, 245, 0.7);
  color: var(--ink-soft);
  font-size: 11px;
}

.model-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--gold);
}

.model-dot.is-live {
  background: #4f8a5b;
  box-shadow: 0 0 0 3px rgba(79, 138, 91, 0.16);
}

.admin-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 28px;
}

.admin-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(255, 252, 245, 0.72);
}

.admin-stat span {
  color: var(--muted);
  font-size: 11.5px;
  letter-spacing: 0.06em;
}

.admin-stat strong {
  font-family: var(--serif);
  font-size: 28px;
  line-height: 1.2;
  color: var(--ink);
}

.admin-stat small {
  color: var(--muted);
  font-size: 10.5px;
}

.admin-stat--accent {
  background: linear-gradient(150deg, rgba(180, 69, 47, 0.12), rgba(255, 252, 245, 0.8));
  border-color: rgba(180, 69, 47, 0.24);
}

.admin-stat--accent strong {
  color: var(--cinnabar);
}

.admin-charts {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.75fr);
  gap: 16px;
  margin-top: 16px;
}

.chart-card,
.ai-card {
  padding: 22px 24px;
}

.chart-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.chart-card__head h3 {
  margin-top: 6px;
  font-size: 20px;
}

.chart-empty {
  padding: 60px 0;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
}

.ai-card__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 14px;
}

.ai-card__list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px dashed var(--line);
  font-size: 12px;
}

.ai-card__list li:last-child {
  border-bottom: none;
}

.ai-card__list span {
  color: var(--muted);
}

.ai-card__list strong {
  color: var(--ink);
  font-weight: 500;
}

.ai-card__hint {
  margin-top: 14px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.8;
}

.ai-card__hint code {
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(29, 33, 29, 0.06);
  font-size: 10.5px;
}

.admin-tabs {
  margin-top: 34px;
}

.tab-count {
  margin-left: 5px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(180, 69, 47, 0.1);
  color: var(--cinnabar);
  font-size: 10px;
  font-weight: 500;
}

.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 20px 0 14px;
}

.tab-toolbar__text {
  color: var(--muted);
  font-size: 12.5px;
}

.ai-tasks__title {
  margin-top: 6px;
  font-size: 20px;
}

.library-filter {
  display: flex;
  align-items: center;
  gap: 12px;
}

.library-filter .field-label {
  margin-bottom: 0;
}

.admin-table {
  border: 1px solid var(--line);
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 252, 245, 0.6);
}

.content-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.content-cell__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.content-cell__text strong {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-cell__text span {
  color: var(--muted);
  font-size: 11px;
}

.table-tag {
  margin-right: 6px;
  color: var(--jade);
  font-size: 11px;
}

.table-muted {
  color: var(--muted);
  font-size: 11.5px;
}

.task-id {
  font-family: var(--serif);
  font-size: 14px;
  color: var(--cinnabar);
}

.task-cell {
  display: flex;
  flex-direction: column;
}

.task-cell strong {
  font-size: 12.5px;
  font-weight: 500;
}

.task-cell span {
  color: var(--muted);
  font-size: 11px;
}

.ai-layout {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
  margin-top: 20px;
}

.ai-form {
  padding: 24px;
  position: sticky;
  top: 100px;
}

.ai-form h3 {
  margin-top: 8px;
  font-size: 22px;
}

.ai-form__lead {
  margin-top: 8px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.8;
}

.ai-form__fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 20px 0;
}

.ai-form__fields .field-label {
  margin-bottom: 6px;
}

.ai-form__note {
  margin-top: 10px;
  color: var(--muted);
  font-size: 10.5px;
  text-align: center;
}

.preview {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 62vh;
  overflow-y: auto;
  padding-right: 4px;
}

.preview__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.preview__title {
  font-size: 26px;
}

.preview__summary {
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.8;
}

.preview__highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview__highlights span {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(176, 138, 79, 0.12);
  color: #8a672f;
  font-size: 11px;
}

.preview__info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px dashed var(--line);
  border-bottom: 1px dashed var(--line);
  color: var(--muted);
  font-size: 11.5px;
}

.preview__audit {
  color: var(--cinnabar);
  font-size: 11.5px;
}

.preview-loading {
  padding: 10px 0;
}

.task-detail__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.task-detail__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0;
}

.task-detail__meta dt {
  color: var(--muted);
  font-size: 10.5px;
}

.task-detail__meta dd {
  margin: 2px 0 0;
  font-size: 13px;
}

.task-detail__block {
  margin-top: 14px;
}

.task-detail__block pre {
  margin: 8px 0 0;
  max-height: 220px;
  overflow: auto;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--paper-3);
  color: var(--ink-soft);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.task-detail__block--error pre {
  border-color: rgba(180, 69, 47, 0.3);
  background: rgba(180, 69, 47, 0.06);
  color: var(--cinnabar-deep);
}

@media (max-width: 1100px) {
  .admin-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .admin-charts {
    grid-template-columns: 1fr;
  }

  .ai-layout {
    grid-template-columns: 1fr;
  }

  .ai-form {
    position: static;
  }
}

@media (max-width: 760px) {
  .admin-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .admin-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-head__actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .task-detail__meta {
    grid-template-columns: 1fr 1fr;
  }

  .tab-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
