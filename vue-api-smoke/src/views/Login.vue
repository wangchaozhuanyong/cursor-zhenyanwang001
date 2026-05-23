<template>
  <div>
    <h3>登录</h3>
    <p>POST /api/auth/login</p>
    <div>
      <label>手机号 <input v-model="phone" /></label>
    </div>
    <div style="margin-top: 8px">
      <label>密码 <input v-model="password" type="password" /></label>
    </div>
    <button style="margin-top: 12px" @click="submit" :disabled="loading">登录</button>
    <pre v-if="msg" style="margin-top: 12px; white-space: pre-wrap">{{ msg }}</pre>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { http } from '../api/http';

const router = useRouter();
const phone = ref('');
const password = ref('');
const loading = ref(false);
const msg = ref('');

async function submit() {
  msg.value = '';
  loading.value = true;
  try {
    const { data } = await http.post('/auth/login', {
      phone: phone.value.trim(),
      password: password.value,
    });
    if (data.code !== 0) {
      msg.value = JSON.stringify(data, null, 2);
      return;
    }
    const token = data.data?.token?.accessToken;
    if (!token) {
      msg.value = '响应无 accessToken：\n' + JSON.stringify(data, null, 2);
      return;
    }
    localStorage.setItem('accessToken', token);
    localStorage.setItem('loginPhone', phone.value.trim());
    msg.value = '登录成功，已保存 token。';
    router.push('/');
  } catch (e) {
    msg.value = e?.response?.data
      ? JSON.stringify(e.response.data, null, 2)
      : String(e?.message || e);
  } finally {
    loading.value = false;
  }
}
</script>
