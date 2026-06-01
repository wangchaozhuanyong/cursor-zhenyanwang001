import Pagination from "@/components/admin/Pagination";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { Tx } from "@/components/admin/AdminText";
import AnimatedTable from "@/modules/micro-interactions/components/AnimatedTable";
import {
  ALERT_STATUS_LABEL,
  INVENTORY_PAGE_SIZE,
  PURCHASE_STATUS_LABEL,
} from "@/modules/admin/pages/product/inventory/inventoryConstants";
import type { PurchaseFromAlertForm } from "@/modules/admin/pages/product/inventory/inventoryTypes";
import type {
  InventoryConversionOrder,
  InventoryPackRule,
  InventoryReplenishmentAlert,
  InventoryStockRecord,
  PurchaseOrder,
} from "@/types/inventory";
import { formatDateTime } from "@/utils/formatDateTime";
import {
  adminTableCellClass,
  adminTableHeadCellClass,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";
import {
  INVENTORY_ALERT_COLUMN_ALIGNS,
  INVENTORY_CONVERSION_COLUMN_ALIGNS,
  INVENTORY_PURCHASE_COLUMN_ALIGNS,
  INVENTORY_RECORD_COLUMN_ALIGNS,
  INVENTORY_RULE_COLUMN_ALIGNS,
} from "@/utils/inventoryTableAlign";
import { THEME_TEXT_DANGER, THEME_TEXT_SUCCESS_SOFT } from "@/utils/themeVisuals";
import { History, Package, SplitSquareHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import AdminRowActionsMenu from "@/components/admin/AdminRowActionsMenu";

type ListTabBase = {
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  L: (zh: string) => string;
};

function inventoryTheadRow(labels: string[], aligns: AdminTableAlign[], L: (zh: string) => string) {
  return (
    <tr>
      {labels.map((head, index) => (
        <th key={head} className={adminTableHeadCellClass(aligns[index] ?? "left")}>
          {L(head)}
        </th>
      ))}
    </tr>
  );
}

export function InventoryAlertsTab({
  alerts,
  loading,
  error,
  onRetry,
  page,
  total,
  onPageChange,
  onCreatePo,
  renderMobileCard,
  L,
}: ListTabBase & {
  alerts: InventoryReplenishmentAlert[];
  onCreatePo: (form: PurchaseFromAlertForm) => void;
  renderMobileCard: (row: InventoryReplenishmentAlert) => ReactNode;
}) {
  return (
    <>
      <AnimatedTable
        embedded
        loading={loading}
        error={error}
        errorTitle={L("补货预警加载失败")}
        errorDescription={L("补货预警接口暂时没有返回数据，请检查网络或稍后重试。")}
        onRetry={onRetry}
        rows={alerts}
        rowKey={(row) => row.id}
        skeletonRows={8}
        skeletonCols={9}
        tableClassName="w-full min-w-[1180px] text-left text-sm"
        theadClassName="border-b border-border text-xs text-muted-foreground"
        emptyIcon={Package}
        emptyTitle={L("暂无补货预警")}
        emptyDescription={L("点击扫描生成预警，系统会按 SKU 库存和在途数量生成补货事项。")}
        thead={inventoryTheadRow(
          ["商品", "SKU", "状态", "可用/预警", "在途", "预计可用", "建议补货", "预计到货", "操作"],
          INVENTORY_ALERT_COLUMN_ALIGNS,
          L,
        )}
        renderMobileCard={renderMobileCard}
        renderRow={(row) => (
          <>
            <td className={adminTableCellClass("left")}><AdminTableCell value={row.product_name} maxWidth="12rem" /></td>
            <td className={adminTableCellClass("left")}><p>{row.variant_title || L("默认规格")}</p><p className="text-xs text-muted-foreground">{row.sku_code || "-"}</p></td>
            <td className={adminTableCellClass("center")}><span className="rounded-full bg-secondary px-2 py-1 text-xs">{L(ALERT_STATUS_LABEL[row.alert_status] || row.alert_status)}</span></td>
            <td className={adminTableCellClass("right")}>{row.available_stock} / {row.warning_stock}</td>
            <td className={adminTableCellClass("right")}>{row.in_transit_qty} {row.unit_name || L("件")}</td>
            <td className={adminTableCellClass("right")}>{row.expected_available_stock}</td>
            <td className={adminTableCellClass("right", "font-semibold")}>{row.suggested_qty}</td>
            <td className={adminTableCellClass("left", "text-xs text-muted-foreground")}>{row.expected_arrival_date || "-"}</td>
            <td className={adminTableCellClass("right")}>
              {row.alert_status !== "resolved" ? (
                <button
                  type="button"
                  onClick={() => onCreatePo({
                    alert: row,
                    ordered_qty: String(Math.max(row.suggested_qty, row.warning_stock - row.available_stock, 1)),
                    unit_cost: "",
                    expected_arrival_date: "",
                    remark: "",
                  })}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  <Tx>生成采购单</Tx>
                </button>
              ) : <span className="text-xs text-muted-foreground">-</span>}
            </td>
          </>
        )}
      />
      {!error ? (
        <Pagination total={total} page={page} pageSize={INVENTORY_PAGE_SIZE} onPageChange={onPageChange} onPageSizeChange={() => undefined} showPageSizeSelect={false} />
      ) : null}
    </>
  );
}

export function InventoryPurchaseOrdersTab({
  purchaseOrders,
  loading,
  error,
  onRetry,
  page,
  total,
  onPageChange,
  onReceive,
  renderMobileCard,
  L,
}: ListTabBase & {
  purchaseOrders: PurchaseOrder[];
  onReceive: (order: PurchaseOrder) => void;
  renderMobileCard: (row: PurchaseOrder) => ReactNode;
}) {
  return (
    <>
      <AnimatedTable
        embedded
        loading={loading}
        error={error}
        errorTitle={L("采购单加载失败")}
        errorDescription={L("采购单接口暂时没有返回数据，请检查网络或稍后重试。")}
        onRetry={onRetry}
        rows={purchaseOrders}
        rowKey={(row) => row.id}
        skeletonRows={8}
        skeletonCols={8}
        tableClassName="w-full min-w-[1080px] text-left text-sm"
        theadClassName="border-b border-border text-xs text-muted-foreground"
        emptyIcon={Package}
        emptyTitle={L("暂无采购单")}
        emptyDescription={L("从补货预警生成采购单后，会在这里跟进入库状态。")}
        thead={inventoryTheadRow(
          ["采购单", "状态", "明细数", "数量", "在途", "预计到货", "金额", "操作"],
          INVENTORY_PURCHASE_COLUMN_ALIGNS,
          L,
        )}
        renderMobileCard={renderMobileCard}
        renderRow={(row) => (
          <>
            <td className={adminTableCellClass("left", "font-medium")}>{row.order_no}</td>
            <td className={adminTableCellClass("center")}><span className="rounded-full bg-secondary px-2 py-1 text-xs">{L(PURCHASE_STATUS_LABEL[row.status] || row.status)}</span></td>
            <td className={adminTableCellClass("right")}>{row.item_count}</td>
            <td className={adminTableCellClass("right")}>{row.received_qty} / {row.ordered_qty}</td>
            <td className={adminTableCellClass("right")}>{row.in_transit_qty}</td>
            <td className={adminTableCellClass("left", "text-xs text-muted-foreground")}>{row.expected_arrival_date || "-"}</td>
            <td className={adminTableCellClass("right")}>RM {Number(row.total_amount || 0).toFixed(2)}</td>
            <td className={adminTableCellClass("right")}>
              {!["received", "cancelled"].includes(row.status) ? (
                <button type="button" onClick={() => onReceive(row)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><Tx>确认到货入库</Tx></button>
              ) : <span className="text-xs text-muted-foreground">-</span>}
            </td>
          </>
        )}
      />
      {!error ? (
        <Pagination total={total} page={page} pageSize={INVENTORY_PAGE_SIZE} onPageChange={onPageChange} onPageSizeChange={() => undefined} showPageSizeSelect={false} />
      ) : null}
    </>
  );
}

export function InventoryRecordsTab({
  records,
  loading,
  error,
  onRetry,
  page,
  total,
  onPageChange,
  changeLabel,
  renderMobileCard,
  L,
}: ListTabBase & {
  records: InventoryStockRecord[];
  changeLabel: (key: string) => string;
  renderMobileCard: (row: InventoryStockRecord) => ReactNode;
}) {
  return (
    <>
      <AnimatedTable
        embedded
        loading={loading}
        error={error}
        errorTitle={L("库存流水加载失败")}
        errorDescription={L("库存流水接口暂时没有返回数据，请检查网络或稍后重试。")}
        onRetry={onRetry}
        rows={records}
        rowKey={(row) => row.id}
        skeletonRows={8}
        skeletonCols={9}
        tableClassName="w-full min-w-[1200px] text-left text-sm"
        theadClassName="border-b border-border text-xs text-muted-foreground"
        emptyIcon={History}
        emptyTitle={L("暂无库存流水")}
        emptyDescription={L("库存调整、订单扣减、拆包组装会写入流水。")}
        thead={inventoryTheadRow(
          ["时间", "商品", "规格/SKU", "类型", "变化", "变更前后", "原因", "单据", "操作人"],
          INVENTORY_RECORD_COLUMN_ALIGNS,
          L,
        )}
        renderMobileCard={renderMobileCard}
        renderRow={(row) => (
          <>
            <td className={adminTableCellClass("left", "text-xs text-muted-foreground")}>{formatDateTime(row.created_at)}</td>
            <td className={adminTableCellClass("left", "max-w-[10rem]")}><AdminTableCell value={row.product_name} maxWidth="9.5rem" /></td>
            <td className={adminTableCellClass("left", "max-w-[9rem]")}><AdminTableCell value={`${row.variant_name || "-"} / ${row.sku_code || "-"}`} fullText={`${L("规格")}：${row.variant_name || "-"}\nSKU：${row.sku_code || "-"}`} maxWidth="8.5rem" muted /></td>
            <td className={adminTableCellClass("left", "text-xs")}>{changeLabel(row.change_type)}</td>
            <td className={adminTableCellClass("right", `font-semibold ${row.quantity_delta >= 0 ? THEME_TEXT_SUCCESS_SOFT : THEME_TEXT_DANGER}`)}>{row.quantity_delta > 0 ? "+" : ""}{row.quantity_delta}</td>
            <td className={adminTableCellClass("right", "text-muted-foreground")}>{row.before_stock} → {row.after_stock}</td>
            <td className={adminTableCellClass("left", "max-w-[11rem]")}><AdminTableCell value={row.reason || row.remark || "-"} fullText={[row.reason, row.remark].filter(Boolean).join("\n") || "-"} maxWidth="10.5rem" muted /></td>
            <td className={adminTableCellClass("left", "text-xs text-muted-foreground")}>{row.order_no || row.source_no || "-"}</td>
            <td className={adminTableCellClass("left", "text-muted-foreground")}>{row.operator_name || L("系统")}</td>
          </>
        )}
      />
      {!error ? (
        <Pagination total={total} page={page} pageSize={INVENTORY_PAGE_SIZE} onPageChange={onPageChange} onPageSizeChange={() => undefined} showPageSizeSelect={false} />
      ) : null}
    </>
  );
}

export function InventoryRulesTab({
  rules,
  loading,
  error,
  onRetry,
  page,
  total,
  onPageChange,
  onEdit,
  onDelete,
  onConvert,
  renderMobileCard,
  L,
}: ListTabBase & {
  rules: InventoryPackRule[];
  onEdit: (rule: InventoryPackRule) => void;
  onDelete: (id: string) => void;
  onConvert: (type: "unpack" | "assemble", rule: InventoryPackRule) => void;
  renderMobileCard: (row: InventoryPackRule) => ReactNode;
}) {
  return (
    <>
      <AnimatedTable
        embedded
        loading={loading}
        error={error}
        errorTitle={L("组装拆包规则加载失败")}
        errorDescription={L("组装拆包规则接口暂时没有返回数据，请检查网络或稍后重试。")}
        onRetry={onRetry}
        rows={rules}
        rowKey={(row) => row.id}
        skeletonRows={8}
        skeletonCols={8}
        tableClassName="w-full min-w-[1260px] text-left text-sm"
        theadClassName="border-b border-border text-xs text-muted-foreground"
        emptyIcon={SplitSquareHorizontal}
        emptyTitle={L("暂无组装拆包规则")}
        emptyDescription={L("新增规则后可手动拆包、组装，也可支持订单自动拆包。")}
        thead={inventoryTheadRow(
          ["大包装 SKU", "小包装 SKU", "换算", "当前库存", "自动拆包", "启用", "备注", "操作"],
          INVENTORY_RULE_COLUMN_ALIGNS,
          L,
        )}
        renderMobileCard={renderMobileCard}
        renderRow={(row) => (
          <>
            <td className={adminTableCellClass("left")}><p>{row.parent_product_name}</p><p className="text-xs text-muted-foreground">{row.parent_variant_name || L("默认规格")} / {row.parent_sku_code || "-"}</p></td>
            <td className={adminTableCellClass("left")}><p>{row.child_product_name}</p><p className="text-xs text-muted-foreground">{row.child_variant_name || L("默认规格")} / {row.child_sku_code || "-"}</p></td>
            <td className={adminTableCellClass("right")}>{row.parent_qty} {row.parent_unit_name} = {row.child_qty} {row.child_unit_name}</td>
            <td className={adminTableCellClass("right", "text-xs text-muted-foreground")}>{L("大包可用")} {row.parent_available_stock ?? row.parent_stock} / {L("小包可用")} {row.child_available_stock ?? row.child_stock}</td>
            <td className={adminTableCellClass("center")}>{row.auto_unpack_enabled ? L("已开启") : L("关闭")}</td>
            <td className={adminTableCellClass("center")}>{row.enabled ? L("启用") : L("停用")}</td>
            <td className={adminTableCellClass("left", "text-muted-foreground")}>{row.remark || "-"}</td>
            <td className={adminTableCellClass("right")}>
              <AdminRowActionsMenu
                primary={(
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    className="inline-flex h-8 min-w-[3.25rem] shrink-0 items-center justify-center rounded-md border border-border bg-secondary px-2.5 text-xs font-medium text-foreground hover:bg-secondary/80"
                  >
                    <Tx>编辑</Tx>
                  </button>
                )}
                moreLabel={<Tx>更多</Tx>}
                items={[
                  {
                    key: "unpack",
                    label: <Tx>立即拆包</Tx>,
                    onClick: () => onConvert("unpack", row),
                  },
                  {
                    key: "assemble",
                    label: <Tx>立即组装</Tx>,
                    onClick: () => onConvert("assemble", row),
                  },
                  {
                    key: "delete",
                    label: <Tx>删除</Tx>,
                    danger: true,
                    separatorBefore: true,
                    onClick: () => onDelete(row.id),
                  },
                ]}
              />
            </td>
          </>
        )}
      />
      {!error ? (
        <Pagination total={total} page={page} pageSize={INVENTORY_PAGE_SIZE} onPageChange={onPageChange} onPageSizeChange={() => undefined} showPageSizeSelect={false} />
      ) : null}
    </>
  );
}

export function InventoryConversionsTab({
  conversions,
  loading,
  error,
  onRetry,
  page,
  total,
  onPageChange,
  conversionLabel,
  renderMobileCard,
  L,
}: ListTabBase & {
  conversions: InventoryConversionOrder[];
  conversionLabel: (key: string) => string;
  renderMobileCard: (row: InventoryConversionOrder) => ReactNode;
}) {
  return (
    <>
      <AnimatedTable
        embedded
        loading={loading}
        error={error}
        errorTitle={L("组装拆包单据加载失败")}
        errorDescription={L("组装拆包单据接口暂时没有返回数据，请检查网络或稍后重试。")}
        onRetry={onRetry}
        rows={conversions}
        rowKey={(row) => row.id}
        skeletonRows={8}
        skeletonCols={9}
        tableClassName="w-full min-w-[1320px] text-left text-sm"
        theadClassName="border-b border-border text-xs text-muted-foreground"
        emptyIcon={History}
        emptyTitle={L("暂无组装拆包单据")}
        emptyDescription={L("手动拆包、手动组装和自动拆包都会生成单据。")}
        thead={inventoryTheadRow(
          ["单据号", "类型", "大包装", "小包装", "数量", "大包装库存", "小包装库存", "来源订单", "时间"],
          INVENTORY_CONVERSION_COLUMN_ALIGNS,
          L,
        )}
        renderMobileCard={renderMobileCard}
        renderRow={(row) => (
          <>
            <td className={adminTableCellClass("left", "font-medium")}>{row.order_no}</td>
            <td className={adminTableCellClass("left")}>{conversionLabel(row.type)}</td>
            <td className={adminTableCellClass("left")}><p>{row.parent_product_name_snapshot}</p><p className="text-xs text-muted-foreground">{row.parent_variant_name_snapshot || L("默认规格")} / {row.parent_sku_code_snapshot || "-"}</p></td>
            <td className={adminTableCellClass("left")}><p>{row.child_product_name_snapshot}</p><p className="text-xs text-muted-foreground">{row.child_variant_name_snapshot || L("默认规格")} / {row.child_sku_code_snapshot || "-"}</p></td>
            <td className={adminTableCellClass("right")}>{row.parent_qty} {row.parent_unit_name_snapshot} → {row.child_total_qty} {row.child_unit_name_snapshot}</td>
            <td className={adminTableCellClass("right")}>{row.parent_before_stock} → {row.parent_after_stock}</td>
            <td className={adminTableCellClass("right")}>{row.child_before_stock} → {row.child_after_stock}</td>
            <td className={adminTableCellClass("left", "text-muted-foreground")}>{row.source_order_no || "-"}</td>
            <td className={adminTableCellClass("left", "text-xs text-muted-foreground")}>{formatDateTime(row.created_at)}</td>
          </>
        )}
      />
      {!error ? (
        <Pagination total={total} page={page} pageSize={INVENTORY_PAGE_SIZE} onPageChange={onPageChange} onPageSizeChange={() => undefined} showPageSizeSelect={false} />
      ) : null}
    </>
  );
}
