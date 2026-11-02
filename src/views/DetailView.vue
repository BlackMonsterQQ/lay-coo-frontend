<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { contentApi, interactionApi, recommendApi } from '@/api'
import { useUserStore } from '@/stores/user'
import type { CommentItem, ContentDetail, InteractionStats, RecommendItem } from '@/types'
import CoverArt from '@/components/CoverArt.vue'
import ContentCardView from '@/components/ContentCard.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatCount, formatDate, formatRating } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)
const notFound = ref(false)
const detail = ref<ContentDetail | null>(null)
const stats = ref<InteractionStats | null>(null)
const related = ref<RecommendItem[]>([])
const comments = ref<CommentItem[]>([])
const commentTotal = ref(0)
const commentPage = ref(1)
const commentLoading = ref(false)
const commentText = ref('')
const submittingComment = ref(false)
const favoriteBusy = ref(false)
const likeBusy = ref(false)
const myRating = ref(0)

const contentId = computed(() => Number(route.params.id))
const favorited = computed(() => stats.value?.favorited ?? false)
const liked = computed(() => stats.value?.liked ?? false)
const commentCount = computed(() => stats.value?.commentCount ?? 0)
const highlights = computed(() => detail.value?.highlights || [])
const isAi = computed(() => detail.value?.source === 'AI')

const loginLink = computed(() => ({
  path: '/login',
  query: { redirect: route.fullPath }
}))

async function loadComments(reset = false) {
  if (commentLoading.value) {
    return
  }
  commentLoading.value = true
  try {
    if (reset) {
      commentPage.value = 1
    }
    const result = await interactionApi.commentList(contentId.value, commentPage.value, 10)
    commentTotal.value = result.total
    if (reset) {
      comments.value = result.list
    } else {
      comments.value = [...comments.value, ...result.list]
    }
  } finally {
    commentLoading.value = false
  }
}

async function loadRelated(id: number) {
  try {
    const similar = await recommendApi.similar(id, 3)
    if (similar.length) {
      related.value = similar
      return
    }
  } catch {
    // 推荐服务不可用时降级为同分类内容
  }
  try {
    const cards = await contentApi.related(id, 3)
    related.value = cards.map((content) => ({
      content,
      reason: '同分类 · 编辑推荐',
      score: 0,
      scene: 'RELATED'
    }))
  } catch {
    related.value = []
  }
}

