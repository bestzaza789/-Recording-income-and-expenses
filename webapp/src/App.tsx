import { HashRouter, Routes, Route } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { SaveToast } from './components/SaveToast';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Onboarding } from './components/Onboarding';
import { MonthEndCelebration } from './components/MonthEndCelebration';
import { BadgeWatcher } from './components/BadgeWatcher';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Management } from './pages/Management';
import { Analytics } from './pages/Analytics';
import { Budget } from './pages/Budget';
import { AccountDetail } from './pages/AccountDetail';
import { Guide } from './pages/Guide';
import { TourOverlay } from './components/TourOverlay';

function App() {
  return (
    <HashRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/management" element={<Management />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/account/:id" element={<AccountDetail />} />
          <Route path="/guide" element={<Guide />} />
        </Routes>
        <BottomNav />
        <SaveToast />
        <ConfirmDialog />
        <Onboarding />
        <TourOverlay />
        <MonthEndCelebration />
        <BadgeWatcher />
      </div>
    </HashRouter>
  );
}

export default App;
