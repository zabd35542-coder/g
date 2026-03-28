import mongoose from 'mongoose';

const shopItemSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  itemId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    enum: ['coins', 'gems'],
    default: 'coins',
  },
  type: {
    type: String,
    required: true,
    enum: ['role', 'item', 'cosmetic'],
  },
  roleId: {
    type: String,
    required: function() {
      return this.type === 'role';
    },
  },
  itemData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  category: {
    type: String,
    required: true,
    enum: ['roles', 'cosmetics', 'utilities', 'premium'],
    default: 'roles',
  },
  stock: {
    type: Number,
    default: -1, // -1 means unlimited
    min: -1,
  },
  maxPerUser: {
    type: Number,
    default: 1, // -1 means unlimited
    min: -1,
  },
  isEnabled: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
shopItemSchema.index({ guildId: 1, category: 1, isEnabled: 1 });
shopItemSchema.index({ guildId: 1, itemId: 1 }, { unique: true });
shopItemSchema.index({ guildId: 1, order: 1 });

// Virtual for checking if item is in stock
shopItemSchema.virtual('isInStock').get(function() {
  return this.stock === -1 || this.stock > 0;
});

// Method to check if user can purchase
shopItemSchema.methods.canPurchase = async function(userId) {
  if (!this.isEnabled || !this.isInStock) return false;

  if (this.maxPerUser === -1) return true;

  // Check purchase history
  const PurchaseHistory = mongoose.model('PurchaseHistory');
  const purchaseCount = await PurchaseHistory.countDocuments({
    userId,
    guildId: this.guildId,
    itemId: this.itemId,
    success: true,
  });

  return purchaseCount < this.maxPerUser;
};

export const ShopItemModel = mongoose.model('ShopItem', shopItemSchema);

// Purchase history model
const purchaseHistorySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  itemId: {
    type: String,
    required: true,
  },
  itemName: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
  success: {
    type: Boolean,
    default: true,
  },
  errorMessage: {
    type: String,
    default: '',
  },
  transactionId: {
    type: String,
    unique: true,
  },
}, {
  timestamps: true,
});

// Indexes for purchase history
purchaseHistorySchema.index({ userId: 1, guildId: 1 });
purchaseHistorySchema.index({ guildId: 1, createdAt: -1 });
purchaseHistorySchema.index({ transactionId: 1 }, { unique: true });

export const PurchaseHistoryModel = mongoose.model('PurchaseHistory', purchaseHistorySchema);

export default {
  ShopItemModel,
  PurchaseHistoryModel,
};