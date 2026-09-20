import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import './style.css'

// autoUpdate: when a new version is deployed, the new service worker takes
// over and this reloads the page onto it, so the phone never runs a stale mix.
registerSW({ immediate: true })

createApp(App).mount('#app')
