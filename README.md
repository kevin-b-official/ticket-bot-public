# 🎫 Ticket Bot

A modern, secure, and production-ready ticket system for Discord, built with **Discord.js v14 (compatible with future v15)** and **SQLite (better-sqlite3)**.
It provides a full support workflow including ticket creation, claiming, closing with transcript generation, and logging.

---

## ✨ Features

* **Ticket Creation Menu**

  * Users can open tickets via a select menu.
  * Configurable ticket types.

* **Database-Backed Tickets**

  * Tickets are stored in SQLite (`better-sqlite3`) with **autoincrement IDs**.
  * Avoids counter desyncs and ensures unique ticket names.

* **Secure & Sanitized Transcripts**

  * Full transcript saved as **sanitized HTML** (Discord-style design).
  * Prevents malicious HTML/JS injection.
  * Includes attachments with safe clickable links.

* **Support Team Workflow**

  * Support role automatically notified on new ticket creation.
  * **Claim System**: Tickets can be claimed by support staff via `/claim` or a claim button.
  * Assigned support staff stored in the database.

* **Ticket Closing**

  * Tickets can be closed via `/close` or a button.
  * Full transcript is:

    * Logged in a specified log channel.
    * Sent to the ticket owner via DM (if possible).
    * Saved in `./data/transcripts/`.

* **Ticket Logs Command**

  * `/ticketlogs` provides paginated browsing of ticket history.
  * Shows type, creator, support staff, created/closed times.

* **Security Enhancements**

  * **dotenv-safe** ensures required environment variables are set.
  * Input/output sanitized before saving transcripts.
  * Ticket permissions tightly controlled.

* **Modular Codebase**

  * Commands, events, utils, and database separated for easy maintenance.
  * Future-proof structure for adding new features.

---

## 🗂 Project Structure

```
/ticket-bot
├─ package.json
├─ .env.example
├─ deploy-commands.js
├─ index.js
├─ README.md
├─ LICENSE.txt
├─ CONFIG_GUIDE.md
├─ /src
│  ├─ /commands
│  │  ├─ ticketlogs.js
│  │  ├─ claim.js
│  │  └─ close.js
│  ├─ /events
│  │  ├─ ready.js
│  │  └─ interactionCreate.js
│  ├─ /database
│  │  └─ db.js
│  ├─ /utils
│  │  ├─ transcript.js
│  │  ├─ logger.js
│  │  ├─ automation.js
│  │  ├─ logEmbed.js
│  │  ├─ fallback.js
│  │  └─ sanitizer.js
│  └─ config.js
└─ /data
   ├─ tickets.db
   └─ /transcripts
```

---

## ⚙️ Installation & Setup

### 1. Clone the project

```bash
git clone https://github.com/kevin-b-official/ticket-bot.git
cd ticket-bot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

* Copy `.env.example` → `.env`
* Fill in values:

```ini
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_app_id
GUILD_ID=your_guild_id
TICKET_MENU_CHANNEL_ID=channel_for_ticket_menu
TICKET_CATEGORY_ID=category_id_for_ticket_channels
SUPPORT_ROLE_ID=support_role_id
LOG_CHANNEL_ID=log_channel_id
NODE_ENV=production
```

### 4. Deploy slash commands

Run once after setup or when commands change:

```bash
npm run deploy-commands
```

### 5. Start the bot

```bash
npm start
```

---

## 📖 Commands

| Command       | Description                  | Permission Required            |
| ------------- | ---------------------------- | ------------------------------ |
| `/claim`      | Claim the current ticket     | Manage Channels + Support role |
| `/close`      | Close the current ticket     | Manage Channels + Support role |
| `/ticketlogs` | View ticket logs (paginated) | Manage Channels                |

---

## 🔒 Security Notes

* **Transcripts**: Sanitized to prevent XSS. Attachments are safe clickable links.
* **Permissions**: Only ticket creator + support role can view/write. Everyone else denied.
* **Env Validation**: Using `dotenv-safe` ensures required environment variables are set at startup.
* **Database**: SQLite with parameterized queries prevents SQL injection.

---

## 📂 Data & Transcripts

* Database: `./data/tickets.db`
* Transcripts: `./data/transcripts/{ticket-id}.html`

---

## 🚀 Future Improvements

* PDF transcript export (via Puppeteer or PDFKit).
* Web dashboard for managing tickets.
* S3/cloud storage for transcript backups.
* Rate limiting for ticket creation to prevent spam.
* Multi-language support (JSON translation files).

---

## 🛡 Best Practices

* Run with Node.js **20+**.
* Use a process manager like **PM2** or systemd for uptime.
* Never commit `.env` or `/data/` to version control.
* Regularly backup database + transcripts.

---

## 📜 License

This project is licensed under the [**GPL v3 License**](/LICENSE.txt).