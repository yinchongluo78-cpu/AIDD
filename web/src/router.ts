import { createRouter, createWebHistory } from 'vue-router'
import Chat from './pages/Chat.vue'
import Kb from './pages/Kb.vue'
import Login from './pages/Login.vue'
import DiagnosticTest from './pages/DiagnosticTest.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: () => {
        const token = localStorage.getItem('token')
        return token ? '/chat' : '/login'
      }
    },
    {
      path: '/login',
      name: 'Login',
      component: Login
    },
    {
      path: '/chat',
      name: 'Chat',
      component: Chat,
      meta: { requiresAuth: true }
    },
    {
      path: '/kb',
      name: 'Kb',
      component: Kb,
      meta: { requiresAuth: true }
    },
    {
      path: '/diagnostic/:slug',
      name: 'DiagnosticTest',
      component: DiagnosticTest,
      meta: { requiresAuth: true }
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')

  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/chat')
  } else {
    next()
  }
})

export default router