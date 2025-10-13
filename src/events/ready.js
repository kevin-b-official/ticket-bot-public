const {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType
} = require('discord.js');
const { presence, ticketMenu, env } = require('../config');
const { log } = require('../utils/logger');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    log('log', `${client.user.tag} is online.`);

    // --- Presence Rotation ---
    let index = 0;

    function setNextActivity() {
      const activity = presence.activities[index];
      client.user.setPresence({
        activities: [{
          name: activity.name,
          type: activity.type,
          url: activity.url || undefined
        }],
        status: presence.status
      });
      index = (index + 1) % presence.activities.length;
    }

    setNextActivity();
    setInterval(setNextActivity, presence.rotationInterval);

    // --- Ticket Menu Setup ---
    const guild = await client.guilds.fetch(env.guildId).catch(() => null);
    if (!guild) return log('error', '❌ Guild not found. Check GUILD_ID in .env');

    const channel = await guild.channels.fetch(env.ticketMenuChannelId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText)
      return log('error', '❌ Ticket menu channel missing or invalid.');

    const embed = new EmbedBuilder()
      .setTitle(ticketMenu.embed.title)
      .setDescription(ticketMenu.embed.description)
      .setColor(ticketMenu.embed.color)
      .setImage(ticketMenu.embed.image)
      .setFooter({
        text: ticketMenu.embed.footer.text,
        iconURL: ticketMenu.embed.footer.icon ? client.user.displayAvatarURL() : null
      });

    const menu = new StringSelectMenuBuilder()
      .setCustomId(ticketMenu.customId)
      .setPlaceholder(ticketMenu.placeholder)
      .addOptions(
        ticketMenu.ticketTypes.map(t => ({
          label: t.label,
          value: t.id,
          description: t.description
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => []);
    const existing = messages.find(
      m =>
        m.embeds?.[0]?.title === ticketMenu.embed.title &&
        m.components?.[0]?.components?.[0]?.customId === ticketMenu.customId
    );

    if (existing) {
      await existing
        .edit({ embeds: [embed], components: [row] })
        .then(() => log('log', '🔁 Ticket menu updated.'))
        .catch(err => log('error', 'Failed to update ticket menu', err));
    } else {
      await channel
        .send({ embeds: [embed], components: [row] })
        .then(() => log('log', '✅ Ticket menu created successfully.'))
        .catch(err => log('error', 'Failed to send ticket menu', err));
    }
  }
};