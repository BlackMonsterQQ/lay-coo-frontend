<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import AuthLayout from '@/components/AuthLayout.vue'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({
  username: '',
  nickname: '',
  password: '',
  confirm: ''
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]{4,20}$/, message: '4-20 位字母、数字或下划线', trigger: 'blur' }
  ],
  nickname: [{ max: 20, message: '昵称最多 20 个字符', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度 6-32 位', trigger: 'blur' }
  ],
  confirm: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== form.password) {
          callback(new Error('两次输入的密码不一致'))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ]
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
    await userStore.register({
      username: form.username.trim(),
      password: form.password,
      nickname: form.nickname.trim() || undefined
    })
    router.replace('/')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout eyebrow="JOIN LAYCOO" title="加入岚途" lead="注册后可以收藏、评分、评论，也会得到更懂你的推荐。">
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="auth-form" @submit.prevent="submit">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" size="large" placeholder="4-20 位字母、数字或下划线" autocomplete="username" />
      </el-form-item>
      <el-form-item label="昵称（选填）" prop="nickname">
        <el-input v-model="form.nickname" size="large" placeholder="想让我们怎么称呼你" />
      </el-form-item>
      <div class="form-row">
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" size="large" type="password" show-password placeholder="至少 6 位" autocomplete="new-password" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirm">
          <el-input
            v-model="form.confirm"
            size="large"
            type="password"
            show-password
            placeholder="再输入一次"
            autocomplete="new-password"
            @keyup.enter="submit"
          />
        </el-form-item>
      </div>

      <button class="btn btn--primary btn--lg btn--block auth-form__submit" type="button" :disabled="loading" @click="submit">
        {{ loading ? '注册中…' : '创建账号' }}
      </button>
    </el-form>

    <p class="auth-switch">
      已经有账号？
      <RouterLink to="/login">直接登录</RouterLink>
    </p>
  </AuthLayout>
</template>

<style scoped>
.auth-form {
  margin-top: 28px;
}

.auth-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.auth-form :deep(.el-form-item__label) {
  padding-bottom: 6px;
  font-size: 13px;
}

.auth-form :deep(.el-input__wrapper) {
  padding: 4px 14px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.auth-form__submit {
  margin-top: 8px;
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

@media (max-width: 480px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
