const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketlogs')
    .setDescription('📜 View all ticket logs in a clean, paginated embed.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, db) {
    const config = require('../config');
    const logsConfig = config.ticketLogs || {};

    await interaction.deferReply({ ephemeral: true });

    const tickets = db.getAllTickets();
    if (!tickets || tickets.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff4d4d)
            .setTitle('❌ No Tickets Found')
            .setDescription('There are currently no ticket logs to display.')
            .setFooter({ text: 'Elegantt Tickets • Logging System' })
            .setTimestamp(),
        ],
      });
    }

    const pageSize = logsConfig.pageSize || 5;
    let page = 0;
    const totalPages = Math.ceil(tickets.length / pageSize);

    // 🧩 Create the paginated embed
    const generateEmbed = (pageIndex) => {
      const pageTickets = tickets.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

      const embed = new EmbedBuilder()
        .setColor(logsConfig.embedColor || 0x5865f2) // Discord blurple default
        .setAuthor({
          name: '🎟️ Elegantt Ticket Logs',
          iconURL: logsConfig.iconURL || 'https://i.imgur.com/lYVY4vY.png', // optional logo
        })
        .setTitle(`📄 Page ${pageIndex + 1} of ${totalPages}`)
        .setDescription('Here’s a summary of recent ticket activity.')
        .setFooter({
          text: `Elegantt Tickets • Total: ${tickets.length}`,
          iconURL: logsConfig.iconURL || 'https://i.imgur.com/lYVY4vY.png',
        })
        .setTimestamp();

      for (const t of pageTickets) {
        const status = t.closed_at ? '🟢 Closed' : '🟠 Open';
        const created = new Date(t.created_at).toLocaleString();
        const closed = t.closed_at ? new Date(t.closed_at).toLocaleString() : '—';

        embed.addFields({
          name: `🎫 ${t.ticket_name} (${status})`,
          value: [
            `> **Type:** ${t.type}`,
            `> **Creator:** ${t.creator_tag}`,
            `> **Support:** ${t.support_tag || 'N/A'}`,
            `> **Created:** ${created}`,
            `> **Closed:** ${closed}`,
          ].join('\n'),
          inline: false,
        });
      }

      return embed;
    };

    // 🔘 Create navigation buttons
    const navigationRow = (pageIndex) =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev_logs')
          .setLabel('⬅ Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('next_logs')
          .setLabel('Next ➡')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageIndex === totalPages - 1),
      );

    // 📤 Send first page
    const message = await interaction.editReply({
      embeds: [generateEmbed(page)],
      components: [navigationRow(page)],
    });

    // 🎣 Create collector for pagination
    const filter = (i) => i.user.id === interaction.user.id;
    const collector = message.createMessageComponentCollector({
      filter,
      time: logsConfig.collectorTimeout || 120_000,
    });

    collector.on('collect', async (i) => {
      if (i.customId === 'prev_logs' && page > 0) page--;
      else if (i.customId === 'next_logs' && page < totalPages - 1) page++;

      await i.update({
        embeds: [generateEmbed(page)],
        components: [navigationRow(page)],
      });
    });

    // 🧹 Disable buttons when collector ends
    collector.on('end', async () => {
      try {
        const disabledRow = new ActionRowBuilder().addComponents(
          navigationRow(page).components.map((btn) => btn.setDisabled(true)),
        );

        await interaction.editReply({
          components: [disabledRow],
        });
      } catch {
        // ignored
      }
    });
  },
};