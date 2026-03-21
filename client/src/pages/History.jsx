import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function History() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/traffic/history');
      setRecords(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading history...</p>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="page-header">
        <h1>📜 Prediction History</h1>
        <p>View all your past traffic predictions</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {records.length > 0 ? (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Source → Destination</th>
                  <th>🚗</th>
                  <th>🏍️</th>
                  <th>🚛</th>
                  <th>🚌</th>
                  <th>Total</th>
                  <th>Time</th>
                  <th>Level</th>
                  <th>Priority</th>
                  <th>Reached</th>
                  <th>Diverted</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r._id}>
                    <td className="route-cell">{r.source} → {r.destination}</td>
                    <td>{r.cars}</td>
                    <td>{r.bikes}</td>
                    <td>{r.trucks}</td>
                    <td>{r.buses}</td>
                    <td><strong>{r.totalVehicles}</strong></td>
                    <td>{r.time}</td>
                    <td>
                      <span className={`badge badge-sm ${
                        r.trafficLevel === 'Low' ? 'badge-success' :
                        r.trafficLevel === 'Medium' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {r.trafficLevel}
                      </span>
                    </td>
                    <td>{r.priority || 'None'}</td>
                    <td className="text-success">{r.reached}</td>
                    <td className="text-warning">{r.diverted}</td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="empty-state">No predictions yet. Go to Home to make your first prediction!</p>
        </div>
      )}
    </div>
  );
}
