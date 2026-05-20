#!/usr/bin/env node
// Backfills historical order profit snapshots using the current SKU cost.
// This is an approximation only: current SKU cost may differ from the cost at order time.
const db = require('../src/config/db');

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

async function main() {
  const conn = await db.getConnection();
  try {
    const [items] = await conn.query(`
      SELECT oi.id, oi.order_id, oi.variant_id, oi.price, oi.qty, oi.subtotal,
             COALESCE(pv.cost_price, 0) AS current_cost_price
      FROM order_items oi
      LEFT JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE (oi.unit_cost_price = 0 OR oi.cost_snapshot_source = 'missing')
      ORDER BY oi.order_id ASC, oi.id ASC
    `);

    const byOrder = new Map();
    for (const item of items) {
      const list = byOrder.get(item.order_id) || [];
      list.push(item);
      byOrder.set(item.order_id, list);
    }

    let itemCount = 0;
    for (const [orderId, rows] of byOrder) {
      const [[order]] = await conn.query(
        `SELECT id, raw_amount, discount_amount, points_discount_amount, reward_cash_discount_amount, shipping_fee
         FROM orders WHERE id = ?`,
        [orderId],
      );
      if (!order) continue;
      const rawAmount = money(order.raw_amount || rows.reduce((s, r) => s + Number(r.subtotal || r.price * r.qty || 0), 0));
      const goodsDiscount = money(Number(order.discount_amount || 0) + Number(order.points_discount_amount || 0) + Number(order.reward_cash_discount_amount || 0));
      let allocatedSoFar = 0;
      let goodsCost = 0;
      let netGoods = 0;
      let grossProfit = 0;

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const lineSubtotal = money(row.subtotal || Number(row.price || 0) * Number(row.qty || 0));
        let discountAllocated = 0;
        if (rawAmount > 0) {
          discountAllocated = index === rows.length - 1
            ? money(goodsDiscount - allocatedSoFar)
            : money(goodsDiscount * lineSubtotal / rawAmount);
        }
        allocatedSoFar = money(allocatedSoFar + discountAllocated);
        const unitCost = money(row.current_cost_price || 0);
        const costAmount = money(unitCost * Number(row.qty || 0));
        const netSales = money(Math.max(0, lineSubtotal - discountAllocated));
        const lineGross = money(netSales - costAmount);
        const source = unitCost > 0 ? 'backfill_current_sku' : 'missing';
        await conn.query(
          `UPDATE order_items
             SET unit_cost_price=?, cost_amount=?, discount_allocated=?, net_sales_amount=?, gross_profit_amount=?, cost_snapshot_source=?
           WHERE id=?`,
          [unitCost, costAmount, discountAllocated, netSales, lineGross, source, row.id],
        );
        goodsCost = money(goodsCost + costAmount);
        netGoods = money(netGoods + netSales);
        grossProfit = money(grossProfit + lineGross);
        itemCount += 1;
      }
      const shippingFee = money(order.shipping_fee || 0);
      await conn.query(
        `UPDATE orders
            SET goods_cost_amount=?, goods_net_sales_amount=?, gross_profit_amount=?,
                net_profit_amount = ? + COALESCE(shipping_fee,0) - COALESCE(shipping_cost_amount,0) - COALESCE(payment_fee_amount,0)
          WHERE id=?`,
        [goodsCost, netGoods, grossProfit, grossProfit, orderId],
      );
    }
    console.log(`Backfilled ${itemCount} order item profit snapshots.`);
  } finally {
    conn.release();
    await db.end?.();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
