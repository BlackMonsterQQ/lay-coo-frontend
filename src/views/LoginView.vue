<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import AuthLayout from '@/components/AuthLayout.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({
  username: '',
  password: ''
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

function fill(username: string, password: string) {
  form.username = username
  form.password = password
}

async function submit() {
  if (!formRef.value) {
    return
  }
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }
  loading.value = true
  try {
    await userStore.login(form.username.trim(), form.password)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.replace(redirect)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout eyebrow="WELCOME BACK" title="欢迎回来" lead="登录后，收藏、评分与推荐都会记得你。">
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="auth-form" @submit.prevent="submit">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" size="large" placeholder="请输入用户名" autocomplete="username" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input
          v-model="form.password"
          size="large"
          type="password"
          show-password
          placeholder="请输入密码"
          autocomplete="current-password"
          @keyup.enter="submit"
        />
      </el-form-item>

      <button class="btn btn--primary btn--lg btn--block auth-form__submit" type="button" :disabled="loading" @click="submit">
        {{ loading ? '登录中…' : '登录' }}
      </button>
    </el-form>

    <div class="demo-accounts">
      <span class="demo-accounts__label">演示账号，一键填入</span>
      <div class="demo-accounts__list">
        <button type="button" class="demo-account" @click="fill('demo', 'demo123')">
          <strong>demo</strong>
          <span>普通用户 / demo123</span>
        </button>
        <button type="button" class="demo-account" @click="fill('admin', 'admin123')">
          <strong>admin</strong>
          <span>管理员 / admin123</span>
        </button>
      </div>
    </div>

    <p class="auth-switch">
      还没有账号？
      <RouterLink to="/register">注册一个</RouterLink>
    </p>
  </AuthLayout>
</template>

<style scoped>
.auth-form {
  margin-top: 30px;
}

.auth-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.auth-form :deep(.el-form-item__label) {
  padding-bottom: 6px;
  font-size: 13px;
}

.auth-form :deep(.el-input__wrapper) {
  padding: 4px 14px;
}

.auth-form__submit {
  margin-top: 6px;
}

.demo-accounts {
  margin-top: 26px;
  padding: 16px 18px;
  border: 1px dashed var(--line-strong);
  border-radius: 16px;
  background: rgba(255, 252, 245, 0.55);
}

.demo-accounts__label {
  display: block;
  margin-bottom: 10px;
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.demo-accounts__list {
  display: flex;
  gap: 8px;
}

.demo-account {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper-2);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.demo-account:hover {
  border-color: var(--cinnabar-soft);
  transform: translateY(-1px);
}

.demo-account strong {
  font-size: 13px;
  color: var(--ink);
}

.demo-account span {
  font-size: 10.5px;
  color: var(--muted);
}

.auth-switch {
  margin-top: 24px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
}

.auth-switch a {
  color: var(--cinnabar);
  font-weight: 500;
}

.auth-switch a:hover {
  text-decoration: underline;
}
</style>
