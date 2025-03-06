import React from 'react';
import { EarningsCall, StockData } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface CallListItemProps {
  call: EarningsCall;
  isSelected: boolean;
  onSelect: () => void;
  stockData?: StockData;
}

const CallListItem: React.FC<CallListItemProps> = ({ call, isSelected, onSelect, stockData }) => {
  const { isDarkMode } = useTheme();

  const formatDateTime = (date: string, time: string) => {
    // Ensure date is in YYYY-MM-DD format for proper parsing
    const callDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if date is valid
    if (isNaN(callDate.getTime())) {
      return `Invalid Date`;
    }
    
    // Format date
    let dateStr;
    if (callDate.toDateString() === today.toDateString()) {
      dateStr = 'Today';
    } else if (callDate.toDateString() === tomorrow.toDateString()) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = callDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      });
    }

    // Handle time formatting
    let timeStr = time;
    if (time.includes(':')) {
      // Convert 24h time to 12h format
      const [hours, minutes] = time.split(':');
      const timeDate = new Date(2024, 0, 1, parseInt(hours), parseInt(minutes));
      if (!isNaN(timeDate.getTime())) {
        timeStr = timeDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit'
        });
      }
    } else {
      // Handle special time codes like 'amc', 'bmo', 'dmh'
      if (time === 'amc') timeStr = 'After Market Close';
      else if (time === 'bmo') timeStr = 'Before Market Open';
      else if (time === 'dmh') timeStr = 'During Market Hours';
    }

    return `${dateStr} at ${timeStr}`;
  };

  const formatPrice = (price: number | null) => {
    return price !== null ? `$${price.toFixed(2)}` : '-';
  };

  const formatChange = (change: number | null, percentChange: number | null) => {
    if (change === null || percentChange === null) return '-';
    const sign = change >= 0 ? '+' : '';
    return `${sign}$${change.toFixed(2)} (${sign}${percentChange.toFixed(2)}%)`;
  };

  const getPriceChangeColor = (change: number | null) => {
    if (change === null) return isDarkMode ? 'text-gray-400' : 'text-gray-500';
    return change > 0 
      ? isDarkMode ? 'text-green-400' : 'text-green-600'
      : change < 0 
        ? isDarkMode ? 'text-red-400' : 'text-red-600'
        : isDarkMode ? 'text-gray-400' : 'text-gray-500';
  };

  const price = stockData?.price ?? null;
  const change = stockData?.change ?? null;
  const percentChange = stockData?.percentChange ?? null;

  return (
    <button
      onClick={onSelect}
      className={`w-full px-4 py-3 flex flex-col text-left transition-all duration-200 ease-in-out relative
        ${isDarkMode
          ? isSelected
            ? 'bg-gray-800/90 hover:bg-gray-800/95 border-l-4 border-l-gray-400'
            : 'hover:bg-gray-800'
          : isSelected
            ? 'bg-gray-100 hover:bg-gray-200 border-l-4 border-l-gray-400'
            : 'hover:bg-gray-50'
        }
        ${isSelected ? 'shadow-md' : ''}`}
    >
      <div className="flex justify-between items-start space-x-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className={`font-semibold truncate ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
              {call.company}
            </span>
            <span className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            } flex-shrink-0`}>
              ({call.symbol})
            </span>
          </div>
          <div className="flex items-center space-x-2 mt-0.5">
            <span className={`text-sm font-medium ${
              isDarkMode ? 'text-gray-200' : 'text-gray-900'
            }`}>
              {formatPrice(price)}
            </span>
            <span className={`text-xs ${getPriceChangeColor(change)}`}>
              {formatChange(change, percentChange)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {formatDateTime(call.date, call.time)}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              call.status === 'upcoming' 
                ? isDarkMode 
                  ? 'bg-blue-900/50 text-blue-200' 
                  : 'bg-blue-100 text-blue-800'
                : call.status === 'ongoing'
                  ? isDarkMode
                    ? 'bg-green-900/50 text-green-200'
                    : 'bg-green-100 text-green-800'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-200'
                    : 'bg-gray-100 text-gray-800'
            }`}>
              {call.status}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-1.5">
        {call.status === 'past' ? (
          <div className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
            isDarkMode
              ? 'bg-gray-800 text-gray-200 border-gray-700'
              : 'bg-gray-100 text-gray-700 border-gray-200'
          } border`}>
            {typeof call.actualEPS === 'number' && typeof call.expectedEPS === 'number' && 
             !isNaN(call.actualEPS) && !isNaN(call.expectedEPS) ? (
              <>
                Actual: ${call.actualEPS.toFixed(2)} vs Est: ${call.expectedEPS.toFixed(2)}
                <span className={`ml-1.5 ${
                  call.actualEPS > call.expectedEPS
                    ? isDarkMode ? 'text-green-400' : 'text-green-700'
                    : call.actualEPS < call.expectedEPS
                      ? isDarkMode ? 'text-red-400' : 'text-red-700'
                      : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  ({((call.actualEPS / call.expectedEPS - 1) * 100).toFixed(1)}%)
                </span>
              </>
            ) : (
              'EPS Data Not Available'
            )}
          </div>
        ) : (
          <div className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
            isDarkMode
              ? 'bg-blue-900/30 text-blue-200 border-blue-900'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          } border`}>
            {typeof call.expectedEPS === 'number' && !isNaN(call.expectedEPS)
              ? `Est. EPS: $${call.expectedEPS.toFixed(2)}`
              : 'Est. EPS Not Available'
            }
          </div>
        )}
      </div>
    </button>
  );
};

export default CallListItem; 