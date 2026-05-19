/**
 * Magic-byte sniffing for uploads (extension/MIME alone are not trusted).
 */

/** @type {Array<{ mime: string, match: (buf: Buffer) => boolean }>} */
const SIGNATURES = [
  {
    mime: 'image/jpeg',
    match: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  {
    mime: 'image/png',
    match: (buf) =>
      buf.length >= 8
      && buf[0] === 0x89
      && buf[1] === 0x50
      && buf[2] === 0x4e
      && buf[3] === 0x47
      && buf[4] === 0x0d
      && buf[5] === 0x0a
      && buf[6] === 0x1a
      && buf[7] === 0x0a,
  },
  {
    mime: 'image/webp',
    match: (buf) =>
      buf.length >= 12
      && buf.slice(0, 4).toString('ascii') === 'RIFF'
      && buf.slice(8, 12).toString('ascii') === 'WEBP',
  },
  {
    mime: 'image/gif',
    match: (buf) =>
      buf.length >= 6
      && (buf.slice(0, 6).toString('ascii') === 'GIF87a'
        || buf.slice(0, 6).toString('ascii') === 'GIF89a'),
  },
  {
    mime: 'image/avif',
    match: (buf) =>
      buf.length >= 12
      && buf.slice(4, 8).toString('ascii') === 'ftyp'
      && (buf.slice(8, 12).toString('ascii') === 'avif'
        || buf.slice(8, 12).toString('ascii') === 'avis'),
  },
  {
    mime: 'video/mp4',
    match: (buf) => buf.length >= 12 && buf.slice(4, 8).toString('ascii') === 'ftyp',
  },
  {
    mime: 'video/webm',
    match: (buf) =>
      buf.length >= 4
      && buf[0] === 0x1a
      && buf[1] === 0x45
      && buf[2] === 0xdf
      && buf[3] === 0xa3,
  },
  {
    mime: 'video/quicktime',
    match: (buf) => buf.length >= 12 && buf.slice(4, 8).toString('ascii') === 'ftyp',
  },
  {
    mime: 'video/x-m4v',
    match: (buf) => buf.length >= 12 && buf.slice(4, 8).toString('ascii') === 'ftyp',
  },
];

/**
 * @param {Buffer | undefined} buffer
 * @param {string} declaredMime
 * @returns {boolean}
 */
function bufferMatchesDeclaredMime(buffer, declaredMime) {
  if (!buffer || !buffer.length) return false;
  const mime = String(declaredMime || '').toLowerCase();
  const rule = SIGNATURES.find((s) => s.mime === mime);
  if (!rule) return false;
  return rule.match(buffer);
}

module.exports = {
  SIGNATURES,
  bufferMatchesDeclaredMime,
};
