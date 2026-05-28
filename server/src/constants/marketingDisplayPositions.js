const marketingDisplayData = require('../../../click-send-shop-main/click-send-shop-main/src/constants/marketingDisplayPositions.data.json');

const DISPLAY_POSITIONS = marketingDisplayData.displayPositions;
const DISPLAY_POSITION_LABELS = marketingDisplayData.displayPositionLabels;
const PUBLISHABLE_ACTIVITY_TYPES = marketingDisplayData.publishableActivityTypes;
const WIP_ACTIVITY_TYPES = marketingDisplayData.wipActivityTypes;
const ACTIVITY_TYPE_DISPLAY_POSITION_MAP = marketingDisplayData.activityTypeDisplayPositions || {};
const ACTIVITY_TYPE_DEFAULT_DISPLAY_POSITION_MAP = marketingDisplayData.activityTypeDefaultDisplayPositions || {};

function isValidDisplayPosition(value) {
  return DISPLAY_POSITIONS.includes(String(value || '').trim());
}

function normalizeDisplayPositions(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map((x) => String(x || '').trim()).filter(isValidDisplayPosition))];
}

function labelDisplayPositions(list) {
  return normalizeDisplayPositions(list).map((k) => DISPLAY_POSITION_LABELS[k] || k);
}

function getAllowedDisplayPositionsForActivity(type) {
  return ACTIVITY_TYPE_DISPLAY_POSITION_MAP[String(type || '')] || [];
}

function getDefaultDisplayPositionsForActivity(type) {
  return ACTIVITY_TYPE_DEFAULT_DISPLAY_POSITION_MAP[String(type || '')] || [];
}

function normalizeDisplayPositionsForActivity(type, list) {
  const allowed = new Set(getAllowedDisplayPositionsForActivity(type));
  return normalizeDisplayPositions(list).filter((position) => allowed.has(position));
}

function findInvalidDisplayPositionsForActivity(type, list) {
  const normalized = normalizeDisplayPositions(list);
  const allowed = new Set(getAllowedDisplayPositionsForActivity(type));
  return normalized.filter((position) => !allowed.has(position));
}

module.exports = {
  DISPLAY_POSITIONS,
  DISPLAY_POSITION_LABELS,
  PUBLISHABLE_ACTIVITY_TYPES,
  WIP_ACTIVITY_TYPES,
  ACTIVITY_TYPE_DISPLAY_POSITION_MAP,
  ACTIVITY_TYPE_DEFAULT_DISPLAY_POSITION_MAP,
  isValidDisplayPosition,
  normalizeDisplayPositions,
  normalizeDisplayPositionsForActivity,
  findInvalidDisplayPositionsForActivity,
  getAllowedDisplayPositionsForActivity,
  getDefaultDisplayPositionsForActivity,
  labelDisplayPositions,
};
