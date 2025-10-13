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

      this.resetInactivityTimer(message.channel);
    });
  }

  resetInactivityTimer(channel) {
    const channelId = channel.id;

    if (this.inactivityTimers.has(channelId)) {
      clearTimeout(this.inactivityTimers.get(channelId));
    }

    const warningConfig = this.automation.inactivityWarning;
    const autoCloseConfig = this.automation.autoClose;

    if (warningConfig?.enabled) {
      const warningTimeout = setTimeout(async () => {
        try {
          await channel.send(warningConfig.message || '⚠️ This ticket has been inactive for a while.');
        } catch (err) {
          log('error', 'Failed to send inactivity warning', err);
        }
      }, (warningConfig.thresholdMinutes || 60) * 60 * 1000);

      this.inactivityTimers.set(channelId, warningTimeout);
    }

    if (autoCloseConfig?.enabled) {
      const closeTimeout = setTimeout(async () => {
        try {
          await this.autoCloseTicket(channel, autoCloseConfig.notifyOwner);
        } catch (err) {
          log('error', 'Failed to auto-close ticket', err);
        }
      }, (autoCloseConfig.inactivityMinutes || 120) * 60 * 1000);

      this.inactivityTimers.set(`${channelId}_close`, closeTimeout);
    }
  }

  async autoCloseTicket(channel, notifyOwner = true) {
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

      this.db.updateTicketClosure({
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
    const reminderConfig = this.automation.unclaimedReminder;
    const intervalMs = (reminderConfig.intervalMinutes || 30) * 60 * 1000;

    log('log', `Unclaimed ticket reminders enabled (every ${reminderConfig.intervalMinutes || 30} minutes)`);

    this.reminderInterval = setInterval(async () => {
      await this.checkUnclaimedTickets(reminderConfig.channelId);
    }, intervalMs);
  }

  async checkUnclaimedTickets(channelId) {
    try {
      const openTickets = this.db.getAllTickets().filter(t => !t.closed_at && !t.support_id);

      if (openTickets.length === 0) return;

      const logChannelId = channelId || config.ticket?.logChannelId || config.env.logChannelId;
      if (!logChannelId) return;

      const channel = await this.client.channels.fetch(logChannelId);
      if (!channel) return;

      const ticketList = openTickets.map(t => `• ${t.ticket_name} (${t.type})`).join('\n');

      await channel.send({
        content: `⚠️ **Unclaimed Tickets Reminder**\n\n${ticketList}\n\nPlease assign support members to these tickets.`
      });

      log('log', `Sent unclaimed ticket reminder for ${openTickets.length} tickets`);
    } catch (err) {
      log('error', 'Failed to send unclaimed reminder', err);
    }
  }
}

module.exports = { TicketAutomation };
