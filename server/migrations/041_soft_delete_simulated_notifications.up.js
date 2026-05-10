/**
 * 清理自动化联调脚本写入的典型演示通知（simulate-e2e-data.js 等），
 * 使用软删除以便与后台列表查询（deleted_at IS NULL）一致。
 *
 * 匹配条件尽量精确，避免误删运营自拟标题中含「模拟」二字的正式通知。
 */
module.exports = {
  async up(query) {
    await query(
      `UPDATE notifications
         SET deleted_at = NOW(),
             send_status = 'cancelled',
             publish_status = 'archived',
             workflow_status = 'cancelled',
             last_modified_at = NOW()
       WHERE deleted_at IS NULL
         AND (
           title = '模拟促销活动上线'
           OR content = '系统已自动生成模拟活动与商品数据，用于联调验证。'
         )`,
    );
  },
};
