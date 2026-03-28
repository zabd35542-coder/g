import { LevelingModel } from './LevelingModel.js';
import { xpForLevel, levelFromXP } from './LevelUtils.js';

class XPManager {
  constructor() {
    this.cooldowns = new Map();
    this.COOLDOWN_TIME = 60000; // 1 minute cooldown
  }

  async addXP(member, amount, reason = 'message') {
    try {
      if (!member?.id || !member?.guild?.id) {
        throw new Error('Invalid member object');
      }

      // Check cooldown
      const cooldownKey = `${member.guild.id}:${member.id}`;
      const lastXP = this.cooldowns.get(cooldownKey);
      if (lastXP && Date.now() - lastXP < this.COOLDOWN_TIME) {
        return { success: false, reason: 'cooldown' };
      }

      // Update cooldown
      this.cooldowns.set(cooldownKey, Date.now());

      // Get or create leveling data
      let levelingData = await LevelingModel.findOne({
        userId: member.id,
        guildId: member.guild.id,
      });

      if (!levelingData) {
        levelingData = new LevelingModel({
          userId: member.id,
          guildId: member.guild.id,
          xp: 0,
          level: 1,
          totalXP: 0,
          lastMessage: new Date(),
        });
      }

      const oldLevel = levelingData.level;
      levelingData.xp += amount;
      levelingData.totalXP += amount;
      levelingData.lastMessage = new Date();

      // Check for level up
      const newLevel = levelFromXP(levelingData.xp);
      levelingData.level = newLevel;

      await levelingData.save();

      const leveledUp = newLevel > oldLevel;

      return {
        success: true,
        oldLevel,
        newLevel,
        leveledUp,
        xpGained: amount,
        totalXP: levelingData.totalXP,
        currentXP: levelingData.xp,
        xpToNext: xpForLevel(newLevel + 1) - levelingData.xp,
      };

    } catch (error) {
      console.error('[XPManager] addXP failed:', error);
      return { success: false, reason: 'error', error: error.message };
    }
  }

  async getXPData(member) {
    try {
      const levelingData = await LevelingModel.findOne({
        userId: member.id,
        guildId: member.guild.id,
      });

      if (!levelingData) {
        return {
          xp: 0,
          level: 1,
          totalXP: 0,
          xpToNext: xpForLevel(2),
        };
      }

      return {
        xp: levelingData.xp,
        level: levelingData.level,
        totalXP: levelingData.totalXP,
        xpToNext: xpForLevel(levelingData.level + 1) - levelingData.xp,
      };

    } catch (error) {
      console.error('[XPManager] getXPData failed:', error);
      return null;
    }
  }

  async getRiskScoreFromDB(member) {
    try {
      const levelingData = await LevelingModel.findOne({
        userId: member.id,
        guildId: member.guild.id,
      });

      return levelingData?.riskScore || 0;
    } catch (error) {
      console.error('[XPManager] getRiskScoreFromDB failed:', error);
      return 0;
    }
  }

  async setRiskScore(member, riskScore) {
    try {
      let levelingData = await LevelingModel.findOne({
        userId: member.id,
        guildId: member.guild.id,
      });

      if (!levelingData) {
        levelingData = new LevelingModel({
          userId: member.id,
          guildId: member.guild.id,
          xp: 0,
          level: 1,
          totalXP: 0,
          riskScore: riskScore,
          lastMessage: new Date(),
        });
      } else {
        levelingData.riskScore = riskScore;
      }

      await levelingData.save();
      return true;

    } catch (error) {
      console.error('[XPManager] setRiskScore failed:', error);
      return false;
    }
  }

  calculateXP(message) {
    // Base XP for any message
    let xp = 10;

    // Bonus for message length (up to 50 chars = +5 XP)
    const lengthBonus = Math.min(Math.floor(message.content.length / 10), 5);
    xp += lengthBonus;

    // Bonus for attachments
    if (message.attachments.size > 0) {
      xp += 5;
    }

    // Bonus for embeds (rich content)
    if (message.embeds.length > 0) {
      xp += 3;
    }

    return xp;
  }
}

export default XPManager;