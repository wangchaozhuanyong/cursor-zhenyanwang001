type RegulatedProductNoticeProps = {
  minimumAge?: number | null;
  regionNotice?: string | null;
  complianceNotice?: string | null;
};

export default function RegulatedProductNotice({
  minimumAge,
  regionNotice,
  complianceNotice,
}: RegulatedProductNoticeProps) {
  return (
    <section className="mt-4 rounded-xl border border-amber-300/50 bg-amber-50/70 px-4 py-3 text-[13px] leading-relaxed text-amber-900">
      <h2 className="text-sm font-semibold">年龄限制与地区适用提示</h2>
      <p className="mt-1">
        本页面可能包含受年龄、地区或当地法规限制的商品或服务信息。相关内容仅面向符合法定年龄并符合当地规定的用户展示。
        页面信息不构成面向未成年人的推广，具体适用范围、购买条件或服务条件，以当地法律法规、平台规则和客服确认为准。
      </p>
      {minimumAge ? <p className="mt-1">仅限 {minimumAge}+ 用户查看或咨询。</p> : null}
      {regionNotice ? <p className="mt-1">适用地区：{regionNotice}</p> : null}
      {complianceNotice ? <p className="mt-1">{complianceNotice}</p> : null}
    </section>
  );
}