async function load() {
  loading.value = true
  notFound.value = false
  detail.value = null
  stats.value = null
  related.value = []
  comments.value = []
  myRating.value = 0
  try {
    const data = await contentApi.detail(contentId.value)
    detail.value = data
    const [statsResult] = await Promise.allSettled([interactionApi.stats(contentId.value)])
    if (statsResult.status === 'fulfilled') {
      stats.value = statsResult.value
      myRating.value = statsResult.value.myRating ?? 0
    }
    await Promise.all([loadComments(true), loadRelated(contentId.value)])
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

function requireLogin(action: string): boolean {
  if (userStore.isLoggedIn) {
    return true
  }
  ElMessage.warning(`登录后才能${action}`)
  router.push(loginLink.value)
  return false
}

async function toggleFavorite() {
  if (!requireLogin('收藏')) {
    return
  }
  if (!stats.value || favoriteBusy.value) {
    return
  }
  favoriteBusy.value = true
  try {
    const result = favorited.value
      ? await interactionApi.favoriteRemove(contentId.value)
      : await interactionApi.favoriteAdd(contentId.value)
    stats.value.favorited = result.favorited
    stats.value.favoriteCount = Math.max(0, stats.value.favoriteCount + (result.favorited ? 1 : -1))
    ElMessage.success(result.favorited ? '已加入收藏' : '已取消收藏')
  } finally {
    favoriteBusy.value = false
  }
}

async function toggleLike() {
  if (!requireLogin('点赞')) {
    return
  }
  if (!stats.value || likeBusy.value) {
    return
  }
  likeBusy.value = true
  try {
    const result = liked.value
      ? await interactionApi.likeRemove(contentId.value)
      : await interactionApi.likeAdd(contentId.value)
    stats.value.liked = result.liked
    stats.value.likeCount = Math.max(0, stats.value.likeCount + (result.liked ? 1 : -1))
  } finally {
    likeBusy.value = false
  }
}

async function submitRating(value: number | undefined) {
  if (!value) {
    return
  }
  if (!requireLogin('评分')) {
    myRating.value = 0
    return
  }
  try {
    const result = await interactionApi.rate(contentId.value, value)
    if (stats.value) {
      stats.value.rating = result.avg
      stats.value.ratingCount = result.count
      stats.value.myRating = result.mine
    }
    myRating.value = result.mine
    ElMessage.success('感谢你的评分')
  } catch {
    myRating.value = 0
  }
}

async function submitComment() {
  if (!requireLogin('评论')) {
    return
  }
  const content = commentText.value.trim()
  if (!content) {
    ElMessage.warning('先写点什么吧')
    return
  }
  submittingComment.value = true
  try {
    await interactionApi.commentAdd({ contentId: contentId.value, content })
    commentText.value = ''
    await loadComments(true)
    if (stats.value) {
      stats.value.commentCount += 1
    }
    ElMessage.success('评论已发布')
  } finally {
    submittingComment.value = false
  }
}

async function removeComment(item: CommentItem) {
  try {
    await ElMessageBox.confirm('确定删除这条评论吗？', '删除评论', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  await interactionApi.commentDelete(item.id)
  comments.value = comments.value.filter((comment) => comment.id !== item.id)
  commentTotal.value = Math.max(0, commentTotal.value - 1)
  if (stats.value) {
    stats.value.commentCount = Math.max(0, stats.value.commentCount - 1)
  }
  ElMessage.success('已删除')
}

async function loadMoreComments() {
  commentPage.value += 1
  await loadComments(false)
}

async function share() {
  const url = window.location.href
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('链接已复制，可以分享给朋友了')
  } catch {
    ElMessage.info(url)
  }
}

function scrollToComments() {
  document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

watch(contentId, () => load())

onMounted(load)
</script>

<template>
  <div class="detail-page">
    <div v-if="loading" class="container detail-loading">
      <el-skeleton animated>
        <template #template>
          <el-skeleton-item variant="text" style="width: 30%" />
          <el-skeleton-item variant="h1" style="width: 70%; height: 56px; margin-top: 20px" />
          <el-skeleton-item variant="image" style="width: 100%; height: 320px; margin-top: 26px; border-radius: 24px" />
          <el-skeleton-item variant="text" style="width: 100%; margin-top: 24px" />
          <el-skeleton-item variant="text" style="width: 90%; margin-top: 8px" />
        </template>
      </el-skeleton>
    </div>

    <div v-else-if="notFound" class="container">
      <EmptyState title="这篇内容暂时看不到" text="它可能还没通过审核，或已经被下架。" mark="佚">
        <template #action>
          <RouterLink to="/explore" class="btn btn--primary btn--sm">返回探索</RouterLink>
        </template>
      </EmptyState>
    </div>

    <article v-else-if="detail" class="container article">
      <nav class="breadcrumb" aria-label="面包屑">
        <RouterLink to="/">首页</RouterLink>
        <span>/</span>
        <RouterLink :to="`/explore?categoryCode=${detail.categoryCode}`">{{ detail.categoryName }}</RouterLink>
        <span>/</span>
        <span class="breadcrumb__current">{{ detail.title }}</span>
      </nav>

      <header class="article-head">
        <div class="article-head__meta">
          <span class="badge badge--soft">{{ detail.categoryName }}</span>
          <span v-if="isAi" class="badge badge--ai">AI 生成 · 已审核</span>
          <span class="article-head__area">{{ detail.area }}</span>
        </div>
        <h1 class="article-title">{{ detail.title }}</h1>
        <p class="article-summary">{{ detail.summary }}</p>
        <div class="article-meta">
          <span>★ {{ formatRating(stats?.rating || detail.rating) }}</span>
          <span class="dot">·</span>
          <span>{{ formatCount(detail.viewCount) }} 次浏览</span>
          <span class="dot">·</span>
          <span>{{ formatCount(stats?.favoriteCount ?? detail.favoriteCount) }} 人收藏</span>
          <span class="dot">·</span>
          <span>发布于 {{ formatDate(detail.publishTime) }}</span>
        </div>
      </header>

      <div class="article-cover">
        <CoverArt
          :code="detail.categoryCode"
          :icon="detail.categoryIcon"
          :desc="detail.coverDesc"
          variant="hero"
        />
      </div>

      <div class="article-layout">
        <div class="article-main">
          <section v-if="highlights.length" class="highlights">
            <div v-for="(item, index) in highlights" :key="index" class="highlight">
              <span class="highlight__no">0{{ index + 1 }}</span>
              <p>{{ item }}</p>
            </div>
          </section>

          <MarkdownBody :source="detail.body" />

          <div v-if="detail.tips" class="tips">
            <span class="tips__label">旅行贴士</span>
            <p>{{ detail.tips }}</p>
          </div>

          <div class="article-tags">
            <span class="muted">标签</span>
            <RouterLink
              v-for="tag in detail.tags"
              :key="tag"
              :to="`/explore?tag=${encodeURIComponent(tag)}`"
              class="tag"
            >
              #{{ tag }}
            </RouterLink>
          </div>

          <section id="comments" class="comments">
            <div class="comments__head">
              <div>
                <span class="eyebrow">COMMENTS</span>
                <h2>旅行者说 <span class="comments__count">{{ commentTotal }}</span></h2>
              </div>
              <button class="comments__rate" type="button" @click="scrollToComments">
                ★ {{ formatRating(stats?.rating) }} · {{ stats?.ratingCount || 0 }} 人评分
              </button>
            </div>

            <form v-if="userStore.isLoggedIn" class="comment-form" @submit.prevent="submitComment">
              <el-input
                v-model="commentText"
                type="textarea"
                :rows="3"
                maxlength="500"
                show-word-limit
                placeholder="写下你的体验、路线或一句提醒…"
              />
              <div class="comment-form__foot">
                <span class="muted">友善交流，评论会进入审核队列。</span>
                <button class="btn btn--primary btn--sm" type="submit" :disabled="submittingComment">
                  {{ submittingComment ? '发布中…' : '发布评论' }}
                </button>
              </div>
            </form>
            <div v-else class="login-tip">
              <p>登录后可以收藏、评分和评论，也可以让推荐更懂你。</p>
              <RouterLink :to="loginLink" class="btn btn--primary btn--sm">去登录</RouterLink>
            </div>

            <div v-if="comments.length" class="comment-list">
              <div v-for="item in comments" :key="item.id" class="comment">
                <span class="comment__avatar">{{ (item.nickname || '旅').slice(0, 1) }}</span>
                <div class="comment__body">
                  <div class="comment__head">
                    <strong>{{ item.nickname }}</strong>
                    <span>{{ formatDate(item.createTime) }}</span>
                    <button v-if="item.deletable" type="button" class="comment__delete" @click="removeComment(item)">
                      删除
                    </button>
                  </div>
                  <p>{{ item.content }}</p>
                </div>
              </div>
            </div>
            <EmptyState v-else-if="!commentLoading" title="还没有人留下评论" text="做第一个分享体验的人吧。" mark="评" />

            <button
              v-if="comments.length < commentTotal"
              class="btn btn--ghost btn--sm comment-more"
              type="button"
              :disabled="commentLoading"
              @click="loadMoreComments"
            >
              {{ commentLoading ? '加载中…' : '加载更多评论' }}
            </button>
          </section>
        </div>

        <aside class="article-aside">
          <div class="action-panel panel">
            <div class="action-stats">
              <div>
                <strong>{{ formatCount(stats?.favoriteCount) }}</strong>
                <span>收藏</span>
              </div>
              <div>
                <strong>{{ formatCount(stats?.likeCount) }}</strong>
                <span>点赞</span>
              </div>
              <div>
                <strong>{{ formatCount(stats?.commentCount) }}</strong>
                <span>评论</span>
              </div>
            </div>

            <button class="btn btn--primary btn--block" type="button" :disabled="favoriteBusy" @click="toggleFavorite">
              {{ favorited ? '♥ 已收藏' : '♡ 收藏这篇' }}
            </button>
            <button class="btn btn--ghost btn--block" type="button" :disabled="likeBusy" @click="toggleLike">
              {{ liked ? '已点赞' : '点个赞' }}
            </button>
            <button class="btn btn--ghost btn--block" type="button" @click="share">复制链接分享</button>

            <div class="action-rating">
              <span>给这篇打分</span>
              <el-rate v-model="myRating" :disabled="!userStore.isLoggedIn" @change="submitRating" />
            </div>
          </div>

          <div class="info-panel panel">
            <h3>实用信息</h3>
            <dl>
              <template v-if="detail.address">
                <dt>地址</dt>
                <dd>{{ detail.area }} · {{ detail.address }}</dd>
              </template>
              <template v-if="detail.openingHours">
                <dt>开放时间</dt>
                <dd>{{ detail.openingHours }}</dd>
              </template>
              <template v-if="detail.priceRange">
                <dt>参考价格</dt>
                <dd>{{ detail.priceRange }}</dd>
              </template>
              <template v-if="detail.coverDesc">
                <dt>画面</dt>
                <dd>{{ detail.coverDesc }}</dd>
              </template>
            </dl>
            <div class="info-panel__note">
              <span>内容来源</span>
              <strong>{{ isAi ? 'AI 生成 · 人工复核' : '运营手记' }}</strong>
            </div>
          </div>

          <div class="aside-tags panel">
            <h3>相关标签</h3>
            <div class="aside-tags__list">
              <RouterLink
                v-for="tag in detail.tags"
                :key="tag"
                :to="`/explore?tag=${encodeURIComponent(tag)}`"
                class="tag"
              >
                #{{ tag }}
              </RouterLink>
            </div>
          </div>
        </aside>
      </div>

      <section v-if="related.length" class="related section">
        <div class="section-head">
          <div>
            <span class="eyebrow">YOU MAY ALSO LIKE</span>
            <h2 class="section-title">也许你还会喜欢</h2>
          </div>
          <RouterLink :to="`/explore?categoryCode=${detail.categoryCode}`" class="link-arrow">更多{{ detail.categoryName }} →</RouterLink>
        </div>
        <div class="related-grid">
          <ContentCardView
            v-for="item in related"
            :key="item.content.id"
            :item="item.content"
            :reason="item.reason"
          />
        </div>
      </section>
    </article>
  </div>
</template>

<style scoped>
.detail-loading {
  padding-top: 40px;
}

.article {
  padding-top: 28px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 26px;
  color: var(--muted);
  font-size: 12px;
  overflow: hidden;
}

.breadcrumb a:hover {
  color: var(--cinnabar);
}

.breadcrumb__current {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-soft);
}

.article-head {
  max-width: 900px;
}

.article-head__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.article-head__area {
  color: var(--muted);
  font-size: 12px;
}

.article-title {
  margin-top: 18px;
  font-size: clamp(34px, 4.6vw, 54px);
  line-height: 1.22;
}

.article-summary {
  margin-top: 16px;
  color: var(--ink-soft);
  font-size: 16px;
  line-height: 1.9;
  max-width: 760px;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  margin-top: 18px;
  color: var(--muted);
  font-size: 12.5px;
}

.dot {
  opacity: 0.45;
}

.article-cover {
  margin: 30px 0 40px;
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-lg);
}

.article-cover :deep(.cover) {
  border-radius: var(--radius-lg);
}

.article-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 46px;
  align-items: start;
}

.article-main {
  min-width: 0;
}

.highlights {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 36px;
}

.highlight {
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255, 252, 245, 0.7);
}

