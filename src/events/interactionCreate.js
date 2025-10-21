const {
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  StringSelectMenuBuilder
} = require('discord.js');

const db = require('../database/db');
const { fetchAllMessages, saveTranscriptHtml } = require('../utils/transcript');
const config = require('../config');
const { log } = require('../utils/logger');
const { createTicketEmbed, updateTicketEmbed } = require('../utils/logEmbed');
const { sendTranscriptFallback } = require('../utils/fallback');

const ticketCfg = config.ticket || {};
const ticketMenuCfg = config.ticketMenu || {};
const env = config.env || {};

// Helper: normalize button config (support both object and string shapes)
const BUTTONS = {
  close: {
    id:
      (typeof ticketCfg.buttons?.close === 'object' && ticketCfg.buttons.close.id) ||
      ticketCfg.buttons?.closeId ||
      'ticket_close',
    label:
      (typeof ticketCfg.buttons?.close === 'object' && ticketCfg.buttons.close.label) ||
      ticketCfg.buttons?.close ||
      'Close Ticket',
    style:
      (typeof ticketCfg.buttons?.close === 'object' && ticketCfg.buttons.close.style) ||
      ticketCfg.buttons?.closeStyle ||
      'Danger'
  },
  claim: {
    id:
      (typeof ticketCfg.buttons?.claim === 'object' && ticketCfg.buttons.claim.id) ||
      ticketCfg.buttons?.claimId ||
      'ticket_claim',
    label:
      (typeof ticketCfg.buttons?.claim === 'object' && ticketCfg.buttons.claim.label) ||
      ticketCfg.buttons?.claim ||
      'Claim',
    style:
      (typeof ticketCfg.buttons?.claim === 'object' && ticketCfg.buttons.claim.style) ||
      ticketCfg.buttons?.claimStyle ||
      'Primary'
  },
  forward: {
    id:
      (typeof ticketCfg.buttons?.forward === 'object' && ticketCfg.buttons.forward.id) ||
      ticketCfg.buttons?.forwardId ||
      'ticket_forward',
    label:
      (typeof ticketCfg.buttons?.forward === 'object' && ticketCfg.buttons.forward.label) ||
      ticketCfg.buttons?.forward ||
      'Forward',
    style:
      (typeof ticketCfg.buttons?.forward === 'object' && ticketCfg.buttons.forward.style) ||
      ticketCfg.buttons?.forwardStyle ||
      'Secondary'
  },
  forwardSelectId: ticketCfg.forwardSelectId || 'forward_ticket_select'
};

