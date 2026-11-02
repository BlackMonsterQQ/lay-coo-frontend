<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="not-found container">
    <div class="not-found__mark serif" aria-hidden="true">404</div>
    <span class="eyebrow">LOST IN THE CITY</span>
    <h1>这条巷子走不通</h1>
    <p>你要找的页面可能已经搬走了，或者从未存在过。</p>
    <div class="not-found__actions">
      <button class="btn btn--primary" type="button" @click="router.push('/')">回到首页</button>
      <button class="btn btn--ghost" type="button" @click="router.push('/explore')">去探索</button>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 62vh;
  padding: 60px 0;
  text-align: center;
}

.not-found__mark {
  position: absolute;
  font-size: clamp(12rem, 28vw, 24rem);
  line-height: 1;
  color: rgba(180, 69, 47, 0.06);
  user-select: none;
  pointer-events: none;
}

.not-found h1 {
  position: relative;
  margin-top: 16px;
  font-size: clamp(30px, 4vw, 44px);
}

.not-found > p {
  position: relative;
  margin-top: 12px;
  color: var(--muted);
}

.not-found__actions {
  position: relative;
  display: flex;
  gap: 12px;
  margin-top: 28px;
}
</style>
