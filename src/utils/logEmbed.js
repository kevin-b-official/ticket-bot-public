const { EmbedBuilder } = require('discord.js');
const { getTicketByName } = require('../database/db');
const config = require('../config');

const ticketCfg = config.ticket || {};

function createTicketEmbed(ticket) {
  return new EmbedBuilder()
    .setTitle(`🎫 Ticket: ${ticket.ticket_name}`)
    .setColor(ticket.closed_at ? 0xff4d4d : 0x5865f2)
    .setDescription(`**Type:** ${ticket.type}`)
    .addFields(
      { name: '🧑 Creator', value: `<@${ticket.creator_id}> (${ticket.creator_tag})`, inline: true },
      { name: '👨‍💼 Support', value: ticket.support_id ? `<@${ticket.support_id}> (${ticket.support_tag})` : 'Unassigned', inline: true },
      { name: '📅 Created', value: `<t:${Math.floor(new Date(ticket.created_at).getTime() / 1000)}:R>`, inline: false },
      ...(ticket.closed_at ? [{ name: '❌ Closed', value: `<t:${Math.floor(new Date(ticket.closed_at).getTime() / 1000)}:R>`, inline: false }] : [])
    )
    .setFooter({
            text: (ticketCfg.embed?.footer?.text) ?? 'Developed by Horizov',
            iconURL: ticketCfg.embed?.footer?.useBotAvatar ? client.user.displayAvatarURL() : ticketCfg.embed?.footer?.iconURL ?? null
          })
    .setTimestamp();
}

async function updateTicketEmbed(client, ticket_name) {
  const ticket = getTicketByName(ticket_name); // ✅ use the destructured function
  if (!ticket || !ticket.log_channel_id || !ticket.log_message_id) return;

  try {
    const channel = await client.channels.fetch(ticket.log_channel_id);
    const message = await channel.messages.fetch(ticket.log_message_id);
    await message.edit({ embeds: [createTicketEmbed(ticket)] });
  } catch (err) {
    console.error(`[Embed Update Error] ${ticket_name}:`, err.message);
  }
}

module.exports = { createTicketEmbed, updateTicketEmbed };