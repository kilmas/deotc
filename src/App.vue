<template>
  <div id="app">
    <transition
      name="fade"
      mode="out-in">
      <router-view class="view" />
    </transition>
  </div>
</template>

<script>
export default {
  name: 'app',
  data () {
    return {
      msg: 'a fibos deotc dapp'
    }
  }
}
</script>

<style>
</style>