.highlight__no {
  font-family: var(--serif);
  font-style: italic;
  font-size: 15px;
  color: var(--cinnabar);
}

.highlight p {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-soft);
}

.tips {
  display: flex;
  gap: 16px;
  margin-top: 34px;
  padding: 20px 22px;
  border-left: 3px solid var(--gold);
  border-radius: 0 16px 16px 0;
  background: rgba(176, 138, 79, 0.08);
}

.tips__label {
  flex-shrink: 0;
  color: #8a672f;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
}

.tips p {
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--ink-soft);
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 32px;
  padding-top: 22px;
  border-top: 1px dashed var(--line);
  font-size: 12px;
}

.comments {
  margin-top: 48px;
  padding-top: 34px;
  border-top: 1px solid var(--line);
  scroll-margin-top: 100px;
}

.comments__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.comments__head h2 {
  margin-top: 8px;
  font-size: 28px;
}

.comments__count {
  margin-left: 4px;
  font-family: var(--sans);
  font-size: 14px;
  color: var(--muted);
}

.comments__rate {
  border: none;
  background: transparent;
  color: #9a7337;
  font-size: 13px;
  cursor: pointer;
}

.comment-form {
  margin-top: 22px;
}

.comment-form__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  font-size: 12px;
}

.login-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 22px;
  padding: 18px 22px;
  border: 1px dashed var(--line-strong);
  border-radius: 16px;
  background: rgba(255, 252, 245, 0.6);
  font-size: 13px;
  color: var(--muted);
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 26px;
}

