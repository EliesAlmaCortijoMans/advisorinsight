import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { EarningsCall } from '../types';
import CallListItem from './CallListItem';

interface SidebarProps {
  selectedCompany: string;
  calls: EarningsCall[];
  pastCalls?: EarningsCall[];
  onSelectCompany: (company: string) => void;
  isLoading?: boolean;
}

type FilterType = 'all' | 'upcoming' | 'live' | 'past';

const Sidebar: React.FC<SidebarProps> = ({ selectedCompany, calls, pastCalls = [], onSelectCompany, isLoading = false }) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Memoize the data filtering logic
  const displayedCalls = useMemo(() => {
    // Determine which data source to use
    let dataToFilter: EarningsCall[] = filter === 'past'
      ? [...pastCalls, ...calls.filter(call => call.status === 'past')]
      : [...calls];
    
    // Sort the calls
    const sortedData = dataToFilter.sort((a, b) => {
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
  }, [filter, searchTerm, calls, pastCalls]);

  // Memoize filter change handler
  const handleFilterChange = useCallback((newFilter: FilterType) => {
    setFilter(newFilter);
  }, []);

  // Memoize search change handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  return (
    <div className="w-80 border-r border-gray-200 bg-white">
      <div className="p-4 border-b border-gray-200">        
        <p className="text-sm text-gray-500 mt-1">Real-time earnings call analysis</p>
      </div>
      
      <div className="p-4">
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search company or symbol..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={searchTerm}
            onChange={handleSearchChange}
            disabled={isLoading}
          />
        </div>

        <div className="flex space-x-2 mb-4">
          <button 
            className={`px-3 py-1 text-xs rounded-full ${
              filter === 'all' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => handleFilterChange('all')}
            disabled={isLoading}
          >
            All Calls
          </button>
          <button 
            className={`px-3 py-1 text-xs rounded-full ${
              filter === 'upcoming' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => handleFilterChange('upcoming')}
            disabled={isLoading}
          >
            Upcoming
          </button>
          <button 
            className={`px-3 py-1 text-xs rounded-full ${
              filter === 'live' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => handleFilterChange('live')}
            disabled={isLoading}
          >
            Live
          </button>
          <button 
            className={`px-3 py-1 text-xs rounded-full ${
              filter === 'past' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => handleFilterChange('past')}
            disabled={isLoading}
          >
            Past
          </button>
        </div>
      </div>

      <div className="overflow-y-auto">
        {isLoading ? (
          <div className="p-4 flex flex-col items-center justify-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-sm text-gray-500">Loading earnings calls...</p>
          </div>
        ) : displayedCalls.length > 0 ? (
          displayedCalls.map(call => (
            <CallListItem
              key={`${call.symbol}-${call.date}`}
              call={call}
              isSelected={selectedCompany === call.company}
              onSelect={() => onSelectCompany(call.company)}
            />
          ))
        ) : (
          <div className="p-4 text-center text-gray-500">
            No calls found {searchTerm && 'matching your search'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar; 