import Vue from 'vue'

import i18n from './i18n/i18n'

import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap-vue/dist/bootstrap-vue.css"

import BootstrapVue from "bootstrap-vue"
Vue.use(BootstrapVue)
import router from './router'
import App from './App.vue'

new Vue({
  el: '#app',
  i18n,
  render: h => h(App),
  router
})
