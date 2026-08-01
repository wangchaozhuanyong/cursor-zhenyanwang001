import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const baseUrlArg = args.find((arg) => !arg.startsWith("--"));
const inputArg = args.find((arg) => arg.startsWith("--input="));
const outputArg = args.find((arg) => arg.startsWith("--output="));
const concurrencyArg = args.find((arg) => arg.startsWith("--concurrency="));

const baseUrl = String(baseUrlArg || process.env.CONTENT_BASE_URL || "").replace(/\/+$/, "");
const inputPath = path.resolve(
  process.cwd(),
  inputArg?.slice("--input=".length).trim() || "docs/production-content-repair-plan.json",
);
const outputPath = outputArg
  ? path.resolve(process.cwd(), outputArg.slice("--output=".length).trim())
  : "";
const concurrency = Math.min(
  10,
  Math.max(1, Number(concurrencyArg?.slice("--concurrency=".length)) || 5),
);
const INTERNAL_PRODUCT_FIELDS = [
  "stock_warning_threshold",
  "stock_lower_limit",
  "stock_upper_limit",
];
const INTERNAL_VARIANT_FIELDS = [
  "cost_price",
  "barcode",
  "stock_warning_threshold",
  "stock_lower_limit",
  "stock_upper_limit",
];

if (!baseUrl) {
  console.error(
    "Usage: npm run audit:production-product-media -- https://example.com "
      + "[--input=docs/production-content-repair-plan.json] "
      + "[--output=docs/production-product-media-depth.json]",
  );
  process.exit(1);
}

function nonEmpty(value) {
  return Boolean(String(value || "").trim());
}

function mediaValue(item) {
  if (typeof item === "string") return item.trim();
  if (!item || typeof item !== "object") return "";
  return String(item.url || item.image_url || item.src || "").trim();
}

function mediaList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(mediaValue).filter(nonEmpty);
}

function descriptionMedia(description) {
  const source = String(description || "");
  const matches = [
    ...source.matchAll(/<img[^>]+src=["']([^"']+)["']/gi),
    ...source.matchAll(/!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g),
  ];
  return [...new Set(matches.map((match) => String(match[1] || "").trim()).filter(nonEmpty))];
}

function inspectProductMedia(product) {
  const direct = [
    product?.cover_image,
    product?.image_url,
  ].filter(nonEmpty);
  const gallery = mediaList(product?.images);
  const variants = [
    product?.default_variant,
    ...(Array.isArray(product?.variants) ? product.variants : []),
  ]
    .map((variant) => String(variant?.image_url || "").trim())
    .filter(nonEmpty);
  const specValues = [
    ...(Array.isArray(product?.spec_values) ? product.spec_values : []),
    ...(Array.isArray(product?.spec_groups)
      ? product.spec_groups.flatMap((group) => (Array.isArray(group?.values) ? group.values : []))
      : []),
  ]
    .map((value) => String(value?.image_url || "").trim())
    .filter(nonEmpty);
  const description = descriptionMedia(product?.description);

  const media = {
    direct: [...new Set(direct)],
    gallery: [...new Set(gallery)],
    variants: [...new Set(variants)],
    specValues: [...new Set(specValues)],
    description: [...new Set(description)],
  };

  if (media.direct.length || media.gallery.length) {
    return { classification: "recoverable_product_media", media };
  }
  if (media.variants.length) {
    return { classification: "recoverable_variant_media", media };
  }
  if (media.specValues.length) {
    return { classification: "recoverable_spec_media", media };
  }
  if (media.description.length) {
    return { classification: "review_description_media", media };
  }
  return { classification: "truly_missing_public_media", media };
}

function presentFields(value, fields) {
  if (!value || typeof value !== "object") return [];
  return fields.filter((field) => Object.hasOwn(value, field));
}

function inspectPublicInternalFields(product) {
  const variantFields = new Set();
  const variants = [
    product?.default_variant,
    ...(Array.isArray(product?.variants) ? product.variants : []),
  ].filter(Boolean);
  for (const variant of variants) {
    for (const field of presentFields(variant, INTERNAL_VARIANT_FIELDS)) {
      variantFields.add(field);
    }
  }
  return {
    product: presentFields(product, INTERNAL_PRODUCT_FIELDS),
    variants: [...variantFields],
  };
}

async function fetchProduct(id) {
  const pathname = `/api/products/${encodeURIComponent(id)}`;
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${pathname} returned HTTP ${response.status}`);
  const body = await response.json();
  if (body?.code !== 0 || !body?.data) {
    throw new Error(`${pathname} returned an unexpected API envelope`);
  }
  return body.data;
}

async function mapConcurrent(items, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

const repairPlan = JSON.parse(await readFile(inputPath, "utf8"));
const candidates = repairPlan?.details?.productsWithoutEffectiveImage;
if (!Array.isArray(candidates)) {
  throw new Error(`${inputPath} does not contain details.productsWithoutEffectiveImage`);
}

const items = await mapConcurrent(candidates, async (candidate) => {
  try {
    const product = await fetchProduct(candidate.id);
    return {
      ...candidate,
      ...inspectProductMedia(product),
      publicInternalFields: inspectPublicInternalFields(product),
      variantCount: Array.isArray(product?.variants) ? product.variants.length : 0,
      requiredAction: undefined,
    };
  } catch (error) {
    return {
      ...candidate,
      classification: "detail_unavailable",
      error: error instanceof Error ? error.message : String(error),
      requiredAction: undefined,
    };
  }
});

const classifications = Object.fromEntries(
  [
    "recoverable_product_media",
    "recoverable_variant_media",
    "recoverable_spec_media",
    "review_description_media",
    "truly_missing_public_media",
    "detail_unavailable",
  ].map((classification) => [
    classification,
    items.filter((item) => item.classification === classification).length,
  ]),
);

const report = {
  baseUrl,
  checkedAt: new Date().toISOString(),
  sourcePlan: path.relative(process.cwd(), inputPath),
  sourcePlanCheckedAt: repairPlan.checkedAt || null,
  summary: {
    auditedProducts: items.length,
    ...classifications,
    productsExposingInternalFields: items.filter((item) => (
      item.publicInternalFields?.product?.length
      || item.publicInternalFields?.variants?.length
    )).length,
  },
  items,
};

const serialized = `${JSON.stringify(report, null, 2)}\n`;
console.log(serialized.trimEnd());
if (outputPath) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized, "utf8");
  console.error(`[audit:production-product-media] report written to ${outputPath}`);
}
