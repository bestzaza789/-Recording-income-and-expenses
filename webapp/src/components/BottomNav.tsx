import { NavLink } from 'react-router-dom';
import { PieChart, List, Folder, BarChart3, Wallet } from 'lucide-react';

const items = [
  { to: '/', label: 'Dashboard', Icon: PieChart },
  { to: '/transactions', label: 'Transactions', Icon: List },
  { to: '/budget', label: 'Budget', Icon: Wallet },
  { to: '/management', label: 'Management', Icon: Folder },
  { to: '/analytics', label: 'Analytics', Icon: BarChart3 },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
