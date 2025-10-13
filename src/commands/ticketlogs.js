const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketlogs')
    .setDescription('View ticket logs (paginated)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction, db) {
    const config = require('../config');
    const logsConfig = config.ticketLogs || {};

    await interaction.deferReply({ ephemeral: true });
    const allRows = db.getAllTickets();
    if (!allRows || allRows.length === 0) return interaction.editReply({ content: 'No tickets found.' });

    const pageSize = logsConfig.pageSize || 5;
    let page = 0;
    const totalPages = Math.ceil(allRows.length / pageSize);

    const generateEmbed = (p) => {
      const slice = allRows.slice(p * pageSize, (p + 1) * pageSize);
      const embed = new EmbedBuilder()
        .setTitle(`📜 Ticket Logs (Page ${p + 1}/${totalPages})`)
        .setColor(logsConfig.embedColor || 0x00FFFF)
        .setTimestamp();
      slice.forEach(r => {
        embed.addFields({ name: `${r.ticket_name} [${r.closed_at ? 'Closed' : 'Open'}]`, value: `Type: ${r.type}\nCreator: ${r.creator_tag}\nSupport: ${r.support_tag || 'N/A'}\nCreated: ${new Date(r.created_at).toLocaleString()}\nClosed: ${r.closed_at ? new Date(r.closed_at).toLocaleString() : 'N/A'}` });
      });
      return embed;
    };

    const navRow = (p) => new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('prev_logs').setLabel('⬅ Previous').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
        new ButtonBuilder().setCustomId('next_logs').setLabel('Next ➡').setStyle(ButtonStyle.Secondary).setDisabled(p === totalPages - 1)
      );

    const msg = await interaction.editReply({ embeds: [generateEmbed(page)], components: [navRow(page)] });

    // collector
    const filter = i => i.user.id === interaction.user.id;
    const collector = msg.createMessageComponentCollector({ filter, time: logsConfig.collectorTimeout || 120000 });

    collector.on('collect', async i => {
      if (i.customId === 'prev_logs' && page > 0) page--;
      if (i.customId === 'next_logs' && page < totalPages - 1) page++;
      await i.update({ embeds: [generateEmbed(page)], components: [navRow(page)] });
    });

    collector.on('end', async () => {
      try {
        await interaction.editReply({ components: [navRow(page).components.map(c => c.setDisabled(true)).reduce((acc, cur) => acc.addComponents(cur), new ActionRowBuilder())] });
      } catch {}
    });
  }
};