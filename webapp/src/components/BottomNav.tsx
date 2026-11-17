import type { CSSProperties } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { PieChart, List, Folder, BarChart3, Wallet } from 'lucide-react';

const items = [
  { to: '/', label: 'หน้าหลัก', Icon: PieChart },
  { to: '/transactions', label: 'รายการ', Icon: List },
  { to: '/budget', label: 'งบประมาณ', Icon: Wallet },
  { to: '/management', label: 'จัดการ', Icon: Folder },
  { to: '/analytics', label: 'สถิติ', Icon: BarChart3 },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const activeIndex = items.findIndex(({ to }) => (to === '/' ? pathname === '/' : pathname.startsWith(to)));

  return (
    <nav className="bottom-nav" style={{ '--active': activeIndex, '--count': items.length } as CSSProperties}>
      {activeIndex >= 0 && <span className="nav-indicator" aria-hidden="true" />}
      {items.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
