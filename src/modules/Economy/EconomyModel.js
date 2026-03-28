import mongoose from 'mongoose';

const economySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  coins: {
    type: Number,
    default: 0,
    min: 0,
  },
  gems: {
    type: Number,
    default: 0,
    min: 0,
  },
  bank: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

// Compound index for efficient queries
economySchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Index for leaderboard queries
economySchema.index({ guildId: 1, coins: -1 });
economySchema.index({ guildId: 1, gems: -1 });

// Index for cleanup (old inactive users)
economySchema.index({ updatedAt: 1 });

export const EconomyModel = mongoose.model('Economy', economySchema);

export default EconomyModel;