require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const createSuperAdmin = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ role: 'superadmin' });
  if (existing) {
    console.log(`✅ Superadmin already exists: @${existing.username}`);
    process.exit(0);
  }

  const admin = await User.create({
    name: 'Super Admin',
    username: 'superadmin',
    email: 'admin@flatsplit.com',
    password: 'Admin@1234',
    role: 'superadmin',
  });

  console.log('✅ Superadmin created!');
  console.log(`   Username : ${admin.username}`);
  console.log(`   Password : Admin@1234`);
  console.log('   ⚠️  Change the password after first login!');
  process.exit(0);
};

createSuperAdmin().catch((err) => { console.error(err); process.exit(1); });
