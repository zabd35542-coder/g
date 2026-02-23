/**
 * Gateway Module - Main Entry Point
 * Handles verification for Button, Trigger, Slash, and Join-check methods
 */

import GatewayConfig from './schema.js';
import { checkTriggerWord, performVerificationCheck } from './checker.js';
import { verifyMember, sendVerificationPrompt, sendChannelEmbed, createEmbed } from './actions.js';

/**
 * Gateway Module Factory
 * @param {Client} client - Discord client
 * @returns {Object} Gateway module with handlers and commands
 */
export default function GatewayModule(client) {
  return {
    /**
     * Handle button interactions
     */
    async handleInteraction(interaction) {
      try {
        const config = await GatewayConfig.findOne({ guildId: interaction.guildId });
        if (!config || !config.enabled) {
          console.log(`[Gateway] Button interaction ignored: config not found or disabled`);
          return;
        }

        if (interaction.customId === 'gateway_verify_button') {
          console.log(`[Gateway] Button pressed by ${interaction.user.tag}`);
          
          // STRICT CHANNEL RESTRICTION: Only respond to button in the designated button channel
          if (interaction.channelId !== config.buttonChannelId) {
            console.log(`[Gateway] Button pressed in wrong channel: ${interaction.channelId} (expected button channel ${config.buttonChannelId}), ignoring`);
            return;
          }
          const result = await verifyMember(interaction.member, config, 'button');

          if (result.alreadyVerified) {
            const embed = createEmbed(config, result.message, 'alreadyVerified');
            await interaction.reply({ embeds: [embed], ephemeral: false });
          } else if (result.success) {
            const embed = createEmbed(config, '✅ Verification successful! Welcome to the server.', 'success');
            await interaction.reply({ embeds: [embed], ephemeral: false });
            
            // If DM failed, send ephemeral notification
            if (result.dmFailed) {
              try {
                await interaction.followUp({
                  content: `⚠️ I couldn't send you a verification DM. Please open your Privacy Settings and try again.`,
                  ephemeral: true,
                });
              } catch (followUpErr) {
                console.error('[Gateway] Failed to send DM failure notification:', followUpErr.message);
              }
            }
          } else {
            await interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
          }
        }
      } catch (err) {
        console.error('[Gateway] Interaction handler error:', err);
        try {
          if (interaction.isRepliable() && !interaction.replied) {
            await interaction.reply({ content: 'An error occurred during verification.', ephemeral: true });
          }
        } catch (e) {
          // swallow
        }
      }
    },

    /**
     * Handle message events (for trigger word detection)
     */
    async handleMessage(message) {
      try {
        const config = await GatewayConfig.findOne({ guildId: message.guildId });
        if (!config || !config.enabled) {
          console.log(`[Gateway] Message handler: no config or disabled for guild ${message.guildId}`);
          return;
        }

        // STRICT CHANNEL RESTRICTION: Only respond to trigger words in the designated trigger channel
        if (message.channelId !== config.triggerChannelId) {
          console.log(`[Gateway] Message in wrong channel: ${message.channelId} (expected trigger channel ${config.triggerChannelId}), ignoring`);
          return;
        }

        // Always process trigger words if a trigger word is configured
        if (config.triggerWord && config.triggerWord.trim()) {
          // Case-insensitive, trimmed content
          const content = (message.content || '').toString().trim().toLowerCase();
          const triggerWordLower = (config.triggerWord || '').toString().trim().toLowerCase();
          
          console.log(`[Gateway] Checking trigger in correct channel: content="${content}" vs trigger="${triggerWordLower}"`);
          
          if (!content) {
            console.log('[Gateway] Empty message content, skipping');
            return;
          }

          if (checkTriggerWord(content, triggerWordLower)) {
            console.log(`[Gateway] Trigger word matched for ${message.author.tag} in verification channel`);
            // React with trigger emoji first (public response in verification channel)
            try {
              const emoji = config.triggerEmoji || '✅';
              await message.react(emoji).catch(() => {});
            } catch (err) {
              console.error('[Gateway] Failed to react:', err.message);
            }

            // Verify member
            const result = await verifyMember(message.member, config, 'trigger');
            
            if (result.alreadyVerified || result.success) {
              console.log(`[Gateway] User ${message.member.user.tag} verified via trigger word`);

              // Send channel embed using page-specific UI
              try {
                const pageKey = result.alreadyVerified ? 'alreadyVerified' : 'success';
                const msg = result.alreadyVerified ? (result.message || '') : '✅ Verification successful! Welcome to the server.';
                const channelEmbed = createEmbed(config, msg, pageKey);
                await message.channel.send({ embeds: [channelEmbed] });
              } catch (sendErr) {
                console.error('[Gateway] Failed to send channel embed after verification:', sendErr.message || sendErr);
              }

              // If DM failed, notify the user in-channel (public) with guidance
              if (result.dmFailed) {
                try {
                  await message.reply({
                    content: `❌ ${message.member.user.toString()}, I couldn't send you a DM. Please open your Privacy Settings and try again or use /verify.`,
                  });
                } catch (replyErr) {
                  console.error('[Gateway] Failed to send DM failure notification:', replyErr.message);
                }
              }
            } else {
              console.log(`[Gateway] Verification failed for ${message.author.tag}: ${result.message}`);
              try {
                const errEmbed = createEmbed(config, result.message || 'Verification failed.', 'error');
                await message.channel.send({ embeds: [errEmbed] });
              } catch (errSend) {
                console.error('[Gateway] Failed to send error embed:', errSend.message || errSend);
              }
            }
          } else {
            console.log('[Gateway] Trigger word NOT matched');
          }
        }
      } catch (err) {
        console.error('[Gateway] Message handler error:', err);
      }
    },

    /**
     * Setup gateway for a guild
     */
    async setupCommand(guildId, verifiedRoleId, unverifiedRoleId, buttonChannelId, triggerChannelId = '', slashChannelId = '', triggerWord = '', successDM = undefined) {
      try {
        const configData = {
          guildId,
          verifiedRole: verifiedRoleId,
          unverifiedRole: unverifiedRoleId,
          buttonChannelId,
          triggerChannelId,
          slashChannelId,
          method: 'multi',
          triggerWord,
          enabled: true,
        };

        if (successDM) configData.successDM = successDM;

        const config = await GatewayConfig.findOneAndUpdate(
          { guildId },
          configData,
          { upsert: true, new: true }
        );

        console.log(`[Gateway] Setup command executed for guild ${guildId}`);
        console.log(`  - Button Channel: ${buttonChannelId}`);
        if (triggerChannelId) console.log(`  - Trigger Channel: ${triggerChannelId}`);
        if (slashChannelId) console.log(`  - Slash Channel: ${slashChannelId}`);

        // Send verification prompt to the button channel
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
          const channel = guild.channels.cache.get(buttonChannelId);
          if (channel) {
            console.log(`[Gateway] Sending verification prompt to button channel ${channel.name}`);
            const promptResult = await sendVerificationPrompt(channel, config);
            console.log(`[Gateway] Prompt result:`, promptResult);
          } else {
            console.warn(`[Gateway] Button channel ${buttonChannelId} not found in guild ${guildId}`);
          }
        } else {
          console.warn(`[Gateway] Guild ${guildId} not found in client cache`);
        }

        return { success: true, config };
      } catch (err) {
        console.error('[Gateway] Setup error:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Customize a specific page (success / alreadyVerified / error)
     */
    async customizePageCommand(guildId, page, title, description, colorHex, imageUrl) {
      try {
        const updateData = {};
        const allowed = ['success', 'alreadyVerified', 'error'];
        if (!allowed.includes(page)) {
          return { success: false, error: 'Invalid page' };
        }

        const fieldPrefix = page === 'success' ? 'successUI' : (page === 'alreadyVerified' ? 'alreadyVerifiedUI' : 'errorUI');

        if (title !== undefined && title !== null) updateData[`${fieldPrefix}.title`] = title;
        if (description !== undefined && description !== null) updateData[`${fieldPrefix}.desc`] = description;
        if (colorHex !== undefined && colorHex !== null) updateData[`${fieldPrefix}.color`] = colorHex;
        if (imageUrl !== undefined && imageUrl !== null) updateData[`${fieldPrefix}.image`] = imageUrl;

        const config = await GatewayConfig.findOneAndUpdate(
          { guildId },
          { $set: updateData },
          { new: true }
        );

        return { success: true, config };
      } catch (err) {
        console.error('[Gateway] Customize page error:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Customize trigger logic (trigger word and emoji)
     */
    async customizeLogicCommand(guildId, triggerWord, triggerEmoji = undefined) {
      try {
        const updateData = {};

        if (triggerWord !== undefined && triggerWord !== null) {
          updateData.triggerWord = triggerWord.trim();
        }
        if (triggerEmoji !== undefined && triggerEmoji !== null) {
          updateData.triggerEmoji = triggerEmoji;
        }

        const config = await GatewayConfig.findOneAndUpdate(
          { guildId },
          updateData,
          { new: true }
        );

        console.log(`[Gateway] Customize logic for guild ${guildId}:`, updateData);
        return { success: true, config };
      } catch (err) {
        console.error('[Gateway] Customize logic error:', err);
        return { success: false, error: err.message };
      }
    },
  };
}
