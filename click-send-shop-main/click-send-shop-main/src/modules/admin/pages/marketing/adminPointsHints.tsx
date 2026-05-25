import type { ReactNode } from "react";
import { Tx } from "@/components/admin/AdminText";

/** 积分管理各子标签说明 */
export const POINTS_TAB_HINTS: Record<string, ReactNode> = {
  积分总览: <Tx>全站积分发放、使用、流水笔数与活跃用户数概览，数据来自实时统计。</Tx>,
  积分规则: <Tx>控制前台是否显示积分、是否发放消费积分、积分计算方式与入账时机等全局规则。</Tx>,
  商品积分规则: <Tx>为指定商品/分类/标签设置特殊积分或倍率，优先级高于全局金额规则的例外配置。</Tx>,
  积分抵扣: <Tx>设置 1 积分抵多少 RM、最低使用门槛、单笔抵扣上限等；需先在「积分规则」开启抵扣开关。</Tx>,
  礼品兑换: <Tx>配置用户用积分（可加价）兑换的礼品商品、库存与每人限兑，并查看兑换记录。</Tx>,
  积分明细: <Tx>查询每笔积分变动流水（下单奖励、抵扣、管理员调整、退款回滚等），可筛选用户与类型。</Tx>,
  手动调整: <Tx>客服或运营对指定用户补发/扣减积分，须填写原因，会记入流水且通常不可撤销。</Tx>,
  高级设置: <Tx>积分过期、不计分场景、与优惠券/返现叠加、支付方式限制及立即执行过期任务。</Tx>,
};

export const POINTS_OVERVIEW_STAT_HINTS: Record<string, ReactNode> = {
  累计发放积分: <Tx>历史所有正向入账积分合计（含订单奖励、签到、管理员增加等）。</Tx>,
  "累计使用/回滚积分": <Tx>抵扣、扣减、退款回滚等负向或冲正类变动合计（绝对值统计）。</Tx>,
  积分流水数: <Tx>积分账本记录总条数，一条记录对应一次变动。</Tx>,
  积分活跃用户: <Tx>有过积分变动的不重复用户数，用于观察参与度。</Tx>,
};

export const POINTS_RULE_FIELD_HINTS: Record<string, ReactNode> = {
  display_enabled: <Tx>关闭后前台隐藏积分入口与余额展示，不影响已有积分数据。</Tx>,
  earn_enabled: <Tx>关闭后新订单不再发放消费积分；历史余额与流水保留。</Tx>,
  redeem_enabled: <Tx>关闭后结账不可使用积分抵扣；具体比例在「积分抵扣」标签配置。</Tx>,
  earn_mode: (
    <Tx>
      按金额：仅用「每多少 RM / 获得多少积分」；商品规则：仅用下方商品特殊规则；金额+商品：先算金额再叠加或取商品规则中的特殊项（以系统实现为准）。
    </Tx>
  ),
  settle_timing: <Tx>积分写入用户账户的时间点：支付成功、发货或订单完成；越晚入账越利于减少退款冲正。</Tx>,
  earn_currency_unit: <Tx>消费金额计量单位，例如填 1 表示每满 1 RM 参与计分（常与「获得多少积分」成对填写）。</Tx>,
  earn_points_unit: <Tx>达到上一栏金额单位时发放的积分数，例如 1 RM 得 1 分。</Tx>,
  earn_rounding: <Tx>金额换算积分后的小数处理方式：向下取整最保守，四舍五入常用，向上取整对用户最友好。</Tx>,
  earn_after_discount: <Tx>开启后按优惠券/促销后的实付金额计分；关闭则按优惠前金额（若业务支持）。</Tx>,
  earn_after_points_redeem: <Tx>本单若使用积分抵扣，开启后仍对抵扣后剩余应付金额计消费积分；关闭则抵扣部分不再计分。</Tx>,
};

export const POINTS_REDEEM_FIELD_HINTS: Record<string, ReactNode> = {
  point_value_myr: <Tx>单积分折算现金，例如 0.01 表示 1 积分 = RM0.01；修改后会联动「多少积分抵扣 RM1」。</Tx>,
  points_per_currency: <Tx>抵扣 RM1 所需积分数，例如 100 表示 100 分抵 1 元；与上一项互为倒数关系。</Tx>,
  min_redeem_points: <Tx>单笔订单至少使用多少积分才能抵扣，防止零碎抵扣。</Tx>,
  redeem_step: <Tx>用户选择抵扣积分时必须为该值的整数倍，例如 10 表示只能 10、20、30…</Tx>,
  max_redeem_percent: <Tx>单笔订单最多用积分抵扣应付金额的百分比上限，0–100。</Tx>,
  max_redeem_amount: <Tx>单笔订单积分抵扣的 RM 金额上限；填 0 通常表示不限制金额（以系统为准）。</Tx>,
  min_order_amount: <Tx>订单应付金额低于此值时不允许使用积分抵扣。</Tx>,
  redeem_scope: (
    <Tx>
      全部商品：均可抵扣；按商品规则：受商品积分规则中「允许抵扣」约束；排除受监管：烟酒等受限品类不可抵扣。
    </Tx>
  ),
};

