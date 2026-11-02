import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    requiresAdmin?: boolean
    guestOnly?: boolean
    bare?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0 }
  },
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: '发现本地' } },
    { path: '/explore', name: 'explore', component: () => import('@/views/ExploreView.vue'), meta: { title: '探索' } },
    { path: '/search', name: 'search', component: () => import('@/views/SearchView.vue'), meta: { title: '搜索' } },
    {
      path: '/content/:id',
      name: 'detail',
      component: () => import('@/views/DetailView.vue'),
      meta: { title: '内容详情' }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: '登录', guestOnly: true, bare: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { title: '注册', guestOnly: true, bare: true }
    },
    {
      path: '/me',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { title: '我的', requiresAuth: true }
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { title: '运营后台', requiresAuth: true, requiresAdmin: true, bare: true }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: '页面未找到' }
    }
  ]
})

router.beforeEach(async (to) => {
  const user = useUserStore()

  if (to.meta.requiresAuth && !user.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin) {
    if (!user.isLoggedIn) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }
    if (!user.profile) {
      const profile = await user.fetchProfile()
      if (!profile) {
        return { path: '/login', query: { redirect: to.fullPath } }
      }
    }
    if (!user.isAdmin) {
      return { path: '/' }
    }
  }

  if (to.meta.guestOnly && user.isLoggedIn) {
    return { path: '/' }
  }

  return true
})

router.afterEach((to) => {
  const base = '岚途 LayCoo · 本地文旅智能推荐'
  document.title = to.meta.title ? `${to.meta.title} | ${base}` : base
})

export default router
