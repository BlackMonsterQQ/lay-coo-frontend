import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { authApi } from '@/api'
import { clearToken, getToken, setToken } from '@/api/http'
import type { AuthResult, UserInfo } from '@/types'

interface UserState {
  token: string
  profile: UserInfo | null
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    token: getToken(),
    profile: null
  }),
  getters: {
    isLoggedIn: (state): boolean => Boolean(state.token),
    isAdmin: (state): boolean => state.profile?.role === 'ADMIN'
  },
  actions: {
    setSession(result: AuthResult) {
      this.token = result.token
      this.profile = result.user
      setToken(result.token)
    },
    async login(username: string, password: string) {
      const result = await authApi.login({ username, password })
      this.setSession(result)
      ElMessage.success(`欢迎回来，${result.user.nickname}`)
    },
    async register(payload: { username: string; password: string; nickname?: string }) {
      const result = await authApi.register(payload)
      this.setSession(result)
      ElMessage.success('注册成功，欢迎加入岚途')
    },
    async fetchProfile(): Promise<UserInfo | null> {
      if (!this.token) {
        return null
      }
      try {
        this.profile = await authApi.info()
        return this.profile
      } catch {
        this.logout()
        return null
      }
    },
    logout() {
      this.token = ''
      this.profile = null
      clearToken()
    }
  }
})
