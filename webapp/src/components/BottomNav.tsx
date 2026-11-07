import { NavLink } from 'react-router-dom';
import { PieChart, List, Folder, BarChart3, Wallet } from 'lucide-react';

const items = [
  { to: '/', label: 'หน้าหลัก', Icon: PieChart },
  { to: '/transactions', label: 'รายการ', Icon: List },
  { to: '/budget', label: 'งบประมาณ', Icon: Wallet },
  { to: '/management', label: 'จัดการ', Icon: Folder },
  { to: '/analytics', label: 'สถิติ', Icon: BarChart3 },
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
