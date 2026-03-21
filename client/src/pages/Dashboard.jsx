import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/traffic/dashboard');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  const getTrafficStatCount = (level) => {
    const stat = data?.trafficStats?.find((s) => s._id === level);
    return stat ? stat.count : 0;
  };

  const totalStats = getTrafficStatCount('Low') + getTrafficStatCount('Medium') + getTrafficStatCount('High');
  const getPercent = (level) => totalStats > 0 ? Math.round((getTrafficStatCount(level) / totalStats) * 100) : 0;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>📊 Dashboard</h1>
        <p>Overview of your traffic prediction activity</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-primary">
          <div className="stat-icon">🔮</div>
          <div className="stat-info">
            <span className="stat-value">{data?.totalPredictions || 0}</span>
            <span className="stat-label">Total Predictions</span>
          </div>
        </div>
        <div className="stat-card stat-success">
          <div className="stat-icon">🟢</div>
          <div className="stat-info">
            <span className="stat-value">{getTrafficStatCount('Low')}</span>
            <span className="stat-label">Low Traffic</span>
          </div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-icon">🟡</div>
          <div className="stat-info">
            <span className="stat-value">{getTrafficStatCount('Medium')}</span>
            <span className="stat-label">Medium Traffic</span>
          </div>
        </div>
        <div className="stat-card stat-danger">
          <div className="stat-icon">🔴</div>
          <div className="stat-info">
            <span className="stat-value">{getTrafficStatCount('High')}</span>
            <span className="stat-label">High Traffic</span>
          </div>
        </div>
      </div>

      {/* Traffic Distribution Bar */}
      <div className="card">
        <div className="card-header">
          <h2>📈 Traffic Distribution</h2>
        </div>
        <div className="distribution-bar-container">
          <div className="distribution-bar">
            {getPercent('Low') > 0 && (
              <div className="dist-segment dist-low" style={{ width: `${getPercent('Low')}%` }}>
                {getPercent('Low')}%
              </div>
            )}
            {getPercent('Medium') > 0 && (
              <div className="dist-segment dist-medium" style={{ width: `${getPercent('Medium')}%` }}>
                {getPercent('Medium')}%
              </div>
            )}
            {getPercent('High') > 0 && (
              <div className="dist-segment dist-high" style={{ width: `${getPercent('High')}%` }}>
                {getPercent('High')}%
              </div>
            )}
          </div>
          <div className="distribution-legend">
            <span className="legend-item"><span className="legend-dot dot-low"></span> Low</span>
            <span className="legend-item"><span className="legend-dot dot-medium"></span> Medium</span>
            <span className="legend-item"><span className="legend-dot dot-high"></span> High</span>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="card">
        <div className="card-header">
          <h2>🚨 Recent Alerts {data?.unreadAlertCount > 0 && <span className="badge badge-sm badge-danger">{data.unreadAlertCount} new</span>}</h2>
        </div>
        {data?.recentAlerts?.length > 0 ? (
          <div className="alerts-list">
            {data.recentAlerts.map((alert) => (
              <div key={alert._id} className={`alert-item alert-item-${alert.severity} ${!alert.isRead ? 'alert-unread' : ''}`}>
                <div className="alert-item-icon">
                  {alert.icon}
                </div>
                <div className="alert-item-content">
                  <strong>{alert.title}</strong>
                  <p>{alert.message}</p>
                  <div className="alert-item-meta">
                    <span className={`badge badge-sm badge-${
                      alert.severity === 'critical' ? 'danger' :
                      alert.severity === 'warning' ? 'warning' : 'success'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="alert-time">{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No alerts yet. Make a prediction to get started!</p>
        )}
      </div>

      {/* Recent Predictions */}
      <div className="card">
        <div className="card-header">
          <h2>🕐 Recent Predictions</h2>
        </div>
        {data?.recentPredictions?.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Vehicles</th>
                  <th>Level</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPredictions.map((p) => (
                  <tr key={p._id}>
                    <td>{p.source} → {p.destination}</td>
                    <td>{p.totalVehicles}</td>
                    <td>
                      <span className={`badge badge-sm ${
                        p.trafficLevel === 'Low' ? 'badge-success' :
                        p.trafficLevel === 'Medium' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {p.trafficLevel}
                      </span>
                    </td>
                    <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No predictions yet.</p>
        )}
      </div>
    </div>
  );
}
