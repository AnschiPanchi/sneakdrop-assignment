require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');

// Run once to seed inventory. Safe to run again — won't duplicate.
const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding.');

    const existing = await Inventory.findOne();
    if (existing) {
      console.log('Inventory already seeded:', existing);
    } else {
      const inventory = new Inventory({ total: 20, available: 20 });
      await inventory.save();
      console.log('Inventory seeded:', inventory);
    }

    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error('Seeding error:', err.message);
    process.exit(1);
  }
};

seed();
