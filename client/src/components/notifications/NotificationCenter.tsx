import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications, Notification } from '../../contexts/NotificationContext';
import {
  Bell,
  X,
  Check,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Trash2
} from 'lucide-react';

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRead, onRemove }) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div
      className={`p-4 ${!notification.read ? 'bg-opacity-50' : ''} ${
        isDarkMode
          ? notification.read ? 'bg-gray-800' : 'bg-gray-700'
          : notification.read ? 'bg-white' : 'bg-blue-50'
      } rounded-lg cursor-pointer transition-colors duration-200`}
      onClick={handleClick}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <p className="font-medium">{notification.title}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(notification.id);
              }}
              className={`p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600
                transition-colors duration-200`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {notification.message}
          </p>
          <div className="flex items-center mt-2 text-xs text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            {getTimeAgo(notification.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationCenter: React.FC = () => {
  const { isDarkMode } = useTheme();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    { id: 'market', label: 'Market' },
    { id: 'earnings', label: 'Earnings' },
    { id: 'watchlist', label: 'Watchlist' },
    { id: 'ai', label: 'AI Insights' },
    { id: 'system', label: 'System' }
  ];

  const filteredNotifications = selectedCategory
    ? notifications.filter(n => n.category === selectedCategory)
    : notifications;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700
          transition-colors duration-200"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2
            bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-96 max-h-[80vh] overflow-hidden rounded-xl shadow-lg
            ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
        >
          {/* Header */}
          <div className="p-4 border-b dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={markAllAsRead}
                  className={`p-2 rounded-lg ${
                    isDarkMode
                      ? 'hover:bg-gray-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={clearAllNotifications}
                  className={`p-2 rounded-lg ${
                    isDarkMode
                      ? 'hover:bg-gray-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap
                  ${!selectedCategory
                    ? isDarkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap
                    ${selectedCategory === category.id
                      ? isDarkMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : isDarkMode
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[60vh]">
            <div className="p-4 space-y-4">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={markAsRead}
                    onRemove={removeNotification}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter; 