<template>
  <div id="app">
    <render />
  </div>
</template>

<script>
import Render from './components/Render.vue'

export default {
  name: 'App',
  components: {
    Render
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
