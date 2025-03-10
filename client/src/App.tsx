import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { NotificationProvider } from './contexts/NotificationContext';
import MainHeader from './components/header/MainHeader';
import Dashboard from './pages/Dashboard';
import MarketInsights from './pages/MarketInsights';
import AIAnalysis from './pages/AIAnalysis';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Watchlist from './pages/Watchlist';
import CompareCompanies from './pages/CompareCompanies';

const App: React.FC = () => {
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [nextMarketOpen, setNextMarketOpen] = useState<number | null>(null);

  return (
    <ThemeProvider>
      <CompanyProvider>
        <NotificationProvider>
          <Router>
            <div>
              <MainHeader 
                isMarketOpen={isMarketOpen}
                nextMarketOpen={nextMarketOpen}
              />
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/market" element={<MarketInsights />} />
                <Route path="/analysis" element={<AIAnalysis />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/help" element={<Help />} />
                <Route path="/watchlist" element={<Watchlist />} />
                <Route path="/compare" element={<CompareCompanies />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </Router>
        </NotificationProvider>
      </CompanyProvider>
    </ThemeProvider>
  );
};

export default App;