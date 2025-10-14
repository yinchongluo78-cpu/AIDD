import { createRouter, createWebHistory } from 'vue-router'
import Login from './views/Login.vue'
import Dashboard from './views/Dashboard.vue'
import Overview from './views/Overview.vue'
import Users from './views/Users.vue'
import Conversations from './views/Conversations.vue'
import KnowledgeBase from './views/KnowledgeBase.vue'
import System from './views/System.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login
    },
    {
      path: '/',
      name: 'Dashboard',
      component: Dashboard,
      redirect: '/overview',
      children: [
        {
          path: '/overview',
          name: 'Overview',
          component: Overview
        },
        {
          path: '/users',
          name: 'Users',
          component: Users
        },
        {
          path: '/conversations',
          name: 'Conversations',
          component: Conversations
        },
        {
          path: '/knowledge-base',
          name: 'KnowledgeBase',
          component: KnowledgeBase
        },
        {
          path: '/system',
          name: 'System',
          component: System
        }
      ]
    }
  ]
})

// 路由守卫：检查是否登录
router.beforeEach((to, _from, next) => {
  const isAuthenticated = sessionStorage.getItem('admin_auth') === 'true'

  if (to.path !== '/login' && !isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router
