import { ShopItemModel, PurchaseHistoryModel } from './ShopModel.js';
import EconomyManager from '../Economy/EconomyManager.js';
import { v4 as uuidv4 } from 'uuid';

class ShopManager {
  constructor() {
    this.economyManager = new EconomyManager();
  }

  /**
   * Get all available items for a guild
   * @param {string} guildId - Discord guild ID
   * @param {string} category - Optional category filter
   * @returns {Promise<Array>} Array of available shop items
   */
  async getAvailableItems(guildId, category = null) {
    try {
      const query = {
        guildId,
        isEnabled: true,
        isInStock: true,
      };

      if (category) {
        query.category = category;
      }

      const items = await ShopItemModel.find(query)
        .sort({ category: 1, order: 1, createdAt: -1 })
        .lean();

      return items.map(item => ({
        ...item,
        isInStock: item.stock === -1 || item.stock > 0,
      }));

    } catch (error) {
      console.error('[ShopManager] getAvailableItems failed:', error);
      return [];
    }
  }

  /**
   * Get items by category
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} Items grouped by category
   */
  async getItemsByCategory(guildId) {
    try {
      const items = await this.getAvailableItems(guildId);
      const categories = {};

      items.forEach(item => {
        if (!categories[item.category]) {
          categories[item.category] = [];
        }
        categories[item.category].push(item);
      });

      return categories;

    } catch (error) {
      console.error('[ShopManager] getItemsByCategory failed:', error);
      return {};
    }
  }

  /**
   * Purchase an item
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {string} itemId - Shop item ID
   * @param {Object} member - Discord member object (optional, for role assignment)
   * @returns {Promise<Object>} Purchase result
   */
  async purchaseItem(userId, guildId, itemId, member = null) {
    try {
      // Find the item
      const item = await ShopItemModel.findOne({
        guildId,
        itemId,
        isEnabled: true,
      });

      if (!item) {
        return {
          success: false,
          error: 'Item not found or not available',
        };
      }

      // Check if item is in stock
      if (!item.isInStock) {
        return {
          success: false,
          error: 'Item is out of stock',
        };
      }

      // Check if user can purchase (max per user limit)
      const canPurchase = await item.canPurchase(userId);
      if (!canPurchase) {
        return {
          success: false,
          error: 'You have reached the maximum purchase limit for this item',
        };
      }

      // Check user balance
      const balance = await this.economyManager.getBalance(userId, guildId);
      if (!balance || balance[item.currency] < item.price) {
        return {
          success: false,
          error: `Insufficient ${item.currency}. Required: ${item.price}, Available: ${balance ? balance[item.currency] : 0}`,
        };
      }

      // Generate transaction ID
      const transactionId = uuidv4();

      // Deduct money
      const deductResult = await this.economyManager.addMoney(
        userId,
        guildId,
        -item.price,
        item.currency
      );

      if (!deductResult.success) {
        return {
          success: false,
          error: 'Failed to process payment',
        };
      }

      // Grant the item
      const grantResult = await this.grantItem(userId, guildId, item, member);

      if (!grantResult.success) {
        // Refund the money
        await this.economyManager.addMoney(userId, guildId, item.price, item.currency);
        return {
          success: false,
          error: grantResult.error,
        };
      }

      // Update stock if limited
      if (item.stock > 0) {
        item.stock -= 1;
        await item.save();
      }

      // Record purchase history
      await PurchaseHistoryModel.create({
        userId,
        guildId,
        itemId,
        itemName: item.name,
        price: item.price,
        currency: item.currency,
        transactionId,
      });

      return {
        success: true,
        item: {
          id: item.itemId,
          name: item.name,
          price: item.price,
          currency: item.currency,
        },
        transactionId,
        newBalance: deductResult.balance,
      };

    } catch (error) {
      console.error('[ShopManager] purchaseItem failed:', error);
      return {
        success: false,
        error: 'Purchase failed due to an internal error',
      };
    }
  }

  /**
   * Grant an item to a user
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {Object} item - Shop item document
   * @param {Object} member - Discord member object
   * @returns {Promise<Object>} Grant result
   */
  async grantItem(userId, guildId, item, member) {
    try {
      switch (item.type) {
        case 'role':
          if (!member || !item.roleId) {
            return {
              success: false,
              error: 'Member object required for role items',
            };
          }

          const role = member.guild.roles.cache.get(item.roleId);
          if (!role) {
            return {
              success: false,
              error: 'Role not found in server',
            };
          }

          // Check if user already has the role
          if (member.roles.cache.has(item.roleId)) {
            return {
              success: false,
              error: 'You already have this role',
            };
          }

          await member.roles.add(item.roleId);
          return {
            success: true,
            type: 'role',
            roleId: item.roleId,
            roleName: role.name,
          };

        case 'item':
          // For custom items, store in inventory or handle as needed
          return {
            success: true,
            type: 'item',
            itemData: item.itemData,
          };

        case 'cosmetic':
          // Handle cosmetic items (could be profile customizations, etc.)
          return {
            success: true,
            type: 'cosmetic',
            cosmeticData: item.itemData,
          };

        default:
          return {
            success: false,
            error: 'Unknown item type',
          };
      }

    } catch (error) {
      console.error('[ShopManager] grantItem failed:', error);
      return {
        success: false,
        error: 'Failed to grant item',
      };
    }
  }

  /**
   * Add a new shop item
   * @param {Object} itemData - Item data
   * @returns {Promise<Object>} Creation result
   */
  async addItem(itemData) {
    try {
      const item = new ShopItemModel(itemData);
      await item.save();

      return {
        success: true,
        item: item,
      };

    } catch (error) {
      console.error('[ShopManager] addItem failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update a shop item
   * @param {string} guildId - Guild ID
   * @param {string} itemId - Item ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Update result
   */
  async updateItem(guildId, itemId, updateData) {
    try {
      const item = await ShopItemModel.findOneAndUpdate(
        { guildId, itemId },
        updateData,
        { new: true }
      );

      if (!item) {
        return {
          success: false,
          error: 'Item not found',
        };
      }

      return {
        success: true,
        item: item,
      };

    } catch (error) {
      console.error('[ShopManager] updateItem failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Remove a shop item
   * @param {string} guildId - Guild ID
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Removal result
   */
  async removeItem(guildId, itemId) {
    try {
      const result = await ShopItemModel.findOneAndDelete({
        guildId,
        itemId,
      });

      if (!result) {
        return {
          success: false,
          error: 'Item not found',
        };
      }

      return {
        success: true,
        item: result,
      };

    } catch (error) {
      console.error('[ShopManager] removeItem failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get purchase history for a user
   * @param {string} userId - User ID
   * @param {string} guildId - Guild ID
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} Purchase history
   */
  async getPurchaseHistory(userId, guildId, limit = 10) {
    try {
      const history = await PurchaseHistoryModel.find({
        userId,
        guildId,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return history;

    } catch (error) {
      console.error('[ShopManager] getPurchaseHistory failed:', error);
      return [];
    }
  }
}

export default ShopManager;