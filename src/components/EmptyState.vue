<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    text?: string
    mark?: string
  }>(),
  {
    title: '这里还没有内容',
    text: '换个筛选条件，或稍后再来看看。',
    mark: '空'
  }
)
</script>

<template>
  <div class="empty">
    <div class="empty__mark serif">{{ mark }}</div>
    <h3 class="empty__title">{{ title }}</h3>
    <p class="empty__text">{{ text }}</p>
    <div v-if="$slots.action" class="empty__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.empty__title {
  font-size: 20px;
  color: var(--ink);
}

.empty__text {
  margin-top: 8px;
  font-size: 13px;
}

.empty__action {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
