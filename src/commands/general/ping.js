import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  async execute(interaction) {
    try {
      await interaction.reply({ content: 'Pong!', ephemeral: true });
    } catch (err) {
      console.error('ping command error:', err);
    }
  },
};
