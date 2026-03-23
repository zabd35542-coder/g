import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Manage embed vault with visual editor')
    .addSubcommand(subcommand =>
      subcommand.setName('manager').setDescription('Open visual embed manager')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('bind')
        .setDescription('Link an embed to an invite code for partner tracking')
        .addStringOption(option =>
          option.setName('name').setDescription('Embed name').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('invite_code').setDescription('Discord invite code').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete an embed from the vault')
        .addStringOption(option =>
          option.setName('name').setDescription('Embed name to delete').setRequired(true)
        )
    ),

  async execute(interaction) {
    try {
      const { client } = interaction;
      const sub = interaction.options.getSubcommand();

      if (!interaction.memberPermissions?.has('Administrator')) {
        return interaction.reply({ content: '❌ Admin permission required.', ephemeral: true });
      }
      if (!client.embedVault) {
        return interaction.reply({ content: '❌ EmbedVault module is not loaded.', ephemeral: true });
      }

      if (sub === 'manager') {
        return await client.embedVault.openManager(interaction);
      }

      if (sub === 'bind') {
        const name = interaction.options.getString('name').trim();
        const inviteCode = interaction.options.getString('invite_code').trim();

        // Validate invite code format
        if (inviteCode.length < 2) {
          return interaction.reply({
            content: '❌ Invalid invite code format.',
            ephemeral: true,
          });
        }

        const updated = await client.embedVault.bindInvite(interaction.guildId, name, inviteCode);
        if (!updated) {
          return interaction.reply({
            content: `❌ Embed **${name}** not found in vault.`,
            ephemeral: true,
          });
        }

        return interaction.reply({
          content: `✅ Bound **${updated.name}** to invite code: \`${inviteCode}\`\nWhen members use this invite to join, this embed will be sent!`,
          ephemeral: true,
        });
      }

      if (sub === 'delete') {
        const name = interaction.options.getString('name').trim();
        const deleted = await client.embedVault.delete(interaction.guildId, name);

        if (!deleted) {
          return interaction.reply({
            content: `❌ Embed **${name}** not found in vault.`,
            ephemeral: true,
          });
        }

        return interaction.reply({
          content: `✅ Deleted **${name}** from vault.`,
          ephemeral: true,
        });
      }

      return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    } catch (err) {
      console.error('[embed command] Error:', err);
      try {
        if (interaction.isRepliable() && !interaction.replied) {
          await interaction.reply({ content: 'An error occurred processing the embed command.', ephemeral: true });
        }
      } catch (e) {
        console.error('[embed command] Reply error:', e);
      }
    }
  },
};
