const config = require('../config');
const { log } = require('./logger');

class TicketAutomation {
  constructor(client, db) {
    this.client = client;
    this.db = db;
    this.automation = config.ticket?.automation || {};
    this.inactivityTimers = new Map();
    this.reminderInterval = null;
  }

  start() {
    if (!this.automation.enabled) {
      log('log', 'Ticket automation is disabled in config');
      return;
    }

    log('log', 'Starting ticket automation...');

    if (this.automation.inactivityWarning?.enabled) {
      this.startInactivityMonitoring();
    }

    if (this.automation.unclaimedReminder?.enabled) {
      this.startUnclaimedReminders();
    }
  }

  stop() {
    this.inactivityTimers.forEach(timer => clearTimeout(timer));
    this.inactivityTimers.clear();

    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
    }

    log('log', 'Stopped ticket automation');
  }

  startInactivityMonitoring() {
    log('log', 'Inactivity monitoring enabled');

    this.client.on('messageCreate', async (message) => {
      if (!message.channel.name?.startsWith('ticket-')) return;
      if (message.author.bot) return;
      if (!message.guild) return;

      const guildConfig = await this.db.getGuildConfig(message.guild.id);
      if (!guildConfig || !guildConfig.automation_enabled) return;

      this.resetInactivityTimer(message.channel, guildConfig);
    });
  }

  resetInactivityTimer(channel, guildConfig) {
    const channelId = channel.id;

    if (this.inactivityTimers.has(channelId)) {
      clearTimeout(this.inactivityTimers.get(channelId));
    }

    if (guildConfig.inactivity_warning_enabled) {
      const warningTimeout = setTimeout(async () => {
        try {
          await channel.send(this.automation.inactivityWarning?.message || '⚠️ This ticket has been inactive for a while.');
        } catch (err) {
          log('error', 'Failed to send inactivity warning', err);
        }
      }, (guildConfig.inactivity_warning_minutes || 60) * 60 * 1000);

      this.inactivityTimers.set(channelId, warningTimeout);
    }

    if (guildConfig.auto_close_enabled) {
      const closeTimeout = setTimeout(async () => {
        try {
          await this.autoCloseTicket(channel, true, guildConfig);
        } catch (err) {
          log('error', 'Failed to auto-close ticket', err);
        }
      }, (guildConfig.auto_close_minutes || 120) * 60 * 1000);

      this.inactivityTimers.set(`${channelId}_close`, closeTimeout);
    }
  }

  async autoCloseTicket(channel, notifyOwner = true, guildConfig) {
    log('log', `Auto-closing inactive ticket: ${channel.name}`);

    const { fetchAllMessages, saveTranscriptHtml } = require('./transcript');
    const { updateTicketEmbed } = require('./logEmbed');

    try {
      const messages = await fetchAllMessages(channel);
      const ticketOwner = (channel.topic?.match(/ticket_owner:(\d+)/) || [])[1] || null;

      const transcriptPath = await saveTranscriptHtml(
        channel.name,
        ticketOwner ? `<@${ticketOwner}>` : 'Unknown',
        'Automated System',
        messages
      );

      await this.db.updateTicketClosure({
        ticket_name: channel.name,
        support_id: 'system',
        support_tag: 'Automated',
        closed_at: new Date().toISOString(),
        transcript: transcriptPath
      });

      await updateTicketEmbed(this.client, channel.name).catch(() => {});

      if (notifyOwner && ticketOwner) {
        try {
          const guild = channel.guild;
          const owner = await guild.members.fetch(ticketOwner);
          if (owner) {
            await owner.send({
              content: `Your ticket ${channel.name} was automatically closed due to inactivity.`,
              files: [{ attachment: transcriptPath }]
            });
          }
        } catch {
          log('warn', `Could not DM ticket owner ${ticketOwner}`);
        }
      }

      await channel.send('🔒 This ticket is being automatically closed due to inactivity.');
      setTimeout(() => channel.delete().catch(() => {}), 5000);

    } catch (err) {
      log('error', 'Auto-close ticket failed', err);
    }
  }

  startUnclaimedReminders() {
    log('log', 'Unclaimed ticket reminders enabled');

    this.reminderInterval = setInterval(async () => {
      await this.checkAllGuildsForUnclaimedTickets();
    }, 15 * 60 * 1000);
  }

  async checkAllGuildsForUnclaimedTickets() {
    try {
      const guilds = this.client.guilds.cache;

      for (const [guildId, guild] of guilds) {
        const guildConfig = await this.db.getGuildConfig(guildId);

        if (!guildConfig || !guildConfig.automation_enabled || !guildConfig.unclaimed_reminder_enabled) {
          continue;
        }

        await this.checkUnclaimedTickets(guildId, guild, guildConfig);
      }
    } catch (err) {
      log('error', 'Failed to check unclaimed tickets across guilds', err);
    }
  }

  async checkUnclaimedTickets(guildId, guild, guildConfig) {
    try {
      const openTickets = await this.db.getUnclaimedTickets(guildId);

      if (openTickets.length === 0) return;

      const logChannelId = guildConfig.log_channel_id;
      if (!logChannelId) return;

      const channel = await this.client.channels.fetch(logChannelId);
      if (!channel) return;

      const ticketList = openTickets.map(t => `• ${t.ticket_name} (${t.type})`).join('\n');

      await channel.send({
        content: `⚠️ **Unclaimed Tickets Reminder**\n\n${ticketList}\n\nPlease assign support members to these tickets.`
      });

      log('log', `Sent unclaimed ticket reminder for ${openTickets.length} tickets in guild ${guild.name}`);
    } catch (err) {
      log('error', 'Failed to send unclaimed reminder', err);
    }
  }
}

module.exports = { TicketAutomation };
