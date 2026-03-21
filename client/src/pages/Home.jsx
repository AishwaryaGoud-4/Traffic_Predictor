import { useState } from 'react';
import api from '../utils/api';
import AutocompleteInput from '../components/AutocompleteInput';

const LOCATIONS = [
  'Hyderabad',
  'Secunderabad',
  'Gachibowli',
  'Hitech City',
  'Madhapur',
  'Kukatpally',
  'Ameerpet',
  'Begumpet',
  'Banjara Hills',
  'Jubilee Hills',
  'Miyapur',
  'LB Nagar',
  'Dilsukhnagar',
  'Charminar',
  'Mehdipatnam',
];

const TIME_OPTIONS = [
  '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM',
  '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM',
  '8 PM', '9 PM', '10 PM', '11 PM',
];

export default function Home() {
  const [formData, setFormData] = useState({
    source: '',
    destination: '',
    cars: '',
    bikes: '',
    trucks: '',
    buses: '',
    time: '',
    emergency: 'No',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAutocomplete = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const payload = {
        ...formData,
        cars: Number(formData.cars) || 0,
        bikes: Number(formData.bikes) || 0,
        trucks: Number(formData.trucks) || 0,
        buses: Number(formData.buses) || 0,
        emergency: formData.emergency === 'Yes',
      };

      const res = await api.post('/traffic/predict', payload);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Prediction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTrafficLevelClass = (level) => {
    switch (level) {
      case 'Low': return 'badge-success';
      case 'Medium': return 'badge-warning';
      case 'High': return 'badge-danger';
      default: return '';
    }
  };

  return (
    <div className="home-page">
      <div className="page-header">
        <h1>🚦 Traffic Prediction</h1>
        <p>Enter traffic data between two locations to predict flow</p>
      </div>

      <div className="home-layout">
        {/* Prediction Form */}
        <div className="card prediction-form-card">
          <div className="card-header">
            <h2>📝 Enter Traffic Data</h2>
          </div>
          <form onSubmit={handleSubmit} className="prediction-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="source">Source</label>
                <AutocompleteInput
                  id="source"
                  name="source"
                  value={formData.source}
                  onChange={handleAutocomplete}
                  options={LOCATIONS}
                  placeholder="Type source location..."
                  required
                  excludeValue={formData.destination}
                />
              </div>
              <div className="form-group">
                <label htmlFor="destination">Destination</label>
                <AutocompleteInput
                  id="destination"
                  name="destination"
                  value={formData.destination}
                  onChange={handleAutocomplete}
                  options={LOCATIONS}
                  placeholder="Type destination location..."
                  required
                  excludeValue={formData.source}
                />
              </div>
            </div>

            {/* Map */}
            <div className="map-container">
              <iframe
                title="Google Maps"
                width="100%"
                height="250"
                style={{ border: 0, borderRadius: '12px' }}
                loading="lazy"
                src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${encodeURIComponent(formData.source || 'Hyderabad')}&destination=${encodeURIComponent(formData.destination || 'Secunderabad')}&mode=driving`}
                allowFullScreen
              ></iframe>
            </div>

            <div className="form-row form-row-4">
              <div className="form-group">
                <label htmlFor="cars">🚗 Cars</label>
                <input id="cars" type="number" name="cars" placeholder="0" min="0" value={formData.cars} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="bikes">🏍️ Bikes</label>
                <input id="bikes" type="number" name="bikes" placeholder="0" min="0" value={formData.bikes} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="trucks">🚛 Trucks</label>
                <input id="trucks" type="number" name="trucks" placeholder="0" min="0" value={formData.trucks} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="buses">🚌 Buses</label>
                <input id="buses" type="number" name="buses" placeholder="0" min="0" value={formData.buses} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="time">⏰ Time</label>
                <select id="time" name="time" value={formData.time} onChange={handleChange} required>
                  <option value="">Select Time</option>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="emergency">🚑 Emergency (Ambulance)</label>
                <select id="emergency" name="emergency" value={formData.emergency} onChange={handleChange}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <span className="spinner-sm"></span> : '🔮 Predict Traffic'}
            </button>
          </form>
        </div>

        {/* Result Section */}
        {result && (
          <div className="card result-card animate-slide-up">
            <div className="card-header">
              <h2>📊 Prediction Results</h2>
            </div>

            {/* Dynamic Alerts */}
            {result.alerts && result.alerts.length > 0 && (
              <div className="dynamic-alerts">
                {result.alerts.map((alert) => (
                  <div
                    key={alert._id}
                    className={`alert-banner alert-severity-${alert.severity}`}
                  >
                    <div className="alert-banner-icon">{alert.icon}</div>
                    <div className="alert-banner-content">
                      <strong>{alert.title}</strong>
                      <p>{alert.message}</p>
                      <span className={`badge badge-sm badge-${
                        alert.severity === 'critical' ? 'danger' :
                        alert.severity === 'warning' ? 'warning' : 'success'
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="result-route">
              <span className="route-point source-point">{result.source}</span>
              <span className="route-arrow">→</span>
              <span className="route-point dest-point">{result.destination}</span>
            </div>

            <div className="result-grid">
              <div className="result-item">
                <span className="result-label">Total Vehicles</span>
                <span className="result-value">{result.totalVehicles}</span>
              </div>
              <div className="result-item">
                <span className="result-label">Traffic Level</span>
                <span className={`badge ${getTrafficLevelClass(result.trafficLevel)}`}>
                  {result.trafficLevel}
                </span>
              </div>
              <div className="result-item">
                <span className="result-label">Reached Destination</span>
                <span className="result-value text-success">{result.reached}</span>
              </div>
              <div className="result-item">
                <span className="result-label">Diverted</span>
                <span className="result-value text-warning">{result.diverted}</span>
              </div>
              <div className="result-item">
                <span className="result-label">Priority Vehicle</span>
                <span className="result-value">{result.priority || 'None'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
