#!/usr/bin/env node
/* eslint-disable no-console */
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const API = `${BASE}/api`;
const ADMIN_PHONE = process.env.ADMIN_PHONE || '18800000001';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123456';

async function jfetch(url, options = {}) {
  const res = await fetch(url, options);
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  const results = [];
  const log = (name, pass, detail) => {
    results.push({ name, pass, detail });
    console.log(`${pass ? 'PASS' : 'FAIL'} | ${name} | ${detail}`);
  };

  const loginRes = await jfetch(`${API}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: ADMIN_PHONE, password: ADMIN_PASSWORD }),
  });
  if (!loginRes.body || loginRes.body.code !== 0) {
    log('Admin Login', false, loginRes.body?.message || `HTTP ${loginRes.status}`);
    process.exit(1);
  }
  const token = loginRes.body.data?.token?.accessToken || loginRes.body.data?.token;
  const headers = { Authorization: `Bearer ${token}` };
  const me = await jfetch(`${API}/admin/auth/me`, { headers });
  const perms = me.body?.data?.permissions || me.body?.data?.permissionCodes || [];
  log('Admin permissions (monitoring)', true, Array.isArray(perms) ? perms.filter((p) => String(p).startsWith('monitoring.')).join(',') || '(none)' : JSON.stringify(me.body?.data?.role || me.body?.data));

  const overview = await jfetch(`${API}/admin/monitoring/overview`, { headers });
  log('1. 数据总览 GET /overview', overview.body?.code === 0, overview.body?.code === 0
    ? `keys=${Object.keys(overview.body.data || {}).join(',')}`
    : overview.body?.message || overview.status);

  const anomalies = await jfetch(`${API}/admin/monitoring/anomalies?page=1&pageSize=5`, { headers });
  log('2. 数据异常 GET /anomalies', anomalies.body?.code === 0, anomalies.body?.code === 0
    ? `total=${anomalies.body.data?.total ?? 0}`
    : anomalies.body?.message || anomalies.status);

  const repairs = await jfetch(`${API}/admin/monitoring/repair-tasks?page=1&pageSize=5`, { headers });
  log('3. 修复任务 GET /repair-tasks', repairs.body?.code === 0, repairs.body?.code === 0
    ? `total=${repairs.body.data?.total ?? 0}`
    : repairs.body?.message || repairs.status);

  const rules = await jfetch(`${API}/admin/monitoring/rules`, { headers });
  const ruleCount = Array.isArray(rules.body?.data) ? rules.body.data.length : 0;
  log('4. 监控规则 GET /rules', rules.body?.code === 0 && ruleCount > 0, rules.body?.code === 0
    ? `rules=${ruleCount}`
    : rules.body?.message || rules.status);

  const runs = await jfetch(`${API}/admin/monitoring/runs?page=1&pageSize=5`, { headers });
  log('5. 运行记录 GET /runs', runs.body?.code === 0, runs.body?.code === 0
    ? `total=${runs.body.data?.total ?? 0}`
    : runs.body?.message || runs.status);

  if (ruleCount > 0) {
    const code = rules.body.data[0].code;
    const runRule = await jfetch(`${API}/admin/monitoring/rules/${code}/run`, { method: 'POST', headers });
    log('4+. 监控规则 POST /rules/:code/run', runRule.body?.code === 0, runRule.body?.code === 0
      ? `rule=${code}`
      : runRule.body?.message || runRule.status);
  }

  const firstAnomaly = anomalies.body?.data?.list?.[0];
  if (firstAnomaly?.id) {
    const detail = await jfetch(`${API}/admin/monitoring/anomalies/${firstAnomaly.id}`, { headers });
    log('2+. 异常详情 GET /anomalies/:id', detail.body?.code === 0, detail.body?.code === 0
      ? `id=${firstAnomaly.id}`
      : detail.body?.message || detail.status);
  } else {
    log('2+. 异常详情 GET /anomalies/:id', true, 'skip: no anomalies');
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
