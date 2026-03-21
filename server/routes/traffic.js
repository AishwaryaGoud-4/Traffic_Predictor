const express = require('express');
const Traffic = require('../models/Traffic');
const Alert = require('../models/Alert');
const auth = require('../middleware/auth');

const router = express.Router();

// Generate dynamic alerts based on prediction data
function generateAlerts({ source, destination, totalVehicles, trafficLevel, emergency, priority, numTrucks, numBuses, time }) {
  const alerts = [];

  // 1. Emergency / Ambulance alert
  if (emergency) {
    alerts.push({
      type: 'emergency',
      severity: 'critical',
      title: '🚨 Emergency Vehicle Detected',
      message: `Immediate road clearance required on ${source} → ${destination}. Ambulance has highest priority — all vehicles must yield.`,
      icon: '🚑',
    });
    alerts.push({
      type: 'emergency',
      severity: 'critical',
      title: '🚓 Police Alert Issued',
      message: `Traffic police notified for emergency corridor: ${source} → ${destination}. Signal override activated.`,
      icon: '🚓',
    });
  }

  // 2. High traffic alert
  if (trafficLevel === 'High') {
    alerts.push({
      type: 'high_traffic',
      severity: 'warning',
      title: '🔴 High Traffic Congestion',
      message: `Heavy congestion detected on ${source} → ${destination} with ${totalVehicles} vehicles. Consider alternate routes to avoid delays.`,
      icon: '🚧',
    });
    alerts.push({
      type: 'diversion',
      severity: 'warning',
      title: '↩️ Route Diversion Recommended',
      message: `Due to high traffic (${totalVehicles} vehicles), diversion is recommended for non-essential vehicles on ${source} → ${destination}.`,
      icon: '↩️',
    });
  }

  // 3. Medium traffic warning
  if (trafficLevel === 'Medium') {
    alerts.push({
      type: 'congestion',
      severity: 'info',
      title: '🟡 Moderate Traffic',
      message: `Moderate congestion on ${source} → ${destination} with ${totalVehicles} vehicles. Plan extra travel time.`,
      icon: '🟡',
    });
  }

  // 4. Peak time / bus priority alert
  const normalizedTime = (time || '').trim().toLowerCase();
  if (normalizedTime === '4 pm' || normalizedTime === '4pm' || normalizedTime === '16:00' || normalizedTime === '4:00 pm') {
    alerts.push({
      type: 'peak_time',
      severity: 'warning',
      title: '🚌 Peak Hour — Bus Priority Active',
      message: `School/college buses given priority on ${source} → ${destination}. Personal vehicles may experience delays during 4 PM rush.`,
      icon: '🚌',
    });
  }

  // 5. Heavy truck traffic
  if (numTrucks > 20) {
    alerts.push({
      type: 'congestion',
      severity: 'warning',
      title: '🚛 Heavy Truck Movement',
      message: `${numTrucks} trucks detected on ${source} → ${destination}. Speed restrictions may apply. Smaller vehicles should use alternate lanes.`,
      icon: '🚛',
    });
  }

  // 6. Low traffic — all clear
  if (trafficLevel === 'Low' && !emergency) {
    alerts.push({
      type: 'info',
      severity: 'info',
      title: '🟢 Clear Roads',
      message: `Smooth traffic on ${source} → ${destination}. Only ${totalVehicles} vehicles detected. No delays expected.`,
      icon: '🟢',
    });
  }

  return alerts;
}

