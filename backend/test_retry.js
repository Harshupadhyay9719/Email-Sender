const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const { Campaign } = require('./dist/models');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Mongo connected');
    const campaign = new Campaign({
      campaignName: 'Test Campaign',
      emailContent: { subject: 'Hello', htmlBody: '<p>Hi</p>', from: 'test@example.com' },
      config: {
        targetOrganizations: [],
        sendingConfig: { startDate: new Date() },
      },
      createdBy: new mongoose.Types.ObjectId(),
    });
    await campaign.save();
    console.log('Campaign saved', campaign._id);
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}
run();
