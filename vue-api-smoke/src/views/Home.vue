<template>
  <div>
    <h3>商品列表</h3>
    <p>GET /api/products</p>
    <button @click="loadProducts" :disabled="loadingList">刷新列表</button>
    <pre style="margin-top: 8px; max-height: 200px; overflow: auto">{{ listMsg }}</pre>

    <hr style="margin: 16px 0" />

    <h3>下单</h3>
    <p>POST /api/orders（需登录，自动带 Bearer）</p>
    <div>
      <label>商品 ID <input v-model="productId" style="width: 280px" /></label>
    </div>
    <div style="margin-top: 8px">
      <label>数量 <input v-model.number="qty" type="number" min="1" /></label>
    </div>
    <div style="margin-top: 8px">
      <label>联系人 <input v-model="contactName" /></label>
    </div>
    <div style="margin-top: 8px">
      <label>电话 <input v-model="contactPhone" /></label>
    </div>
    <div style="margin-top: 8px">
      <label>地址 <input v-model="address" style="width: 280px" /></label>
    </div>
    <button style="margin-top: 12px" @click="placeOrder" :disabled="loadingOrder">下单</button>
    <pre v-if="orderMsg" style="margin-top: 12px; white-space: pre-wrap">{{ orderMsg }}</pre>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { http } from '../api/http';

const loadingList = ref(false);
const listMsg = ref('未请求');
const products = ref([]);

const productId = ref('');
const qty = ref(1);
const contactName = ref('测试');
const contactPhone = ref('');
const address = ref('测试地址');
const loadingOrder = ref(false);
const orderMsg = ref('');

onMounted(() => {
  contactPhone.value = localStorage.getItem('loginPhone') || '';
  loadProducts();
});

async function loadProducts() {
  listMsg.value = '请求中…';
  loadingList.value = true;
  try {
    const { data } = await http.get('/products', { params: { page: 1, pageSize: 20 } });
    listMsg.value = JSON.stringify(data, null, 2);
    products.value = data.data?.list || [];
    if (products.value.length && !productId.value) {
      productId.value = products.value[0].id;
    }
  } catch (e) {
    listMsg.value = e?.response?.data
      ? JSON.stringify(e.response.data, null, 2)
      : String(e?.message || e);
  } finally {
    loadingList.value = false;
  }
}

async function placeOrder() {
  orderMsg.value = '';
  if (!localStorage.getItem('accessToken')) {
    orderMsg.value = '请先前往「登录」页获取 token。';
    return;
  }
  loadingOrder.value = true;
  try {
    const { data } = await http.post('/orders', {
      items: [{ product_id: productId.value.trim(), qty: Number(qty.value) || 1 }],
      contact_name: contactName.value.trim(),
      contact_phone: contactPhone.value.trim(),
      address: address.value.trim(),
      payment_method: 'mock',
      note: 'vue-api-smoke',
    });
    orderMsg.value = JSON.stringify(data, null, 2);
  } catch (e) {
    orderMsg.value = e?.response?.data
      ? JSON.stringify(e.response.data, null, 2)
      : String(e?.message || e);
  } finally {
    loadingOrder.value = false;
  }
}
</script>
