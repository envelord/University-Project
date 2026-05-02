import { NavLink, useLocation } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/projects', label: 'Projects', icon: '◈' },
];

export default function Sidebar() {
  const loc = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Elevate</h1>
        <span>progress tracker</span>
      </div>

      <nav className="sidebar-nav">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
