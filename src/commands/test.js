const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { db } = require('../database/db');
const { createTicketEmbed } = require('../utils/logEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Open a test ticket (no support ping)')
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    const guild = interaction.guild;
    const member = interaction.member;

    if (!guild) return interaction.reply({ content: 'Guild not found.', ephemeral: true });

    // --- DEFER IMMEDIATELY ---
    await interaction.deferReply({ ephemeral: true });

    const categoryId = config.ticket.categoryId || config.env.ticketCategoryId;
    if (!categoryId) return interaction.editReply({ content: 'Ticket category not set in config.' });

    const ticketName = config.ticket.namingPattern.replace('{id}', Date.now());

    try {
      // --- CREATE TICKET CHANNEL ---
      const channel = await guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: categoryId,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: ['ViewChannel'] },
          { id: member.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
        ],
      });

      // --- LOG TICKET TO DB ---
      if (db && db.createTicket) {
        db.createTicket({
          ticket_name: ticketName,
          creator_id: member.id,
          creator_tag: member.user.tag,
          type: 'Test',
          created_at: new Date(),
        });
      }

      // --- CREATE CLOSE BUTTON ---
      const closeButton = new ButtonBuilder()
        .setCustomId(config.ticket.buttons.close.id || 'ticket_close')
        .setLabel(config.ticket.buttons.close.label || 'Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji(config.ticket.buttons.close.emoji || '🔒');

      const row = new ActionRowBuilder().addComponents(closeButton);

      // --- SEND EMBED WITH BUTTON ---
      const ticketMessage = await channel.send({
        embeds: [createTicketEmbed({
          ticket_name: ticketName,
          creator_id: member.id,
          creator_tag: member.user.tag,
          type: 'Test',
          created_at: new Date(),
          closed_at: null,
          support_id: null,
          support_tag: null,
          log_channel_id: null,
          log_message_id: null,
        }, interaction.client)],
        components: [row],
      });

      // Optional: store message ID
      if (db && db.updateTicketMessageId) {
        db.updateTicketMessageId(ticketName, ticketMessage.id, channel.id);
      }

      // --- EDIT INITIAL DEFERRED REPLY ---
      await interaction.editReply({ content: `✅ Test ticket created: ${channel}` });

      // --- BUTTON COLLECTOR ---
      const filter = i =>
        i.customId === (config.ticket.buttons.close.id || 'ticket_close') &&
        i.user.id === member.id;

      const collector = ticketMessage.createMessageComponentCollector({ filter, time: 15 * 60 * 1000 });

      collector.on('collect', async i => {
        try {
          // Update embed to show closed
          const embed = createTicketEmbed({
            ticket_name: ticketName,
            creator_id: member.id,
            creator_tag: member.user.tag,
            type: 'Test',
            created_at: new Date(),
            closed_at: new Date(),
            support_id: null,
            support_tag: null,
          }, interaction.client);

          // Disable button
          const disabledRow = new ActionRowBuilder().addComponents(closeButton.setDisabled(true));

          await i.update({ embeds: [embed], components: [disabledRow] });

          // Delete channel after delay
          const deleteDelay = config.ticket.channelDeleteDelay || 5000;
          setTimeout(() => channel.delete().catch(() => {}), deleteDelay);

          collector.stop();
        } catch (err) {
          console.warn('[Button Interaction Error]', err.message);
        }
      });

      collector.on('end', () => {
        // Collector ended — nothing needed, button already disabled on close
      });

    } catch (err) {
      console.error('[Test Ticket Error]', err);
      await interaction.editReply({ content: '❌ Failed to create test ticket.' });
    }
  },
};