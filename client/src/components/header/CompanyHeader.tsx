import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface CompanyHeaderProps {
  company: string;
  currentPrice: number | null;
  priceChange: number | null;
  priceChangePercent: number | null;
  lastUpdate: number;
  isLoading: boolean;
}

const CompanyHeader: React.FC<CompanyHeaderProps> = ({
  company,
  currentPrice,
  priceChange,
  priceChangePercent,
  lastUpdate,
  isLoading
}) => {
  const { isDarkMode } = useTheme();

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

  const getPriceChangeIcon = (change: number | null) => {
    if (change === null) return <Minus className="w-5 h-5" />;
    return change > 0 
      ? <TrendingUp className="w-5 h-5" />
      : change < 0 
        ? <TrendingDown className="w-5 h-5" />
        : <Minus className="w-5 h-5" />;
  };

  return (
    <div className={`card p-6 backdrop-blur-sm bg-opacity-90 animate-fade-in border shadow-xl ${
      isDarkMode 
        ? 'bg-gray-800/50 border-gray-700 shadow-gray-900/50' 
        : 'bg-white/50 border-gray-200 shadow-gray-200/50'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="mb-4 md:mb-0">
          <h1 className={`text-2xl font-bold mb-1 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            {company || 'Select a Company'}
          </h1>
          <div className="flex items-center space-x-2">
            <Clock className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Last updated {formatDistanceToNow(new Date(lastUpdate * 1000), { addSuffix: true })}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse flex flex-col items-end">
            <div className={`h-8 rounded w-32 mb-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            <div className={`h-6 rounded w-24 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          </div>
        ) : (
          <div className="flex flex-col items-end">
            <div className={`text-3xl font-bold mb-1 ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
              {formatPrice(currentPrice)}
            </div>
            <div className={`flex items-center space-x-2 ${getPriceChangeColor(priceChange)}`}>
              {getPriceChangeIcon(priceChange)}
              <span className="text-lg font-medium">
                {formatChange(priceChange, priceChangePercent)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyHeader; 