// POST /api/traffic/predict
router.post('/predict', auth, async (req, res) => {
  try {
    const { source, destination, cars, bikes, trucks, buses, time, emergency } = req.body;

    if (!source || !destination) {
      return res.status(400).json({ message: 'Source and destination are required.' });
    }

    const numCars = Number(cars) || 0;
    const numBikes = Number(bikes) || 0;
    const numTrucks = Number(trucks) || 0;
    const numBuses = Number(buses) || 0;

    // Step 1: Total Vehicles
    const totalVehicles = numCars + numBikes + numTrucks + numBuses;

    // Step 2: Default Logic
    let reached = Math.round(totalVehicles * 0.6);
    let diverted = totalVehicles - reached;
    let priority = 'None';
    let alertMessage = '';

    const isEmergency = emergency === true || emergency === 'true' || emergency === 'Yes';

    // Step 3: Emergency Case
    if (isEmergency) {
      priority = 'Ambulance';
      reached = Math.round(totalVehicles * 0.8);
      diverted = totalVehicles - reached;
      alertMessage = '🚨 Clear road immediately! Ambulance must go first';
    }

    // Step 4: Peak Time Logic (4 PM)
    const normalizedTime = (time || '').trim().toLowerCase();
    if (
      normalizedTime === '4 pm' ||
      normalizedTime === '4pm' ||
      normalizedTime === '16:00' ||
      normalizedTime === '4:00 pm'
    ) {
      priority = 'Buses';
      const restVehicles = numCars + numBikes + numTrucks;
      reached = numBuses + Math.round(restVehicles * 0.4);
      diverted = totalVehicles - reached;
      alertMessage = '🚌 Priority given to school/college buses';
    }

    // Step 5: Traffic Level
    let trafficLevel = 'Low';
    if (totalVehicles >= 50 && totalVehicles <= 120) {
      trafficLevel = 'Medium';
    } else if (totalVehicles > 120) {
      trafficLevel = 'High';
    }

    // Save traffic record
    const trafficRecord = new Traffic({
      userId: req.user.id,
      source,
      destination,
      cars: numCars,
      bikes: numBikes,
      trucks: numTrucks,
      buses: numBuses,
      time,
      emergency: isEmergency,
      priority,
      totalVehicles,
      reached,
      diverted,
      trafficLevel,
      alertMessage,
    });

    await trafficRecord.save();

    // Generate dynamic alerts
    const dynamicAlerts = generateAlerts({
      source,
      destination,
      totalVehicles,
      trafficLevel,
      emergency: isEmergency,
      priority,
      numTrucks,
      numBuses,
      time,
    });

    // Save alerts to DB
    const savedAlerts = [];
    for (const alertData of dynamicAlerts) {
      const alert = new Alert({
        userId: req.user.id,
        trafficId: trafficRecord._id,
        source,
        destination,
        ...alertData,
      });
      await alert.save();
      savedAlerts.push(alert);
    }

    res.json({
      totalVehicles,
      reached,
      diverted,
      trafficLevel,
      alertMessage,
      priority,
      source,
      destination,
      alerts: savedAlerts,
    });
  } catch (error) {
    console.error('Predict error:', error);
    res.status(500).json({ message: 'Server error during prediction.' });
  }
});

// GET /api/traffic/history
router.get('/history', auth, async (req, res) => {
  try {
    const records = await Traffic.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(records);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ message: 'Server error fetching history.' });
  }
});

// GET /api/traffic/alerts — all alerts for the logged-in user
router.get('/alerts', auth, async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(alerts);
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ message: 'Server error fetching alerts.' });
  }
});

// PUT /api/traffic/alerts/:id/read — mark an alert as read
router.put('/alerts/:id/read', auth, async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found.' });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/traffic/dashboard
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const totalPredictions = await Traffic.countDocuments({ userId });

    // Get recent alerts from Alert collection
    const recentAlerts = await Alert.find({ userId })
      .sort({ createdAt: -1 })
      .limit(8);

    const unreadAlertCount = await Alert.countDocuments({ userId, isRead: false });

    const trafficStats = await Traffic.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(userId) } },
      {
        $group: {
          _id: '$trafficLevel',
          count: { $sum: 1 },
        },
      },
    ]);

    const recentPredictions = await Traffic.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalPredictions,
      recentAlerts,
      unreadAlertCount,
      trafficStats,
      recentPredictions,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard.' });
  }
});

module.exports = router;
