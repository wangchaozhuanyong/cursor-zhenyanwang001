const { ValidationError } = require('../../../errors');

function assertPromotionEvaluationEligible(evaluation) {
  if (!evaluation || evaluation.eligible !== false) return;
  const blocking = (evaluation.unavailable_reasons || []).find((item) => item?.blocking)
    || (evaluation.unavailable_reasons || [])[0];
  const title = blocking?.title ? `「${blocking.title}」` : '';
  const reason = blocking?.reason || '活动规则已变化';
  throw new ValidationError(`活动${title}不可用：${reason}，请刷新结算页后重试`);
}

module.exports = {
  assertPromotionEvaluationEligible,
};
