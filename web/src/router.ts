import { createRouter, createWebHistory } from 'vue-router'
import Chat from './pages/Chat.vue'
import Kb from './pages/Kb.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/chat'
    },
    {
      path: '/chat',
      name: 'Chat',
      component: Chat
    },
    {
      path: '/kb',
      name: 'Kb',
      component: Kb
    }
  ]
})

export default router