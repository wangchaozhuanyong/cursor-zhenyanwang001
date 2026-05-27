/** 数据保存与清理中心 — 面向非技术人员的说明文案 */

export const DATA_RETENTION_PAGE_HINT =
  "这里用来定期删除「过期、不再需要的记录」，给数据库减负。不会直接删订单、付款等核心交易数据。想清空测试环境请用运维脚本，不要指望本页一键清站。";

export const DATA_RETENTION_TAB_HINTS: Record<string, string> = {
  overview:
    "看当前有多少条清理规则、最近有没有跑过清理。下面的「保护表」是系统禁止删除的重要数据。",
  policies:
    "每条规则对应一类后台数据。可改「保留多少天」和是否启用；改完后要点「保存」。",
  preview:
    "先勾选要清理的项目，点「生成预览」看会删多少条，确认无误后再点「执行清理」。不能跳过预览。",
  runs: "每次预览和正式清理都会留记录，方便事后核对删了什么。",
  risk: "说明系统如何防止误删订单、付款等重要数据。",
};

export const DATA_RETENTION_FIELD_HINTS = {
  retentionDays:
    "只删除「已经超过这里填写的天数」的记录。例如填 30，表示 30 天前的旧数据才可能被删（还要看该条策略是否要求「已读」「已解决」等）。",
  batchSize:
    "每次从数据库里删多少条。数字越大清理越快，但短时间内可能让后台略慢。一般保持默认即可。",
  enabled:
    "关闭后，这条规则不会参与「定时自动清理」，也不会出现在「选择启用项」里。",
  protected:
    "「锁定」表示不能改保留天数或关闭（如审计日志）。「保护」表示这类数据受系统保护，不能通过本功能硬删。",
  matched:
    "预览时统计到「符合删除条件」的条数，还没真正删除。",
  deleted: "执行清理后，实际从数据库里删掉的条数。",
  batchCount: "分几批删完，批数多说明数据量大或每批条数设得较小。",
  policyCount: "系统内置的清理规则总条数。",
  enabledPolicyCount: "当前打开的规则数量，定时任务会按这些规则清理。",
  lockedPolicyCount: "被锁定的规则，主要是审计日志，保留期不能随意缩短。",
  batchSizeRange: "所有规则允许的「每批删除条数」范围，需在 500～2000 之间。",
  protectedTables:
    "订单、付款、发票、库存流水、积分等永远不允许在本功能里整表删除，防止误操作。",
  previewWorkflow:
    "流程：勾选策略 → 生成预览（看命中条数）→ 确认后执行清理。预览结果约 30 分钟内有效，且只能用一次。",
  previewTtlMinutes:
    "预览结果的有效时间，超时后须重新生成预览才能执行。",
  runningCleanup:
    "当前有清理任务正在后台运行，可在此查看进度或请求取消。",
  selectEnabled:
    "快速勾选所有「已启用」的策略，适合按默认配置做一次全面预览。",
  testEnvNote:
    "测试环境若想「全部清空」订单、通知、事件等，请使用 server 目录下的 wipe 脚本（WIPE_TEST_FULL），本页面只适合按规则删过期数据。",
};

export const DATA_RETENTION_CATEGORY_HINTS: Record<string, string> = {
  auth: "登录、验证码、第三方登录过程中产生的临时记录，删了不影响已登录用户，只是清历史。",
  security: "与安全相关的日志和设备记录。正式审计日志保留期很长且通常锁定。",
  commerce: "购物车、未完成结账等营销/交易辅助数据，不是正式订单表。",
  user: "用户浏览历史等行为记录，不涉及账户本身。",
  analytics: "网站访问、首页点击等统计分析用的原始记录。",
  notification: "发给用户的站内通知、后台通知批次及发送记录。",
  export: "报表导出产生的任务记录和服务器上的导出文件。",
  monitoring: "后台事件、数据一致性检查、修复任务等运维类记录。",
  system: "其他系统维护类数据。",
};

/** 每条策略的通俗说明（policy key 与后端一致） */
export const DATA_CLEANUP_POLICY_HELP: Record<string, string> = {
  otp_send_logs:
    "用户收短信验证码时留下的发送记录。过期后可删，不影响账号。",
  password_reset_tokens:
    "用户点「忘记密码」时生成的临时链接/令牌，用过或过期就没用了。",
  oauth_states:
    "微信/Google 等第三方登录跳转时的临时状态，防止重复提交，短期有效。",
  pending_wechat_login:
    "微信扫码登录等待绑定时的临时记录，过期可删。",
  auth_login_tickets:
    "社交登录一次性票据，登录完成后不再需要。",
  admin_trusted_devices:
    "管理员勾选「信任此设备」的记录。只删已过期或已撤销的设备，不影响当前正常登录。",
  admin_sensitive_action_tokens:
    "管理员执行删除、导出等敏感操作时的二次验证令牌。过期或撤销后可删，不影响当前会话。",
  cart_items:
    "购物车里长期没更新的商品行。不是订单，删了只是清空「僵尸购物车」。",
  checkout_abandonments:
    "用户下单中途离开、系统保存的结账快照，用于分析弃单，时间久了可删。",
  browsing_history:
    "用户看了哪些商品的历史，用于「最近浏览」，过期可删。",
  analytics_events:
    "前台埋点产生的访问、点击等原始日志，删了不影响订单，只影响很久以前的分析明细。",
  home_engagement_events:
    "首页轮播、按钮等运营互动统计用的记录。",
  notifications_read:
    "用户 App/网站里「已读」的站内通知。未读通知不会删。想清通知中心列表需用户先已读或等更久。",
  notification_logs:
    "后台每次发短信/推送时留下的发送流水，用于排查是否发出。",
  notification_batches:
    "后台「通知中心」里创建的发送批次（含草稿、已发送历史）。不会删「定时待发」的批次。",
  export_tasks:
    "在报表里点「导出 Excel」等产生的任务记录。",
  export_files:
    "导出完成后留在服务器磁盘上的文件，过期可删以释放空间。",
  user_login_audits:
    "普通用户登录成功/失败的记录，用于安全排查。",
  audit_logs:
    "管理员在后台的重要操作记录（谁改了什么）。默认保留约 7 年且锁定，一般不要缩短。",
  admin_event_records_resolved:
    "顶部铃铛「后台事件」里已经解决、忽略或过期的条目。进行中的事件不会删，需先在事件中心处理完。",
  data_consistency_runs:
    "系统自动检查订单/库存等是否对得上时，每次检查的运行记录。",
  data_consistency_rule_events:
    "数据一致性检查过程中产生的明细事件。",
  data_change_events:
    "数据一致性监控为追踪实体变更而记录的流水事件，不影响业务主数据。",
  data_consistency_anomalies_resolved:
    "一致性检查发现的异常，在已标记为已解决/已忽略/已修复后的历史记录。",
  data_repair_tasks:
    "后台「数据修复」功能执行过的任务历史。",
};

export function getDataCleanupPolicyHelp(policyKey: string, fallbackDescription?: string): string {
  const key = String(policyKey || "").trim();
  if (key && DATA_CLEANUP_POLICY_HELP[key]) return DATA_CLEANUP_POLICY_HELP[key];
  const desc = String(fallbackDescription || "").trim();
  if (desc && !/^[a-z][a-z0-9_]*$/i.test(desc)) return desc;
  return "按保留天数清理该类系统记录；具体范围见策略名称与预览命中条数。";
}
