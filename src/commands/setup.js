const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure the ticket system for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, db) {
    const guildId = interaction.guild.id;
    const guildName = interaction.guild.name;

    let config = await db.getGuildConfig(guildId);

    const embed = new EmbedBuilder()
      .setTitle('Ticket System Setup')
      .setDescription('Configure your server\'s ticket system using the menu below.')
      .setColor(config?.embed_color || '#5865f2')
      .addFields(
        {
          name: 'Category Channel',
          value: config?.ticket_category_id
            ? `<#${config.ticket_category_id}>`
            : 'Not set',
          inline: true
        },
        {
          name: 'Support Role',
          value: config?.support_role_id
            ? `<@&${config.support_role_id}>`
            : 'Not set',
          inline: true
        },
        {
          name: 'Log Channel',
          value: config?.log_channel_id
            ? `<#${config.log_channel_id}>`
            : 'Not set',
          inline: true
        },
        {
          name: 'Automation',
          value: config?.automation_enabled ? 'Enabled' : 'Disabled',
          inline: true
        },
        {
          name: 'Inactivity Warning',
          value: config?.inactivity_warning_enabled
            ? `${config.inactivity_warning_minutes}m`
            : 'Disabled',
          inline: true
        },
        {
          name: 'Auto-Close',
          value: config?.auto_close_enabled
            ? `${config.auto_close_minutes}m`
            : 'Disabled',
          inline: true
        }
      )
      .setFooter({ text: 'Select an option below to configure' })
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('setup_menu')
      .setPlaceholder('Select a setting to configure')
      .addOptions([
        {
          label: 'Set Ticket Category',
          description: 'Choose where ticket channels will be created',
          value: 'set_category',
          emoji: '📁'
        },
        {
          label: 'Set Support Role',
          description: 'Role that can manage tickets',
          value: 'set_support_role',
          emoji: '🛡️'
        },
        {
          label: 'Set Log Channel',
          description: 'Where ticket logs will be posted',
          value: 'set_log_channel',
          emoji: '📝'
        },
        {
          label: 'Set Fallback Channel',
          description: 'Fallback for transcript uploads',
          value: 'set_fallback_channel',
          emoji: '💾'
        },
        {
          label: 'Toggle Automation',
          description: 'Enable/disable ticket automation',
          value: 'toggle_automation',
          emoji: '🤖'
        },
        {
          label: 'Configure Timers',
          description: 'Set inactivity and auto-close timers',
          value: 'configure_timers',
          emoji: '⏰'
        },
        {
          label: 'Set Embed Color',
          description: 'Customize embed color (hex code)',
          value: 'set_color',
          emoji: '🎨'
        },
        {
          label: 'View Full Config',
          description: 'Display complete configuration',
          value: 'view_config',
          emoji: '📋'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });

    const collector = interaction.channel.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id && i.customId.startsWith('setup_'),
      time: 300000
    });

    collector.on('collect', async i => {
      try {
        if (i.isStringSelectMenu() && i.customId === 'setup_menu') {
          const value = i.values[0];

          if (value === 'set_category') {
            const categories = interaction.guild.channels.cache.filter(
              c => c.type === ChannelType.GuildCategory
            );

            if (categories.size === 0) {
              return i.reply({
                content: 'No categories found. Please create a category first.',
                ephemeral: true
              });
            }

            const categoryMenu = new StringSelectMenuBuilder()
              .setCustomId('setup_select_category')
              .setPlaceholder('Select a category')
              .addOptions(
                Array.from(categories.values()).slice(0, 25).map(cat => ({
                  label: cat.name,
                  value: cat.id
                }))
              );

            const categoryRow = new ActionRowBuilder().addComponents(categoryMenu);
            await i.reply({
              content: 'Select the category where tickets will be created:',
              components: [categoryRow],
              ephemeral: true
            });
          } else if (value === 'set_support_role') {
            const roles = interaction.guild.roles.cache.filter(
              r => !r.managed && r.id !== interaction.guild.id
            );

            if (roles.size === 0) {
              return i.reply({
                content: 'No suitable roles found.',
                ephemeral: true
              });
            }

            const roleMenu = new StringSelectMenuBuilder()
              .setCustomId('setup_select_support_role')
              .setPlaceholder('Select support role')
              .addOptions(
                Array.from(roles.values()).slice(0, 25).map(role => ({
                  label: role.name,
                  value: role.id
                }))
              );

            const roleRow = new ActionRowBuilder().addComponents(roleMenu);
            await i.reply({
              content: 'Select the support role:',
              components: [roleRow],
              ephemeral: true
            });
          } else if (value === 'set_log_channel') {
            const channels = interaction.guild.channels.cache.filter(
              c => c.type === ChannelType.GuildText
            );

            const channelMenu = new StringSelectMenuBuilder()
              .setCustomId('setup_select_log_channel')
              .setPlaceholder('Select log channel')
              .addOptions(
                Array.from(channels.values()).slice(0, 25).map(ch => ({
                  label: ch.name,
                  value: ch.id
                }))
              );

            const channelRow = new ActionRowBuilder().addComponents(channelMenu);
            await i.reply({
              content: 'Select the log channel:',
              components: [channelRow],
              ephemeral: true
            });
          } else if (value === 'set_fallback_channel') {
            const channels = interaction.guild.channels.cache.filter(
              c => c.type === ChannelType.GuildText
            );

            const channelMenu = new StringSelectMenuBuilder()
              .setCustomId('setup_select_fallback_channel')
              .setPlaceholder('Select fallback channel')
              .addOptions(
                Array.from(channels.values()).slice(0, 25).map(ch => ({
                  label: ch.name,
                  value: ch.id
                }))
              );

            const channelRow = new ActionRowBuilder().addComponents(channelMenu);
            await i.reply({
              content: 'Select the fallback transcript channel:',
              components: [channelRow],
              ephemeral: true
            });
          } else if (value === 'toggle_automation') {
            config = await db.getGuildConfig(guildId);
            const newState = !config?.automation_enabled;

            await db.upsertGuildConfig(guildId, {
              guild_name: guildName,
              automation_enabled: newState
            });

            await i.reply({
              content: `Automation ${newState ? 'enabled' : 'disabled'}.`,
              ephemeral: true
            });

            await interaction.editReply({
              embeds: [await buildConfigEmbed(db, guildId, guildName)]
            });
          } else if (value === 'configure_timers') {
            const modal = new ModalBuilder()
              .setCustomId('setup_timers_modal')
              .setTitle('Configure Timers');

            const warningInput = new TextInputBuilder()
              .setCustomId('warning_minutes')
              .setLabel('Inactivity Warning (minutes)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('60')
              .setRequired(false)
              .setValue((config?.inactivity_warning_minutes || 60).toString());

            const closeInput = new TextInputBuilder()
              .setCustomId('close_minutes')
              .setLabel('Auto-Close Timer (minutes)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('120')
              .setRequired(false)
              .setValue((config?.auto_close_minutes || 120).toString());

            const reminderInput = new TextInputBuilder()
              .setCustomId('reminder_minutes')
              .setLabel('Unclaimed Reminder (minutes)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('15')
              .setRequired(false)
              .setValue((config?.unclaimed_reminder_minutes || 15).toString());

            modal.addComponents(
              new ActionRowBuilder().addComponents(warningInput),
              new ActionRowBuilder().addComponents(closeInput),
              new ActionRowBuilder().addComponents(reminderInput)
            );

            await i.showModal(modal);
          } else if (value === 'set_color') {
            const modal = new ModalBuilder()
              .setCustomId('setup_color_modal')
              .setTitle('Set Embed Color');

            const colorInput = new TextInputBuilder()
              .setCustomId('embed_color')
              .setLabel('Embed Color (hex code)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('#5865f2')
              .setRequired(true)
              .setValue(config?.embed_color || '#5865f2');

            modal.addComponents(
              new ActionRowBuilder().addComponents(colorInput)
            );

            await i.showModal(modal);
          } else if (value === 'view_config') {
            config = await db.getGuildConfig(guildId);

            if (!config) {
              return i.reply({
                content: 'No configuration found. Please set up the basic settings first.',
                ephemeral: true
              });
            }

            const detailedEmbed = new EmbedBuilder()
              .setTitle('Complete Server Configuration')
              .setColor(config.embed_color || '#5865f2')
              .addFields(
                { name: 'Guild ID', value: config.guild_id, inline: true },
                { name: 'Guild Name', value: config.guild_name, inline: true },
                { name: 'Total Tickets', value: config.ticket_counter.toString(), inline: true },
                {
                  name: 'Ticket Category',
                  value: config.ticket_category_id ? `<#${config.ticket_category_id}>` : 'Not set',
                  inline: true
                },
                {
                  name: 'Support Role',
                  value: config.support_role_id ? `<@&${config.support_role_id}>` : 'Not set',
                  inline: true
                },
                {
                  name: 'Log Channel',
                  value: config.log_channel_id ? `<#${config.log_channel_id}>` : 'Not set',
                  inline: true
                },
                {
                  name: 'Fallback Channel',
                  value: config.transcript_fallback_channel_id
                    ? `<#${config.transcript_fallback_channel_id}>`
                    : 'Not set',
                  inline: true
                },
                { name: 'Embed Color', value: config.embed_color, inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
                {
                  name: 'Automation',
                  value: config.automation_enabled ? 'Enabled' : 'Disabled',
                  inline: true
                },
                {
                  name: 'Inactivity Warning',
                  value: config.inactivity_warning_enabled
                    ? `${config.inactivity_warning_minutes} minutes`
                    : 'Disabled',
                  inline: true
                },
                {
                  name: 'Auto-Close',
                  value: config.auto_close_enabled
                    ? `${config.auto_close_minutes} minutes`
                    : 'Disabled',
                  inline: true
                },
                {
                  name: 'Unclaimed Reminder',
                  value: config.unclaimed_reminder_enabled
                    ? `${config.unclaimed_reminder_minutes} minutes`
                    : 'Disabled',
                  inline: true
                }
              )
              .setFooter({ text: `Last updated: ${new Date(config.updated_at).toLocaleString()}` })
              .setTimestamp();

            await i.reply({ embeds: [detailedEmbed], ephemeral: true });
          }
        } else if (i.isStringSelectMenu()) {
          if (i.customId === 'setup_select_category') {
            const categoryId = i.values[0];
            await db.upsertGuildConfig(guildId, {
              guild_name: guildName,
              ticket_category_id: categoryId
            });

            await i.reply({
              content: `Ticket category set to <#${categoryId}>.`,
              ephemeral: true
            });

            await interaction.editReply({
              embeds: [await buildConfigEmbed(db, guildId, guildName)]
            });
          } else if (i.customId === 'setup_select_support_role') {
            const roleId = i.values[0];
            await db.upsertGuildConfig(guildId, {
              guild_name: guildName,
              support_role_id: roleId
            });

            await i.reply({
              content: `Support role set to <@&${roleId}>.`,
              ephemeral: true
            });

            await interaction.editReply({
              embeds: [await buildConfigEmbed(db, guildId, guildName)]
            });
          } else if (i.customId === 'setup_select_log_channel') {
            const channelId = i.values[0];
            await db.upsertGuildConfig(guildId, {
              guild_name: guildName,
              log_channel_id: channelId
            });

            await i.reply({
              content: `Log channel set to <#${channelId}>.`,
              ephemeral: true
            });

            await interaction.editReply({
              embeds: [await buildConfigEmbed(db, guildId, guildName)]
            });
          } else if (i.customId === 'setup_select_fallback_channel') {
            const channelId = i.values[0];
            await db.upsertGuildConfig(guildId, {
              guild_name: guildName,
              transcript_fallback_channel_id: channelId
            });

            await i.reply({
              content: `Fallback channel set to <#${channelId}>.`,
              ephemeral: true
            });

            await interaction.editReply({
              embeds: [await buildConfigEmbed(db, guildId, guildName)]
            });
          }
        } else if (i.isModalSubmit()) {
          if (i.customId === 'setup_timers_modal') {
            const warningMinutes = parseInt(i.fields.getTextInputValue('warning_minutes')) || 60;
            const closeMinutes = parseInt(i.fields.getTextInputValue('close_minutes')) || 120;
            const reminderMinutes = parseInt(i.fields.getTextInputValue('reminder_minutes')) || 15;

            await db.upsertGuildConfig(guildId, {
              guild_name: guildName,
              inactivity_warning_minutes: warningMinutes,
              auto_close_minutes: closeMinutes,
              unclaimed_reminder_minutes: reminderMinutes
            });

            await i.reply({
              content: `Timers updated:\nWarning: ${warningMinutes}m\nAuto-close: ${closeMinutes}m\nReminder: ${reminderMinutes}m`,
              ephemeral: true
            });

            await interaction.editReply({
              embeds: [await buildConfigEmbed(db, guildId, guildName)]
            });
          } else if (i.customId === 'setup_color_modal') {
            const color = i.fields.getTextInputValue('embed_color');

            if (!/^#[0-9A-F]{6}$/i.test(color)) {
              return i.reply({
                content: 'Invalid hex color. Please use format: #RRGGBB',
                ephemeral: true
              });
            }

            await db.upsertGuildConfig(guildId, {
              guild_name: guildName,
              embed_color: color
            });

            await i.reply({
              content: `Embed color set to ${color}.`,
              ephemeral: true
            });

            await interaction.editReply({
              embeds: [await buildConfigEmbed(db, guildId, guildName)]
            });
          }
        }
      } catch (error) {
        console.error('Setup interaction error:', error);
        if (!i.replied && !i.deferred) {
          await i.reply({
            content: 'An error occurred while processing your request.',
            ephemeral: true
          });
        }
      }
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  }
};

async function buildConfigEmbed(db, guildId, guildName) {
  const config = await db.getGuildConfig(guildId);

  return new EmbedBuilder()
    .setTitle('Ticket System Setup')
    .setDescription('Configure your server\'s ticket system using the menu below.')
    .setColor(config?.embed_color || '#5865f2')
    .addFields(
      {
        name: 'Category Channel',
        value: config?.ticket_category_id
          ? `<#${config.ticket_category_id}>`
          : 'Not set',
        inline: true
      },
      {
        name: 'Support Role',
        value: config?.support_role_id
          ? `<@&${config.support_role_id}>`
          : 'Not set',
        inline: true
      },
      {
        name: 'Log Channel',
        value: config?.log_channel_id
          ? `<#${config.log_channel_id}>`
          : 'Not set',
        inline: true
      },
      {
        name: 'Automation',
        value: config?.automation_enabled ? 'Enabled' : 'Disabled',
        inline: true
      },
      {
        name: 'Inactivity Warning',
        value: config?.inactivity_warning_enabled
          ? `${config.inactivity_warning_minutes}m`
          : 'Disabled',
        inline: true
      },
      {
        name: 'Auto-Close',
        value: config?.auto_close_enabled
          ? `${config.auto_close_minutes}m`
          : 'Disabled',
        inline: true
      }
    )
    .setFooter({ text: 'Select an option below to configure' })
    .setTimestamp();
}
