const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  trafficId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Traffic',
  },
  type: {
    type: String,
    enum: ['emergency', 'high_traffic', 'peak_time', 'diversion', 'congestion', 'info'],
    required: true,
  },
  severity: {
    type: String,
    enum: ['critical', 'warning', 'info'],
    default: 'info',
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: '⚠️',
  },
  source: String,
  destination: String,
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Alert', alertSchema);
