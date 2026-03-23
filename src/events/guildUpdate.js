/**
 * guildUpdate Event Handler
 * Monitors guild changes including boost/premium tier updates
 * Sends custom boost embeds from embedVault when boost level increases
 */

import { initializeEmbedHelper } from '../utils/embedHelper.js';

export default {
  name: 'guildUpdate',
  async execute(oldGuild, newGuild) {
    try {
      const { client } = newGuild;
      if (!client) return;

      // Check if this is a boost level change
      const oldBoostLevel = oldGuild.premiumTier ?? 0;
      const newBoostLevel = newGuild.premiumTier ?? 0;
      const boostCountChange = (newGuild.premiumSubscriptionCount ?? 0) - (oldGuild.premiumSubscriptionCount ?? 0);

      // Only trigger if boost level increased or boost count increased significantly
      if (newBoostLevel > oldBoostLevel || boostCountChange >= 1) {
        console.log(
          `[GuildUpdate] Boost detected in ${newGuild.name}: Tier ${oldBoostLevel} -> ${newBoostLevel}, ` +
          `Boosts: ${oldGuild.premiumSubscriptionCount} -> ${newGuild.premiumSubscriptionCount}`
        );

        // Use centralized embed helper to send boost embed
        try {
          const embedHelper = initializeEmbedHelper(client);
          await embedHelper.sendBoostEmbed(newGuild);
        } catch (helperErr) {
          console.error('[GuildUpdate] EmbedHelper boost send failed:', helperErr);
        }
      }
    } catch (err) {
      console.error('[guildUpdate] Handler failed:', err);
    }
  },
};
