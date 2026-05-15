const KNOWN_MOJIBAKE_MAP = {
  '鍖呴偖': '包邮',
};

function normalizeKnownMojibakeText(value) {
  if (typeof value !== 'string' || !value) return value;
  let out = value;
  for (const [bad, good] of Object.entries(KNOWN_MOJIBAKE_MAP)) {
    if (out.includes(bad)) out = out.split(bad).join(good);
  }
  return out;
}

module.exports = {
  normalizeKnownMojibakeText,
};

