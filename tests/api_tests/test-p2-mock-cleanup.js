#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
const ROOT_DIR = path.resolve(__dirname, '../..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function unwrapPayload(payload) {
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data;
  }
  return payload;
}

async function apiRequest(urlPath, { method = 'GET', token, body, headers = {} } = {}) {
  const finalHeaders = { ...headers };
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let finalBody;
  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(body);
  }

  const resp = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers: finalHeaders,
    body: finalBody,
  });

  const text = await resp.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (err) {
    payload = { raw: text };
  }

  return {
    status: resp.status,
    payload,
  };
}

async function login(username, password) {
  const res = await apiRequest('/api/login', {
    method: 'POST',
    body: { username, password },
  });

  assert(res.status === 200, `Login failed for ${username}, HTTP=${res.status}`);
  const userData = unwrapPayload(res.payload);
  assert(userData && typeof userData.token === 'string', `Login response has no token for ${username}`);

  return {
    id: userData.id,
    token: userData.token,
  };
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assertNoPattern(filePath, pattern, description) {
  const content = readText(filePath);
  assert(!pattern.test(content), `${filePath}: should not contain ${description}`);
}

function assertHasPattern(filePath, pattern, description) {
  const content = readText(filePath);
  assert(pattern.test(content), `${filePath}: missing ${description}`);
}

function runStaticChecks() {
  const reportListFile = path.join(ROOT_DIR, 'src/pages/farmer/report/list.vue');
  assertNoPattern(reportListFile, /originalMockList/, 'originalMockList');
  assertNoPattern(reportListFile, /global_report_list/, 'global_report_list');
  assertHasPattern(reportListFile, /\/api\/farmer-reports/, 'real farmer reports API usage');

  const supplyFile = path.join(ROOT_DIR, 'src/pages/farmer/supply/index.vue');
  assertNoPattern(supplyFile, /originalMockList/, 'originalMockList');
  assertNoPattern(supplyFile, /global_demand_list/, 'global_demand_list');
  assertHasPattern(supplyFile, /\/api\/processor-requests\?for_farmers=true/, 'processor requests API usage');
  assertHasPattern(supplyFile, /\/api\/intentions/, 'intentions API usage');

  const merchantOrdersFile = path.join(ROOT_DIR, 'src/pages/merchant/orders/index.vue');
  assertNoPattern(merchantOrdersFile, /global_order_list/, 'global_order_list');
  assertHasPattern(merchantOrdersFile, /\/api\/orders/, 'orders API usage');

  const merchantOrderDetailFile = path.join(ROOT_DIR, 'src/pages/merchant/orders/detail.vue');
  assertNoPattern(merchantOrderDetailFile, /useMockData\s*\(/, 'useMockData fallback');
  assertNoPattern(merchantOrderDetailFile, /\/api\/merchant\/orders\//, 'legacy merchant order API path');
  assertNoPattern(merchantOrderDetailFile, /global_order_list/, 'global_order_list');
  assertHasPattern(merchantOrderDetailFile, /\/api\/orders\//, 'orders detail API usage');

  const processorOrdersFile = path.join(ROOT_DIR, 'src/pages/processor/orders/index.vue');
  assertNoPattern(processorOrdersFile, /global_order_list/, 'global_order_list');
  assertHasPattern(processorOrdersFile, /\/api\/orders/, 'orders API usage');

  const processorOrderDetailFile = path.join(ROOT_DIR, 'src/pages/processor/orders/detail.vue');
  assertNoPattern(processorOrderDetailFile, /useMockData\s*\(/, 'useMockData fallback');
  assertNoPattern(processorOrderDetailFile, /\/api\/processor\/orders\//, 'legacy processor order API path');
  assertNoPattern(processorOrderDetailFile, /global_order_list/, 'global_order_list');
  assertHasPattern(processorOrderDetailFile, /\/api\/orders\//, 'orders detail API usage');
}

async function runApiChecks() {
  const health = await apiRequest('/health');
  assert(health.status === 200, `Health check failed, HTTP=${health.status}`);

  const init = await apiRequest('/init', { method: 'POST' });
  assert(init.status === 200, `Init failed, HTTP=${init.status}`);

  const farmer = await login('farmer001', 'farmer123');
  const recycler = await login('recycler001', 'recycler123');
  const processor = await login('processor001', 'processor123');

  const createOrderRes = await apiRequest('/api/orders', {
    method: 'POST',
    token: farmer.token,
    body: {
      recycler_id: recycler.id,
      weight_kg: 188,
      price_per_kg: 1.3,
      notes: 'P2 order API check',
    },
  });
  assert(createOrderRes.status === 200, `Create order failed, HTTP=${createOrderRes.status}`);

  const createOrderData = unwrapPayload(createOrderRes.payload);
  const orderId = createOrderData && createOrderData.id;
  assert(orderId, 'Create order response has no id');

  const listRes = await apiRequest('/api/orders', { token: recycler.token });
  assert(listRes.status === 200, `Recycler list orders failed, HTTP=${listRes.status}`);
  const orderList = unwrapPayload(listRes.payload);
  assert(Array.isArray(orderList), 'Orders list payload is not an array');
  assert(orderList.some((item) => Number(item.id) === Number(orderId)), 'Created order not found in recycler list');

  const detailRes = await apiRequest(`/api/orders/${orderId}`, { token: recycler.token });
  assert(detailRes.status === 200, `Recycler order detail failed, HTTP=${detailRes.status}`);
  const detailData = unwrapPayload(detailRes.payload);
  assert(Number(detailData.id) === Number(orderId), 'Order detail id mismatch');

  const shippedRes = await apiRequest(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    token: recycler.token,
    body: { status: 'shipped' },
  });
  assert(shippedRes.status === 200, `Update order status to shipped failed, HTTP=${shippedRes.status}`);

  const completedRes = await apiRequest(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    token: recycler.token,
    body: { status: 'completed' },
  });
  assert(completedRes.status === 200, `Update order status to completed failed, HTTP=${completedRes.status}`);

  const farmerDetail = await apiRequest(`/api/orders/${orderId}`, { token: farmer.token });
  assert(farmerDetail.status === 200, `Farmer detail check failed, HTTP=${farmerDetail.status}`);
  const farmerDetailData = unwrapPayload(farmerDetail.payload);
  assert(farmerDetailData.status === 'completed', 'Farmer detail status is not completed');

  const outsiderDetail = await apiRequest(`/api/orders/${orderId}`, { token: processor.token });
  assert(outsiderDetail.status === 403, `Outsider should be forbidden, got HTTP=${outsiderDetail.status}`);
}

async function main() {
  console.log(`[P2] Base URL: ${BASE_URL}`);
  runStaticChecks();
  console.log('[P2] Static de-mock checks passed.');

  await runApiChecks();
  console.log('[P2] API checks passed.');
}

main().catch((err) => {
  console.error(`\n[P2] Mock cleanup checks FAILED: ${err.message}`);
  process.exit(1);
});
