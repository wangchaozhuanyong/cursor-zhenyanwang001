# Malaysia MyInvois Integration

This integration is optional and disabled by default. Do not enable it unless the company is required to connect to LHDN MyInvois or has a confirmed rollout plan.

## Enablement

1. Set `MYINVOIS_ENABLED=1`.
2. Configure the admin profile through `/api/admin/myinvois/config`.
3. Keep `MYINVOIS_SUBMIT_ENABLED=0` until legal/accounting complete sandbox acceptance.
4. Enable `MYINVOIS_SUBMIT_ENABLED=1` only after certificates, credential references, signing key references, and LHDN sandbox validation are approved.

## Flow

- Paid orders enqueue an `invoice` document.
- Approved refunds or refunded orders enqueue a `credit_note` document.
- Documents stay queued/ready until submission is explicitly enabled.
- Failed submissions are retried by the scheduler and can be retried manually.
- Reconciliation snapshots can be created from the document queue for accounting review.

## W3 Dependency

Payloads currently mark tax details as not ready. Formal LHDN submission depends on W3 providing item-level tax rate, tax amount, tax type, and exemption detail fields.
