const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { fetchAllMessages, saveTranscriptHtml } = require('../utils/transcript');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Close the current ticket (support only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction, db) {
        if (!interaction.channel || !interaction.channel.name?.startsWith('ticket-')) return interaction.reply({ content: 'This command must be used inside a ticket channel.', ephemeral: true });
        if (!interaction.member.roles.cache.has(process.env.SUPPORT_ROLE_ID)) return interaction.reply({ content: 'You are not part of support.', ephemeral: true });

        await interaction.deferReply({ ephemeral: true });

        const messages = await fetchAllMessages(interaction.channel);
        const ownerId = (interaction.channel.topic?.match(/ticket_owner:(\d+)/) || [])[1] || null;
        const transcriptPath = await saveTranscriptHtml(interaction.channel.name, ownerId ? `<@${ownerId}>` : 'Unknown', interaction.user.tag, messages);

        db.updateTicketClosure({ ticket_name: interaction.channel.name, support_id: interaction.user.id, support_tag: interaction.user.tag, closed_at: new Date().toISOString(), transcript: transcriptPath });

        if (process.env.LOG_CHANNEL_ID) {
            try {
                const logCh = await interaction.guild.channels.fetch(process.env.LOG_CHANNEL_ID);
                await logCh.send({ content: `Ticket closed: ${interaction.channel.name} by ${interaction.user.tag}`, files: [{ attachment: transcriptPath }] });
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
                // fallback if DM fails
                const { sendTranscriptFallback } = require('../utils/fallback');
                await sendTranscriptFallback(interaction.guild, ownerId, transcriptPath);
            }
        }


        await interaction.channel.delete().catch(() => { });
        await interaction.editReply({ content: 'Ticket closed.' });
    }
};