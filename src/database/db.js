const Database = require('better-sqlite3');
const config = require('../config');
const path = require('path');
const fs = require('fs');

const dbPath = config.database?.path || './data/tickets.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_name TEXT,
  type TEXT,
  creator_id TEXT,
  creator_tag TEXT,
  support_id TEXT,
  support_tag TEXT,
  created_at TEXT,
  closed_at TEXT,
  transcript TEXT,
  log_channel_id TEXT,
  log_message_id TEXT
);
`);

module.exports = {
  db,

  insertTicket({ ticket_name, type, creator_id, creator_tag, created_at }) {
    const stmt = db.prepare(`
      INSERT INTO tickets (ticket_name, type, creator_id, creator_tag, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(ticket_name, type, creator_id, creator_tag, created_at);
    return info.lastInsertRowid;
  },

  updateTicketClosure({ ticket_name, support_id, support_tag, closed_at, transcript }) {
    const stmt = db.prepare(`
      UPDATE tickets SET support_id = ?, support_tag = ?, closed_at = ?, transcript = ?
      WHERE ticket_name = ?
    `);
    return stmt.run(support_id, support_tag, closed_at, transcript, ticket_name);
  },

  assignSupport(ticket_name, support_id, support_tag) {
    const stmt = db.prepare(`
      UPDATE tickets SET support_id = ?, support_tag = ? WHERE ticket_name = ?
    `);
    return stmt.run(support_id, support_tag, ticket_name);
  },

  saveLogEmbedInfo(ticket_name, channel_id, message_id) {
    const stmt = db.prepare(`
      UPDATE tickets SET log_channel_id = ?, log_message_id = ? WHERE ticket_name = ?
    `);
    return stmt.run(channel_id, message_id, ticket_name);
  },

  getLogEmbedInfo(ticket_name) {
    return db.prepare(`
      SELECT log_channel_id, log_message_id FROM tickets WHERE ticket_name = ?
    `).get(ticket_name);
  },

  getAllTickets() {
    return db.prepare('SELECT * FROM tickets ORDER BY created_at DESC').all();
  },

  getTicketByName(name) {
    return db.prepare('SELECT * FROM tickets WHERE ticket_name = ?').get(name);
  }
};