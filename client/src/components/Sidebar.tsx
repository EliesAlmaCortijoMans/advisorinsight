import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { EarningsCall, Company, StockData } from '../types';
import CallListItem from './CallListItem';
import { StockWebSocket } from '../services/stockWebSocket';
import { Search, Calendar, Radio, History } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  selectedCompany: Company | null;
  calls: EarningsCall[];
  onSelectCompany: (company: Company) => void;
  isLoading?: boolean;
  stockData: Record<string, StockData>;
}

type FilterType = 'all' | 'upcoming' | 'live' | 'past';

const FilterIcon = {
  all: Calendar,
  upcoming: Calendar,
  live: Radio,
  past: History
};

const Sidebar: React.FC<SidebarProps> = ({ 
  selectedCompany, 
  calls, 
  onSelectCompany, 
  isLoading = false,
  stockData
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { isDarkMode } = useTheme();

  // Memoize the data filtering logic
  const displayedCalls = useMemo(() => {
    // Sort the calls
    const sortedData = [...calls].sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      return dateCompare !== 0 ? dateCompare : a.time.localeCompare(b.time);
    });
    
    // Apply filters
    return sortedData.filter(call => {
      // Apply status filter
      const matchesFilter = 
        filter === 'all' ? true :
        filter === 'upcoming' ? call.status === 'upcoming' :
        filter === 'live' ? call.status === 'ongoing' :
        filter === 'past' ? call.status === 'past' : false;
      
      // Apply search filter
      const matchesSearch = searchTerm
        ? call.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          call.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      
      return matchesFilter && matchesSearch;
    });
  }, [filter, searchTerm, calls]);

  // Memoize filter change handler
  const handleFilterChange = useCallback((newFilter: FilterType) => {
    setFilter(newFilter);
  }, []);

  // Memoize search change handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const filterButtons: { type: FilterType; label: string }[] = [
    { type: 'all', label: 'All Calls' },
    { type: 'upcoming', label: 'Upcoming' },
    { type: 'live', label: 'Live' },
    { type: 'past', label: 'Past' }
  ];

  return (
    <div className={`w-80 flex flex-col h-full transition-colors duration-200 relative ${
      isDarkMode 
        ? 'bg-gray-900 border-r border-gray-700' 
        : 'bg-white border-r border-gray-200'
    }`}>
      {/* 3D Border Effect */}
      <div className={`absolute right-0 top-0 bottom-0 w-[1px] ${
        isDarkMode
          ? 'shadow-[2px_0_3px_rgba(0,0,0,0.3),inset_-1px_0_2px_rgba(255,255,255,0.1)]'
          : 'shadow-[2px_0_3px_rgba(0,0,0,0.1),inset_-1px_0_2px_rgba(255,255,255,0.5)]'
      }`} />
      
      <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>        
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
          Real-time earnings call analysis
        </p>
      </div>
      
      <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <div className="relative mb-4 group">
          <div className={`absolute inset-y-0 left-3 flex items-center pointer-events-none transition-colors duration-200 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} group-focus-within:text-indigo-500`}>
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search company or symbol..."
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm transition-all duration-200
              ${isDarkMode 
                ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-indigo-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500'
              } border focus:ring-2 focus:ring-indigo-500/20 focus:outline-none`}
            value={searchTerm}
            onChange={handleSearchChange}
            disabled={isLoading}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filterButtons.map(({ type, label }) => {
            const Icon = FilterIcon[type];
            return (
              <button 
                key={type}
                className={`flex items-center px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-200 ${
                  filter === type 
                    ? isDarkMode
                      ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/50'
                      : 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-500/50'
                    : isDarkMode
                      ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => handleFilterChange(type)}
                disabled={isLoading}
              >
                <Icon className="w-3 h-3 mr-1" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto ${isDarkMode ? 'bg-gray-900' : 'bg-white'} custom-scrollbar`}>
        {isLoading ? (
          <div className="p-8 flex flex-col items-center justify-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading earnings calls...</p>
          </div>
        ) : displayedCalls.length > 0 ? (
          <div className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
            {displayedCalls.map((call, index) => (
              <div 
                key={`${call.symbol}-${call.date}`}
                className="animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CallListItem
                  call={call}
                  isSelected={selectedCompany?.symbol === call.symbol}
                  onSelect={() => onSelectCompany({
                    symbol: call.symbol,
                    name: call.company,
                    status: call.status
                  })}
                  stockData={stockData[call.symbol]}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={`p-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No calls found {searchTerm && 'matching your search'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar; 