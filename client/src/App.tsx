import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { CompanyProvider, useSelectedCompany } from './contexts/CompanyContext';
import { NotificationProvider } from './contexts/NotificationContext';
import MainHeader from './components/header/MainHeader';
import Dashboard from './pages/Dashboard';
import MarketInsights from './pages/MarketInsights';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Watchlist from './pages/Watchlist';
import CompareCompanies from './pages/CompareCompanies';
import { ChatBot } from './components/ChatBot';

const AppContent: React.FC = () => {
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [nextMarketOpen, setNextMarketOpen] = useState<number | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { selectedCompany } = useSelectedCompany();

  useEffect(() => {
    // Connect to WebSocket
    console.log('Attempting to connect to WebSocket...');
    const websocket = new WebSocket('wss://backend-production-2463.up.railway.app/ws/stock/');

    websocket.onopen = () => {
      console.log('WebSocket connection established');
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data);
      if (data.type === 'market_status') {
        console.log('Updating market status:', { isOpen: data.isOpen, nextOpen: data.nextOpen });
        setIsMarketOpen(data.isOpen);
        setNextMarketOpen(data.nextOpen);
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(websocket);

    return () => {
      console.log('Cleaning up WebSocket connection');
      websocket.close();
    };
  }, []);

  return (
    <Router>
      <div>
        <MainHeader 
          isMarketOpen={isMarketOpen}
          nextMarketOpen={nextMarketOpen}
        />
        <Routes>
          <Route path="/dashboard" element={
            <>
              <Dashboard />
              {selectedCompany && <ChatBot symbol={selectedCompany.symbol} />}
            </>
          } />
          <Route path="/market" element={<MarketInsights />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/compare" element={<CompareCompanies />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <CompanyProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </CompanyProvider>
    </ThemeProvider>
  );
};

export default App;