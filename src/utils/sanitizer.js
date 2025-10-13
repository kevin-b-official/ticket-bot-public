const sanitizeHtml = require('sanitize-html');
const { escape } = require('html-escaper');
const config = require('../config');

function sanitizeForHtml(text) {
  if (!text) return '';
  // escape HTML special chars to prevent injection when saving as HTML transcript
  let s = escape(text);
  // optionally strip tags if any slip through
  s = sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} });
  // cap length
  if (s.length > config.transcriptMaxLength) s = s.slice(0, config.transcriptMaxLength) + '...';
  return s;
}

function sanitizeMessageContent(content) {
  if (!content) return '';
  return sanitizeForHtml(content);
}

module.exports = { sanitizeForHtml, sanitizeMessageContent };