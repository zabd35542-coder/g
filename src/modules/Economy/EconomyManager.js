import { EconomyModel } from './EconomyModel.js';

class EconomyManager {
  constructor() {
    // Types of currency
    this.CURRENCY_TYPES = {
      COINS: 'coins',
      GEMS: 'gems',
      BANK: 'bank',
    };
  }

  /**
   * Add money to a user's economy
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {number} amount - Amount to add (can be negative to subtract)
   * @param {string} type - Type of currency ('coins', 'gems', 'bank')
   * @returns {Promise<Object>} Result object with success status and new balance
   */
  async addMoney(userId, guildId, amount, type) {
    try {
      if (!this.CURRENCY_TYPES[type.toUpperCase()]) {
        throw new Error(`Invalid currency type: ${type}`);
      }

      if (typeof amount !== 'number' || isNaN(amount)) {
        throw new Error('Amount must be a valid number');
      }

      // Get or create economy data
      let economyData = await EconomyModel.findOne({
        userId: userId,
        guildId: guildId,
      });

      if (!economyData) {
        economyData = new EconomyModel({
          userId: userId,
          guildId: guildId,
          coins: 0,
          gems: 0,
          bank: 0,
        });
      }

      // Update the specified currency type
      const currentAmount = economyData[type] || 0;
      const newAmount = Math.max(0, currentAmount + amount); // Prevent negative balances
      economyData[type] = newAmount;

      await economyData.save();

      return {
        success: true,
        type: type,
        previousAmount: currentAmount,
        newAmount: newAmount,
        change: amount,
        balance: {
          coins: economyData.coins,
          gems: economyData.gems,
          bank: economyData.bank,
        },
      };

    } catch (error) {
      console.error('[EconomyManager] addMoney failed:', error);
      return {
        success: false,
        error: error.message,
        type: type,
        amount: amount,
      };
    }
  }

  /**
   * Get a user's economy balance
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} Balance data or null if not found
   */
  async getBalance(userId, guildId) {
    try {
      const economyData = await EconomyModel.findOne({
        userId: userId,
        guildId: guildId,
      });

      if (!economyData) {
        return {
          coins: 0,
          gems: 0,
          bank: 0,
          exists: false,
        };
      }

      return {
        coins: economyData.coins,
        gems: economyData.gems,
        bank: economyData.bank,
        exists: true,
        lastUpdated: economyData.updatedAt,
      };

    } catch (error) {
      console.error('[EconomyManager] getBalance failed:', error);
      return null;
    }
  }

  /**
   * Transfer money between users
   * @param {string} fromUserId - Sender's user ID
   * @param {string} toUserId - Receiver's user ID
   * @param {string} guildId - Guild ID
   * @param {number} amount - Amount to transfer
   * @param {string} type - Currency type
   * @returns {Promise<Object>} Transfer result
   */
  async transferMoney(fromUserId, toUserId, guildId, amount, type) {
    try {
      if (amount <= 0) {
        throw new Error('Transfer amount must be positive');
      }

      // Check sender's balance
      const senderBalance = await this.getBalance(fromUserId, guildId);
      if (!senderBalance || senderBalance[type] < amount) {
        return {
          success: false,
          error: 'Insufficient funds',
        };
      }

      // Subtract from sender
      const subtractResult = await this.addMoney(fromUserId, guildId, -amount, type);
      if (!subtractResult.success) {
        return subtractResult;
      }

      // Add to receiver
      const addResult = await this.addMoney(toUserId, guildId, amount, type);
      if (!addResult.success) {
        // Rollback the subtraction
        await this.addMoney(fromUserId, guildId, amount, type);
        return {
          success: false,
          error: 'Transfer failed, rolled back',
        };
      }

      return {
        success: true,
        from: fromUserId,
        to: toUserId,
        amount: amount,
        type: type,
      };

    } catch (error) {
      console.error('[EconomyManager] transferMoney failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get top users by currency in a guild
   * @param {string} guildId - Guild ID
   * @param {string} type - Currency type ('coins' or 'gems')
   * @param {number} limit - Number of top users to return
   * @returns {Promise<Array>} Array of top users
   */
  async getLeaderboard(guildId, type = 'coins', limit = 10) {
    try {
      if (!this.CURRENCY_TYPES[type.toUpperCase()]) {
        throw new Error(`Invalid currency type: ${type}`);
      }

      const results = await EconomyModel.find({ guildId })
        .sort({ [type]: -1 })
        .limit(limit)
        .select('userId coins gems bank')
        .lean();

      return results.map((user, index) => ({
        rank: index + 1,
        userId: user.userId,
        coins: user.coins,
        gems: user.gems,
        bank: user.bank,
      }));

    } catch (error) {
      console.error('[EconomyManager] getLeaderboard failed:', error);
      return [];
    }
  }
}

export default EconomyManager;