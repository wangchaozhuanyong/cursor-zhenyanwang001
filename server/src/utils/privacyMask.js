function maskPhone(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return '';

  const compact = raw.replace(/\s+/g, '');

  if (compact.length <= 7) {
    if (compact.length <= 3) return compact;
    return `${compact.slice(0, 2)}****${compact.slice(-1)}`;
  }

  return `${compact.slice(0, 3)}****${compact.slice(-4)}`;
}

module.exports = {
  maskPhone,
};
