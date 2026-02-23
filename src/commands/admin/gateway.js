/**
 * Gateway Admin Command - Clean 3-Subcommand Structure
 * Consolidates setup, UI customization, and status display
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('gateway')
    .setDescription('Configure and manage the gateway verification module')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Setup gateway verification with independent channels for each method')
        .addRoleOption(option =>
          option
            .setName('verified_role')
            .setDescription('Role to give verified users')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName('unverified_role')
            .setDescription('Penalty/unverified role to remove')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName('button_channel')
            .setDescription('Channel where verification button is posted')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName('trigger_channel')
            .setDescription('Channel where trigger word verification is processed (optional)')
            .setRequired(false)
        )
        .addChannelOption(option =>
          option
            .setName('slash_channel')
            .setDescription('Channel where /verify slash command is allowed (optional)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('trigger_word')
            .setDescription('Trigger word for message-based verification (optional)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('success_dm')
            .setDescription('Custom DM message on successful verification')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('customize_ui')
        .setDescription('Customize the visual appearance of specific verification pages')
        .addStringOption(option =>
          option
            .setName('page')
            .setDescription('Which page to customize')
            .setRequired(true)
            .addChoices(
              { name: 'Success', value: 'success' },
              { name: 'AlreadyVerified', value: 'alreadyVerified' },
              { name: 'Error', value: 'error' }
            )
        )
        .addStringOption(option =>
          option
            .setName('title')
            .setDescription('Embed title for this page')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('Embed description for this page')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('color')
            .setDescription('Hex color code (e.g., #2ecc71) for this page')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('image_url')
            .setDescription('Banner image URL for this page')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('customize_logic')
        .setDescription('Customize trigger word and trigger emoji')
        .addStringOption(option =>
          option
            .setName('trigger_word')
            .setDescription('Word/phrase that triggers verification')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('trigger_emoji')
            .setDescription('Emoji to react with when trigger word is matched')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Display all gateway settings and active verification methods')
    ),

  async execute(interaction) {
    try {
      const { client, guild, options } = interaction;

      // Check if user has admin permissions
      if (!interaction.memberPermissions?.has('Administrator')) {
        await interaction.reply({
          content: '❌ You need Administrator permissions to use this command.',
          ephemeral: true,
        });
        return;
      }

      // Check if gateway module is loaded
      if (!client.gateway) {
        await interaction.reply({
          content: '❌ Gateway module is not loaded.',
          ephemeral: true,
        });
        return;
      }

      const subcommand = options.getSubcommand();

      if (subcommand === 'setup') {
        const verifiedRole = options.getRole('verified_role', true);
        const unverifiedRole = options.getRole('unverified_role', true);
        const buttonChannel = options.getChannel('button_channel', true);
        const triggerChannel = options.getChannel('trigger_channel') || undefined;
        const slashChannel = options.getChannel('slash_channel') || undefined;
        const triggerWord = options.getString('trigger_word') || '';
        const successDM = options.getString('success_dm') || undefined;

        const result = await client.gateway.setupCommand(
          guild.id,
          verifiedRole.id,
          unverifiedRole.id,
          buttonChannel.id,
          triggerChannel?.id || '',
          slashChannel?.id || '',
          triggerWord,
          successDM
        );

        if (result.success) {
          const enabledMethods = ['✅ Button'];
          if (triggerChannel) enabledMethods.push(`✅ Trigger (channel: <#${triggerChannel.id}>)`);
          if (triggerWord) enabledMethods.push(`✅ with word: \`${triggerWord}\``);
          if (slashChannel) enabledMethods.push(`✅ /verify Slash (channel: <#${slashChannel.id}>)`);

          await interaction.reply({
            content: `✅ Gateway configured successfully!\n\n**Button Channel:** <#${buttonChannel.id}>\n**Verified Role:** <@&${verifiedRole.id}>\n**Unverified Role:** <@&${unverifiedRole.id}>\n\n**Enabled Methods:**\n${enabledMethods.join('\n')}`,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: `❌ Setup failed: ${result.error}`,
            ephemeral: true,
          });
        }
      } else if (subcommand === 'customize_ui') {
        const page = options.getString('page', true);
        const title = options.getString('title');
        const description = options.getString('description');
        const color = options.getString('color');
        const imageUrl = options.getString('image_url');

        const result = await client.gateway.customizePageCommand(
          guild.id,
          page,
          title,
          description,
          color,
          imageUrl
        );

        if (result.success) {
          const updates = [];
          if (title) updates.push(`**Title:** ${title}`);
          if (description) updates.push(`**Description:** ${description}`);
          if (color) updates.push(`**Color:** ${color}`);
          if (imageUrl) updates.push(`**Image:** ${imageUrl}`);

          await interaction.reply({
            content: `✅ **${page}** page customization updated!\n\n${updates.join('\n') || 'No changes made.'}`,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: `❌ Update failed: ${result.error}`,
            ephemeral: true,
          });
        }
      } else if (subcommand === 'customize_logic') {
        const triggerWord = options.getString('trigger_word', true);
        const triggerEmoji = options.getString('trigger_emoji');

        const result = await client.gateway.customizeLogicCommand(
          guild.id,
          triggerWord,
          triggerEmoji
        );

        if (result.success) {
          const updates = [];
          updates.push(`**Trigger Word:** \`${triggerWord}\``);
          if (triggerEmoji) updates.push(`**Trigger Emoji:** ${triggerEmoji}`);

          await interaction.reply({
            content: `✅ Trigger logic customization updated!\n\n${updates.join('\n')}`,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: `❌ Update failed: ${result.error}`,
            ephemeral: true,
          });
        }
      } else if (subcommand === 'status') {
        const GatewayConfig = (await import('../../modules/gateway/schema.js')).default;
        const config = await GatewayConfig.findOne({ guildId: guild.id });

        if (!config || !config.enabled) {
          await interaction.reply({
            content: '❌ Gateway is not configured for this server.\n\nUse `/gateway setup` to configure it.',
            ephemeral: true,
          });
          return;
        }

        // Build status embed
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🔐 Gateway Verification Status')
          .setDescription('Current configuration and active methods')
          .addFields(
            { name: '� Button Channel', value: config.buttonChannelId ? `<#${config.buttonChannelId}>` : 'Not configured', inline: false },
            { name: '💬 Trigger Channel', value: config.triggerChannelId ? `<#${config.triggerChannelId}>` : 'Not configured', inline: false },
            { name: '⚡ Slash Channel', value: config.slashChannelId ? `<#${config.slashChannelId}>` : 'Not configured (allowed everywhere)', inline: false },
            { name: '✅ Verified Role', value: `<@&${config.verifiedRole}>`, inline: true },
            { name: '❌ Unverified Role', value: `<@&${config.unverifiedRole}>`, inline: true },
            { name: '🔄 Active Methods', value: [
              '✅ **Button** (always active)',
              config.triggerWord ? `✅ **Trigger** (word: \`${config.triggerWord}\`, emoji: ${config.triggerEmoji || '✅'})` : '⭕ Trigger (no word configured)',
              config.slashChannelId ? `✅ **/verify** Slash (<#${config.slashChannelId}>)` : '✅ **/verify** Slash (allowed everywhere)'
            ].join('\n'), inline: false },
            { name: '🎨 Theme Color', value: config.theme?.color || '#2ecc71', inline: true },
            { name: '🛡️ Raid Shield', value: config.raidMode ? `✅ Active (Min age: ${config.minAccountAge} days)` : '❌ Disabled', inline: false }
          )
          .setFooter({ text: 'Use /gateway customize_ui for page visuals, /gateway customize_logic for trigger settings' })
          .setTimestamp();

        await interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
      }
    } catch (err) {
      console.error('[gateway command] Error:', err);
      try {
        if (interaction.isRepliable() && !interaction.replied) {
          await interaction.reply({
            content: '❌ An error occurred while executing this command.',
            ephemeral: true,
          });
        }
      } catch (replyErr) {
        console.error('[gateway command] Failed to send error reply:', replyErr);
      }
    }
  },
};
