const sanitizeHtml = require('sanitize-html');

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'h1', 'h2', 'h3', 'h4', 'blockquote', 'pre', 'code',
  'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTRIBUTES = {
  a: ['href', 'name', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  '*': ['class'],
};

function sanitizeCmsHtml(input) {
  const cleaned = sanitizeHtml(String(input || ''), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer',
      }, true),
      img: sanitizeHtml.simpleTransform('img', {
        loading: 'lazy',
      }, true),
    },
    disallowedTagsMode: 'discard',
    enforceHtmlBoundary: true,
  });
  return cleaned.replace(/<a\b(?![^>]*\shref=)/gi, '<a href="#"');
}

module.exports = {
  sanitizeCmsHtml,
};
