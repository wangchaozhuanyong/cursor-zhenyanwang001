<template>
  <div style="padding: 16px; font-family: sans-serif">
    <h2>API 联测（Vue3）</h2>
    <p>后端：<code>{{ apiBase }}</code></p>
    <nav style="margin-bottom: 12px">
      <router-link to="/login">登录</router-link>
      |
      <router-link to="/">商品与下单</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script setup>
const apiBase = import.meta.env.VITE_API_BASE || 'http://13.214.165.214:3001';
</script>
