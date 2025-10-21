# 🎫 Ticket Bot

A modern, secure, and production-ready **multi-server** ticket system for Discord, built with **Discord.js v14** and **Supabase**.
It provides a full support workflow including ticket creation, claiming, closing with transcript generation, logging, and per-guild customization.

---

## ✨ Features

* **Multi-Guild Support**

  * Works across unlimited Discord servers simultaneously.
  * Each server has independent configuration and ticket numbering.
  * Per-guild settings stored in Supabase database.

* **Interactive Setup Command**

  * `/setup` command provides a fully interactive configuration interface.
  * Customize ticket categories, support roles, log channels, automation settings, and more.
  * No need to edit config files or environment variables per server.

* **Ticket Creation Menu**

  * Users can open tickets via a select menu.
  * Configurable ticket types.

* **Database-Backed Tickets**

  * Tickets are stored in **Supabase** with per-guild autoincrement IDs.
  * Scalable and reliable cloud database.
  * Performance optimized with caching.

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
* Fill in required values:

```ini
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_app_id

# Supabase credentials (Required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: GUILD_ID for testing (deploys commands to one server instantly)
# Leave empty for global deployment (takes up to 1 hour)
GUILD_ID=
```

### 4. Deploy slash commands

Run once after setup or when commands change:

```bash
npm run deploy
```

### 5. Start the bot

```bash
npm start
```

### 6. Configure your server

In your Discord server, run:

```
/setup
```

This will guide you through configuring:
* Ticket category
* Support role
* Log channel
* Fallback transcript channel
* Automation settings
* Inactivity timers
* Embed colors

---

## 📖 Commands

| Command       | Description                                | Permission Required            |
| ------------- | ------------------------------------------ | ------------------------------ |
| `/setup`      | Configure ticket system for your server    | Administrator                  |
| `/claim`      | Claim the current ticket                   | Manage Channels + Support role |
| `/close`      | Close the current ticket                   | Manage Channels + Support role |
| `/ticketlogs` | View ticket logs for your server (paginated) | Manage Channels                |

---

## 🔒 Security Notes

* **Transcripts**: Sanitized to prevent XSS. Attachments are safe clickable links.
* **Permissions**: Only ticket creator + support role can view/write. Everyone else denied.
* **Env Validation**: Using `dotenv-safe` ensures required environment variables are set at startup.
* **Database**: SQLite with parameterized queries prevents SQL injection.

---

## 📂 Data & Transcripts

* Database: **Supabase** (cloud-hosted PostgreSQL)
* Transcripts: `./data/transcripts/{ticket-name}.html`
* Per-guild configuration stored in database
* Automatic ticket numbering per guild

---

## 🚀 Performance Optimizations

* **Guild config caching** with 5-minute TTL to reduce database queries
* **Indexed database queries** for fast lookups by guild_id, status, and creator
* **Efficient automation** that checks only guilds with automation enabled
* **Supabase connection pooling** for optimal database performance

---

## 🌐 Multi-Server Benefits

* **Scalable**: Add the bot to unlimited servers
* **Independent**: Each server has its own configuration and ticket numbering
* **No conflicts**: Tickets and settings are completely isolated per guild
* **Easy management**: Server admins configure their own settings via `/setup`

---

## 🚀 Future Improvements

* PDF transcript export (via Puppeteer or PDFKit).
* Web dashboard for managing tickets.
* Advanced analytics per guild.
* Rate limiting for ticket creation to prevent spam.
* Multi-language support (JSON translation files).

---

## 🛡 Best Practices

* Run with Node.js **20+**.
* Use a process manager like **PM2** or systemd for production uptime.
* Never commit `.env` or `/data/` to version control.
* Regularly backup transcripts (database is backed up by Supabase).
* Use environment variables for sensitive data.
* Deploy commands globally (without GUILD_ID) for production use.

---

## 📜 License

This project is licensed under the [**GPL v3 License**](/LICENSE.txt).