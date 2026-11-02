<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import SearchIcon from '@/components/SearchIcon.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const navItems = [
  { label: '首页', to: '/' },
  { label: '探索', to: '/explore' },
  { label: '人文', to: '/explore?type=HUMANITY' },
  { label: '搜索', to: '/search' }
]

const activePath = computed(() => {
  if (route.path.startsWith('/explore')) {
    return route.query.type === 'HUMANITY' ? '/explore?type=HUMANITY' : '/explore'
  }
  return route.path
})

function go(path: string) {
  router.push(path)
}

function logout() {
  userStore.logout()
  ElMessage.success('已退出登录')
  router.push('/')
}

function onCommand(command: string) {
  if (command === '__logout') {
    logout()
    return
  }
  go(command)
}
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <RouterLink to="/" class="brand" aria-label="岚途 LayCoo 首页">
        <span class="brand__seal">岚</span>
        <span class="brand__text">
          <strong>岚途</strong>
          <small>LAYCOO · 本地文旅</small>
        </span>
      </RouterLink>

      <nav class="main-nav" aria-label="主导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.label"
          :to="item.to"
          class="nav-link"
          :class="{ 'is-active': activePath === item.to }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="header-actions">
        <button class="icon-btn" type="button" aria-label="搜索" @click="go('/search')">
          <SearchIcon :size="18" />
        </button>

        <template v-if="userStore.isLoggedIn">
          <RouterLink to="/me" class="nav-link nav-link--me">我的收藏</RouterLink>
          <el-dropdown trigger="click" @command="onCommand">
            <button class="user-btn" type="button">
              <span class="user-avatar">{{ (userStore.profile?.nickname || '旅').slice(0, 1) }}</span>
              <span class="user-name">{{ userStore.profile?.nickname || '旅人' }}</span>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="/me">我的主页</el-dropdown-item>
                <el-dropdown-item v-if="userStore.isAdmin" command="/admin">运营后台</el-dropdown-item>
                <el-dropdown-item divided command="__logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>

        <template v-else>
          <button class="btn btn--sm nav-login" type="button" @click="go('/login')">登录</button>
          <button class="btn btn--primary btn--sm" type="button" @click="go('/register')">加入岚途</button>
        </template>
      </div>
    </div>

    <nav class="mobile-nav container" aria-label="移动端导航">
      <RouterLink
        v-for="item in navItems"
        :key="item.label"
        :to="item.to"
        class="nav-link"
        :class="{ 'is-active': activePath === item.to }"
      >
        {{ item.label }}
      </RouterLink>
      <RouterLink v-if="userStore.isLoggedIn" to="/me" class="nav-link">我的</RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.site-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 100;
  background: rgba(246, 241, 231, 0.86);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(226, 217, 200, 0.9);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  height: 78px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.brand__seal {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: linear-gradient(145deg, var(--cinnabar), var(--cinnabar-deep));
  color: #fff6ec;
  font-family: var(--serif);
  font-size: 24px;
  box-shadow: 0 8px 18px rgba(180, 69, 47, 0.24);
}

.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.brand__text strong {
  font-family: var(--serif);
  font-size: 22px;
  letter-spacing: 0.08em;
}

.brand__text small {
  margin-top: 3px;
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--muted);
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 28px;
}

.nav-link {
  position: relative;
  padding: 6px 0;
  color: var(--ink-soft);
  font-size: 14px;
  letter-spacing: 0.04em;
  transition: color 0.2s ease;
}

.nav-link::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -2px;
  width: 0;
  height: 2px;
  background: var(--cinnabar);
  border-radius: 2px;
  transform: translateX(-50%);
  transition: width 0.25s ease;
}

.nav-link:hover {
  color: var(--ink);
}

.nav-link:hover::after,
.nav-link.is-active::after {
  width: 18px;
}

.nav-link.is-active {
  color: var(--ink);
  font-weight: 600;
}

.nav-link--me {
  font-size: 13px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.icon-btn {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: rgba(255, 252, 245, 0.7);
  color: var(--ink-soft);
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  border-color: var(--cinnabar);
  color: var(--cinnabar);
  transform: rotate(-8deg);
}

.user-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 5px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 252, 245, 0.7);
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.user-btn:hover {
  border-color: var(--line-strong);
}

.user-avatar {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--ink);
  color: var(--paper-2);
  font-family: var(--serif);
  font-size: 14px;
}

.user-name {
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--ink-soft);
}

.nav-login {
  padding-left: 10px;
  padding-right: 10px;
  border-color: transparent;
  color: var(--ink-soft);
}

.mobile-nav {
  display: none;
}

@media (max-width: 900px) {
  .main-nav,
  .nav-login {
    display: none;
  }

  .mobile-nav {
    display: flex;
    gap: 22px;
    overflow-x: auto;
    padding: 0 0 10px;
    scrollbar-width: none;
  }

  .mobile-nav::-webkit-scrollbar {
    display: none;
  }

  .mobile-nav .nav-link {
    font-size: 13px;
    white-space: nowrap;
  }

  .header-inner {
    height: 70px;
  }
}

@media (max-width: 520px) {
  .brand__text small {
    display: none;
  }

  .user-name {
    display: none;
  }

  .nav-link--me {
    display: none;
  }

  .header-actions {
    gap: 8px;
  }

  .header-actions .icon-btn {
    display: none;
  }

  .header-actions .nav-login {
    display: inline-flex;
  }

  .header-actions .btn--primary {
    display: none;
  }
}
</style>
