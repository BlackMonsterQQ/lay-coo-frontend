<script setup lang="ts">
import { computed } from 'vue'
import CoverArt from './CoverArt.vue'
import { formatCount, formatRating } from '@/utils/format'
import type { ContentCard } from '@/types'

const props = withDefaults(
  defineProps<{
    item: ContentCard
    reason?: string
    compact?: boolean
  }>(),
  {
    reason: '',
    compact: false
  }
)

const tags = computed(() => (props.item.tags || []).slice(0, 3))
const isAi = computed(() => props.item.source === 'AI')
</script>

<template>
  <RouterLink :to="`/content/${item.id}`" class="card" :class="{ 'card--compact': compact }">
    <div class="card__cover">
      <CoverArt
        :code="item.categoryCode"
        :icon="item.categoryIcon"
        :desc="item.coverDesc"
        :variant="compact ? 'card' : 'card'"
        :label="false"
      />
      <span v-if="reason" class="card__reason">{{ reason }}</span>
      <span v-else-if="isAi" class="card__ai badge badge--ai">AI 生成</span>
    </div>

    <div class="card__body">
      <div class="card__eyebrow">
        <span class="card__category">{{ item.categoryName }}</span>
        <span class="card__area">{{ item.area }}</span>
      </div>

      <h3 class="card__title">{{ item.title }}</h3>
      <p class="card__summary">{{ item.summary }}</p>

      <div v-if="tags.length" class="card__tags">
        <span v-for="tag in tags" :key="tag" class="tag">{{ tag }}</span>
      </div>

      <div class="card__meta">
        <span class="card__rating">★ {{ formatRating(item.rating) }}</span>
        <span class="card__dot">·</span>
        <span>{{ formatCount(item.viewCount) }} 浏览</span>
        <span class="card__dot">·</span>
        <span>{{ formatCount(item.favoriteCount) }} 收藏</span>
        <span class="card__arrow" aria-hidden="true">↗</span>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: rgba(255, 252, 245, 0.86);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  height: 100%;
}

.card:hover {
  transform: translateY(-5px);
  border-color: var(--line-strong);
  box-shadow: var(--shadow-md);
}

.card__cover {
  position: relative;
  padding: 10px 10px 0;
}

.card__cover :deep(.cover) {
  border-radius: 18px;
}

.card__reason,
.card__ai {
  position: absolute;
  left: 22px;
  top: 20px;
  max-width: calc(100% - 44px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__reason {
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(255, 252, 245, 0.92);
  color: var(--ink);
  font-size: 11px;
  letter-spacing: 0.02em;
  backdrop-filter: blur(6px);
  box-shadow: 0 4px 12px rgba(29, 33, 29, 0.1);
}

.card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 20px 18px;
  flex: 1;
}

.card__eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.card__category {
  color: var(--cinnabar);
  font-weight: 600;
}

.card__title {
  font-size: 19px;
  line-height: 1.4;
  color: var(--ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card__summary {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.card__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
  color: var(--muted);
  font-size: 11.5px;
}

.card__rating {
  color: #9a7337;
  font-weight: 600;
}

.card__dot {
  opacity: 0.5;
}

.card__arrow {
  margin-left: auto;
  color: var(--cinnabar);
  font-size: 15px;
  transition: transform 0.25s ease;
}

.card:hover .card__arrow {
  transform: translate(2px, -2px);
}

.card--compact .card__body {
  padding: 14px 18px 16px;
}

.card--compact .card__summary {
  -webkit-line-clamp: 2;
}

@media (max-width: 600px) {
  .card__title {
    font-size: 17px;
  }
}
</style>
