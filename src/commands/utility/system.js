import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import GuildConfig from '../../modules/config/GuildConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('system')
    .setDescription('نظام الرادار الإمبراطوري • Imperial Radar System')
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('عرض حالة النظام والخرائط • Display system status and maps')
    ),

  async execute(interaction) {
    try {
      if (!interaction.memberPermissions?.has('Administrator')) {
        return interaction.reply({ content: '❌ Admin permission required.', ephemeral: true });
      }

      const sub = interaction.options.getSubcommand();

      if (sub === 'status') {
        return await showSystemDashboard(interaction);
      }

      return interaction.reply({ content: 'أمر فرعي غير معروف.', ephemeral: true });
    } catch (err) {
      console.error('[system command] Error:', err);
      try {
        if (interaction.isRepliable() && !interaction.replied) {
          await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
        }
      } catch (e) {
        console.error('[system command] Reply error:', e);
      }
    }
  },
};

async function showSystemDashboard(interaction) {
  const { client, guildId } = interaction;

  // Get system data
  const data = await client.embedHelper.getSystemMap(guildId);
  const embed = new EmbedBuilder(data);

  // Create tab buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('system_tab_events')
      .setLabel('خرائط الأحداث')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true), // Initially selected
    new ButtonBuilder()
      .setCustomId('system_tab_permissions')
      .setLabel('فحص الصلاحيات')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('system_tab_partners')
      .setLabel('شبكة الشركاء')
      .setStyle(ButtonStyle.Secondary)
  );

  return interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}

async function createPermissionsEmbed(client, guild) {
  const embed = new EmbedBuilder()
    .setTitle('🔍 فحص صلاحيات النظام')
    .setColor(0xDAA520)
    .setDescription('تشخيص صلاحيات البوت في الخادم')
    .setFooter({ text: 'نظام الرادار الإمبراطوري • Imperial Radar System' });

  const botMember = guild.members.me;
  const permissions = botMember.permissions.toArray();

  const keyPermissions = [
    'Administrator',
    'ManageGuild',
    'ManageRoles',
    'ManageChannels',
    'KickMembers',
    'BanMembers',
    'ViewAuditLog',
    'SendMessages',
    'EmbedLinks',
    'AttachFiles',
    'UseExternalEmojis',
    'AddReactions',
  ];

  const permStatus = keyPermissions.map(perm => {
    const has = permissions.includes(perm);
    return `${has ? '✅' : '❌'} ${perm}`;
  }).join('\n');

  embed.addFields({
    name: '🔑 الصلاحيات الرئيسية',
    value: permStatus,
    inline: false,
  });

  // Check channels
  const channels = guild.channels.cache;
  const textChannels = channels.filter(c => c.isTextBased());
  const accessibleChannels = textChannels.filter(c => c.permissionsFor(botMember).has('SendMessages'));

  embed.addFields({
    name: '📢 قنوات النص',
    value: `إجمالي: ${textChannels.size}\nيمكن الكتابة: ${accessibleChannels.size}`,
    inline: true,
  });

  return embed;
}