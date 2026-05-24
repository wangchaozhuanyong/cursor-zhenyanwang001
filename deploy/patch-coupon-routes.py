#!/usr/bin/env python3
"""Append coupon lifecycle admin routes if missing."""
from pathlib import Path

path = Path('/var/www/click-send-shop/server/src/modules/admin/routes/admin.routes.js')
text = path.read_text(encoding='utf-8')
marker = "router.get('/coupons/:couponId/records'"
insert = """router.post('/coupons/:id/pause-claim', adminAuth, couponFeature, requirePermission('coupon.manage'), couponCtrl.pauseClaim);
router.post('/coupons/:id/disable-use', adminAuth, couponFeature, requirePermission('coupon.manage'), couponCtrl.disableUse);
router.post('/coupons/:id/archive', adminAuth, couponFeature, requirePermission('coupon.manage'), couponCtrl.archive);
router.post('/coupons/:id/invalidate-user-coupons', adminAuth, couponFeature, requirePermission('coupon.manage'), couponCtrl.invalidateUserCoupons);
"""
if 'pause-claim' in text:
    print('already patched')
elif marker not in text:
    raise SystemExit('marker not found')
else:
    idx = text.index(marker)
    line_end = text.index('\n', idx)
    text = text[: line_end + 1] + insert + text[line_end + 1 :]
    path.write_text(text, encoding='utf-8')
    print('patched ok')
