#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assertHasPattern(filePath, pattern, description) {
  const content = readText(filePath);
  assert(pattern.test(content), `${filePath}: missing ${description}`);
}

function assertNoPattern(filePath, pattern, description) {
  const content = readText(filePath);
  assert(!pattern.test(content), `${filePath}: should not contain ${description}`);
}

function collectFilesRecursively(dirPath, matcher, bucket = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectFilesRecursively(absolutePath, matcher, bucket);
      continue;
    }
    if (matcher(absolutePath)) bucket.push(absolutePath);
  }
  return bucket;
}

function runIndexBoundaryChecks() {
  const indexFile = path.join(ROOT_DIR, 'src/pages/index/index.vue');

  assertHasPattern(indexFile, /from ['"]@\/utils\/session['"]/u, 'session utility import');
  assertHasPattern(indexFile, /syncSessionFromServer\(\)/u, 'syncSessionFromServer usage');
  assertHasPattern(indexFile, /roleAllowed\(/u, 'roleAllowed usage');

  assertNoPattern(indexFile, /uni\.request\([\s\S]*?\/api\/me/u, 'raw /api/me request logic');
  assertNoPattern(indexFile, /const\s+normalizeClientRole\s*=\s*/u, 'local role normalization duplication');
  assertNoPattern(indexFile, /const\s+isRoleAllowed\s*=\s*/u, 'local role permission duplication');
}

function runDashboardGuardChecks() {
  const dashboardFiles = [
    'src/pages/admin/dashboard/index.vue',
    'src/pages/farmer/dashboard/index.vue',
    'src/pages/merchant/dashboard/index.vue',
    'src/pages/processor/dashboard/index.vue',
  ];

  for (const relativeFile of dashboardFiles) {
    const filePath = path.join(ROOT_DIR, relativeFile);
    assertHasPattern(filePath, /syncSessionFromServer/u, 'syncSessionFromServer import/usage');
    assertHasPattern(filePath, /roleAllowed\(/u, 'roleAllowed guard usage');
  }
}

function runCurrentRoleReadChecks() {
  const pagesDir = path.join(ROOT_DIR, 'src/pages');
  const vueFiles = collectFilesRecursively(pagesDir, (filePath) => filePath.endsWith('.vue'));

  for (const filePath of vueFiles) {
    assertNoPattern(filePath, /getStorageSync\(\s*['"]current_role['"]\s*\)/u, 'direct current_role read for authorization');
  }
}

function main() {
  runIndexBoundaryChecks();
  runDashboardGuardChecks();
  runCurrentRoleReadChecks();

  console.log('[P9] Frontend auth trust-boundary checks passed.');
}

try {
  main();
} catch (err) {
  console.error(`\n[P9] Frontend auth trust-boundary checks FAILED: ${err.message}`);
  process.exit(1);
}
