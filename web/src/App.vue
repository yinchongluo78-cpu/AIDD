<template>
  <div id="app">
    <nav>
      <router-link to="/chat">对话</router-link> |
      <router-link to="/kb">知识库</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script setup lang="ts">
</script>

<style>
#app {
  font-family: sans-serif;
  padding: 20px;
}

nav {
  margin-bottom: 20px;
}

nav a {
  margin: 0 10px;
  color: #42b883;
  text-decoration: none;
}

nav a.router-link-active {
  font-weight: bold;
}
</style>