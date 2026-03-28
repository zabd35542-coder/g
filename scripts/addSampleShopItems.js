import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ShopItemModel } from '../src/modules/Shop/ShopModel.js';

dotenv.config();

async function addSampleShopItems() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');

    const guildId = '1449104671737380915'; // Replace with your test guild ID

    // Sample shop items
    const sampleItems = [
      {
        guildId,
        itemId: 'vip_role',
        name: 'VIP Member',
        description: 'Get access to VIP channels and special perks!',
        price: 5000,
        currency: 'coins',
        type: 'role',
        roleId: '123456789012345678', // Replace with actual role ID
        category: 'roles',
        stock: -1, // Unlimited
        maxPerUser: 1,
        isEnabled: true,
        order: 1,
        createdBy: 'system',
      },
      {
        guildId,
        itemId: 'premium_cosmetic',
        name: 'Premium Badge',
        description: 'Show off with a special premium badge!',
        price: 100,
        currency: 'gems',
        type: 'cosmetic',
        category: 'cosmetics',
        stock: 50,
        maxPerUser: 1,
        isEnabled: true,
        order: 2,
        createdBy: 'system',
      },
      {
        guildId,
        itemId: 'booster_pack',
        name: 'XP Booster',
        description: 'Double XP for 24 hours!',
        price: 200,
        currency: 'coins',
        type: 'item',
        category: 'utilities',
        stock: 100,
        maxPerUser: 3,
        isEnabled: true,
        order: 3,
        createdBy: 'system',
      },
    ];

    // Clear existing items for this guild (for testing)
    await ShopItemModel.deleteMany({ guildId });

    // Add sample items
    for (const item of sampleItems) {
      const newItem = new ShopItemModel(item);
      await newItem.save();
      console.log(`Added item: ${item.name}`);
    }

    console.log('Sample shop items added successfully!');
    console.log('Use /shop command to view the items in Discord.');

  } catch (error) {
    console.error('Error adding sample items:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Run the script
addSampleShopItems();