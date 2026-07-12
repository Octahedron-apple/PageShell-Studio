import React from 'react';
import { NavLink } from 'react-router-dom';

const BASE = import.meta.env.BASE_URL;

const navItems = [
  { to: '/editor', icon: '💻', label: 'Editor' },
  { to: '/ai',      icon: '🤖', label: 'AI' },
];

export default function Sidebar() {
  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logoArea}>
        <img src={`${BASE}assets/logo.png`} alt="Logo" style={styles.logo} />
      </div>

      {/* Nav Links */}
      <nav style={styles.nav}>
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {}),
            })}
          >
            <span style={styles.navIcon}>{icon}</span>
            <span style={styles.navLabel}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Badge */}
      <div style={styles.badge}>
        <span style={styles.badgeDot} />
        <span style={styles.badgeText}>Offline</span>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '72px',
    height: '100vh',
    backgroundColor: '#0d0d10',
    borderRight: '1px solid #1e1e24',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '12px',
    paddingBottom: '16px',
    boxSizing: 'border-box',
    gap: '4px',
    flexShrink: 0,
    zIndex: 100,
  },
  logoArea: {
    marginBottom: '20px',
  },
  logo: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    objectFit: 'contain',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
  },
  navLink: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    width: '52px',
    height: '52px',
    borderRadius: '10px',
    textDecoration: 'none',
    color: '#5a5a72',
    transition: 'background 0.15s, color 0.15s',
    cursor: 'pointer',
  },
  navLinkActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.12)',
    color: '#4facfe',
  },
  navIcon: {
    fontSize: '20px',
    lineHeight: 1,
  },
  navLabel: {
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  badge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    marginTop: 'auto',
  },
  badgeDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#2ecc71',
    boxShadow: '0 0 8px #2ecc71',
  },
  badgeText: {
    fontSize: '8px',
    fontWeight: '700',
    color: '#2ecc71',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
};
