# Migration Guide: Single-Server to Multi-Server

This guide helps you migrate from the old SQLite single-server version to the new Supabase multi-server version.

## What's Changed

### Database
- **Old**: SQLite local file (`./data/tickets.db`)
- **New**: Supabase PostgreSQL (cloud-hosted)

### Configuration
- **Old**: Environment variables per installation
- **New**: Per-guild configuration via `/setup` command

### Deployment
- **Old**: Guild-specific command deployment
- **New**: Global command deployment for multi-server support

## Migration Steps

### 1. Update Dependencies

```bash
npm install
```

This will install the new `@supabase/supabase-js` dependency.

### 2. Update Environment Variables

Update your `.env` file to include Supabase credentials:

```ini
DISCORD_TOKEN=your_existing_token
CLIENT_ID=your_existing_client_id

# NEW: Add these Supabase credentials
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OPTIONAL: Keep for testing, remove for production
GUILD_ID=
```

### 3. Deploy Commands

If moving to production (multi-server):

```bash
# Remove GUILD_ID from .env or set it to empty
GUILD_ID=

# Deploy globally
npm run deploy
```

Note: Global deployment takes up to 1 hour to propagate.

### 4. Configure Each Server

In each Discord server where the bot is installed:

1. Run `/setup`
2. Configure:
   - Ticket category
   - Support role
   - Log channel
   - Fallback transcript channel
   - Automation settings

### 5. Data Migration (Optional)

The bot now uses Supabase instead of SQLite. Your old ticket data remains in `./data/tickets.db` for reference, but new tickets will be created in Supabase.

If you need to preserve ticket history:

1. Keep the old `./data/tickets.db` file as backup
2. Use the old `/ticketlogs` command to export history before migrating
3. Old transcripts in `./data/transcripts/` remain accessible

## Benefits of Migration

### For Bot Owners
- **No per-server setup**: Add bot to unlimited servers without configuration
- **Centralized management**: All data in one Supabase database
- **Better scalability**: Cloud database handles unlimited guilds
- **Automatic backups**: Supabase handles database backups

### For Server Admins
- **Self-service configuration**: Use `/setup` to configure without contacting bot owner
- **Independent settings**: Each server has its own configuration
- **No conflicts**: Ticket numbers are unique per server

## Rollback (If Needed)

If you need to rollback to the old version:

1. Checkout the previous git commit or keep a backup of old files
2. Restore your old `.env` file
3. The old `./data/tickets.db` is still intact

## Support

If you encounter issues during migration:

1. Check that Supabase credentials are correct in `.env`
2. Verify database tables were created properly
3. Ensure each server is configured via `/setup`
4. Check bot logs for any error messages

## New Features Available

After migration, you can take advantage of:

- **Multi-server support**: One bot instance for all your servers
- **Interactive setup**: Easy configuration via Discord interface
- **Performance optimizations**: Caching and indexed queries
- **Per-guild automation**: Each server can have different automation settings
- **Scalability**: Cloud database that grows with your needs
