const { BusinessError } = require('../../errors/BusinessError');
const { RETURN_STATUS } = require('../../constants/status');

/**
 * 售后单（return_requests）状态迁移规则
 */
const RETURN_TRANSITIONS = {
  [RETURN_STATUS.PENDING]: [RETURN_STATUS.APPROVED, RETURN_STATUS.REJECTED, RETURN_STATUS.CANCELLED],
  [RETURN_STATUS.APPROVED]: [RETURN_STATUS.PROCESSING, RETURN_STATUS.COMPLETED, RETURN_STATUS.CANCELLED],
  [RETURN_STATUS.REJECTED]: [],
  [RETURN_STATUS.PROCESSING]: [RETURN_STATUS.COMPLETED, RETURN_STATUS.CANCELLED],
  [RETURN_STATUS.COMPLETED]: [],
  [RETURN_STATUS.CANCELLED]: [],
};

/**
 * @param {string} from
 * @param {string} to
 * @throws {BusinessError}
 */
function assertReturnTransition(from, to) {
  const allowed = RETURN_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new BusinessError(400, `不能从售后状态「${from}」变更为「${to}」`);
  }
}

module.exports = {
  RETURN_TRANSITIONS,
  assertReturnTransition,
};
