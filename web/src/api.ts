import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 60000 // 60秒超时
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API请求失败:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    })

    // 401 或 403 都表示认证问题
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn('认证失败，准备跳转登录页')

      // 仅在特定页面才自动跳转（避免在登录页重复跳转）
      if (!window.location.pathname.includes('/login')) {
        // 延迟一点时间，让控制台日志有时间显示
        setTimeout(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          alert('登录已过期，请重新登录')
          window.location.href = '/login'
        }, 100)
      }
    }
    return Promise.reject(error)
  }
)

export default api