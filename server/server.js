const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const trafficRoutes = require('./routes/traffic');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/traffic', trafficRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Smart Traffic Prediction System API is running' });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

const PORT = process.env.PORT || 5001;
const HOST = '0.0.0.0'; // Essential for Render to detect the active port

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server successfully bound to ${HOST} on port ${PORT}`);
});

// Export for Vercel Serverless Functions
module.exports = app;
