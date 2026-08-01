const EFFECTIVE_PRODUCT_MEDIA_SQL = `(
  NULLIF(TRIM(p.cover_image), '') IS NOT NULL
  OR EXISTS (
    SELECT 1
    FROM product_variants media_variant
    WHERE media_variant.product_id = p.id
      AND media_variant.deleted_at IS NULL
      AND media_variant.enabled = 1
      AND NULLIF(TRIM(media_variant.image_url), '') IS NOT NULL
  )
)`;

function buildProductMediaFilterSql(value) {
  const status = String(value || '').trim();
  if (status === 'missing') return ` AND NOT ${EFFECTIVE_PRODUCT_MEDIA_SQL}`;
  if (status === 'normal') return ` AND ${EFFECTIVE_PRODUCT_MEDIA_SQL}`;
  return '';
}

module.exports = {
  EFFECTIVE_PRODUCT_MEDIA_SQL,
  buildProductMediaFilterSql,
};
