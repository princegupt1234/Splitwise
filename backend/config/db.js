const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Drop old non-sparse email index if it exists so Mongoose can recreate it as sparse
    try {
      await conn.connection.collection('users').dropIndex('email_1');
      console.log('🔧 Dropped old email index — will be recreated as sparse');
    } catch (_) { /* index didn't exist, nothing to do */ }

  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
