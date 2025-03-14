import React, { useState } from 'react';
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
  LogIn,
  Menu
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const mainNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" />, path: '/dashboard' },
    { id: 'market', label: 'Market Insights', icon: <LineChart className="w-4 h-4" />, path: '/market' },
    { id: 'analysis', label: 'AI Analysis', icon: <Brain className="w-4 h-4" />, path: '/analysis' },
    { id: 'compare', label: 'Compare', icon: <GitCompare className="w-4 h-4" />, path: '/compare' },
  ];

  const menuItems: NavItem[] = [
    { id: 'watchlist', label: 'Watchlist', icon: <List className="w-4 h-4" />, path: '/watchlist' },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, path: '/settings' },
    { id: 'help', label: 'Help', icon: <HelpCircle className="w-4 h-4" />, path: '/help' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 ${
      isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
    } border-b backdrop-blur-sm bg-opacity-80`}>
      <div className="h-16 px-4 flex items-center justify-between">
        {/* Logo and Market Status */}
        <div className="flex items-center space-x-4">
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
              ADVISOR INSIGHT
            </span>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${
            isMarketOpen 
              ? (isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700')
              : (isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700')
          }`}>
            {isMarketOpen ? 'Market Open' : 'Market Closed'}
          </div>
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

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`px-3 py-2 rounded-lg transition-all duration-200 flex items-center ${
                isMenuOpen
                  ? isDarkMode
                    ? 'bg-gray-800 text-indigo-300'
                    : 'bg-gray-100 text-indigo-700'
                  : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-800'
                    : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Menu className="w-5 h-5" />
              <span className="ml-2 text-sm font-medium">Menu</span>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 ${
                isDarkMode
                  ? 'bg-gray-800 border border-gray-700'
                  : 'bg-white border border-gray-200'
              }`}>
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => item.path && handleNavigation(item.path)}
                    className={`w-full flex items-center px-4 py-2 text-sm ${
                      isActive(item.path || '')
                        ? isDarkMode
                          ? 'bg-indigo-900/50 text-indigo-300'
                          : 'bg-indigo-50 text-indigo-700'
                        : isDarkMode
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    <span className="ml-2">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification Center with brighter colors */}
          <div className={`p-2 rounded-lg transition-all duration-200 ${
            isDarkMode
              ? 'text-indigo-300 hover:bg-gray-800 hover:text-indigo-200'
              : 'text-gray-600 hover:bg-gray-100'
          }`}>
            <NotificationCenter />
          </div>

          {/* Theme Toggle */}
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

          {/* Login Button */}
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