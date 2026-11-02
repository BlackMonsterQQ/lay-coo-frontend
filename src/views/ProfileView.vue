<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { interactionApi } from '@/api'
import { useUserStore } from '@/stores/user'
import type { CommentItem, ContentCard } from '@/types'
import ContentCardView from '@/components/ContentCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatDate } from '@/utils/format'

const router = useRouter()
const userStore = useUserStore()

const tab = ref<'favorites' | 'comments'>('favorites')
const favorites = ref<ContentCard[]>([])
const favoriteTotal = ref(0)
const favoritePage = ref(1)
const favoriteLoading = ref(false)
const comments = ref<CommentItem[]>([])
const commentTotal = ref(0)
const commentPage = ref(1)
const commentLoading = ref(false)
const pageSize = 9

const profile = computed(() => userStore.profile)
const isAdmin = computed(() => profile.value?.role === 'ADMIN')

async function loadFavorites(page = 1) {
  favoriteLoading.value = true
  try {
    const result = await interactionApi.favoriteList(page, pageSize)
    favorites.value = result.list
    favoriteTotal.value = result.total
    favoritePage.value = page
  } catch {
    favorites.value = []
  } finally {
    favoriteLoading.value = false
  }
}

async function loadComments(page = 1) {
  commentLoading.value = true
  try {
    const result = await interactionApi.commentMine(page, 10)
    comments.value = result.list
    commentTotal.value = result.total
    commentPage.value = page
  } catch {
    comments.value = []
  } finally {
    commentLoading.value = false
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
  ElMessage.success('已删除')
  await loadComments(commentPage.value)
}

function logout() {
  userStore.logout()
  ElMessage.success('已退出登录')
  router.push('/')
}

watch(tab, (value) => {
  if (value === 'comments' && comments.value.length === 0) {
    loadComments()
  }
})

onMounted(async () => {
  if (!userStore.profile) {
    await userStore.fetchProfile()
  }
  await Promise.all([loadFavorites(), loadComments()])
})
</script>

<template>
  <div class="profile container">
    <section v-if="profile" class="profile-hero">
      <div class="profile-hero__pattern serif" aria-hidden="true">岚</div>
      <div class="profile-hero__main">
        <span class="profile-avatar">{{ (profile.nickname || profile.username).slice(0, 1) }}</span>
        <div class="profile-info">
          <div class="profile-info__top">
            <h1>{{ profile.nickname }}</h1>
            <span class="badge" :class="isAdmin ? 'badge--ai' : 'badge--soft'">
              {{ isAdmin ? '运营管理员' : '岚途旅人' }}
            </span>
          </div>
          <p class="profile-info__meta">@{{ profile.username }} · 加入于 {{ profile.createTime }}</p>
          <p class="profile-info__bio">把喜欢的本地角落收进来，下一次出门就不用再纠结去哪里。</p>
        </div>
      </div>
      <div class="profile-hero__actions">
        <RouterLink v-if="isAdmin" to="/admin" class="btn btn--ghost btn--sm">运营后台</RouterLink>
        <button class="btn btn--ghost btn--sm" type="button" @click="logout">退出登录</button>
      </div>
    </section>

    <section class="profile-stats">
      <div class="stat-card">
        <strong>{{ favoriteTotal }}</strong>
        <span>收藏内容</span>
      </div>
      <div class="stat-card">
        <strong>{{ commentTotal }}</strong>
        <span>我的评论</span>
      </div>
      <div class="stat-card">
        <strong>{{ isAdmin ? 'ADMIN' : 'USER' }}</strong>
        <span>当前角色</span>
      </div>
    </section>

    <div class="profile-tabs">
      <button
        type="button"
        class="profile-tab"
        :class="{ 'is-active': tab === 'favorites' }"
        @click="tab = 'favorites'"
      >
        我的收藏
        <span>{{ favoriteTotal }}</span>
      </button>
      <button
        type="button"
        class="profile-tab"
        :class="{ 'is-active': tab === 'comments' }"
        @click="tab = 'comments'"
      >
        我的评论
        <span>{{ commentTotal }}</span>
      </button>
    </div>

    <section v-if="tab === 'favorites'" class="tab-panel">
      <div v-if="favoriteLoading" class="favorite-grid">
        <el-skeleton v-for="n in 3" :key="n" animated>
          <template #template>
            <div class="skeleton-card">
              <el-skeleton-item variant="image" class="skeleton-card__img" />
              <el-skeleton-item variant="h3" style="width: 55%; margin-top: 16px" />
            </div>
          </template>
        </el-skeleton>
      </div>
      <div v-else-if="favorites.length" class="favorite-grid">
        <ContentCardView v-for="item in favorites" :key="item.id" :item="item" compact />
      </div>
      <EmptyState v-else title="还没有收藏" text="在内容详情页点一下收藏，喜欢的地方就会留在这里。" mark="藏">
        <template #action>
          <RouterLink to="/explore" class="btn btn--primary btn--sm">去发现内容</RouterLink>
        </template>
      </EmptyState>

      <el-pagination
        v-if="favoriteTotal > pageSize"
        background
        layout="prev, pager, next"
        :total="Number(favoriteTotal)"
        :page-size="pageSize"
        :current-page="favoritePage"
        @current-change="loadFavorites"
      />
    </section>

    <section v-else class="tab-panel">
      <div v-if="commentLoading" class="comment-loading">
        <el-skeleton v-for="n in 3" :key="n" animated :rows="2" />
      </div>
      <div v-else-if="comments.length" class="my-comments">
        <article v-for="item in comments" :key="item.id" class="my-comment">
          <div class="my-comment__head">
            <RouterLink :to="`/content/${item.contentId}`" class="my-comment__title">
              {{ item.contentTitle || '相关内容' }}
            </RouterLink>
            <span class="my-comment__date">{{ formatDate(item.createTime) }}</span>
          </div>
          <p class="my-comment__text">{{ item.content }}</p>
          <div class="my-comment__foot">
            <RouterLink :to="`/content/${item.contentId}`" class="link-arrow">回到内容 →</RouterLink>
            <button type="button" class="my-comment__delete" @click="removeComment(item)">删除</button>
          </div>
        </article>
      </div>
      <EmptyState v-else title="还没有评论" text="看完一篇内容，留下你的体验或提醒吧。" mark="评">
        <template #action>
          <RouterLink to="/explore" class="btn btn--primary btn--sm">去找内容</RouterLink>
        </template>
      </EmptyState>

      <el-pagination
        v-if="commentTotal > 10"
        background
        layout="prev, pager, next"
        :total="Number(commentTotal)"
        :page-size="10"
        :current-page="commentPage"
        @current-change="loadComments"
      />
    </section>
  </div>
</template>

<style scoped>
.profile {
  padding-top: 40px;
}

.profile-hero {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 34px 38px;
  border-radius: 28px;
  background: radial-gradient(620px 300px at 92% -20%, rgba(180, 69, 47, 0.28), transparent 62%),
    linear-gradient(150deg, #252b22, #171a13);
  color: #f6f1e7;
  box-shadow: var(--shadow-md);
}

.profile-hero__pattern {
  position: absolute;
  right: 6%;
  bottom: -30%;
  font-size: 18rem;
  line-height: 1;
  color: rgba(255, 250, 240, 0.05);
  pointer-events: none;
}

.profile-hero__main {
  position: relative;
  display: flex;
  align-items: center;
  gap: 24px;
  min-width: 0;
}

.profile-avatar {
  width: 76px;
  height: 76px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(145deg, var(--cinnabar), var(--cinnabar-deep));
  color: #fff6ec;
  font-family: var(--serif);
  font-size: 32px;
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.24);
}

.profile-info {
  min-width: 0;
}

.profile-info__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.profile-info__top h1 {
  font-size: clamp(26px, 3vw, 34px);
  color: #f8f4ec;
}

.profile-info__meta {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(246, 241, 231, 0.5);
}

.profile-info__bio {
  margin-top: 10px;
  max-width: 520px;
  font-size: 13px;
  color: rgba(246, 241, 231, 0.68);
}

.profile-hero__actions {
  position: relative;
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.profile-hero__actions .btn {
  border-color: rgba(246, 241, 231, 0.24);
  color: rgba(246, 241, 231, 0.86);
  background: rgba(255, 255, 255, 0.04);
}

.profile-hero__actions .btn:hover {
  border-color: rgba(246, 241, 231, 0.5);
  color: #fff6ec;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-top: 18px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px 24px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(255, 252, 245, 0.7);
}

.stat-card strong {
  font-family: var(--serif);
  font-size: 26px;
  color: var(--ink);
  line-height: 1;
}

.stat-card span {
  color: var(--muted);
  font-size: 11.5px;
  letter-spacing: 0.06em;
}

.profile-tabs {
  display: flex;
  gap: 28px;
  margin: 42px 0 24px;
  border-bottom: 1px solid var(--line);
}

.profile-tab {
  position: relative;
  padding: 0 0 14px;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 15px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.profile-tab span {
  margin-left: 6px;
  font-size: 11px;
  color: var(--muted);
}

.profile-tab.is-active {
  color: var(--ink);
  font-weight: 600;
}

.profile-tab.is-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: var(--cinnabar);
}

.favorite-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.skeleton-card {
  padding: 10px 10px 20px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: rgba(255, 252, 245, 0.7);
}

.skeleton-card__img {
  width: 100%;
  height: 150px;
  border-radius: 16px;
}

.my-comments {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.my-comment {
  padding: 22px 24px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(255, 252, 245, 0.72);
  transition: border-color 0.2s ease;
}

.my-comment:hover {
  border-color: var(--line-strong);
}

.my-comment__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.my-comment__title {
  font-family: var(--serif);
  font-size: 18px;
  color: var(--ink);
}

.my-comment__title:hover {
  color: var(--cinnabar);
}

.my-comment__date {
  color: var(--muted);
  font-size: 11px;
  white-space: nowrap;
}

.my-comment__text {
  margin-top: 10px;
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.my-comment__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
}

.my-comment__delete {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
}

.my-comment__delete:hover {
  color: var(--cinnabar);
}

.comment-loading {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

@media (max-width: 900px) {
  .profile-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 26px;
  }

  .favorite-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .profile-hero__main {
    flex-direction: column;
    align-items: flex-start;
  }

  .profile-stats {
    grid-template-columns: 1fr;
  }

  .favorite-grid {
    grid-template-columns: 1fr;
  }

  .my-comment__head {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
