import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../utils/api';
import AutocompleteInput from '../components/AutocompleteInput';
import { LOCATIONS_COORDINATES } from '../utils/coordinates';

// Fix for default marker icons in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconRetinaUrl: iconRetina,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to auto-fit map to routes
function MapBounds({ routes, sourceCoords, destCoords, otherLocations }) {
  const map = useMap();
  useEffect(() => {
    let allCoords = [];
    
    // Add route coordinates
    if (routes && routes.length > 0) {
      routes.forEach(route => {
        if (route.geometry && route.geometry.coordinates) {
          route.geometry.coordinates.forEach(coord => {
            allCoords.push([coord[1], coord[0]]);
          });
        }
      });
    } else if (sourceCoords && destCoords) {
      allCoords.push(sourceCoords, destCoords);
    }
    
    // Add other location coordinates
    if (otherLocations && otherLocations.length > 0) {
      otherLocations.forEach(loc => {
        allCoords.push(loc.coords);
      });
    }

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routes, sourceCoords, destCoords, otherLocations, map]);
  return null;
}

const LOCATIONS = Object.keys(LOCATIONS_COORDINATES);

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
  
  // MAP STATE
  const [routes, setRoutes] = useState([]);
  const [optimizedRouteId, setOptimizedRouteId] = useState(null);
  const [maxTraffic, setMaxTraffic] = useState(0);
  
  // NEW: Hover interaction and other location markers
  const [hoveredRouteId, setHoveredRouteId] = useState(null);
  const [otherLocationsTraffic, setOtherLocationsTraffic] = useState([]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAutocomplete = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const generateOtherLocationsTraffic = (source, destination) => {
    // Pick up to 5 random locations that are NOT the source or destination
    const availableLocs = LOCATIONS.filter(l => l !== source && l !== destination);
    // Shuffle and pick
    const randomLocations = availableLocs.sort(() => 0.5 - Math.random()).slice(0, 5);
    
    return randomLocations.map(name => {
      // Generate some simulated traffic numbers
      const totalVehicles = Math.floor(Math.random() * 200) + 20; // 20 to 220
      let level = 'Low';
      if (totalVehicles > 120) level = 'High';
      else if (totalVehicles >= 50) level = 'Medium';
      
      return {
        name,
        totalVehicles,
        level,
        coords: LOCATIONS_COORDINATES[name]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setRoutes([]);
    setOptimizedRouteId(null);
    setMaxTraffic(0);
    setOtherLocationsTraffic([]);
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

      if (LOCATIONS_COORDINATES[formData.source] && LOCATIONS_COORDINATES[formData.destination]) {
        // 1. Fetch alternative routes from OSRM
        const [lat1, lon1] = LOCATIONS_COORDINATES[formData.source];
        const [lat2, lon2] = LOCATIONS_COORDINATES[formData.destination];
        
        try {
          const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson&alternatives=3`);
          const osrmData = await osrmRes.json();
          
          if (osrmData.code === 'Ok' && osrmData.routes) {
            const baseTraffic = res.data.totalVehicles || 0;
            const fetchedRoutes = osrmData.routes.map((route, index) => {
              let routeTraffic = baseTraffic;
              if (index === 0) {
                routeTraffic = baseTraffic;
              } else {
                // Variations for realistic randomness
                const variation = (Math.random() * 0.8) - 0.3; // -30% to +50%
                routeTraffic = Math.floor(baseTraffic * (1 + variation));
              }

              let level = 'Low';
              if (routeTraffic > 120) level = 'High';
              else if (routeTraffic >= 50) level = 'Medium';

              // Slice into realistic segmented traffic condition lines
              const rawCoords = route.geometry.coordinates; // [lon, lat]
              const segments = [];
              const numSegments = Math.max(3, Math.floor(rawCoords.length / 15)); // chunks of ~15 coords
              const chunkSize = Math.max(2, Math.floor(rawCoords.length / numSegments));
              
              const signals = []; // coordinates to place traffic signals

              for (let i = 0; i < rawCoords.length; i += chunkSize) {
                const chunk = rawCoords.slice(i, i + chunkSize + 1).map(c => [c[1], c[0]]); // [lat, lon]
                if (chunk.length > 1) {
                  // Determine color of this segment based on route's overall level
                  let segColor = '#10b981'; // green default moving traffic
                  const rand = Math.random();
                  
                  if (level === 'High') {
                    if (rand < 0.6) segColor = '#ef4444'; // 60% heavy red
                    else if (rand < 0.9) segColor = '#f59e0b'; // 30% yellow moving
                  } else if (level === 'Medium') {
                    if (rand < 0.2) segColor = '#ef4444'; // 20% heavy red
                    else if (rand < 0.7) segColor = '#f59e0b'; // 50% yellow moving
                  } else {
                    if (rand < 0.15) segColor = '#f59e0b'; // 15% yellow moving
                  }
                  
                  segments.push({ positions: chunk, color: segColor });
                  
                  // Randomly place a few traffic signals, skipping start
                  if (i > 0 && Math.random() < 0.4 && signals.length < 4) {
                    signals.push(chunk[0]);
                  }
                }
              }

              return {
                ...route,
                trafficData: {
                  totalVehicles: Math.max(0, routeTraffic),
                  level: level,
                },
                segments,
                signals,
                id: index
              };
            });

            const sorted = [...fetchedRoutes].sort((a,b) => a.trafficData.totalVehicles - b.trafficData.totalVehicles);
            const optimizedId = sorted[0].id; // route with lowest totalVehicles
            const fetchedMaxTraffic = Math.max(...fetchedRoutes.map(r => r.trafficData.totalVehicles));

            setRoutes(fetchedRoutes);
            setOptimizedRouteId(optimizedId);
            setMaxTraffic(fetchedMaxTraffic);
          }
        } catch (err) {
          console.error("OSRM fetch failed", err);
        }

        // 2. Generate random traffic data for other locations
        const others = generateOtherLocationsTraffic(formData.source, formData.destination);
        setOtherLocationsTraffic(others);
      }

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

  const sourceCoords = LOCATIONS_COORDINATES[formData.source];
  const destCoords = LOCATIONS_COORDINATES[formData.destination];

  // We reorder the routes array so that the selected/optimized route is rendered last (on top) 
  const displayRoutes = [...routes].sort((a, b) => {
    if (hoveredRouteId !== null) {
      if (a.id === hoveredRouteId) return 1;
      if (b.id === hoveredRouteId) return -1;
    } else {
      if (a.id === optimizedRouteId) return 1;
      if (b.id === optimizedRouteId) return -1;
    }
    return 0;
  });

  return (
    <div className="home-page">
      <div className="page-header">
        <h1>🚦 Traffic Prediction</h1>
        <p>Enter traffic data between two locations to predict flow and view optimal routes</p>
      </div>

      <div className="home-layout">
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

            {/* Map Container */}
            <div className="map-container" style={{ height: '450px', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', zIndex: 0, position: 'relative' }}>
              {(!sourceCoords || !destCoords) ? (
                <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p>Select a valid Source and Destination to view the interactive map.</p>
                </div>
              ) : (
                <MapContainer 
                  center={sourceCoords} 
                  zoom={12} 
                  style={{ height: '100%', width: '100%', zIndex: 1 }}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  
                  {/* Primary Source and Destination Markers */}
                  <Marker position={sourceCoords}>
                    <Popup><strong>Source: {formData.source}</strong></Popup>
                  </Marker>
                  <Marker position={destCoords}>
                    <Popup><strong>Destination: {formData.destination}</strong></Popup>
                  </Marker>

                  {/* Other Location Markers with Traffic Simulation */}
                  {otherLocationsTraffic.map((loc, idx) => (
                    <Marker key={`other-${idx}`} position={loc.coords} opacity={0.8}>
                      <Tooltip direction="top" offset={[0, -20]} opacity={0.9} permanent className="custom-tooltip">
                        <div style={{ textAlign: 'center', minWidth: '100px', fontSize: '12px', lineHeight: '1.2' }}>
                          <strong style={{ fontSize: '14px' }}>{loc.name}</strong><br/>
                          <span style={{
                             color: loc.level === 'High' ? '#dc2626' : loc.level === 'Medium' ? '#d97706' : '#16a34a',
                             fontWeight: 'bold'
                          }}>{loc.level} Traffic</span><br/>
                          ({loc.totalVehicles} Vehicles)
                        </div>
                      </Tooltip>
                    </Marker>
                  ))}

                  {/* Render Segmented Routes */}
                  {displayRoutes.map((route) => {
                    const isOptimized = route.id === optimizedRouteId;
                    
                    // Style logic for interactive hover / default optimized highlighted
                    let isFocused = hoveredRouteId !== null ? route.id === hoveredRouteId : isOptimized;
                    let isFaded = hoveredRouteId !== null && route.id !== hoveredRouteId;

                    const weight = isFocused ? 8 : 4;
                    const opacity = isFaded ? 0.15 : (isFocused ? 1 : 0.6);

                    return (
                      <React.Fragment key={`route-group-${route.id}`}>
                        {/* Map chunks into multiple colored lines */}
                        {route.segments.map((segment, sIdx) => {
                          // Unselected routes become gray/faded out, Selected retains segment colors
                          const color = isFaded ? '#9ca3af' : segment.color;
                          return (
                            <Polyline 
                              key={`segment-${route.id}-${sIdx}`} 
                              positions={segment.positions} 
                              pathOptions={{ color, weight, opacity }}
                              eventHandlers={{
                                mouseover: () => setHoveredRouteId(route.id),
                                mouseout: () => setHoveredRouteId(null),
                              }}
                            >
                              <Popup>
                                <strong>Route {route.id + 1}</strong><br/>
                                {isOptimized && <span style={{color: 'green'}}>⭐ Optimized Route<br/></span>}
                                Segment Condition: {segment.color === '#10b981' ? 'Clear' : (segment.color === '#f59e0b' ? 'Moving' : 'Heavy')}<br/>
                                Overall Traffic: {route.trafficData.level}
                              </Popup>
                            </Polyline>
                          );
                        })}

                        {/* Optional Traffic Signals along the route, prominently shown if selected */}
                        {isFocused && route.signals.map((sigLatLng, sigIdx) => (
                           <Marker 
                             key={`signal-${route.id}-${sigIdx}`} 
                             position={sigLatLng} 
                             icon={L.divIcon({ 
                               html: '<div style="font-size:18px; line-height:1; cursor: pointer;">🚦</div>', 
                               className: 'traffic-signal-icon', 
                               iconSize: [18,18], 
                               iconAnchor: [9,9] 
                             })}
                           >
                             <Tooltip direction="top" offset={[0,-5]}>Traffic Signal</Tooltip>
                           </Marker>
                        ))}
                      </React.Fragment>
                    )
                  })}
                  
                  <MapBounds routes={routes} sourceCoords={sourceCoords} destCoords={destCoords} otherLocations={otherLocationsTraffic} />
                </MapContainer>
              )}
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
              {loading ? <span className="spinner-sm"></span> : '🔮 Predict Traffic & Routes'}
            </button>
          </form>
        </div>

        {/* Result Section */}
        {result && (
          <div className="card result-card animate-slide-up">
            <div className="card-header">
              <h2>📊 Prediction Results</h2>
            </div>
            
            {/* New Routes Feature Display */}
            {routes.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div className="alert alert-warning" style={{ marginBottom: '15px' }}>
                  <strong>Maximum Traffic Observed:</strong> {maxTraffic} vehicles across all derived routes.
                </div>
                <h4>🛤️ Available Routes {hoveredRouteId !== null && <span style={{fontSize: '0.85rem', color: '#6b7280', fontWeight: 'normal'}}>(Hovering Route {hoveredRouteId + 1})</span>}</h4>
                <div className="routes-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  {routes.map((route) => {
                    const isOptimized = route.id === optimizedRouteId;
                    const isHovered = route.id === hoveredRouteId;
                    
                    return (
                      <div 
                        key={route.id} 
                        className="route-option-card" 
                        onMouseEnter={() => setHoveredRouteId(route.id)}
                        onMouseLeave={() => setHoveredRouteId(null)}
                        style={{ 
                          padding: '12px', 
                          borderRadius: '8px', 
                          border: isHovered ? '2px solid #3b82f6' : (isOptimized ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)'),
                          background: isOptimized ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          transform: isHovered ? 'scale(1.02)' : 'scale(1)'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                          Route {route.id + 1} {isOptimized && <span style={{color: '#10b981'}}>⭐ (Optimized)</span>}
                        </div>
                        <div style={{ fontSize: '0.9rem', marginBottom: '2px', color: 'rgba(255,255,255,0.8)' }}>
                          Distance: {(route.distance / 1000).toFixed(1)} km
                        </div>
                        <div style={{ fontSize: '0.9rem', marginBottom: '5px', color: 'rgba(255,255,255,0.8)' }}>
                          Duration: {Math.round(route.duration / 60)} min
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>{route.trafficData.totalVehicles} Vehicles</span>
                          <span className={`badge badge-sm ${getTrafficLevelClass(route.trafficData.level)}`}>
                            {route.trafficData.level}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                <span className="result-label">Base Vehicles</span>
                <span className="result-value">{result.totalVehicles}</span>
              </div>
              <div className="result-item">
                <span className="result-label">Base Traffic Level</span>
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
