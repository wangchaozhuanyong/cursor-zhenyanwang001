import { describe, expect, it } from "vitest";
import {
  localizedAuditSummary,
  zhActionType,
  zhAuditSummary,
  zhObjectType,
} from "@/utils/auditLogI18n";
import { translateAdminText } from "@/i18n/admin";

const sameLang = (text: string) => text;

describe("auditLogI18n", () => {
  it("formats category delete summaries with readable object tail instead of raw UUID", () => {
    const text = zhAuditSummary("删除分类 65005193-4dad-40f1-adcd-ecbf55678861");

    expect(text).toBe("删除分类（对象尾号 …55678861）");
    expect(text).not.toContain("65005193-4dad-40f1-adcd-ecbf55678861");
  });

  it("formats upload hash summaries as readable upload file text", () => {
    const text = zhAuditSummary("用户上传 f9f5089ae9a01b3c4d5e6f7a8b9c0d1e");

    expect(text).toBe("用户上传文件（对象尾号 …8b9c0d1e）");
  });

  it("keeps business names readable while compacting only internal ids", () => {
    expect(zhAuditSummary("更新分类 正品烟草")).toBe("更新分类 正品烟草");
    expect(localizedAuditSummary("更新商品 28fbeb12-057e-46c9-9797-ea653d66f750", sameLang)).toBe("更新商品（对象尾号 …3d66f750）");
  });

  it("maps newer audit action and object types globally", () => {
    expect(zhActionType("coupon_campaign.update")).toBe("更新优惠券活动");
    expect(zhActionType("inventory.smart_replenishment.apply")).toBe("应用智能补货建议");
    expect(zhObjectType("inventory_replenishment_run")).toBe("智能补货任务");
  });

  it("uses admin language translation for localized audit summaries", () => {
    const text = localizedAuditSummary(
      "删除分类 65005193-4dad-40f1-adcd-ecbf55678861",
      (zh) => translateAdminText("en", zh),
    );

    expect(text).toContain("Delete category");
    expect(text).toContain("object tail ID");
    expect(text).toContain("…55678861");
  });
});
