const mongoose = require('mongoose');

const trafficSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  source: {
    type: String,
    required: true,
    trim: true,
  },
  destination: {
    type: String,
    required: true,
    trim: true,
  },
  cars: {
    type: Number,
    required: true,
    default: 0,
  },
  bikes: {
    type: Number,
    required: true,
    default: 0,
  },
  trucks: {
    type: Number,
    required: true,
    default: 0,
  },
  buses: {
    type: Number,
    required: true,
    default: 0,
  },
  time: {
    type: String,
    required: true,
  },
  emergency: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: String,
    default: 'None',
  },
  totalVehicles: {
    type: Number,
    default: 0,
  },
  reached: {
    type: Number,
    default: 0,
  },
  diverted: {
    type: Number,
    default: 0,
  },
  trafficLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Low',
  },
  alertMessage: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Traffic', trafficSchema);
