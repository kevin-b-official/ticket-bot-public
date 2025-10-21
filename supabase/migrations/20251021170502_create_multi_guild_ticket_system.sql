/*
  # Multi-Guild Ticket System Database Schema

  1. New Tables
    - `guilds`
      - `guild_id` (text, primary key) - Discord guild ID
      - `guild_name` (text) - Guild name for reference
      - `ticket_category_id` (text) - Category for ticket channels
      - `support_role_id` (text) - Support role ID
      - `log_channel_id` (text) - Channel for ticket logs
      - `transcript_fallback_channel_id` (text) - Fallback for transcripts
      - `ticket_counter` (bigint, default 0) - Auto-increment ticket numbers per guild
      - `automation_enabled` (boolean, default true) - Master switch for automation
      - `inactivity_warning_enabled` (boolean, default true) - Inactivity warnings
      - `inactivity_warning_minutes` (integer, default 60) - Minutes before warning
      - `auto_close_enabled` (boolean, default true) - Auto-close inactive tickets
      - `auto_close_minutes` (integer, default 120) - Minutes before auto-close
      - `unclaimed_reminder_enabled` (boolean, default true) - Remind about unclaimed tickets
      - `unclaimed_reminder_minutes` (integer, default 15) - Reminder interval
      - `embed_color` (text, default '#5865f2') - Embed color hex
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

    - `tickets`
      - `id` (bigint, primary key, auto-increment)
      - `guild_id` (text, foreign key to guilds)
      - `ticket_name` (text, unique) - Channel name
      - `ticket_number` (bigint) - Sequential number per guild
      - `type` (text) - Ticket type/category
      - `creator_id` (text) - Discord user ID
      - `creator_tag` (text) - User tag for reference
      - `support_id` (text) - Assigned support member ID
      - `support_tag` (text) - Support member tag
      - `channel_id` (text) - Discord channel ID
      - `created_at` (timestamptz, default now())
      - `closed_at` (timestamptz) - Closure timestamp
      - `transcript` (text) - Transcript file path
      - `log_channel_id` (text) - Where log embed was posted
      - `log_message_id` (text) - Log embed message ID
      - `status` (text, default 'open') - open, claimed, closed

  2. Security
    - Enable RLS on all tables
    - Tables are service-role only (bot operations)
    
  3. Indexes
    - Index on guild_id for fast guild lookups
    - Index on ticket status for filtering
    - Index on creator_id for user ticket lookups
    
  4. Important Notes
    - All data is isolated per guild
    - Ticket numbers auto-increment per guild
    - Configuration is fully customizable per guild
    - RLS ensures data security
*/

CREATE TABLE IF NOT EXISTS guilds (
  guild_id text PRIMARY KEY,
  guild_name text NOT NULL,
  ticket_category_id text,
  support_role_id text,
  log_channel_id text,
  transcript_fallback_channel_id text,
  ticket_counter bigint DEFAULT 0,
  automation_enabled boolean DEFAULT true,
  inactivity_warning_enabled boolean DEFAULT true,
  inactivity_warning_minutes integer DEFAULT 60,
  auto_close_enabled boolean DEFAULT true,
  auto_close_minutes integer DEFAULT 120,
  unclaimed_reminder_enabled boolean DEFAULT true,
  unclaimed_reminder_minutes integer DEFAULT 15,
  embed_color text DEFAULT '#5865f2',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets (
  id bigserial PRIMARY KEY,
  guild_id text NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
  ticket_name text UNIQUE NOT NULL,
  ticket_number bigint NOT NULL,
  type text NOT NULL,
  creator_id text NOT NULL,
  creator_tag text NOT NULL,
  support_id text,
  support_tag text,
  channel_id text,
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  transcript text,
  log_channel_id text,
  log_message_id text,
  status text DEFAULT 'open',
  UNIQUE(guild_id, ticket_number)
);

ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all guilds"
  ON guilds FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all tickets"
  ON tickets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tickets_guild_id ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_creator_id ON tickets(creator_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);

CREATE OR REPLACE FUNCTION update_guild_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guilds_updated_at
  BEFORE UPDATE ON guilds
  FOR EACH ROW
  EXECUTE FUNCTION update_guild_timestamp();