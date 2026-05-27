require('dotenv').config();

const db = require('../src/config/db');
const service = require('../src/modules/dataRetention/service/dataRetention.service');

function makeReq() {
  return {
    user: {
      id: 'system-exec',
      role: 'super_admin',
      isSuperAdmin: true,
      permissions: ['data_cleanup.execute'],
      mfaVerifiedAt: Math.floor(Date.now() / 1000),
    },
    headers: {},
    method: 'POST',
    originalUrl: '/api/admin/data-retention/runs',
  };
}

async function shutdown(exitCode = 0) {
  try {
    await db.end();
  } catch {
    // ignore pool shutdown errors
  }
  process.exit(exitCode);
}

async function main() {
  const policies = await service.listPolicies();
  const enabledKeys = policies.filter((policy) => policy.enabled).map((policy) => policy.key);
  console.log(`启用策略数: ${enabledKeys.length}`);

  const preview = await service.createPreview({ policy_keys: enabledKeys }, makeReq());
  console.log(`预览 #${preview.id} 状态: ${preview.status} 命中: ${preview.total_matched}`);

  if (!['previewed', 'partial_failed'].includes(preview.status)) {
    console.log('预览未通过，跳过执行');
    for (const step of preview.steps || []) {
      if (step.status !== 'success' && step.status !== 'skipped') {
        console.log(` - ${step.policy_key} ${step.status} ${step.error_message || ''}`);
      }
    }
    await shutdown(1);
    return;
  }

  const run = await service.executeRun(
    { preview_run_id: preview.id, policy_keys: preview.policy_keys },
    makeReq(),
  );
  console.log(
    `执行 #${run.id} 状态: ${run.status} 删除: ${run.total_deleted} 命中: ${run.total_matched} 失败: ${run.total_failed}`,
  );
  if (run.error_message) console.log(`错误: ${run.error_message}`);
  await shutdown(run.status === 'success' ? 0 : 2);
}

main().catch(async (error) => {
  console.error('执行失败:', error.message || error);
  await shutdown(1);
});
