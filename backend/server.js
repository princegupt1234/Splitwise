require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes         = require('./routes/auth');
const groupRoutes        = require('./routes/groups');
const expenseRoutes      = require('./routes/expenses');
const settlementRoutes   = require('./routes/settlements');
const reportRoutes       = require('./routes/reports');
const adminRoutes        = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const budgetRoutes       = require('./routes/budgets');

const { startScheduler } = require('./services/monthlyReportScheduler');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Flat Expense Manager API is running' });
});

// Temp SMTP test - remove after testing
app.get('/api/test-email', async (req, res) => {
  const { Resend } = require('resend');
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ success: false, error: 'RESEND_API_KEY not set in Railway variables' });
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'FlatSplit <onboarding@resend.dev>',
      to: process.env.SMTP_USER || 'princegupt3052@gmail.com',
      subject: 'FlatSplit Email Test',
      text: 'If you see this, Resend email is working correctly on Railway!',
    });
    if (error) return res.status(500).json({ success: false, error });
    res.json({ success: true, message: `Email sent`, id: data?.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Routes
app.use('/api/auth',          authRoutes);
app.use('/api/groups',        groupRoutes);
app.use('/api/expenses',      expenseRoutes);
app.use('/api/settlements',   settlementRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/budgets',       budgetRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  startScheduler();
});
