const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (dnsErr) {
  console.warn('Failed to set DNS servers:', dnsErr);
}

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Connecting to MongoDB at:', mongoUri.split('@')[1] || mongoUri);
    await mongoose.connect(mongoUri);
    console.log('✓ Connected successfully.');

    const users = await mongoose.connection.db.collection('users').find({}).toArray();

    // Search in campaigns
    const campaignsTesting = await mongoose.connection.db.collection('campaigns').find({
      $or: [
        { campaignName: /prabuddha/i },
        { campaignName: /siemens/i },
        { campaignName: /testing/i }
      ]
    }).toArray();
    console.log(`\nMatching Campaigns (${campaignsTesting.length}):`);
    campaignsTesting.forEach(c => {
      console.log(`- ID: ${c._id}, Name: ${c.campaignName}, Status: ${c.config?.status}`);
    });

    // Search in organizations (Slots)
    const orgsTesting = await mongoose.connection.db.collection('organizations').find({
      $or: [
        { companyName: /siemens/i },
        { companyName: /testing/i },
        { 'contacts.name': /prabuddha/i },
        { 'contacts.companyName': /siemens/i }
      ]
    }).toArray();
    console.log(`\nMatching Organizations/Slots (${orgsTesting.length}):`);
    orgsTesting.forEach(o => {
      console.log(`- ID: ${o._id}, CompanyName/SlotName: ${o.companyName}, Contacts Count: ${o.contacts?.length}`);
      o.contacts?.forEach((c, idx) => {
        console.log(`   * Contact ${idx}: Name=${c.name}, Email=${c.email}, Company=${c.companyName}`);
      });
    });

    // Search in emaillogs
    const logsTesting = await mongoose.connection.db.collection('emaillogs').find({
      $or: [
        { recipientName: /prabuddha/i },
        { recipientEmail: /prabuddha/i }
      ]
    }).toArray();
    console.log(`\nMatching EmailLogs (${logsTesting.length}):`);
    logsTesting.forEach(l => {
      console.log(`- ID: ${l._id}, Recipient: ${l.recipientName} (${l.recipientEmail}), Status: ${l.status}`);
    });

    // Search in importlogs
    const importsTesting = await mongoose.connection.db.collection('importlogs').find({
      $or: [
        { fileName: /prabuddha/i },
        { organizationName: /prabuddha/i },
        { organizationName: /siemens/i },
        { organizationName: /testing/i }
      ]
    }).toArray();
    console.log(`\nMatching ImportLogs (${importsTesting.length}):`);
    importsTesting.forEach(i => {
      console.log(`- ID: ${i._id}, FileName: ${i.fileName}, OrgName: ${i.organizationName}, Status: ${i.importStatus}`);
    });

    // Generate JWT access token for the first user
    if (users.length > 0) {
      const jwt = require('jsonwebtoken');
      const u = users[0];
      const payload = {
        userId: u._id.toString(),
        email: u.email,
        role: u.role
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', {
        expiresIn: '1d',
        issuer: 'email-campaign-platform',
        subject: u._id.toString()
      });
      console.log(`\n✓ Generated access token for ${u.email}:`);
      console.log(`Bearer ${token}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error in diagnostic script:', err);
  }
}

run();
