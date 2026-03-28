import { verifyMember, startStrictGauntlet } from '../modules/gateway/actions.js';

export default {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      // Handle button interactions
      if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
        return;
      }

      // Handle slash commands if needed
      if (interaction.isChatInputCommand()) {
        // For now, just acknowledge
        await interaction.reply({
          content: 'Command received!',
          ephemeral: true,
        });
        return;
      }

    } catch (error) {
      console.error('[interactionCreate] Failed to handle interaction:', error);

      try {
        if (interaction.isRepliable() && !interaction.replied) {
          await interaction.reply({
            content: 'An error occurred while processing your interaction.',
            ephemeral: true,
          });
        }
      } catch (replyError) {
        console.error('[interactionCreate] Failed to send error reply:', replyError);
      }
    }
  },
};

async function handleButtonInteraction(interaction) {
  const { customId } = interaction;

  try {
    // Gateway verification buttons
    if (customId.startsWith('gateway_verify_')) {
      await interaction.deferUpdate();

      const member = interaction.member;
      if (!member) {
        await interaction.editReply({
          content: 'Unable to find member information.',
          embeds: [],
          components: [],
        });
        return;
      }

      if (customId === 'gateway_verify_easy') {
        await verifyMember(interaction, member);
      } else if (customId === 'gateway_verify_normal') {
        await verifyMember(interaction, member);
      } else if (customId === 'gateway_verify_hard') {
        await startStrictGauntlet(interaction, member);
      } else if (customId === 'gateway_verify_fallback') {
        await verifyMember(interaction, member);
      }
      return;
    }

    // Strict gauntlet answer buttons
    if (customId.startsWith('gauntlet_answer_')) {
      await interaction.deferUpdate();

      const answer = customId.split('_')[2]; // Extract the answer (4, 5, or 6)

      if (answer === '4') {
        // Correct answer
        const member = interaction.member;
        if (member) {
          await verifyMember(interaction, member);
        }
      } else {
        // Wrong answer
        await interaction.editReply({
          content: '❌ Incorrect answer. Please try again.',
          embeds: [],
          components: [],
        });
      }
      return;
    }

    // Captcha verification (placeholder)
    if (customId === 'verify_captcha') {
      await interaction.deferUpdate();
      await interaction.editReply({
        content: 'Captcha verification not implemented yet. Please contact an administrator.',
        embeds: [],
        components: [],
      });
      return;
    }

    // Cancel verification
    if (customId === 'verify_cancel') {
      await interaction.deferUpdate();
      await interaction.editReply({
        content: 'Verification cancelled. You can try again later.',
        embeds: [],
        components: [],
      });
      return;
    }

    // Unknown button
    await interaction.reply({
      content: 'Unknown button interaction.',
      ephemeral: true,
    });

  } catch (error) {
    console.error('[handleButtonInteraction] Error:', error);

    try {
      if (interaction.isRepliable() && !interaction.replied) {
        await interaction.editReply({
          content: 'An error occurred while processing your button interaction.',
          embeds: [],
          components: [],
        });
      }
    } catch (replyError) {
      console.error('[handleButtonInteraction] Failed to send error reply:', replyError);
    }
  }
}