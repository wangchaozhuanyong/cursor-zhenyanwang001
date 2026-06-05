/**
 * Re-encode oversized home navigation image icons as thumb uploads.
 *
 * Dry run:
 *   node scripts/backfill-home-nav-icons.js
 *
 * Apply:
 *   node scripts/backfill-home-nav-icons.js --apply
 *
 * Restore from an apply backup:
 *   node scripts/backfill-home-nav-icons.js --restore backups/home-nav-icon-backfill-xxx.json --apply
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const db = require('../src/config/db');
const { writeMediaFromFile } = require('../src/modules/user/service/uploadMedia.service');
const { getS3ObjectBuffer, isS3StorageEnabled } = require('../src/utils/objectStorage');
const {
  extensionForMimeType,
  extractSourceStorageKey,
  inferImageMimeType,
  isBackfillableIconUrl,
  shouldOptimizeIconImage,
  summarizeBytes,
} = require('../src/maintenance/homeNavIconBackfill');
const { extractStorageKeyFromSource } = require('../src/modules/media/service/navIconThumb.service');

const SERVER_ROOT = path.join(__dirname, '..');
const DEFAULT_LIMIT = 100;
const DEFAULT_TIMEOUT_MS = 20_000;

function parseArgs(argv) {
  const args = {
    apply: false,
    baseUrl: process.env.PUBLIC_APP_URL || process.env.APP_URL || '',
    includeExternal: false,
    limit: DEFAULT_LIMIT,
    maxEdge: 256,
    restorePath: '',
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (const arg of argv) {
    if (arg === '--apply') args.apply = true;
    else if (arg === '--include-external') args.includeExternal = true;
    else if (arg.startsWith('--base-url=')) args.baseUrl = arg.slice('--base-url='.length).trim();
    else if (arg.startsWith('--limit=')) args.limit = Math.max(1, Number(arg.slice('--limit='.length)) || DEFAULT_LIMIT);
    else if (arg.startsWith('--max-edge=')) args.maxEdge = Math.max(48, Number(arg.slice('--max-edge='.length)) || 256);
    else if (arg.startsWith('--restore=')) args.restorePath = arg.slice('--restore='.length).trim();
    else if (arg.startsWith('--timeout-ms=')) args.timeoutMs = Math.max(3_000, Number(arg.slice('--timeout-ms='.length)) || DEFAULT_TIMEOUT_MS);
  }

  return args;
}

function resolveBackupPath(input) {
  if (!input) return '';
  return path.isAbsolute(input) ? input : path.join(SERVER_ROOT, input);
}

function resolveLocalUploadPath(iconUrl) {
  const raw = String(iconUrl || '').trim();
  if (!raw.startsWith('/uploads/')) return '';
  const rel = raw.replace(/[?#].*$/, '').replace(/^\//, '');
  const resolved = path.resolve(SERVER_ROOT, 'public', rel);
  const uploadsRoot = path.resolve(SERVER_ROOT, 'public', 'uploads');
  if (!resolved.startsWith(uploadsRoot)) return '';
  return resolved;
}

function resolveFetchUrl(iconUrl, baseUrl) {
  const raw = String(iconUrl || '').trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/') && baseUrl) return new URL(raw, baseUrl).toString();
  return '';
}

async function loadIconImage(iconUrl, options) {
  const localPath = resolveLocalUploadPath(iconUrl);
  if (localPath && fs.existsSync(localPath)) {
    const buffer = await fs.promises.readFile(localPath);
    return {
      buffer,
      contentType: inferImageMimeType(iconUrl),
      source: localPath,
    };
  }

  if (isS3StorageEnabled()) {
    const storageKey = extractStorageKeyFromSource(iconUrl);
    if (storageKey) {
      try {
        const buffer = await getS3ObjectBuffer(storageKey);
        return {
          buffer,
          contentType: inferImageMimeType(iconUrl),
          source: `s3://${storageKey}`,
        };
      } catch (error) {
        console.warn(`[warn] object storage read failed ${storageKey}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  const fetchUrl = resolveFetchUrl(iconUrl, options.baseUrl);
  if (!fetchUrl) {
    throw new Error('relative icon URL requires --base-url or a local /public/uploads file');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const res = await fetch(fetchUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: inferImageMimeType(iconUrl, res.headers.get('content-type') || ''),
      source: fetchUrl,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function selectNavItems(limit) {
  const [rows] = await db.query(
    `SELECT id, title, icon_url, sort_order
       FROM home_nav_items
      WHERE icon_url IS NOT NULL
        AND TRIM(icon_url) <> ''
      ORDER BY sort_order ASC, created_at ASC
      LIMIT ?`,
    [limit],
  );
  return rows;
}

async function updateNavIconUrl(id, oldUrl, newUrl) {
  const [result] = await db.query(
    'UPDATE home_nav_items SET icon_url = ? WHERE id = ? AND icon_url = ?',
    [newUrl, id, oldUrl],
  );
  return result.affectedRows || 0;
}

async function writeBackup(entries) {
  const backupDir = path.join(SERVER_ROOT, 'backups');
  await fs.promises.mkdir(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(backupDir, `home-nav-icon-backfill-${stamp}.json`);
  await fs.promises.writeFile(
    file,
    JSON.stringify({
      createdAt: new Date().toISOString(),
      description: 'Backup for home_nav_items.icon_url before icon thumb backfill',
      entries,
    }, null, 2),
  );
  return file;
}

async function restoreBackup(restorePath, apply) {
  const file = resolveBackupPath(restorePath);
  const parsed = JSON.parse(await fs.promises.readFile(file, 'utf8'));
  const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
  let restored = 0;
  for (const entry of entries) {
    const id = String(entry.id || '').trim();
    const oldUrl = String(entry.oldUrl || '').trim();
    const newUrl = String(entry.newUrl || '').trim();
    if (!id || !oldUrl) continue;
    if (!apply) {
      console.log(`[dry-run:restore] ${id} ${newUrl || '(current)'} -> ${oldUrl}`);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const [result] = await db.query(
      newUrl
        ? 'UPDATE home_nav_items SET icon_url = ? WHERE id = ? AND icon_url = ?'
        : 'UPDATE home_nav_items SET icon_url = ? WHERE id = ?',
      newUrl ? [oldUrl, id, newUrl] : [oldUrl, id],
    );
    restored += result.affectedRows || 0;
  }
  console.log(`${apply ? '[restore]' : '[dry-run:restore]'} entries=${entries.length} restored=${restored}`);
}

async function backfill(options) {
  const rows = await selectNavItems(options.limit);
  const backupEntries = [];
  const stats = {
    scanned: rows.length,
    candidates: 0,
    skipped: 0,
    optimized: 0,
    failed: 0,
  };

  for (const row of rows) {
    const iconUrl = String(row.icon_url || '').trim();
    if (!isBackfillableIconUrl(iconUrl, { includeExternal: options.includeExternal })) {
      stats.skipped += 1;
      continue;
    }
    stats.candidates += 1;

    try {
      // eslint-disable-next-line no-await-in-loop
      const loaded = await loadIconImage(iconUrl, options);
      // eslint-disable-next-line no-await-in-loop
      const metadata = await sharp(loaded.buffer).metadata();
      if (!shouldOptimizeIconImage(metadata, { maxEdge: options.maxEdge })) {
        stats.skipped += 1;
        console.log(`[skip] ${row.id} ${metadata.width || 0}x${metadata.height || 0} ${summarizeBytes(loaded.buffer.length)} ${iconUrl}`);
        continue;
      }

      console.log(`[candidate] ${row.id} ${metadata.width || 0}x${metadata.height || 0} ${summarizeBytes(loaded.buffer.length)} ${iconUrl}`);
      if (!options.apply) continue;

      const mimeType = inferImageMimeType(iconUrl, loaded.contentType);
      const file = {
        buffer: loaded.buffer,
        size: loaded.buffer.length,
        mimetype: mimeType,
        originalname: `home-nav-icon${extensionForMimeType(mimeType)}`,
      };

      // eslint-disable-next-line no-await-in-loop
      const uploaded = await writeMediaFromFile(file, 'thumb', {
        uploaderId: null,
        uploaderType: 'system',
        uploadSource: 'home_nav_icon_backfill',
        sourceStorageKey: extractStorageKeyFromSource(iconUrl) || extractSourceStorageKey(iconUrl),
      });

      // eslint-disable-next-line no-await-in-loop
      const affected = await updateNavIconUrl(row.id, iconUrl, uploaded.url);
      if (affected !== 1) throw new Error('database row changed before update');

      backupEntries.push({
        id: row.id,
        title: row.title || '',
        oldUrl: iconUrl,
        newUrl: uploaded.url,
        oldWidth: metadata.width || null,
        oldHeight: metadata.height || null,
        oldSizeBytes: loaded.buffer.length,
        newFilename: uploaded.filename,
      });
      stats.optimized += 1;
      console.log(`[updated] ${row.id} -> ${uploaded.url}`);
    } catch (error) {
      stats.failed += 1;
      console.warn(`[failed] ${row.id} ${error instanceof Error ? error.message : error}`);
    }
  }

  let backupFile = '';
  if (options.apply && backupEntries.length) {
    backupFile = await writeBackup(backupEntries);
    console.log(`[backup] ${backupFile}`);
  }
  console.log(`${options.apply ? '[apply]' : '[dry-run]'} ${JSON.stringify(stats)}`);
  if (!options.apply) {
    console.log('No database changes were made. Add --apply to update icon URLs.');
  }
  return { stats, backupFile };
}

(async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.restorePath) {
    await restoreBackup(options.restorePath, options.apply);
    return;
  }
  await backfill(options);
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end().catch(() => {});
  });
