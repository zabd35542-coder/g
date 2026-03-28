import mongoose from 'mongoose';

const levelingSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  xp: {
    type: Number,
    default: 0,
    min: 0,
  },
  level: {
    type: Number,
    default: 1,
    min: 1,
  },
  totalXP: {
    type: Number,
    default: 0,
    min: 0,
  },
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  lastMessage: {
    type: Date,
    default: Date.now,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound index for efficient queries
levelingSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Index for leaderboard queries
levelingSchema.index({ guildId: 1, xp: -1 });

// Index for cleanup (old inactive users)
levelingSchema.index({ lastMessage: 1 });

export const LevelingModel = mongoose.model('Leveling', levelingSchema);

export default LevelingModel;