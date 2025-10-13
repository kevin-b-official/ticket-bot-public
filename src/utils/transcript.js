const fs = require('fs');
const path = require('path');
const { sanitizeMessageContent } = require('./sanitizer');
const config = require('../config');

async function fetchAllMessages(channel, maxFetchBatch = config.ticket?.maxFetchBatch || 100) {
  let all = [];
  let lastId = null;
  while (true) {
    const options = { limit: maxFetchBatch };
    if (lastId) options.before = lastId;
    const fetched = await channel.messages.fetch(options);
    if (!fetched || fetched.size === 0) break;
    all = all.concat(Array.from(fetched.values()));
    lastId = fetched.last().id;
    if (fetched.size < maxFetchBatch) break;
  }
  return all.reverse();
}

function buildHtmlTranscript(channelName, ticketOwner, closedBy, messages) {
  const styling = config.transcript?.styling || {};
  const includeAttachments = config.transcript?.includeAttachments !== false;

  const rows = messages.map(m => {
    const time = new Date(m.createdTimestamp).toLocaleString();
    let content = sanitizeMessageContent(m.content || '');
    if (includeAttachments && m.attachments?.size > 0) {
      content += `<div>Attachments: ${m.attachments.map(a => `<a href="${a.url}" target="_blank" rel="noopener noreferrer">${a.name || a.url}</a>`).join(', ')}</div>`;
    }
    return `<div class="msg"><span class="time">[${time}]</span> <strong>${sanitizeMessageContent(m.author.tag)}</strong>: <span class="content">${content}</span></div>`;
  }).join('\n');

  const bgColor = styling.backgroundColor || '#0f172a';
  const textColor = styling.textColor || '#d1d5db';
  const accentColor = styling.accentColor || '#60a5fa';
  const fontFamily = styling.fontFamily || 'Arial, Helvetica, sans-serif';

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:${fontFamily};padding:16px;background:${bgColor};color:${textColor}}
h2{color:#fff}
.msg{margin:8px 0;padding:8px;border-radius:6px;background:rgba(255,255,255,0.03)}
.time{color:#94a3b8;font-size:0.9em;margin-right:6px}
.content{white-space:pre-wrap}
a{color:${accentColor}}
</style>
</head><body>
<h2>Ticket Transcript - ${sanitizeMessageContent(channelName)}</h2>
<p>Owner: ${sanitizeMessageContent(ticketOwner)} | Closed by: ${sanitizeMessageContent(closedBy)} | Date: ${new Date().toLocaleString()}</p>
<hr/>
${rows}
</body></html>`;
}

async function saveTranscriptHtml(channelName, ticketOwner, closedBy, messages) {
  const html = buildHtmlTranscript(channelName, ticketOwner, closedBy, messages);
  const saveLocation = config.transcript?.saveLocation || './data/transcripts';
  if (!fs.existsSync(saveLocation)) fs.mkdirSync(saveLocation, { recursive: true });
  const filePath = path.join(saveLocation, `${channelName}.html`);
  fs.writeFileSync(filePath, html, 'utf8');
  return filePath;
}

module.exports = { fetchAllMessages, saveTranscriptHtml };