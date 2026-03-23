export default {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      const { client } = interaction;

      // ── Autocomplete ────────────────────────────────────────────────────────
      if (interaction.isAutocomplete?.()) {
        if (interaction.commandName === 'embed' && client.embedVault) {
          const focused = interaction.options.getFocused(true);
          if (focused.name === 'name') {
            const all = await client.embedVault.list(interaction.guildId).catch(() => []);
            const filtered = all
              .filter(item => item.name.toLowerCase().includes(String(focused.value).toLowerCase()))
              .slice(0, 25)
              .map(item => ({ name: item.name, value: item.name }));
            return interaction.respond(filtered);
          }
        }
        return;
      }

      // ── Slash Commands ──────────────────────────────────────────────────────
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
          await command.execute(interaction);
        } catch (cmdErr) {
          console.error(`[Command: ${interaction.commandName}] Execution error:`, cmdErr);
          try {
            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: '❌ An error occurred executing the command.', ephemeral: true });
            }
          } catch (replyErr) {
            console.error('[Slash Command] Failed to send error reply:', replyErr);
          }
        }
        return;
      }

      // ── Buttons ─────────────────────────────────────────────────────────────
      if (interaction.isButton()) {
        try {
          if (interaction.customId.startsWith('welcome_') && client.welcome?.handleButtonInteraction) {
            await client.welcome.handleButtonInteraction(interaction);
            return;
          }
          if (interaction.customId.startsWith('embedvault_') && client.embedVault?.handleButtonInteraction) {
            await client.embedVault.handleButtonInteraction(interaction);
            return;
          }
          if (client.gateway?.handleInteraction) {
            await client.gateway.handleInteraction(interaction);
          }
        } catch (err) {
          console.error('[Button Interaction] Error:', err);
          try {
            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: '❌ An error occurred processing your interaction.', ephemeral: true });
            }
          } catch (replyErr) {
            console.error('[Button] Failed to send error reply:', replyErr);
          }
        }
        return;
      }

      // ── Modal Submissions ────────────────────────────────────────────────────
      if (interaction.isModalSubmit()) {
        try {
          if (interaction.customId.startsWith('welcome_modal_') && client.welcome?.handleModalSubmit) {
            await client.welcome.handleModalSubmit(interaction);
            return;
          }
          if (interaction.customId.startsWith('embedvault_') && client.embedVault?.handleModalSubmit) {
            await client.embedVault.handleModalSubmit(interaction);
            return;
          }
        } catch (err) {
          console.error('[Modal Interaction] Error:', err);
          try {
            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: '❌ Failed to process your submission.', ephemeral: true });
            }
          } catch (replyErr) {
            console.error('[Modal] Failed to send error reply:', replyErr);
          }
        }
        return;
      }

      // ── Select Menus ─────────────────────────────────────────────────────────
      // FIX #5 – isSelectMenu() was removed in discord.js v14; use isAnySelectMenu()
      if (interaction.isAnySelectMenu()) {
        try {
          if (interaction.customId.startsWith('embedvault_') && client.embedVault?.handleSelectMenu) {
            await client.embedVault.handleSelectMenu(interaction);
            return;
          }
          if (client.gateway?.handleInteraction) {
            await client.gateway.handleInteraction(interaction);
          }
        } catch (err) {
          console.error('[Select Menu] Error:', err);
          try {
            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
            }
          } catch (replyErr) {
            console.error('[Select Menu] Failed to send error reply:', replyErr);
          }
        }
      }
    } catch (err) {
      console.error('[interactionCreate] Handler failed:', err);
      try {
        if (interaction?.isRepliable?.() && !interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Internal error.', ephemeral: true });
        }
      } catch (e) {
        console.error('[interactionCreate] Failed to send final error reply:', e);
      }
    }
  },
};