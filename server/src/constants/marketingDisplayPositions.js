const marketingDisplayData = require('../../../click-send-shop-main/click-send-shop-main/src/constants/marketingDisplayPositions.data.json');

const DISPLAY_POSITIONS = marketingDisplayData.displayPositions;
const DISPLAY_POSITION_LABELS = marketingDisplayData.displayPositionLabels;
const PUBLISHABLE_ACTIVITY_TYPES = marketingDisplayData.publishableActivityTypes;
const WIP_ACTIVITY_TYPES = marketingDisplayData.wipActivityTypes;

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

module.exports = {
  DISPLAY_POSITIONS,
  DISPLAY_POSITION_LABELS,
  PUBLISHABLE_ACTIVITY_TYPES,
  WIP_ACTIVITY_TYPES,
  isValidDisplayPosition,
  normalizeDisplayPositions,
  labelDisplayPositions,
};
