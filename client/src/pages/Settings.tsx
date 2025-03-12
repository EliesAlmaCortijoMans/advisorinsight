import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  Settings as SettingsIcon,
  Bell,
  Moon,
  Sun,
  Globe,
  Lock,
  Mail,
  User,
  Key,
  Save,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const Settings: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([
    {
      id: 'earnings',
      label: 'Earnings Alerts',
      description: 'Get notified about upcoming earnings calls and reports',
      enabled: true
    },
    {
      id: 'market',
      label: 'Market Updates',
      description: 'Receive important market updates and news',
      enabled: true
    },
    {
      id: 'ai',
      label: 'AI Insights',
      description: 'Get AI-powered insights and recommendations',
      enabled: true
    },
    {
      id: 'price',
      label: 'Price Alerts',
      description: 'Notifications for significant price movements',
      enabled: false
    }
  ]);

  // API Configuration state
  const [apiConfig, setApiConfig] = useState({
    finnhubKey: '',
    alphaVantageKey: '',
    openAIKey: ''
  });

  // Display preferences state
  const [displayPreferences, setDisplayPreferences] = useState({
    compactView: false,
    showVolume: true,
    showMarketCap: true,
    show24hChange: true
  });

  const handleNotificationToggle = (id: string) => {
    setNotificationSettings(prev =>
      prev.map(setting =>
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
  };

  const handleSaveSettings = () => {
    setIsLoading(true);
    // Simulate saving settings
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className={`min-h-screen pt-24 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold flex items-center">
              <SettingsIcon className="w-6 h-6 mr-2" />
              Settings
            </h1>
            <button
              onClick={handleSaveSettings}
              className={`px-4 py-2 rounded-lg flex items-center
                ${isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-blue-500 hover:bg-blue-400'
                } text-white transition-colors duration-200`}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              Save Changes
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Theme & Display Settings */}
            <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <Moon className="w-5 h-5 mr-2" />
                Display Settings
              </h2>
              <div className="space-y-6">
                {/* Theme Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dark Mode</p>
                    <p className="text-sm text-gray-500">Toggle dark/light theme</p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={`p-2 rounded-lg transition-colors duration-200
                      ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  >
                    {isDarkMode ? (
                      <Moon className="w-5 h-5 text-blue-400" />
                    ) : (
                      <Sun className="w-5 h-5 text-yellow-500" />
                    )}
                  </button>
                </div>

                {/* Display Preferences */}
                {Object.entries(displayPreferences).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</p>
                      <p className="text-sm text-gray-500">Toggle visibility</p>
                    </div>
                    <button
                      onClick={() => setDisplayPreferences(prev => ({ ...prev, [key]: !value }))}
                      className={`p-2 rounded-lg transition-colors duration-200
                        ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                    >
                      {value ? (
                        <ToggleRight className="w-5 h-5 text-blue-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notification Settings */}
            <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notification Settings
              </h2>
              <div className="space-y-6">
                {notificationSettings.map(setting => (
                  <div key={setting.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{setting.label}</p>
                      <p className="text-sm text-gray-500">{setting.description}</p>
                    </div>
                    <button
                      onClick={() => handleNotificationToggle(setting.id)}
                      className={`p-2 rounded-lg transition-colors duration-200
                        ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                    >
                      {setting.enabled ? (
                        <ToggleRight className="w-5 h-5 text-blue-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* API Configuration */}
            <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <Key className="w-5 h-5 mr-2" />
                API Configuration
              </h2>
              <div className="space-y-4">
                {Object.entries(apiConfig).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <label className="block font-medium">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </label>
                    <input
                      type="password"
                      value={value}
                      onChange={(e) => setApiConfig(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={`Enter your ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} here`}
                      className={`w-full p-2 rounded-lg border ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600'
                          : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                ))}
                <p className="text-sm text-gray-500 flex items-center mt-4">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  API keys are stored securely and never shared
                </p>
              </div>
            </div>

            {/* Time Zone Settings */}
            <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Time & Region
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block font-medium mb-2">Time Zone</label>
                  <select
                    className={`w-full p-2 rounded-lg border ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="EST">EST (Eastern Standard Time)</option>
                    <option value="PST">PST (Pacific Standard Time)</option>
                    <option value="GMT">GMT (Greenwich Mean Time)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-2">Market Region</label>
                  <select
                    className={`w-full p-2 rounded-lg border ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="US">United States</option>
                    <option value="EU">Europe</option>
                    <option value="ASIA">Asia</option>
                    <option value="GLOBAL">Global</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 