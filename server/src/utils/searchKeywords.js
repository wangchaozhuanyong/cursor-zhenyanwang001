/**
 * 轻量搜索关键词生成器。
 *
 * 不依赖第三方拼音包：英文/数字会标准化；中文会保留原文，并为常见电商字补充拼音首字母。
 * 对无法覆盖的生僻字，仍可通过原中文 LIKE 命中；后续如接入 pinyin 包，只需替换这里。
 */
const PINYIN_INITIALS = {
  新: 'x', 品: 'p', 热: 'r', 销: 'x', 推: 't', 荐: 'j',
  服: 'f', 装: 'z', 男: 'n', 女: 'n', 童: 't', 鞋: 'x', 包: 'b',
  美: 'm', 妆: 'z', 护: 'h', 肤: 'f', 香: 'x', 水: 's',
  家: 'j', 居: 'j', 电: 'd', 器: 'q', 手: 's', 机: 'j', 脑: 'n',
  食: 's', 零: 'l', 饮: 'y', 料: 'l', 茶: 'c',
  母: 'm', 婴: 'y', 运: 'y', 动: 'd', 户: 'h', 外: 'w',
  珠: 'z', 宝: 'b', 饰: 's', 表: 'b', 眼: 'y', 镜: 'j',
  黑: 'h', 白: 'b', 红: 'h', 蓝: 'l', 绿: 'l', 金: 'j', 银: 'y',
  大: 'd', 小: 'x', 中: 'z', 号: 'h', 款: 'k', 套: 't',
};

function normalizeSearchKeyword(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 100);
}

function initialsOf(input) {
  const chars = Array.from(String(input || ''));
  return chars.map((ch) => {
    if (/[a-z0-9]/i.test(ch)) return ch.toLowerCase();
    return PINYIN_INITIALS[ch] || '';
  }).join('');
}

function buildSearchKeywords(...parts) {
  const raw = parts
    .flat()
    .filter((v) => v != null && String(v).trim())
    .map((v) => String(v).trim());
  const initials = raw.map(initialsOf).filter(Boolean);
  return [...new Set([...raw, ...initials, ...raw.map(normalizeSearchKeyword)])]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);
}

module.exports = {
  normalizeSearchKeyword,
  buildSearchKeywords,
};
