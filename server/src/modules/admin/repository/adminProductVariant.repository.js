const db = require('../../../config/db');
const { BusinessError } = require('../../../errors/BusinessError');

async function selectVariantsByProductIds(productIds) {
  const map = new Map();
  if (!productIds.length) return map;
  const uniq = [...new Set(productIds)];
  const ph = uniq.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT id, product_id, sku_code, title, price, original_price, stock, sort_order, is_default,
            stock_warning_threshold, stock_lower_limit, stock_upper_limit, cost_price, barcode, image_url, weight, enabled
     FROM product_variants
     WHERE product_id IN (${ph}) AND deleted_at IS NULL
     ORDER BY product_id ASC, is_default DESC, sort_order ASC, created_at ASC`,
    uniq,
  );
  for (const id of uniq) map.set(id, []);
  for (const row of rows) {
    const list = map.get(row.product_id) || [];
    list.push(row);
    map.set(row.product_id, list);
  }
  return map;
}

async function selectVariantsByProductId(productId, opts = {}) {
  const includeDeleted = !!opts.includeDeleted;
  const [rows] = await db.query(
    `SELECT id, product_id, sku_code, title, price, original_price, stock, sort_order, is_default, stock_warning_threshold,
            stock_lower_limit, stock_upper_limit,
            reserved_stock, cost_price, barcode, image_url, weight, enabled, deleted_at, created_at, updated_at
     FROM product_variants
     WHERE product_id = ? ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
     ORDER BY is_default DESC, sort_order ASC, created_at ASC`,
    [productId],
  );
  return rows;
}

async function selectSpecGroupsByProductId(productId, opts = {}) {
  const includeDeleted = !!opts.includeDeleted;
  const [groups] = await db.query(
    `SELECT id, product_id, name, sort_order, created_at, updated_at, deleted_at
     FROM product_spec_groups
     WHERE product_id = ? ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
     ORDER BY sort_order ASC, created_at ASC`,
    [productId],
  );
  if (!groups.length) return [];
  const [values] = await db.query(
    `SELECT id, product_id, group_id, value, image_url, sort_order, created_at, updated_at, deleted_at
     FROM product_spec_values
     WHERE product_id = ? ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
     ORDER BY sort_order ASC, created_at ASC`,
    [productId],
  );
  const byGroup = new Map();
  for (const row of values) {
    const list = byGroup.get(row.group_id) || [];
    list.push(row);
    byGroup.set(row.group_id, list);
  }
  return groups.map((group) => ({ ...group, values: byGroup.get(group.id) || [] }));
}

async function selectVariantSpecValuesByProductId(productId) {
  const [rows] = await db.query(
    `SELECT
       pvsv.variant_id,
       pvsv.group_id,
       pvsv.value_id,
       g.name AS group_name,
       v.value AS value
     FROM product_variant_spec_values pvsv
     JOIN product_spec_groups g ON g.id = pvsv.group_id
     JOIN product_spec_values v ON v.id = pvsv.value_id
     WHERE pvsv.product_id = ?
       AND g.deleted_at IS NULL
       AND v.deleted_at IS NULL
     ORDER BY g.sort_order ASC, v.sort_order ASC, g.created_at ASC, v.created_at ASC`,
    [productId],
  );
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.variant_id) || [];
    list.push({
      group_id: row.group_id,
      group_name: row.group_name,
      value_id: row.value_id,
      value: row.value,
    });
    map.set(row.variant_id, list);
  }
  return map;
}

async function selectProductSkuMatrix(productId) {
  const [variants, specGroups, specMap] = await Promise.all([
    selectVariantsByProductId(productId),
    selectSpecGroupsByProductId(productId),
    selectVariantSpecValuesByProductId(productId),
  ]);
  const decoratedVariants = variants.map((variant) => {
    const specs = specMap.get(variant.id) || [];
    const specText = specs.map((x) => x.value).filter(Boolean).join(' / ');
    return {
      ...variant,
      spec_values: specs,
      spec_value_ids: specs.map((x) => x.value_id),
      spec_text: specText || variant.title || '',
    };
  });
  return { spec_groups: specGroups, variants: decoratedVariants };
}

async function guardSpecValueRemoval(conn, productId, valueIds) {
  if (!valueIds.length) return;
  const [rows] = await conn.query(
    `SELECT DISTINCT pv.id, pv.title, pv.sku_code, pv.stock,
       EXISTS(SELECT 1 FROM order_items oi WHERE oi.variant_id = pv.id LIMIT 1) AS has_orders,
       EXISTS(SELECT 1 FROM inventory_stock_records sr WHERE sr.variant_id = pv.id LIMIT 1) AS has_records
     FROM product_variant_spec_values rel
     JOIN product_variants pv ON pv.id = rel.variant_id
     WHERE rel.product_id = ? AND rel.value_id IN (${valueIds.map(() => '?').join(',')})
     FOR UPDATE`,
    [productId, ...valueIds],
  );
  const blocked = rows.find((row) =>
    Number(row.stock || 0) > 0 || Number(row.has_orders || 0) > 0 || Number(row.has_records || 0) > 0);
  if (blocked) {
    const skuLabel = blocked.title || blocked.sku_code || blocked.id;
    throw new BusinessError(400, `规格值已被 SKU「${skuLabel}」使用（含库存/订单/流水），无法硬删除`);
  }
}

async function softDeleteVariantsByIds(conn, productId, ids) {
  if (!ids.length) return;
  const [guardRows] = await conn.query(
    `SELECT
       v.id,
       v.title,
       v.sku_code,
       v.stock,
       EXISTS(SELECT 1 FROM order_items oi WHERE oi.variant_id = v.id LIMIT 1) AS has_orders,
       EXISTS(SELECT 1 FROM inventory_stock_records sr WHERE sr.variant_id = v.id LIMIT 1) AS has_records
     FROM product_variants v
     WHERE v.product_id = ? AND v.id IN (${ids.map(() => '?').join(',')})
     FOR UPDATE`,
    [productId, ...ids],
  );
  const blocked = guardRows.find((row) =>
    Number(row.stock || 0) > 0 || Number(row.has_orders || 0) > 0 || Number(row.has_records || 0) > 0);
  if (blocked) {
    const skuLabel = blocked.title || blocked.sku_code || blocked.id;
    throw new BusinessError(400, `SKU「${skuLabel}」存在库存/订单/流水记录，无法删除`);
  }
  await conn.query(
    `UPDATE product_variants
     SET deleted_at = NOW(), is_default = 0
     WHERE product_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
    [productId, ...ids],
  );
}

