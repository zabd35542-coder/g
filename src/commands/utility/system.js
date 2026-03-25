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
  const config = await GuildConfig.findOne({ guildId });

  // Create initial embed (Events Map)
  const embed = await createEventsMapEmbed(client, config);

  // Create tab buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('system_tab_events')
      .setLabel('خرائط الأحداث')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true), // Initially selected
    new ButtonBuilder()
      .setCustomId('system_tab_partners')
      .setLabel('شبكة الشركاء')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('system_tab_permissions')
      .setLabel('فحص الصلاحيات')
      .setStyle(ButtonStyle.Secondary)
  );

  return interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}

async function createEventsMapEmbed(client, config) {
  const embed = new EmbedBuilder()
    .setTitle('🗺️ خرائط الأحداث الإمبراطورية')
    .setColor(0xDAA520)
    .setDescription('حالة الإيمبد المرتبطة بالأحداث الرئيسية')
    .setFooter({ text: 'نظام الرادار الإمبراطوري • Imperial Radar System' });

  // Welcome
  const welcomeEmbed = config?.welcome?.embedName || 'غير محدد';
  const welcomeRole = config?.welcome?.autoRoleId ? `<@&${config.welcome.autoRoleId}>` : 'لا يوجد';
  embed.addFields({
    name: '👋 رسالة الترحيب',
    value: `**إمبد:** ${welcomeEmbed}\n**دور تلقائي:** ${welcomeRole}`,
    inline: true,
  });

  // Goodbye
  const goodbyeEmbed = config?.goodbye?.embedName || 'غير محدد';
  embed.addFields({
    name: '👋 رسالة الوداع',
    value: `**إمبد:** ${goodbyeEmbed}`,
    inline: true,
  });

  // Boost
  const boostEmbed = config?.boost?.embedName || 'غير محدد';
  embed.addFields({
    name: '🚀 تعزيز الخادم',
    value: `**إمبد:** ${boostEmbed}`,
    inline: true,
  });

  return embed;
}

async function createPartnersEmbed(client, config, page = 0) {
  const embed = new EmbedBuilder()
    .setTitle('🤝 شبكة الشركاء الإمبراطورية')
    .setColor(0xDAA520)
    .setDescription('روابط الدعوة المرتبطة بالإيمبد والأدوار')
    .setFooter({ text: 'نظام الرادار الإمبراطوري • Imperial Radar System' });

  const partners = config?.partners || [];
  const itemsPerPage = 5;
  const totalPages = Math.ceil(partners.length / itemsPerPage);
  const startIdx = page * itemsPerPage;
  const pagePartners = partners.slice(startIdx, startIdx + itemsPerPage);

  if (pagePartners.length === 0) {
    embed.setDescription('لا توجد شراكات محددة');
  } else {
    pagePartners.forEach((partner, index) => {
      const globalIndex = startIdx + index + 1;
      const inviteLink = partner.inviteLink || 'غير محدد';
      const embedName = partner.embedName || 'غير محدد';
      const role = partner.roleId ? `<@&${partner.roleId}>` : 'لا يوجد';
      embed.addFields({
        name: `🤝 الشريك ${globalIndex}`,
        value: `**رابط الدعوة:** ${inviteLink}\n**إمبد مرتبط:** ${embedName}\n**دور معطى:** ${role}`,
        inline: false,
      });
    });

    embed.setFooter({ text: `الصفحة ${page + 1}/${totalPages} • نظام الرادار الإمبراطوري` });
  }

  return embed;
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