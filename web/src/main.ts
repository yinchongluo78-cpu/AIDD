import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import 'katex/dist/katex.min.css'
import './assets/katex-override.css'

const app = createApp(App)
app.use(router)
app.mount('#app')