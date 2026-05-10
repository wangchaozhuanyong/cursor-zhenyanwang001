const { z } = require('zod');

const idParamSchema = z.object({
  id: z.string().trim().min(1),
});

const profileBodySchema = z.object({
  enabled: z.coerce.boolean().default(false),
  environment: z.enum(['sandbox', 'live']).default('sandbox'),
  supplier_tin: z.string().trim().max(64).optional(),
  supplier_name: z.string().trim().max(191).optional(),
  supplier_id_type: z.string().trim().max(32).optional(),
  supplier_id_value: z.string().trim().max(64).optional(),
  supplier_sst: z.string().trim().max(64).optional(),
  supplier_email: z.string().trim().email().max(191).optional().or(z.literal('')),
  supplier_phone: z.string().trim().max(64).optional(),
  supplier_address: z.record(z.string(), z.any()).optional(),
  client_id: z.string().trim().max(191).optional(),
  client_secret_ref: z.string().trim().max(191).optional(),
  certificate_ref: z.string().trim().max(191).optional(),
  certificate_fingerprint: z.string().trim().max(191).optional(),
  certificate_expires_at: z.string().trim().optional().nullable(),
  signing_key_ref: z.string().trim().max(191).optional(),
  config_json: z.record(z.string(), z.any()).optional(),
});

const listDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().trim().max(32).optional(),
  documentType: z.enum(['invoice', 'credit_note']).optional(),
  orderId: z.string().trim().optional(),
});

const processPendingBodySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const reconciliationBodySchema = z.object({
  reconcile_date: z.string().trim().min(1),
  document_type: z.enum(['invoice', 'credit_note']).optional(),
  notes: z.string().trim().max(512).optional(),
});

module.exports = {
  idParamSchema,
  profileBodySchema,
  listDocumentsQuerySchema,
  processPendingBodySchema,
  reconciliationBodySchema,
};
