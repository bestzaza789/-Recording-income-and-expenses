import { HashRouter, Routes, Route } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Management } from './pages/Management';
import { Analytics } from './pages/Analytics';

function App() {
  return (
    <HashRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/management" element={<Management />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
        <BottomNav />
      </div>
    </HashRouter>
  );
}

export default App;
