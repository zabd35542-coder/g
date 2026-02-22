/**
 * Gateway Admin Command
 * Allows admins to configure the Gateway verification module
 */

export default {
  name: 'gateway',
  description: 'Configure the gateway verification module',
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
        const method = options.getString('method', true);
        const verifiedRole = options.getRole('verified_role', true);
        const unverifiedRole = options.getRole('unverified_role', true);
        const channel = options.getChannel('channel', true);
        const triggerWord = options.getString('trigger_word') || '';

        const result = await client.gateway.setupCommand(
          guild.id,
          method,
          verifiedRole.id,
          unverifiedRole.id,
          channel.id,
          triggerWord
        );

        if (result.success) {
          await interaction.reply({
            content: `✅ Gateway configured successfully!\n\n**Method:** ${method}\n**Channel:** <#${channel.id}>\n**Verified Role:** <@&${verifiedRole.id}>\n**Unverified Role:** <@&${unverifiedRole.id}>`,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: `❌ Setup failed: ${result.error}`,
            ephemeral: true,
          });
        }
      } else if (subcommand === 'disable') {
        const result = await client.gateway.disableCommand(guild.id);
        if (result.success) {
          await interaction.reply({
            content: '✅ Gateway has been disabled.',
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: `❌ Disable failed: ${result.error}`,
            ephemeral: true,
          });
        }
      }
    } catch (err) {
      console.error('[gateway command] Error:', err);
      await interaction.reply({
        content: '❌ An error occurred while executing this command.',
        ephemeral: true,
      });
    }
  },
};
