<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <div class="footer-seal">岚</div>
        <p class="footer-slogan serif">把一座城，<br />慢慢讲给你听。</p>
        <p class="footer-note">岚途 LayCoo · 本地文旅智能推荐平台</p>
      </div>

      <div class="footer-col">
        <h4>去发现</h4>
        <RouterLink to="/explore?type=LIFE">吃喝玩乐</RouterLink>
        <RouterLink to="/explore?type=HUMANITY">人文历史</RouterLink>
        <RouterLink to="/explore?sort=new">新近发布</RouterLink>
        <RouterLink to="/search">全站搜索</RouterLink>
      </div>

      <div class="footer-col">
        <h4>关于平台</h4>
        <RouterLink to="/me">我的收藏</RouterLink>
        <RouterLink v-if="$route.path !== '/admin'" to="/admin">运营后台</RouterLink>
        <span>内容由 AI 生成并经人工复核</span>
        <span>问题反馈：hello@laycoo.local</span>
      </div>

      <div class="footer-col footer-col--quote">
        <h4>一句本地话</h4>
        <p class="footer-quote serif">“欲把西湖比西子，<br />淡妆浓抹总相宜。”</p>
        <p class="footer-quote-from">—— 苏轼《饮湖上初晴后雨》</p>
      </div>
    </div>

    <div class="container footer-bottom">
      <span>© {{ year }} 岚途 LayCoo</span>
      <span>Vue 3 · Spring Cloud Alibaba · AI 大模型</span>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: 80px;
  padding: 60px 0 26px;
  background: radial-gradient(600px 300px at 15% 0%, rgba(180, 69, 47, 0.18), transparent 65%),
    linear-gradient(160deg, #22271f, #14170f);
  color: rgba(246, 241, 231, 0.78);
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.4fr 0.8fr 1fr 1fr;
  gap: 40px;
}

.footer-brand {
  max-width: 280px;
}

.footer-seal {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  border: 1px solid rgba(255, 246, 236, 0.28);
  font-family: var(--serif);
  font-size: 24px;
  color: #fff6ec;
}

.footer-slogan {
  margin-top: 20px;
  font-size: 24px;
  line-height: 1.45;
  color: #f6f1e7;
  letter-spacing: 0.04em;
}

.footer-note {
  margin-top: 16px;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: rgba(246, 241, 231, 0.5);
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
}

.footer-col h4 {
  margin-bottom: 4px;
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: rgba(246, 241, 231, 0.45);
}

.footer-col a,
.footer-col span {
  color: rgba(246, 241, 231, 0.72);
  transition: color 0.2s ease;
}

.footer-col a:hover {
  color: #fff6ec;
}

.footer-col--quote {
  max-width: 240px;
}

.footer-quote {
  font-size: 17px;
  line-height: 1.8;
  color: rgba(246, 241, 231, 0.86);
}

.footer-quote-from {
  margin-top: 10px;
  font-size: 12px;
  color: rgba(246, 241, 231, 0.45);
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-top: 48px;
  padding-top: 20px;
  border-top: 1px solid rgba(246, 241, 231, 0.1);
  font-size: 12px;
  color: rgba(246, 241, 231, 0.4);
}

@media (max-width: 900px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }

  .footer-brand {
    grid-column: 1 / -1;
    max-width: none;
  }

  .footer-col--quote {
    display: none;
  }
}

@media (max-width: 520px) {
  .site-footer {
    margin-top: 48px;
    padding-top: 40px;
  }

  .footer-grid {
    grid-template-columns: 1fr;
    gap: 26px;
  }

  .footer-bottom {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
