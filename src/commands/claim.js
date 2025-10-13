const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Claim the current ticket (support only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction, db) {
    if (!interaction.channel || !interaction.channel.name?.startsWith('ticket-')) return interaction.reply({ content: 'This command must be used inside a ticket channel.', ephemeral: true });
    if (!interaction.member.roles.cache.has(process.env.SUPPORT_ROLE_ID)) return interaction.reply({ content: 'You are not part of support.', ephemeral: true });

    const ownerId = (interaction.channel.topic?.match(/ticket_owner:(\d+)/) || [])[1] || 'unknown';
    await interaction.channel.setTopic(`ticket_owner:${ownerId}|claimed_by:${interaction.user.id}`).catch(() => {});
    db.assignSupport(interaction.channel.name, interaction.user.id, interaction.user.tag);

    await interaction.reply({ content: `Ticket claimed by ${interaction.user.tag}`, ephemeral: true });
    await interaction.channel.send(`🔧 Ticket claimed by <@${interaction.user.id}>`);
  }
};