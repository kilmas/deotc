import Vue from 'vue'
import Router from 'vue-router'

const Otc = () => import('../components/Otc.vue')
const Ctc = () => import('../components/Ctc.vue')

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
    },
    {
      path: '/ctc',
      components: {
        default: Ctc
      }
    }
  ]
})
