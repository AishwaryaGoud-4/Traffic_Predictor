import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const handleLinkClick = () => setMenuOpen(false);

  if (!token) return null;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" onClick={handleLinkClick}>
          <span className="brand-icon">🚦</span>
          <span className="brand-text">TrafficPredict</span>
        </Link>

        {/* Hamburger Button */}
        <button
          className={`hamburger ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        {/* Overlay for mobile */}
        {menuOpen && <div className="nav-overlay" onClick={() => setMenuOpen(false)}></div>}

        <div className={`navbar-menu ${menuOpen ? 'open' : ''}`}>
          <div className="navbar-links">
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} onClick={handleLinkClick}>
              <span className="nav-icon">🏠</span> Home
            </Link>
            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`} onClick={handleLinkClick}>
              <span className="nav-icon">📊</span> Dashboard
            </Link>
            <Link to="/history" className={`nav-link ${isActive('/history') ? 'active' : ''}`} onClick={handleLinkClick}>
              <span className="nav-icon">📜</span> History
            </Link>
            <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`} onClick={handleLinkClick}>
              <span className="nav-icon">👤</span> Profile
            </Link>
            <div className="navbar-user">
            <span className="user-greeting">Hi, {user?.name}</span>
            <button onClick={handleLogout} className="btn btn-logout">
              Logout
            </button>
          </div>
          </div>

          
        </div>
      </div>
    </nav>
  );
}
