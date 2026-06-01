require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env'), override: true });

const userModule = require('../modules/user');
const { processVideoAsset } = require('../modules/media/service/videoTranscode.service');

const userApi = userModule.api;

const intervalMs = Math.max(10_000, Number(process.env.MEDIA_TRANSCODE_POLL_MS || 60_000));
const batchSize = Math.max(1, Math.min(5, Number(process.env.MEDIA_TRANSCODE_BATCH_SIZE || 1)));
let running = false;
let stopping = false;

async function tick() {
  if (running || stopping) return;
  running = true;
  try {
    const assets = await userApi.selectPendingVideoTranscodeAssets(batchSize);
    for (const asset of assets) {
      if (stopping) break;
      try {
        const result = await processVideoAsset(asset);
        if (!result?.skipped) {
          console.info(`[media-transcode] asset=${asset.id} done replacedProducts=${result.replacedProducts || 0}`);
        }
      } catch (error) {
        console.error(`[media-transcode] asset=${asset.id} failed: ${error?.message || error}`);
      }
    }
  } catch (error) {
    console.error(`[media-transcode] tick failed: ${error?.message || error}`);
  } finally {
    running = false;
  }
}

function shutdown(signal) {
  stopping = true;
  console.info(`[media-transcode] received ${signal}, stopping after current job`);
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.info(`[media-transcode] started intervalMs=${intervalMs} batchSize=${batchSize}`);
tick();
setInterval(tick, intervalMs);