.comment {
  display: flex;
  gap: 14px;
  padding: 18px 0;
  border-bottom: 1px dashed var(--line);
}

.comment__avatar {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(47, 93, 85, 0.12);
  color: var(--jade);
  font-family: var(--serif);
  font-size: 16px;
}

.comment__body {
  flex: 1;
  min-width: 0;
}

.comment__head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--muted);
}

.comment__head strong {
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
}

.comment__delete {
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 11px;
  cursor: pointer;
}

.comment__delete:hover {
  color: var(--cinnabar);
}

.comment__body p {
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink-soft);
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-more {
  margin-top: 20px;
}

.article-aside {
  position: sticky;
  top: 100px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.action-panel {
  padding: 22px;
}

.action-stats {
  display: flex;
  justify-content: space-around;
  gap: 8px;
  padding-bottom: 18px;
  margin-bottom: 16px;
  border-bottom: 1px dashed var(--line);
}

.action-stats div {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.action-stats strong {
  font-family: var(--serif);
  font-size: 22px;
  color: var(--ink);
}

.action-stats span {
  color: var(--muted);
  font-size: 11px;
}

.action-panel .btn {
  margin-top: 10px;
}

.action-rating {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed var(--line);
  font-size: 12px;
  color: var(--muted);
}

.info-panel {
  padding: 22px;
}

.info-panel h3,
.aside-tags h3 {
  font-size: 18px;
  margin-bottom: 14px;
}

.info-panel dl {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  font-size: 12.5px;
}

.info-panel dt {
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.info-panel dd {
  margin: 2px 0 0;
  color: var(--ink-soft);
  line-height: 1.7;
}

.info-panel__note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed var(--line);
  font-size: 11px;
  color: var(--muted);
}

.info-panel__note strong {
  color: var(--jade);
  font-weight: 500;
}

.aside-tags {
  padding: 22px;
}

.aside-tags__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.related {
  margin-top: 30px;
  border-top: 1px solid var(--line);
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}

@media (max-width: 1000px) {
  .article-layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .article-aside {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .article-aside > * {
    flex: 1 1 260px;
  }
}

@media (max-width: 760px) {
  .highlights {
    grid-template-columns: 1fr;
  }

  .related-grid {
    grid-template-columns: 1fr;
  }

  .article-cover {
    margin: 24px 0 30px;
  }

  .comments__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .login-tip {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
