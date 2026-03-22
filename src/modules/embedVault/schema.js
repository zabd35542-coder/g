import mongoose from 'mongoose';

const EmbedVaultSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    data: {
      type: Object,
      required: true,
      default: {},
      description: 'Full embed object (title, description, color, image, etc.)',
    },
    category: {
      type: String,
      required: true,
      enum: ['Welcome', 'Leave', 'Boost', 'Manual'],
      default: 'Manual',
    },
    linkedInviteCode: {
      type: String,
      default: '',
      description: 'Optional invite code that triggers this embed when used by a joiner',
    },
  },
  { timestamps: true }
);

EmbedVaultSchema.index({ guildId: 1, name: 1 }, { unique: true });

export default mongoose.model('EmbedVault', EmbedVaultSchema);
