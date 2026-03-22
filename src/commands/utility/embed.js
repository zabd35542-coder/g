import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Manage embed vault with visual editor')
    .addSubcommand(subcommand =>
      subcommand.setName('manager').setDescription('Open visual embed manager')
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
        // Use the new openManager() flow
        return await client.embedVault.openManager(interaction);
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
