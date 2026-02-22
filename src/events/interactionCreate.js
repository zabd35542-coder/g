export default {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      const { client } = interaction;
      
      // Handle slash commands
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
        return;
      }

      // Route button interactions to Gateway module
      if (interaction.isButton()) {
        if (client.gateway && typeof client.gateway.handleInteraction === 'function') {
          try {
            await client.gateway.handleInteraction(interaction);
            return;
          } catch (err) {
            console.error('[Gateway] Button interaction error:', err);
            if (interaction.isRepliable() && !interaction.replied) {
              await interaction.reply({ content: 'An error occurred.', ephemeral: true });
            }
          }
        }
      }

      // Route select menu interactions to modules if present
      if (interaction.isSelectMenu()) {
        if (client.gateway && typeof client.gateway.handleInteraction === 'function') {
          try {
            await client.gateway.handleInteraction(interaction);
            return;
          } catch (err) {
            console.error('[Gateway] Select menu interaction error:', err);
            if (interaction.isRepliable() && !interaction.replied) {
              await interaction.reply({ content: 'An error occurred.', ephemeral: true });
            }
          }
        }
      }
    } catch (err) {
      console.error('[interactionCreate] Handler failed:', err);
      try {
        if (interaction && interaction.isRepliable && interaction.isRepliable() && !interaction.replied) {
          await interaction.reply({ content: 'Internal error.', ephemeral: true });
        }
      } catch (e) {
        // swallow
      }
    }
  },
};
