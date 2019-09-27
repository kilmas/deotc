import Vue from 'vue'
import Router from 'vue-router'

const Otc = () => import('../components/Otc.vue')

Vue.use(Router)

export default new Router({
  mode: 'history',
  scrollBehavior: () => ({ y: 0 }),
  linkActiveClass: 'is-active',
  routes: [
    {
      path: '/',
      components: {
        default: Otc
      }
    }
  ]
})
