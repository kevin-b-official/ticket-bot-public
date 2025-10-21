const { EmbedBuilder } = require('discord.js');
const { getTicketByName } = require('../database/db');
const config = require('../config');

const ticketCfg = config.ticket || {};

/**
 * Get embed color depending on ticket type.
 * @param {string} type
 * @param {boolean} closed
 * @returns {number}
 */
function resolveColor(type, closed) {
  if (closed) return 0xff4d4d; // closed = red
  const typeLower = (type || '').toLowerCase();
  if (typeLower.includes('report')) return 0xff5555; // red
  if (typeLower.includes('technical')) return 0xffa500; // orange
  if (typeLower.includes('general')) return 0x3b82f6; // blue
  return ticketCfg.embed?.color || 0x5865f2; // default Elegantt blurple
}

/**
 * Create a formatted ticket embed based on config.
 * @param {object} ticket - Ticket object from database
 * @param {import('discord.js').Client} client - Discord client
 */
function createTicketEmbed(ticket, client) {
  const isClosed = !!ticket.closed_at;
  const color = resolveColor(ticket.type, isClosed);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: '🎟️ Elegantt Ticket System',
      iconURL:
        ticketCfg.embed?.author?.iconURL
    })
    .setTitle(
      `${isClosed ? '🔒 Closed Ticket' : '🟢 Active Ticket'} — ${ticket.ticket_name}`,
    )
    .setDescription(
      ticketCfg.embed?.description ??
        [
          `> **Type:** ${ticket.type}`,
          `> **Status:** ${isClosed ? 'Closed ❌' : 'Open 🟢'}`,
          '',
          '**Ticket Details**',
        ].join('\n'),
    )
    .addFields(
      {
        name: '🧑 Creator',
        value: `<@${ticket.creator_id}> (${ticket.creator_tag})`,
        inline: true,
      },
      {
        name: '👨‍💼 Support',
        value: ticket.support_id
          ? `<@${ticket.support_id}> (${ticket.support_tag})`
          : 'Unassigned',
        inline: true,
      },
      {
        name: '📅 Created',
        value: `<t:${Math.floor(
          new Date(ticket.created_at).getTime() / 1000,
        )}:R>`,
        inline: false,
      },
      ...(isClosed
        ? [
            {
              name: '❌ Closed',
              value: `<t:${Math.floor(
                new Date(ticket.closed_at).getTime() / 1000,
              )}:R>`,
              inline: false,
            },
          ]
        : []),
    );

  // Optional thumbnail / image
  if (ticketCfg.embed?.thumbnail)
    embed.setThumbnail(ticketCfg.embed.thumbnail);
  if (ticketCfg.embed?.image) embed.setImage(ticketCfg.embed.image);

  // Footer (supports bot avatar or custom icon)
  const footerIcon =
    ticketCfg.embed?.footer?.iconURL ||
    (ticketCfg.embed?.footer?.icon && client
      ? client.user.displayAvatarURL()
      : null);

  embed.setFooter({
    text:
      ticketCfg.embed?.footer?.text ||
      (isClosed
        ? ticketCfg.embed?.closeFooter || 'Thank you for contacting support'
        : 'Developed by Horizov'),
    iconURL: footerIcon,
  });

  return embed.setTimestamp();
}

/**
 * Update a ticket log embed.
 * @param {import('discord.js').Client} client
 * @param {string} ticketName
 */
async function updateTicketEmbed(client, ticketName) {
  const ticket = getTicketByName(ticketName);
  if (!ticket || !ticket.log_channel_id || !ticket.log_message_id) return;

  try {
    const channel = await client.channels.fetch(ticket.log_channel_id);
    const message = await channel.messages.fetch(ticket.log_message_id);
    await message.edit({ embeds: [createTicketEmbed(ticket, client)] });
  } catch (err) {
    console.error(`[❌ Embed Update Error] ${ticketName}:`, err.message);
  }
}

module.exports = { createTicketEmbed, updateTicketEmbed };