import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  Home, 
  LineChart, 
  Brain, 
  Settings, 
  HelpCircle, 
  List, 
  GitCompare, 
  Moon,
  Sun,
  LogIn
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import NotificationCenter from '../notifications/NotificationCenter';

interface MainHeaderProps {
  isMarketOpen: boolean;
  nextMarketOpen: number | null;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  isOptional?: boolean;
}

const MainHeader: React.FC<MainHeaderProps> = ({ isMarketOpen, nextMarketOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useTheme();

  const mainNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" />, path: '/dashboard' },
    { id: 'market', label: 'Market Insights', icon: <LineChart className="w-4 h-4" />, path: '/market' },
    { id: 'analysis', label: 'AI Analysis', icon: <Brain className="w-4 h-4" />, path: '/analysis' },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, path: '/settings' },
    { id: 'help', label: 'Help', icon: <HelpCircle className="w-4 h-4" />, path: '/help' },
  ];

  const optionalNavItems: NavItem[] = [
    { id: 'watchlist', label: 'Watchlist', icon: <List className="w-4 h-4" />, path: '/watchlist', isOptional: true },
    { id: 'compare', label: 'Compare', icon: <GitCompare className="w-4 h-4" />, path: '/compare', isOptional: true }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className={`${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-b transition-colors duration-200 ease-in-out sticky top-0 z-50 backdrop-blur-sm bg-opacity-90`}>
      <div className="flex w-full items-center h-16 px-4 md:px-6">
        {/* Logo and Title - Left edge */}
        <div className="flex items-center">
          <img 
            src="/images/logo.jpg" 
            alt="Logo" 
            className="h-8 w-auto rounded-md shadow-sm transition-transform duration-200 hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://via.placeholder.com/32';
            }}
          />
          <span className={`ml-3 text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-200`}>
            Earning Call Advisor
          </span>
        </div>

        {/* Market Status - Between Title and Navigation */}
        <div className="ml-6 mr-4">
          {isMarketOpen ? (
            <span className="px-3 py-1.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-full text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md">
              Market Open
            </span>
          ) : nextMarketOpen ? (
            <span className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded-full text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md">
              Opens {formatDistanceToNow(new Date(nextMarketOpen * 1000), { addSuffix: true })}
            </span>
          ) : (
            <span className="px-3 py-1.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-full text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md">
              Market Closed
            </span>
          )}
        </div>

        {/* Main Navigation - Centered */}
        <div className="flex-1">
          <nav className="flex justify-center space-x-1 md:space-x-2">
            {mainNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => item.path && handleNavigation(item.path)}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(item.path || '')
                    ? isDarkMode 
                      ? 'bg-indigo-900/50 text-indigo-300 shadow-lg shadow-indigo-900/20'
                      : 'bg-indigo-100 text-indigo-700 shadow-md'
                    : isDarkMode
                      ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Optional Navigation and Actions - Right edge */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {optionalNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.path && handleNavigation(item.path)}
              className={`flex items-center p-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive(item.path || '')
                  ? isDarkMode 
                    ? 'bg-indigo-900/50 text-indigo-300 shadow-lg shadow-indigo-900/20'
                    : 'bg-indigo-100 text-indigo-700 shadow-md'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.icon}
            </button>
          ))}

          <NotificationCenter />

          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isDarkMode
                ? 'text-yellow-300 hover:bg-gray-800'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            aria-label="Toggle theme"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 hover:rotate-90 transition-transform duration-500" />
            ) : (
              <Moon className="w-5 h-5 hover:-rotate-90 transition-transform duration-500" />
            )}
          </button>

          <button className={`
            flex items-center px-4 py-2 rounded-lg font-medium
            transition-all duration-200 transform hover:scale-105
            ${isDarkMode
              ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/50'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
            }
          `}>
            <LogIn className="w-4 h-4 mr-2" />
            <span className="hidden md:inline">Login</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default MainHeader;