export const POINTS_PRODUCT_RULE_HINTS: Record<string, ReactNode> = {
  name: <Tx>后台识别用名称，用户端不展示。</Tx>,
  scope_type: <Tx>规则作用范围：全部、指定分类、商品或标签；选「全部」时范围 ID 可留空。</Tx>,
  scope_id: <Tx>分类 ID、商品 ID 或标签 ID，多个场景请新建多条规则。</Tx>,
  earn_mode: (
    <Tx>
      继承全局=走「积分规则」金额设置；不积分=该范围内不发消费积分；固定/百分比/倍率=覆盖全局的计算方式。
    </Tx>
  ),
  fixed_points: <Tx>每件或每单固定赠送的积分数（视积分模式而定）。</Tx>,
  points_percent: <Tx>按金额或售价百分比折算积分，例如填 5 表示 5%。</Tx>,
  multiplier_percent: <Tx>在全局金额积分结果上乘以的倍率，100 表示不变，200 表示双倍。</Tx>,
  priority: <Tx>数字越小越优先；多条规则命中同一商品时用于决定哪条生效。</Tx>,
  max_redeem_percent: <Tx>该范围内单笔最多可用积分抵扣的百分比；留空表示继承全局抵扣上限。</Tx>,
  earn_enabled: <Tx>关闭后该范围内商品下单不获得消费积分。</Tx>,
  redeem_enabled: <Tx>关闭后该范围内商品结账不可使用积分抵扣。</Tx>,
  enabled: <Tx>关闭后整条规则停用，不参与匹配。</Tx>,
};

export const POINTS_ADVANCED_FIELD_HINTS: Record<string, ReactNode> = {
  expire_enabled: <Tx>开启后积分在有效天数后自动过期扣减；需配合定时任务（每日 KL 时区）。</Tx>,
  expire_days: <Tx>自获得之日起多少天内有效，过期后按策略扣减可用积分。</Tx>,
  coupon_no_points: <Tx>使用了优惠券的订单是否仍发放消费积分。</Tx>,
  promotion_no_points: <Tx>参与促销价的商品是否不计消费积分。</Tx>,
  marketing_activity_no_points: <Tx>营销活动（如满减、秒杀）中的商品是否不计分。</Tx>,
  member_price_no_points: <Tx>使用会员专享价的商品是否不计分。</Tx>,
  allow_with_coupon: <Tx>结账同时使用优惠券与积分抵扣是否允许。</Tx>,
  allow_with_reward_cash: <Tx>积分抵扣与返现余额（钱包返现）是否可同时使用。</Tx>,
  allow_negative_points: <Tx>仅影响后台手动调账是否允许扣到负数；前台用户余额通常仍不可为负。</Tx>,
  payment_points_mode: <Tx>限制哪些支付方式下可获得积分或使用积分抵扣。</Tx>,
  allowed_payment_methods: <Tx>与上一项配合：include 为白名单，exclude 为黑名单；填 online、whatsapp 等内部编码。</Tx>,
};

export const POINTS_ADJUST_FIELD_HINTS: Record<string, ReactNode> = {
  userId: <Tx>用户中心或订单中的用户 ID（UUID），填错会导致调整到他人账户。</Tx>,
  points: <Tx>正数为增加、负数为扣减；不可为 0；大额调整建议先与财务确认。</Tx>,
  reason: <Tx>必填，会显示在积分流水中，便于审计与客服追溯。</Tx>,
};

export const POINTS_GIFT_FIELD_HINTS: Record<string, ReactNode> = {
  product: <Tx>兑换成功后发放/关联的实物或服务商品；先搜索再选择，会自动带出标题与图片。</Tx>,
  variant_id: <Tx>多规格商品时填写 SKU/规格 ID；单规格可留空。</Tx>,
  title: <Tx>礼品专区展示名称，可不同于商品原名。</Tx>,
  required_points: <Tx>用户兑换需扣除的积分数。</Tx>,
  cash_amount: <Tx>除积分外需支付的 RM，0 表示纯积分兑换。</Tx>,
  stock_limit: <Tx>全站可兑换总次数，0 表示不限制总库存。</Tx>,
  limit_per_user: <Tx>每位用户最多兑换次数，0 表示不限制。</Tx>,
  enabled: <Tx>关闭后前台礼品列表隐藏，已兑换记录保留。</Tx>,
  gift_list: <Tx>已上架的积分礼品，可编辑或删除。</Tx>,
  recent_redemptions: <Tx>用户最近发起的兑换单及状态（待发货、已完成等）。</Tx>,
};

export const POINTS_SECTION_HINTS: Record<string, ReactNode> = {
  功能开关: <Tx>三个总开关彼此独立：展示入口、发放消费积分、允许结账抵扣。</Tx>,
  消费积分规则: <Tx>定义下单后如何计算并发放积分；关闭「开启消费积分」后本节仅可查看。</Tx>,
  抵扣比例与门槛: <Tx>定义积分与现金的换算及使用限制；需「开启积分抵扣」才会在前台生效。</Tx>,
  积分过期: <Tx>到期自动扣减长期未使用的积分，减轻负债；生产启用前请评估用户通知。</Tx>,
  不计分场景: <Tx>满足条件的订单或商品行不计消费积分，常用于合规或与促销互斥。</Tx>,
  叠加与调账: <Tx>控制积分与优惠/返现的叠加策略，以及后台是否允许扣成负积分。</Tx>,
  支付方式限制: <Tx>例如仅在线支付可用积分，WhatsApp 下单禁用等。</Tx>,
};
