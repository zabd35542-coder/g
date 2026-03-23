import { SlashCommandBuilder, ChannelType } from 'discord.js';
import GuildConfig from '../../modules/config/GuildConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('إعداد الخوادم • Configure server settings')
    .addSubcommand(subcommand =>
      subcommand
        .setName('welcome')
        .setDescription('إعداد رسالة الترحيب • Configure welcome message')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('قناة الترحيب • Welcome channel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option =>
          option
            .setName('embed_name')
            .setDescription('اسم الإيمبد • Embed name from vault')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addRoleOption(option =>
          option
            .setName('auto_role')
            .setDescription('دور الأعضاء الجدد • Auto-assign role')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('goodbye')
        .setDescription('إعداد رسالة الوداع • Configure goodbye message')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('قناة الوداع • Goodbye channel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option =>
          option
            .setName('embed_name')
            .setDescription('اسم الإيمبد • Embed name from vault')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('boost')
        .setDescription('إعداد رسالة تعزيز الخادم • Configure server boost message')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('قناة التعزيز • Boost event channel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option =>
          option
            .setName('embed_name')
            .setDescription('اسم الإيمبد • Embed name from vault')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('logs')
        .setDescription('إعداد قناة السجلات • Configure logs channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('قناة السجلات • Logs channel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    ),

  async autocomplete(interaction) {
    const option = interaction.options.getFocused(true);
    if (option.name === 'embed_name') {
      try {
        if (!interaction.client.embedVault) {
          await interaction.respond([]);
          return;
        }

        const embeds = await interaction.client.embedVault.list(interaction.guildId);
        const focusedValue = interaction.options.getFocused();

        const filtered = embeds
          .filter(embed => embed.name.toLowerCase().includes(focusedValue.toLowerCase()))
          .slice(0, 25)
          .map(embed => ({
            name: embed.name.length > 50 ? embed.name.substring(0, 47) + '...' : embed.name,
            value: embed.name,
          }));

        await interaction.respond(filtered);
      } catch (err) {
        console.error('[setup autocomplete] Error:', err);
        await interaction.respond([]).catch(() => {});
      }
    }
  },

  async execute(interaction) {
    try {
      if (!interaction.memberPermissions?.has('Administrator')) {
        return interaction.reply({ content: '❌ Admin permission required.', ephemeral: true });
      }

      const sub = interaction.options.getSubcommand();

      if (sub === 'welcome') {
        const channel = interaction.options.getChannel('channel');
        const embedName = interaction.options.getString('embed_name');
        const autoRole = interaction.options.getRole('auto_role');

        // Verify embed exists
        if (!interaction.client.embedVault) {
          return interaction.reply({ content: '❌ EmbedVault module is not loaded.', ephemeral: true });
        }

        const embed = await interaction.client.embedVault.getByName(interaction.guildId, embedName);
        if (!embed) {
          return interaction.reply({ content: `❌ Embed **${embedName}** not found in vault.`, ephemeral: true });
        }

        const config = await GuildConfig.findOneAndUpdate(
          { guildId: interaction.guildId },
          {
            $set: {
              'welcome.channelId': channel.id,
              'welcome.embedName': embedName,
              'welcome.autoRoleId': autoRole.id,
            },
          },
          { upsert: true, new: true }
        );

        return interaction.reply({
          content: `✅ **Welcome Setup Complete!**\n📢 Channel: ${channel}\n🎯 Embed: **${embedName}**\n🔑 Auto-Role: ${autoRole}`,
          ephemeral: true,
        });
      }

      if (sub === 'goodbye') {
        const channel = interaction.options.getChannel('channel');
        const embedName = interaction.options.getString('embed_name');

        // Verify embed exists
        if (!interaction.client.embedVault) {
          return interaction.reply({ content: '❌ EmbedVault module is not loaded.', ephemeral: true });
        }

        const embed = await interaction.client.embedVault.getByName(interaction.guildId, embedName);
        if (!embed) {
          return interaction.reply({ content: `❌ Embed **${embedName}** not found in vault.`, ephemeral: true });
        }

        const config = await GuildConfig.findOneAndUpdate(
          { guildId: interaction.guildId },
          {
            $set: {
              'goodbye.channelId': channel.id,
              'goodbye.embedName': embedName,
            },
          },
          { upsert: true, new: true }
        );

        return interaction.reply({
          content: `✅ **Goodbye Setup Complete!**\n📢 Channel: ${channel}\n🎯 Embed: **${embedName}**`,
          ephemeral: true,
        });
      }

      if (sub === 'boost') {
        const channel = interaction.options.getChannel('channel');
        const embedName = interaction.options.getString('embed_name');

        // Verify embed exists
        if (!interaction.client.embedVault) {
          return interaction.reply({ content: '❌ EmbedVault module is not loaded.', ephemeral: true });
        }

        const embed = await interaction.client.embedVault.getByName(interaction.guildId, embedName);
        if (!embed) {
          return interaction.reply({ content: `❌ Embed **${embedName}** not found in vault.`, ephemeral: true });
        }

        const config = await GuildConfig.findOneAndUpdate(
          { guildId: interaction.guildId },
          {
            $set: {
              'boost.channelId': channel.id,
              'boost.embedName': embedName,
            },
          },
          { upsert: true, new: true }
        );

        return interaction.reply({
          content: `✅ **Boost Setup Complete!**\n📢 Channel: ${channel}\n🎯 Embed: **${embedName}**`,
          ephemeral: true,
        });
      }

      if (sub === 'logs') {
        const channel = interaction.options.getChannel('channel');

        const config = await GuildConfig.findOneAndUpdate(
          { guildId: interaction.guildId },
          {
            $set: {
              'logs.channelId': channel.id,
            },
          },
          { upsert: true, new: true }
        );

        return interaction.reply({
          content: `✅ **Logs Setup Complete!**\n📋 Channel: ${channel}`,
          ephemeral: true,
        });
      }

      return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    } catch (err) {
      console.error('[setup command] Error:', err);
      try {
        if (interaction.isRepliable() && !interaction.replied) {
          await interaction.reply({ content: '❌ An error occurred during setup.', ephemeral: true });
        }
      } catch (e) {
        console.error('[setup command] Reply error:', e);
      }
    }
  },
};
