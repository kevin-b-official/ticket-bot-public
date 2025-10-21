const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { fetchAllMessages, saveTranscriptHtml } = require('../utils/transcript');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Close the current ticket (support only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction, db) {
        if (!interaction.channel || !interaction.channel.name?.startsWith('ticket-')) {
            return interaction.reply({ content: 'This command must be used inside a ticket channel.', ephemeral: true });
        }

        const guildId = interaction.guild.id;
        const config = await db.getGuildConfig(guildId);

        if (!config || !config.support_role_id) {
            return interaction.reply({ content: 'Ticket system not configured. Please run /setup first.', ephemeral: true });
        }

        if (!interaction.member.roles.cache.has(config.support_role_id)) {
            return interaction.reply({ content: 'You are not part of support.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const messages = await fetchAllMessages(interaction.channel);
        const ownerId = (interaction.channel.topic?.match(/ticket_owner:(\d+)/) || [])[1] || null;
        const transcriptPath = await saveTranscriptHtml(interaction.channel.name, ownerId ? `<@${ownerId}>` : 'Unknown', interaction.user.tag, messages);

        await db.updateTicketClosure({
            ticket_name: interaction.channel.name,
            support_id: interaction.user.id,
            support_tag: interaction.user.tag,
            closed_at: new Date().toISOString(),
            transcript: transcriptPath
        });

        if (config.log_channel_id) {
            try {
                const logCh = await interaction.guild.channels.fetch(config.log_channel_id);
                await logCh.send({
                    content: `Ticket closed: ${interaction.channel.name} by ${interaction.user.tag}`,
                    files: [{ attachment: transcriptPath }]
                });
            } catch { }
        }

        if (ownerId) {
            try {
                const owner = await interaction.guild.members.fetch(ownerId);
                if (owner) {
                    await owner.send({
                        content: `Your ticket ${interaction.channel.name} has been closed by ${interaction.user.tag}`,
                        files: [{ attachment: transcriptPath }]
                    });
                }
            } catch {
                const { sendTranscriptFallback } = require('../utils/fallback');
                await sendTranscriptFallback(interaction.guild, ownerId, transcriptPath, config);
            }
        }

        await interaction.channel.delete().catch(() => { });
        await interaction.editReply({ content: 'Ticket closed.' });
    }
};