<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string
    title?: string
    lead?: string
  }>(),
  {
    eyebrow: 'WELCOME',
    title: '欢迎回来',
    lead: ''
  }
)
</script>

<template>
  <div class="auth">
    <aside class="auth__visual">
      <RouterLink to="/" class="auth__brand">
        <span class="auth__seal">岚</span>
        <span>岚途 LayCoo</span>
      </RouterLink>

      <div class="auth__quote">
        <span class="eyebrow">LOCAL CULTURE · AI</span>
        <h1 class="serif">一座城的<br />吃喝玩乐<br />与人文历史</h1>
        <p>AI 生成、规则审核、人工复核。我们把内容做慢一点，把这座城讲得再清楚一点。</p>
        <ul class="auth__points">
          <li><span>01</span>按兴趣推荐，而不是按广告</li>
          <li><span>02</span>收藏、评分与评论都可沉淀</li>
          <li><span>03</span>内容来源透明，AI 内容有标记</li>
        </ul>
      </div>

      <div class="auth__foot">
        <p class="serif">“江南忆，最忆是杭州。”</p>
        <span>—— 白居易</span>
      </div>

      <div class="auth__watermark serif" aria-hidden="true">杭</div>
    </aside>

    <section class="auth__panel">
      <div class="auth__panel-inner">
        <RouterLink to="/" class="auth__mobile-brand">
          <span class="auth__seal">岚</span>
          <span>岚途 LayCoo</span>
        </RouterLink>

        <span class="eyebrow">{{ eyebrow }}</span>
        <h2 class="auth__title">{{ title }}</h2>
        <p v-if="lead" class="auth__lead">{{ lead }}</p>

        <slot />
      </div>
    </section>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  grid-template-columns: 1.02fr 0.98fr;
  min-height: calc(100vh - 78px);
}

.auth__visual {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 46px 52px;
  background: radial-gradient(700px 420px at 85% 8%, rgba(180, 69, 47, 0.42), transparent 62%),
    linear-gradient(155deg, #262c22, #141710 70%);
  color: rgba(246, 241, 231, 0.78);
  border-radius: 0 40px 40px 0;
}

.auth__brand,
.auth__mobile-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #f6f1e7;
  font-family: var(--serif);
  font-size: 18px;
  letter-spacing: 0.08em;
}

.auth__seal {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: linear-gradient(145deg, var(--cinnabar), var(--cinnabar-deep));
  color: #fff6ec;
  font-family: var(--serif);
  font-size: 20px;
}

.auth__quote {
  position: relative;
  z-index: 1;
  max-width: 460px;
  margin: 60px 0;
}

.auth__quote .eyebrow {
  color: #d99a82;
}

.auth__quote h1 {
  margin-top: 18px;
  font-size: clamp(34px, 3.8vw, 52px);
  line-height: 1.3;
  color: #f8f4ec;
}

.auth__quote > p {
  margin-top: 20px;
  max-width: 380px;
  font-size: 13.5px;
  line-height: 1.9;
  color: rgba(246, 241, 231, 0.55);
}

.auth__points {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 28px;
}

.auth__points li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12.5px;
  color: rgba(246, 241, 231, 0.7);
}

.auth__points span {
  font-family: var(--serif);
  font-style: italic;
  color: #d99a82;
}

.auth__foot {
  position: relative;
  z-index: 1;
  color: rgba(246, 241, 231, 0.5);
  font-size: 11px;
}

.auth__foot p {
  font-size: 16px;
  color: rgba(246, 241, 231, 0.78);
  letter-spacing: 0.06em;
}

.auth__foot span {
  display: inline-block;
  margin-top: 6px;
}

.auth__watermark {
  position: absolute;
  right: -8%;
  bottom: -22%;
  font-size: clamp(18rem, 30vw, 30rem);
  line-height: 1;
  color: rgba(255, 250, 240, 0.04);
  pointer-events: none;
}

.auth__panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
}

.auth__panel-inner {
  width: min(400px, 100%);
}

.auth__mobile-brand {
  display: none;
  margin-bottom: 34px;
  color: var(--ink);
}

.auth__title {
  margin-top: 12px;
  font-size: 34px;
}

.auth__lead {
  margin-top: 10px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.8;
}

@media (max-width: 960px) {
  .auth {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .auth__visual {
    display: none;
  }

  .auth__panel {
    padding: 44px 24px 60px;
  }

  .auth__mobile-brand {
    display: inline-flex;
  }
}
</style>
