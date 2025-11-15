<template>
  <div class="login-container">
    <div class="login-card">
      <h1>学习助手</h1>
      <div class="tabs">
        <button
          :class="{ active: mode === 'login' }"
          @click="handleTabClick('login')"
        >
          登录
        </button>
        <button
          :class="{ active: mode === 'register' }"
          @click="handleTabClick('register')"
        >
          注册
        </button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <input
            v-model="form.email"
            type="email"
            placeholder="邮箱"
            required
          />
        </div>

        <div class="form-group">
          <input
            v-model="form.password"
            type="password"
            placeholder="密码"
            required
          />
        </div>

        <div v-if="mode === 'register'" class="form-group">
          <input
            v-model="form.confirmPassword"
            type="password"
            placeholder="确认密码"
            required
          />
        </div>

        <button type="submit" class="submit-btn" @click="handleButtonClick">
          {{ mode === 'login' ? '登录' : '注册' }}
        </button>
      </form>

      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="loading" class="loading">处理中...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

console.log('Login.vue loaded!')

const router = useRouter()
const mode = ref<'login' | 'register'>('login')
const error = ref('')
const loading = ref(false)

const form = ref({
  email: '',
  password: '',
  confirmPassword: ''
})

const handleTabClick = (newMode: 'login' | 'register') => {
  console.log('Tab clicked:', newMode)
  mode.value = newMode
}

const handleButtonClick = (e: Event) => {
  console.log('Button clicked!', e)
}

const handleSubmit = async (e: Event) => {
  console.log('handleSubmit called!', e)
  error.value = ''
  loading.value = true

  if (mode.value === 'register' && form.value.password !== form.value.confirmPassword) {
    error.value = '两次密码不一致'
    loading.value = false
    return
  }

  try {
    console.log('Sending request...', {
      mode: mode.value,
      email: form.value.email
    })

    const endpoint = mode.value === 'login' ? '/auth/login' : '/auth/register'
    console.log('Endpoint:', endpoint)

    const response = await api.post(endpoint, {
      email: form.value.email,
      password: form.value.password
    }, {
      timeout: 10000 // 设置10秒超时
    })

    console.log('Response received:', response)

    // 保存 token
    localStorage.setItem('token', response.data.token)
    localStorage.setItem('user', JSON.stringify(response.data.user))

    // 跳转到对话页面
    console.log('Navigating to /chat...')
    router.push('/chat')
  } catch (err: any) {
    console.error('Login error:', err)
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      error.value = '请求超时，请检查网络连接'
    } else if (err.code === 'ERR_NETWORK') {
      error.value = '无法连接到服务器，请确保后端正在运行'
    } else {
      error.value = err.response?.data?.message || '操作失败，请重试'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  console.log('Login.vue mounted!')
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  width: 400px;
  max-width: 90%;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.tabs {
  display: flex;
  margin-bottom: 30px;
  border-bottom: 2px solid #f0f0f0;
}

.tabs button {
  flex: 1;
  padding: 10px;
  background: none;
  border: none;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.tabs button.active {
  color: #667eea;
  border-bottom: 2px solid #667eea;
}

.form-group {
  margin-bottom: 20px;
}

input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
  transition: border 0.3s;
}

input:focus {
  outline: none;
  border-color: #667eea;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s;
}

.submit-btn:hover {
  background: #5a67d8;
}

.error {
  color: #f56565;
  text-align: center;
  margin-top: 20px;
}
</style>