import type { AuditLogRow } from "@/services/admin/logService";
import {
  buildAuditChangeSummary,
  buildAuditSnapshotRows,
  type AuditSnapshotRow,
  zhActionType,
  zhAuditErrorMessage,
  zhAuditSummary,
  zhObjectType,
  zhRequestPath,
  zhUserAgentBrief,
} from "@/utils/auditLogI18n";
import { shortId } from "@/utils/shortId";
import { Tx } from "@/components/admin/AdminText";
import { THEME_ALERT_ERROR_SOFT } from "@/utils/themeVisuals";
import { useAdminT } from "@/hooks/useAdminT";

function SnapshotBlock({ title, rows }: { title: string; rows: AuditSnapshotRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)]/40 p-2.5">
      <p className="mb-2 text-xs font-semibold text-foreground">{title}</p>
      <dl className="space-y-1.5">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="flex items-start justify-between gap-3 text-[11px]">
            <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 text-right font-medium text-foreground break-words">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type Props = {
  detail: AuditLogRow;
  onClose: () => void;
  embedded?: boolean;
};

export default function AuditLogDetailPanel({ detail, onClose, embedded = false }: Props) {
  const { tText } = useAdminT();
  const changes = buildAuditChangeSummary(detail.before_json, detail.after_json);
  const beforeRows = buildAuditSnapshotRows(detail.before_json);
  const afterRows = buildAuditSnapshotRows(detail.after_json);
  const userAgent = zhUserAgentBrief(detail.user_agent);
  const objectHint = detail.object_id ? ` · ${shortId(detail.object_id, 8)}` : "";

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={
        embedded
          ? "w-full"
          : "max-h-[85vh] w-full max-w-lg overflow-y-auto theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow"
      }
    >
      {!embedded ? <h3 className="mb-3 text-sm font-bold text-foreground"><Tx>审计详情</Tx></h3> : null}
      <dl className="space-y-2.5 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground"><Tx>动作</Tx></dt>
          <dd className="text-right font-semibold">{zhActionType(detail.action_type)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground"><Tx>摘要</Tx></dt>
          <dd className="max-w-[72%] text-right break-words">{zhAuditSummary(detail.summary)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground"><Tx>对象</Tx></dt>
          <dd className="text-right" title={detail.object_id || undefined}>
            {zhObjectType(detail.object_type)}
            {detail.object_id ? ` · 已关联${objectHint}` : ""}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground"><Tx>请求</Tx></dt>
          <dd className="text-right font-medium">{zhRequestPath(detail.request_method, detail.request_path)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground"><Tx>IP 地址</Tx></dt>
          <dd>{detail.ip || "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground"><Tx>访问设备</Tx></dt>
          <dd className="text-right">{userAgent.brief}</dd>
        </div>
      </dl>

      {userAgent.full ? (
        <details className="mt-2 text-[11px] text-muted-foreground">
          <summary className="cursor-pointer select-none hover:text-foreground"><Tx>查看完整浏览器标识（技术信息）</Tx></summary>
          <p className="mt-1 break-all rounded-lg bg-secondary/60 p-2 font-mono text-[10px] leading-relaxed">{userAgent.full}</p>
        </details>
      ) : null}

      {detail.result === "failure" && detail.error_message ? (
        <div className={`mt-3 rounded-lg p-2 text-xs ${THEME_ALERT_ERROR_SOFT}`}>{zhAuditErrorMessage(detail.error_message)}</div>
      ) : null}

      {changes.length > 0 ? (
        <div className="mt-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)]/40 p-2.5">
          <p className="mb-2 text-xs font-semibold text-foreground"><Tx>变更摘要</Tx></p>
          <div className="space-y-1.5 text-[11px]">
            {changes.map((item) => (
              <div key={item.key} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="text-right text-foreground">
                  <span className="text-muted-foreground">{item.fromText}</span>
                  <span className="mx-1 text-muted-foreground">→</span>
                  <span className="font-medium">{item.toText}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {changes.length === 0 && afterRows.length > 0 ? (
        <div className="mt-3">
          <SnapshotBlock title={tText("本次记录")} rows={afterRows} />
        </div>
      ) : null}

      {changes.length === 0 && beforeRows.length > 0 && afterRows.length === 0 ? (
        <div className="mt-3">
          <SnapshotBlock title={tText("变更前快照")} rows={beforeRows} />
        </div>
      ) : null}

      {changes.length === 0 && beforeRows.length > 0 && afterRows.length > 0 ? (
        <div className="mt-3 space-y-2">
          <SnapshotBlock title={tText("变更前")} rows={beforeRows} />
          <SnapshotBlock title={tText("变更后")} rows={afterRows} />
        </div>
      ) : null}

      {(detail.before_json != null || detail.after_json != null) ? (
        <details className="mt-3 text-[11px] text-muted-foreground">
          <summary className="cursor-pointer select-none hover:text-foreground"><Tx>查看原始 JSON（开发调试）</Tx></summary>
          <div className="mt-2 space-y-2">
            <div>
              <p className="mb-1 text-muted-foreground"><Tx>变更前</Tx></p>
              <pre className="max-h-32 overflow-auto rounded-lg bg-secondary p-2 font-mono text-[10px]">
                {detail.before_json != null ? JSON.stringify(detail.before_json, null, 2) : "—"}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground"><Tx>变更后</Tx></p>
              <pre className="max-h-32 overflow-auto rounded-lg bg-secondary p-2 font-mono text-[10px]">
                {detail.after_json != null ? JSON.stringify(detail.after_json, null, 2) : "—"}
              </pre>
            </div>
          </div>
        </details>
      ) : null}

      {!embedded ? (
        <button type="button" onClick={onClose} className="mt-4 w-full theme-rounded border border-[var(--theme-border)] py-2 text-sm">
          <Tx>关闭</Tx>
        </button>
      ) : null}
    </div>
  );
}