module.exports = {
  name: Events.InteractionCreate,
  async execute(client, interaction) {
    // safeReply helper from original (handles deferred / replied states)
    async function safeReply(interaction, options) {
      try {
        if (!interaction) return;
        if (interaction.deferred) return interaction.editReply(options);
        if (interaction.replied) return interaction.followUp({ ephemeral: options.ephemeral ?? true, ...options });
        return interaction.reply(options);
      } catch (err) {
        log('error', 'safeReply failed', err);
      }
    }

    try {
      // ---------------------------
      // 1) TICKET CREATION (select menu)
      // ---------------------------
      if (interaction.isStringSelectMenu() && interaction.customId === (ticketMenuCfg.customId || 'ticket_type_select')) {
        await interaction.deferReply({ ephemeral: true }).catch(() => {});

        const type = interaction.values[0];
        const guildId = interaction.guild.id;

        const guildConfig = await db.getGuildConfig(guildId);
        if (!guildConfig || !guildConfig.support_role_id || !guildConfig.ticket_category_id) {
          return interaction.editReply({ content: 'Ticket system not configured. Please ask an admin to run /setup first.' });
        }

        const existingTicket = await db.getUserOpenTickets(guildId, interaction.user.id);
        if (existingTicket) {
          return interaction.editReply({ content: ticketCfg.messages?.alreadyOpen || '⚠️ You already have an open ticket!' });
        }

        const createdAt = new Date().toISOString();
        const tempName = `pending-${Date.now()}`;

        const channel = await interaction.guild.channels.create({
          name: tempName,
          type: ChannelType.GuildText,
          parent: guildConfig.ticket_category_id,
          topic: `ticket_owner:${interaction.user.id}`,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: guildConfig.support_role_id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
          ]
        });

        const ticket = await db.insertTicket({
          guildId,
          ticket_name: channel.name,
          type,
          creator_id: interaction.user.id,
          creator_tag: interaction.user.tag,
          channel_id: channel.id
        });

        const ticketName = `ticket-${ticket.ticket_number}`;

        await channel.setName(ticketName).catch(() => {});
        await db.supabase
          .from('tickets')
          .update({ ticket_name: ticketName })
          .eq('id', ticket.id);

        const supportRoleId = guildConfig.support_role_id;

        // Build action row (buttons)
        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(BUTTONS.close.id).setLabel(BUTTONS.close.label).setStyle(ButtonStyle[BUTTONS.close.style] || ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(BUTTONS.claim.id).setLabel(BUTTONS.claim.label).setStyle(ButtonStyle[BUTTONS.claim.style] || ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(BUTTONS.forward.id).setLabel(BUTTONS.forward.label).setStyle(ButtonStyle[BUTTONS.forward.style] || ButtonStyle.Secondary)
        );

        // Build ticket embed from config
        const supportRole = interaction.guild.roles.cache.get(supportRoleId);
        const ticketEmbed = new EmbedBuilder()
          .setTitle(`🎫 ${type.charAt(0).toUpperCase() + type.slice(1)} Ticket Created`)
          .setColor(ticketCfg.embed?.color ?? 0x5865f2)
          .setDescription(ticketCfg.embed?.description ||
            `Hello ${interaction.user},\n\nThank you for reaching out to the support team. A member of our **Support Team** will be with you shortly to assist with your request.\n\nPlease provide all relevant details regarding your issue to help us resolve it efficiently.`)
          .addFields(
            { name: '👤 Ticket Owner', value: `<@${interaction.user.id}>`, inline: true },
            { name: '🛡 Support Team', value: supportRole ? `<@&${supportRole.id}>` : (ticketCfg.messages?.supportTeamName || 'Support Team'), inline: true },
            { name: '🆔 Ticket ID', value: `${ticketName}`, inline: false },
            { name: '📅 Created At', value: `<t:${Math.floor(new Date().getTime() / 1000)}:F>`, inline: false }
          )
          .setImage(ticketCfg.embed?.image)
          .setFooter({
            text: (ticketCfg.embed?.footer?.text) ?? 'Developed by Horizov',
            iconURL: ticketCfg.embed?.footer?.useBotAvatar ? client.user.displayAvatarURL() : ticketCfg.embed?.footer?.iconURL ?? null
          })
          .setTimestamp();

        await channel.send({
          content: `${interaction.user} ${supportRole ? `| ${supportRole}` : ''}`,
          embeds: [ticketEmbed],
          components: [actionRow]
        });

        // Live log embed to configured log channel
        const logChId = ticketCfg.logChannelId || env.logChannelId || process.env.LOG_CHANNEL_ID;
        if (logChId) {
          try {
            const logCh = await client.channels.fetch(logChId);
            const logMsg = await logCh.send({
              embeds: [createTicketEmbed({
                ticket_name: ticketName,
                type,
                creator_id: interaction.user.id,
                creator_tag: interaction.user.tag,
                support_id: null,
                support_tag: null,
                created_at: createdAt,
                closed_at: null
              })]
            });
            db.saveLogEmbedInfo(ticketName, logCh.id, logMsg.id);
          } catch (err) {
            log('error', 'log embed send failed', err);
          }
        }

        await interaction.editReply({ content: (ticketCfg.messages?.ticketCreated || '✅ Ticket created: {channel}').replace('{channel}', `${channel}`) }).catch(() => {});
        return;
      }

      // ---------------------------
      // 2) BUTTONS
      // ---------------------------
      if (interaction.isButton()) {
        const { customId, channel } = interaction;

        // --- Close Ticket ---
        if (customId === BUTTONS.close.id) {
          if (!channel.name?.startsWith('ticket-'))
            return safeReply(interaction, { content: ticketCfg.messages?.notTicket || '⚠️ This is not a ticket channel.', ephemeral: true });

          await interaction.deferReply({ ephemeral: true }).catch(() => { });

          const messages = await fetchAllMessages(channel, ticketCfg.maxFetchBatch ?? 100);
          const ticketOwner = (channel.topic?.match(/ticket_owner:(\d+)/) || [])[1] || null;

          const transcriptPath = await saveTranscriptHtml(
            channel.name,
            ticketOwner ? `<@${ticketOwner}>` : 'Unknown',
            interaction.user.tag,
            messages
          );

          // Update DB closure info
          try {
            db.updateTicketClosure({
              ticket_name: channel.name,
              support_id: interaction.user.id,
              support_tag: interaction.user.tag,
              closed_at: new Date().toISOString(),
              transcript: transcriptPath
            });
          } catch (err) {
            log('error', 'db updateTicketClosure failed', err);
          }

          // Update live embed in log channel if present
          try { await updateTicketEmbed(client, channel.name); } catch (err) { log('error', 'updateTicketEmbed failed', err); }

          // DM owner the transcript
          if (ticketOwner) {
            try {
              const owner = await interaction.guild.members.fetch(ticketOwner);
              if (owner) {
                const supportMember = interaction.user;
                await owner.send({
                  embeds: [
                    new EmbedBuilder()
                      .setTitle(ticketCfg.closeDm?.title || '✅ Your Ticket Has Been Closed')
                      .setColor(ticketCfg.closeDm?.color || 0xff4d4d)
                      .setDescription(
                        ticketCfg.closeDm?.description ||
                        `Hello ${owner.user.username},\n\nYour support ticket **${channel.name}** has been successfully closed by **${supportMember.tag}** from our Support Team.`
                      )
                      .addFields(
                        { name: '📄 Ticket ID', value: `${channel.name}`, inline: true },
                        { name: '👨‍💼 Support Member', value: `${supportMember.tag}`, inline: true },
                        { name: '🕒 Closed At', value: `<t:${Math.floor(new Date().getTime() / 1000)}:F>`, inline: false }
                      )
                      .setFooter({ text: ticketCfg.embed?.closeFooter || ticketCfg.embed?.footer?.text || 'Thank you for contacting support', iconURL: client.user.displayAvatarURL() })
                      .setTimestamp()
                  ],
                  files: [{ attachment: transcriptPath, name: `${channel.name}-transcript.html` }]
                });
              }
            } catch (err) {
              log('error', 'owner DM failed, trying fallback', err);
              await sendTranscriptFallback(interaction.guild, ticketOwner, transcriptPath);
            }
          }

          await interaction.editReply({ content: ticketCfg.messages?.ticketClosed || '✅ Ticket closed and transcript saved. Deleting channel...' }).catch(() => { });
          setTimeout(() => channel.delete().catch(() => { }), ticketCfg.channelDeleteDelay || 5000);
          return;
        }

        // --- Claim Ticket ---
        if (customId === BUTTONS.claim.id) {
          const member = interaction.member;
          const guildId = interaction.guild.id;
          const guildConfig = await db.getGuildConfig(guildId);

          if (!guildConfig || !guildConfig.support_role_id) {
            return safeReply(interaction, { content: 'Ticket system not configured.', ephemeral: true });
          }

          const ownerId = (channel.topic?.match(/ticket_owner:(\d+)/) || [])[1];
          const claimedByMatch = channel.topic?.match(/claimed_by:(\d+)/);
          const currentClaimer = claimedByMatch ? claimedByMatch[1] : null;

          if (interaction.user.id === ownerId)
            return safeReply(interaction, { content: ticketCfg.messages?.cannotClaimOwn || '❌ You cannot claim your own ticket.', ephemeral: true });

          const supportRoleId = guildConfig.support_role_id;
          if (!member.roles.cache.has(supportRoleId))
            return safeReply(interaction, { content: ticketCfg.messages?.onlySupport || 'Only support members can claim tickets.', ephemeral: true });

          if (currentClaimer)
            return safeReply(interaction, { content: (ticketCfg.messages?.alreadyClaimed || '⚠️ Already claimed by {user}.').replace('{user}', `<@${currentClaimer}>`), ephemeral: true });

          // update topic
          await channel.setTopic(`ticket_owner:${ownerId}|claimed_by:${interaction.user.id}`).catch(() => {});

          // update DB
          try { db.assignSupport(channel.name, interaction.user.id, interaction.user.tag); } catch (err) { log('error', 'db.assignSupport failed', err); }

          // update log embed
          try { await updateTicketEmbed(client, channel.name); } catch (err) { log('error', 'updateTicketEmbed failed', err); }

          // Disable claim button in the message that contains components
          try {
            const msg = (await channel.messages.fetch({ limit: 10 })).find(m => m.components?.length);
            if (msg) {
              const row = ActionRowBuilder.from(msg.components[0]);
              const claimComp = row.components.find(c => (c.data && (c.data.custom_id || c.data.customId) === BUTTONS.claim.id) || (c.customId === BUTTONS.claim.id));
              if (claimComp) {
                if (typeof claimComp.setDisabled === 'function') claimComp.setDisabled(true);
                else if (claimComp.data) claimComp.data.disabled = true;
              }
              await msg.edit({ components: [row] }).catch(() => {});
            }
          } catch (err) {
            log('error', 'disable claim button failed', err);
          }

          await safeReply(interaction, { content: `🔧 Ticket claimed by ${interaction.user.tag}`, ephemeral: true });
          await channel.send({ content: `✅ Ticket claimed by <@${interaction.user.id}>.` }).catch(() => {});
          return;
        }

        // --- Forward Ticket (open select menu) ---
        if (customId === BUTTONS.forward.id) {
          const member = interaction.member;
          const guildId = interaction.guild.id;
          const guildConfig = await db.getGuildConfig(guildId);

          if (!guildConfig || !guildConfig.support_role_id) {
            return safeReply(interaction, { content: 'Ticket system not configured.', ephemeral: true });
          }

          const claimedBy = (channel.topic?.match(/claimed_by:(\d+)/) || [])[1];

          const supportRoleId = guildConfig.support_role_id;
          if (!member.roles.cache.has(supportRoleId))
            return safeReply(interaction, { content: ticketCfg.messages?.notAuthorized || 'Not authorized.', ephemeral: true });

          if (!claimedBy)
            return safeReply(interaction, { content: ticketCfg.messages?.mustBeClaimedFirst || 'Ticket must be claimed first.', ephemeral: true });

          if (interaction.user.id !== claimedBy)
            return safeReply(interaction, { content: ticketCfg.messages?.forwardOnlyClaimer || '❌ Only current claimer can forward this ticket.', ephemeral: true });

          const role = interaction.guild.roles.cache.get(supportRoleId);
          const members = role ? Array.from(role.members.values()) : [];
          const supportMembers = members.filter(m => m.id !== interaction.user.id).map(m => ({ label: m.user.tag.slice(0, 100), value: m.id }));

          if (!supportMembers.length)
            return safeReply(interaction, { content: ticketCfg.messages?.noOtherSupport || 'No other support members found.', ephemeral: true });

          const menu = new StringSelectMenuBuilder()
            .setCustomId(BUTTONS.forwardSelectId)
            .setPlaceholder('Select a support member')
            .addOptions(supportMembers.slice(0, 25));

          const row = new ActionRowBuilder().addComponents(menu);
          await safeReply(interaction, { content: 'Select a member to forward:', components: [row], ephemeral: true });
          return;
        }
      }

      // ---------------------------
      // 3) Forward Select Menu Handling
      // ---------------------------
      if (interaction.isStringSelectMenu() && interaction.customId === BUTTONS.forwardSelectId) {
        await interaction.deferReply({ ephemeral: true }).catch(() => {});
        const newSupportId = interaction.values[0];
        const channel = interaction.channel;
        const ownerId = (channel.topic?.match(/ticket_owner:(\d+)/) || [])[1];

        await channel.setTopic(`ticket_owner:${ownerId}|claimed_by:${newSupportId}`).catch(() => {});
        const newTag = (await interaction.guild.members.fetch(newSupportId)).user.tag;
        try { db.assignSupport(channel.name, newSupportId, newTag); } catch (err) { log('error', 'db.assignSupport failed', err); }
        try { await updateTicketEmbed(client, channel.name); } catch (err) { log('error', 'updateTicketEmbed failed', err); }

        await interaction.editReply({ content: `✅ Ticket forwarded to <@${newSupportId}>.` }).catch(() => {});
        await channel.send({ content: `🔁 Ticket forwarded to <@${newSupportId}> by <@${interaction.user.id}>.` }).catch(() => {});
        return;
      }

      // ---------------------------
      // 4) Slash Commands
      // ---------------------------
      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (!cmd) return;
        try {
          await cmd.execute(interaction, db);
        } catch (err) {
          log('error', 'command execute error', err);
          await safeReply(interaction, { content: 'Error executing command.', ephemeral: true });
        }
      }
    } catch (err) {
      log('error', 'interaction handler error', err);
      try { if (interaction) await safeReply(interaction, { content: 'An internal error occurred.', ephemeral: true }); } catch { }
    }
  }
};