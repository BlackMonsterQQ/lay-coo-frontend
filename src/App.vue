<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

function onUnauthorized() {
  userStore.logout()
  if (route.path !== '/login') {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
  }
}

onMounted(() => {
  window.addEventListener('laycoo:unauthorized', onUnauthorized)
  if (userStore.isLoggedIn && !userStore.profile) {
    userStore.fetchProfile()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('laycoo:unauthorized', onUnauthorized)
})
</script>

<template>
  <div class="app-shell">
    <AppHeader v-if="route.name !== 'home'" />
    <main class="app-main" :class="{ 'app-main--bare': route.name === 'home' }">
      <RouterView v-slot="{ Component, route: current }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" :key="current.path" />
        </Transition>
      </RouterView>
    </main>
    <AppFooter v-if="!route.meta.bare" />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  padding-top: 78px;
}

.app-main.app-main--bare {
  padding-top: 0;
}

@media (max-width: 900px) {
  .app-main {
    padding-top: 106px;
  }
}
</style>
