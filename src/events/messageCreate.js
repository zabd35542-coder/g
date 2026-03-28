import XPManager from '../modules/leveling/XPManager.js';
import { EmbedBuilder } from 'discord.js';

const xpManager = new XPManager();

export default {
  name: 'messageCreate',
  async execute(message) {
    try {
      // Skip bot messages
      if (message.author.bot) return;

      // Skip messages in DMs
      if (!message.guild) return;

      const member = message.member;
      if (!member) return;

      // Check if user is verified (has risk score saved)
      const riskScore = await xpManager.getRiskScoreFromDB(member);
      if (riskScore === 0) {
        // User hasn't been through gateway verification yet
        return;
      }

      // Calculate and add XP
      const xpAmount = xpManager.calculateXP(message);
      const xpResult = await xpManager.addXP(member, xpAmount, 'message');

      // Handle level up
      if (xpResult.success && xpResult.leveledUp) {
        await sendLevelUpMessage(message, xpResult);
      }

    } catch (error) {
      console.error('[messageCreate] Failed to process message:', error);
    }
  },
};

async function sendLevelUpMessage(message, xpResult) {
  try {
    const embed = new EmbedBuilder()
      .setTitle('🎉 Level Up!')
      .setDescription(`${message.author}, you leveled up to **Level ${xpResult.newLevel}**!`)
      .addFields(
        { name: 'Previous Level', value: xpResult.oldLevel.toString(), inline: true },
        { name: 'New Level', value: xpResult.newLevel.toString(), inline: true },
        { name: 'XP Gained', value: `+${xpResult.xpGained}`, inline: true }
      )
      .setColor(0xffd700)
      .setTimestamp();

    await message.reply({ embeds: [embed] });

  } catch (error) {
    console.error('[messageCreate] Failed to send level up message:', error);
  }
}
