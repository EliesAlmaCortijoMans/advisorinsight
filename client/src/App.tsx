import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import MainHeader from './components/header/MainHeader';
import Dashboard from './pages/Dashboard';

const App: React.FC = () => {
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [nextMarketOpen, setNextMarketOpen] = useState<number | null>(null);

  return (
    <ThemeProvider>
      <Router>
        <div>
          <MainHeader 
            isMarketOpen={isMarketOpen}
            nextMarketOpen={nextMarketOpen}
          />
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;