async function upsertProductVariants(productId, rows) {
  return upsertProductSkuMatrix(productId, null, rows);
}

async function upsertProductSkuMatrix(productId, specGroups, rows) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const valueIdToGroupId = new Map();
    if (Array.isArray(specGroups)) {
      const normalizedGroups = specGroups
        .filter((g) => g && String(g.name || '').trim())
        .slice(0, 3)
        .map((g, i) => ({
          ...g,
          id: g.id || require('../../../utils/helpers').generateId(),
          name: String(g.name || '').trim().slice(0, 64),
          sort_order: Number.isFinite(Number(g.sort_order)) ? Number(g.sort_order) : i,
          values: Array.isArray(g.values) ? g.values.filter((v) => String(v?.value || '').trim()).slice(0, 20) : [],
        }));
      const incomingGroupIds = new Set(normalizedGroups.map((g) => g.id));
      const incomingValueIds = new Set();
      for (const group of normalizedGroups) {
        await conn.query(
          `INSERT INTO product_spec_groups (id, product_id, name, sort_order, deleted_at)
           VALUES (?, ?, ?, ?, NULL)
           ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order), deleted_at = NULL`,
          [group.id, productId, group.name, group.sort_order],
        );
        for (let i = 0; i < group.values.length; i += 1) {
          const value = group.values[i];
          const valueId = value.id || require('../../../utils/helpers').generateId();
          incomingValueIds.add(valueId);
          valueIdToGroupId.set(valueId, group.id);
          await conn.query(
            `INSERT INTO product_spec_values (id, product_id, group_id, value, image_url, sort_order, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, NULL)
             ON DUPLICATE KEY UPDATE group_id = VALUES(group_id), value = VALUES(value), image_url = VALUES(image_url),
                                     sort_order = VALUES(sort_order), deleted_at = NULL`,
            [
              valueId,
              productId,
              group.id,
              String(value.value || '').trim().slice(0, 64),
              value.image_url || null,
              Number.isFinite(Number(value.sort_order)) ? Number(value.sort_order) : i,
            ],
          );
        }
      }

      const [oldValues] = await conn.query(
        'SELECT id FROM product_spec_values WHERE product_id = ? AND deleted_at IS NULL',
        [productId],
      );
      const removeValueIds = oldValues.map((r) => r.id).filter((vid) => !incomingValueIds.has(vid));
      await guardSpecValueRemoval(conn, productId, removeValueIds);
      if (removeValueIds.length) {
        await conn.query(
          `UPDATE product_spec_values SET deleted_at = NOW()
           WHERE product_id = ? AND id IN (${removeValueIds.map(() => '?').join(',')})`,
          [productId, ...removeValueIds],
        );
      }

      const [oldGroups] = await conn.query(
        'SELECT id FROM product_spec_groups WHERE product_id = ? AND deleted_at IS NULL',
        [productId],
      );
      const removeGroupIds = oldGroups.map((r) => r.id).filter((gid) => !incomingGroupIds.has(gid));
      if (removeGroupIds.length) {
        await conn.query(
          `UPDATE product_spec_groups SET deleted_at = NOW()
           WHERE product_id = ? AND id IN (${removeGroupIds.map(() => '?').join(',')})`,
          [productId, ...removeGroupIds],
        );
        await conn.query(
          `UPDATE product_spec_values SET deleted_at = NOW()
           WHERE product_id = ? AND group_id IN (${removeGroupIds.map(() => '?').join(',')})`,
          [productId, ...removeGroupIds],
        );
      }
    } else {
      const [values] = await conn.query(
        'SELECT id, group_id FROM product_spec_values WHERE product_id = ? AND deleted_at IS NULL',
        [productId],
      );
      for (const row of values) valueIdToGroupId.set(row.id, row.group_id);
    }

    const [existing] = await conn.query(
      'SELECT id FROM product_variants WHERE product_id = ? AND deleted_at IS NULL',
      [productId],
    );
    const existingIds = new Set(existing.map((r) => r.id));
    const keepIds = new Set(rows.filter((r) => r.id).map((r) => r.id));

    for (const r of rows) {
      if (r.id && existingIds.has(r.id)) {
        await conn.query(
          `UPDATE product_variants
           SET sku_code = ?, title = ?, price = ?, original_price = ?, stock = ?, sort_order = ?, is_default = ?,
               stock_warning_threshold = COALESCE(?, stock_warning_threshold),
               stock_lower_limit = ?,
               stock_upper_limit = ?,
               barcode = COALESCE(?, barcode), cost_price = COALESCE(?, cost_price),
               image_url = ?, weight = ?, enabled = ?, deleted_at = NULL
           WHERE id = ? AND product_id = ?`,
          [
            r.sku_code ?? null,
            r.title ?? '',
            r.price,
            r.original_price == null || r.original_price === '' ? null : Number(r.original_price),
            Number.isFinite(Number(r.stock)) ? Number(r.stock) : 0,
            r.sort_order ?? 0,
            r.is_default ? 1 : 0,
            r.stock_warning_threshold ?? null,
            r.stock_lower_limit ?? null,
            r.stock_upper_limit ?? null,
            r.barcode ?? null,
            r.cost_price ?? null,
            r.image_url || null,
            r.weight == null || r.weight === '' ? null : Number(r.weight),
            r.enabled === false || r.enabled === 0 ? 0 : 1,
            r.id,
            productId,
          ],
        );
      } else {
        await conn.query(
          `INSERT INTO product_variants
             (id, product_id, sku_code, title, price, original_price, stock, sort_order, is_default,
              stock_warning_threshold, stock_lower_limit, stock_upper_limit, reserved_stock, barcode, cost_price, image_url, weight, enabled, deleted_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)`,
          [
            r.id,
            productId,
            r.sku_code ?? null,
            r.title ?? '',
            r.price,
            r.original_price == null || r.original_price === '' ? null : Number(r.original_price),
            r.stock ?? 0,
            r.sort_order ?? 0,
            r.is_default ? 1 : 0,
            r.stock_warning_threshold ?? 5,
            r.stock_lower_limit ?? null,
            r.stock_upper_limit ?? null,
            r.reserved_stock ?? 0,
            r.barcode ?? null,
            r.cost_price ?? null,
            r.image_url || null,
            r.weight == null || r.weight === '' ? null : Number(r.weight),
            r.enabled === false || r.enabled === 0 ? 0 : 1,
          ],
        );
      }

      const specValueIds = Array.isArray(r.spec_value_ids) ? r.spec_value_ids.filter(Boolean) : [];
      await conn.query('DELETE FROM product_variant_spec_values WHERE product_id = ? AND variant_id = ?', [productId, r.id]);
      for (const valueId of specValueIds) {
        const groupId = r.spec_value_group_map?.[valueId] || valueIdToGroupId.get(valueId);
        if (!groupId) continue;
        await conn.query(
          `INSERT INTO product_variant_spec_values (id, product_id, variant_id, group_id, value_id)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE value_id = VALUES(value_id)`,
          [require('../../../utils/helpers').generateId(), productId, r.id, groupId, valueId],
        );
      }
    }

    const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
    await softDeleteVariantsByIds(conn, productId, toDelete);

    await conn.query(
      `UPDATE products p
       SET p.stock = COALESCE((SELECT SUM(v.stock) FROM product_variants v WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1),0),
           p.price = COALESCE((SELECT v.price FROM product_variants v WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1 ORDER BY v.is_default DESC, v.sort_order ASC, v.created_at ASC LIMIT 1), p.price),
           p.stock_warning_threshold = COALESCE((SELECT v.stock_warning_threshold FROM product_variants v WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1 ORDER BY v.is_default DESC, v.sort_order ASC, v.created_at ASC LIMIT 1), p.stock_warning_threshold),
           p.stock_lower_limit = (SELECT v.stock_lower_limit FROM product_variants v WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1 ORDER BY v.is_default DESC, v.sort_order ASC, v.created_at ASC LIMIT 1),
           p.stock_upper_limit = (SELECT v.stock_upper_limit FROM product_variants v WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1 ORDER BY v.is_default DESC, v.sort_order ASC, v.created_at ASC LIMIT 1)
       WHERE p.id = ?`,
      [productId],
    );

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function updateDefaultVariantPriceStock(productId, price, stock) {
  await db.query(
    'UPDATE product_variants SET price = ?, stock = ? WHERE product_id = ? AND is_default = 1 AND deleted_at IS NULL LIMIT 1',
    [price, stock, productId],
  );
}

module.exports = {
  selectVariantsByProductId,
  selectVariantsByProductIds,
  selectSpecGroupsByProductId,
  selectVariantSpecValuesByProductId,
  selectProductSkuMatrix,
  upsertProductVariants,
  upsertProductSkuMatrix,
  updateDefaultVariantPriceStock,
};

