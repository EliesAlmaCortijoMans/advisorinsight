import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Home, 
  PhoneCall, 
  LineChart, 
  Brain, 
  Settings, 
  HelpCircle, 
  List, 
  GitCompare, 
  Bell,
  Moon,
  Sun,
  LogIn
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  isOptional?: boolean;
}

interface MainHeaderProps {
  isMarketOpen: boolean;
  nextMarketOpen: number | null;
}

const MainHeader: React.FC<MainHeaderProps> = ({ isMarketOpen, nextMarketOpen }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const mainNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" /> },
    { id: 'earnings', label: 'Earnings Calls', icon: <PhoneCall className="w-4 h-4" /> },
    { id: 'market', label: 'Market Insights', icon: <LineChart className="w-4 h-4" /> },
    { id: 'analysis', label: 'AI Analysis', icon: <Brain className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'help', label: 'Help', icon: <HelpCircle className="w-4 h-4" /> },
  ];

  const optionalNavItems: NavItem[] = [
    { id: 'watchlist', label: 'Watchlist', icon: <List className="w-4 h-4" />, isOptional: true },
    { id: 'compare', label: 'Compare', icon: <GitCompare className="w-4 h-4" />, isOptional: true },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, isOptional: true },
  ];

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex w-full items-center h-16">
        {/* Logo and Title - Left edge */}
        <div className="flex items-center pl-6">
          <img 
            src="/images/logo.jpg" 
            alt="Logo" 
            className="h-8 w-auto"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://via.placeholder.com/32';
            }}
          />
          <span className="ml-3 text-xl font-semibold text-gray-900">Earning Call Advisor</span>
        </div>

        {/* Market Status - Between Title and Navigation */}
        <div className="ml-6 mr-4">
          {isMarketOpen ? (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Market Open
            </span>
          ) : nextMarketOpen ? (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              Opens {formatDistanceToNow(new Date(nextMarketOpen * 1000), { addSuffix: true })}
            </span>
          ) : (
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              Market Closed
            </span>
          )}
        </div>

        {/* Main Navigation - Centered */}
        <div className="flex-1">
          <nav className="flex justify-center space-x-4">
            {mainNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === item.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Optional Navigation and Login - Right edge */}
        <div className="flex items-center space-x-4 pr-6">
          {optionalNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center p-2 rounded-md text-sm font-medium ${
                activeTab === item.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.icon}
            </button>
          ))}

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            <LogIn className="w-4 h-4 mr-2" />
            Login
          </button>
        </div>
      </div>
    </header>
  );
};

export default MainHeader; 