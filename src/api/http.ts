import axios, { type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

const TOKEN_KEY = 'laycoo_token'

export const getToken = (): string => localStorage.getItem(TOKEN_KEY) || ''

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
}

const http = axios.create({
  baseURL: '/api/v1',
  timeout: 20000
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function handleUnauthorized(): void {
  clearToken()
  ElMessage.warning('登录状态已失效，请重新登录')
  window.dispatchEvent(new CustomEvent('laycoo:unauthorized'))
}

http.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) {
        return body.data
      }
      if (body.code === 401) {
        handleUnauthorized()
        return Promise.reject(new Error(body.msg || '请先登录'))
      }
      ElMessage.error(body.msg || '请求失败')
      return Promise.reject(new Error(body.msg || '请求失败'))
    }
    return body
  },
  (error) => {
    if (error.response?.status === 401) {
      handleUnauthorized()
      return Promise.reject(new Error('请先登录'))
    }
    if (error.response?.status === 403) {
      ElMessage.error(error.response?.data?.msg || '没有访问权限')
      return Promise.reject(new Error('没有访问权限'))
    }
    const message =
      error.response?.data?.msg ||
      (error.code === 'ECONNABORTED' ? '请求超时，请稍后再试' : '网络异常，请确认后端服务已启动')
    ElMessage.error(message)
    return Promise.reject(new Error(message))
  }
)

export default http
