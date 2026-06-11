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

    // Query connected accounts
    const accounts = await mongoose.connection.db.collection('connectedaccounts').find({}).toArray();
    console.log(`Found ${accounts.length} connected account(s):`);
    accounts.forEach(acc => {
      console.log(`- Email: ${acc.email}, User: ${acc.userId}, Provider: ${acc.provider}, HasRefreshToken: ${!!acc.refreshToken}, ExpiryDate: ${acc.expiryDate ? new Date(acc.expiryDate).toISOString() : 'N/A'}`);
    });

    // Query users
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log(`\nFound ${users.length} user(s):`);
    users.forEach(u => {
      console.log(`- Email: ${u.email}, ID: ${u._id}, Role: ${u.role}`);
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
