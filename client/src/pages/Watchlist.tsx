import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  Star,
  Search,
  TrendingUp,
  TrendingDown,
  Plus,
  Filter,
  ArrowUp,
  ArrowDown,
  Trash2,
  Bell,
  MoreVertical,
  Edit3,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface WatchlistItem {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  alerts: boolean;
}

const Watchlist: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof WatchlistItem>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock watchlist data
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([
    {
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      price: 173.45,
      change: 2.34,
      changePercent: 1.37,
      volume: 52436789,
      marketCap: 2800000000000,
      alerts: true
    },
    {
      symbol: 'MSFT',
      companyName: 'Microsoft Corporation',
      price: 378.92,
      change: -1.23,
      changePercent: -0.32,
      volume: 23456789,
      marketCap: 2500000000000,
      alerts: false
    },
    {
      symbol: 'GOOGL',
      companyName: 'Alphabet Inc.',
      price: 142.56,
      change: 0.89,
      changePercent: 0.63,
      volume: 15678901,
      marketCap: 1800000000000,
      alerts: true
    },
    {
      symbol: 'NVDA',
      companyName: 'NVIDIA Corporation',
      price: 789.23,
      change: 15.67,
      changePercent: 2.02,
      volume: 34567890,
      marketCap: 950000000000,
      alerts: false
    }
  ]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000000000) {
      return `$${(num / 1000000000000).toFixed(2)}T`;
    }
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(2)}B`;
    }
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    }
    return num.toLocaleString();
  };

  const handleSort = (field: keyof WatchlistItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedWatchlist = [...watchlist].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return sortDirection === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const filteredWatchlist = sortedWatchlist.filter(item =>
    item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleRemove = (symbol: string) => {
    setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
  };

  const handleToggleAlert = (symbol: string) => {
    setWatchlist(prev =>
      prev.map(item =>
        item.symbol === symbol
          ? { ...item, alerts: !item.alerts }
          : item
      )
    );
  };

  return (
    <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Star className="w-8 h-8 mr-3 text-yellow-500" />
            <h1 className="text-2xl font-bold">Watchlist</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-lg transition-colors duration-200
                ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              className={`px-4 py-2 rounded-lg flex items-center
                ${isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-blue-500 hover:bg-blue-400'
                } text-white transition-colors duration-200`}
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Symbol
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className={`flex-1 min-w-[300px] flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input
              type="text"
              placeholder="Search symbols or companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-transparent border-none focus:outline-none ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            />
          </div>
          <button
            className={`p-3 rounded-lg flex items-center
              ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'}
              shadow-lg transition-colors duration-200`}
          >
            <Filter className="w-5 h-5 mr-2" />
            Filter
          </button>
        </div>

        {/* Watchlist Table */}
        <div className={`rounded-xl shadow-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className="px-6 py-4 text-left">
                    <button
                      className="flex items-center font-semibold"
                      onClick={() => handleSort('symbol')}
                    >
                      Symbol
                      {sortField === 'symbol' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">Company</th>
                  <th className="px-6 py-4 text-right">
                    <button
                      className="flex items-center justify-end font-semibold ml-auto"
                      onClick={() => handleSort('price')}
                    >
                      Price
                      {sortField === 'price' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <button
                      className="flex items-center justify-end font-semibold ml-auto"
                      onClick={() => handleSort('changePercent')}
                    >
                      Change
                      {sortField === 'changePercent' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <button
                      className="flex items-center justify-end font-semibold ml-auto"
                      onClick={() => handleSort('volume')}
                    >
                      Volume
                      {sortField === 'volume' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <button
                      className="flex items-center justify-end font-semibold ml-auto"
                      onClick={() => handleSort('marketCap')}
                    >
                      Market Cap
                      {sortField === 'marketCap' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredWatchlist.map((item) => (
                  <tr
                    key={item.symbol}
                    className={`
                      ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}
                      transition-colors duration-150
                    `}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 mr-2" />
                        <span className="font-medium">{item.symbol}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{item.companyName}</td>
                    <td className="px-6 py-4 text-right font-medium">
                      ${item.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`flex items-center justify-end font-medium
                        ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}
                      >
                        {item.change >= 0 ? (
                          <TrendingUp className="w-4 h-4 mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 mr-1" />
                        )}
                        {item.change > 0 ? '+' : ''}{item.change.toFixed(2)} ({item.changePercent.toFixed(2)}%)
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {formatNumber(item.volume)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {formatNumber(item.marketCap)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleToggleAlert(item.symbol)}
                          className={`p-2 rounded-lg transition-colors duration-200
                            ${isDarkMode
                              ? item.alerts ? 'text-blue-400' : 'text-gray-400 hover:text-blue-400'
                              : item.alerts ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'
                            }`}
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                        <button
                          className={`p-2 rounded-lg transition-colors duration-200
                            ${isDarkMode
                              ? 'text-gray-400 hover:text-yellow-400'
                              : 'text-gray-500 hover:text-yellow-500'
                            }`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(item.symbol)}
                          className={`p-2 rounded-lg transition-colors duration-200
                            ${isDarkMode
                              ? 'text-gray-400 hover:text-red-400'
                              : 'text-gray-500 hover:text-red-500'
                            }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredWatchlist.length === 0 && (
          <div className={`mt-8 p-8 rounded-xl text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-xl font-semibold mb-2">No stocks found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery
                ? 'No stocks match your search criteria'
                : 'Add some stocks to your watchlist to get started'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Watchlist; 