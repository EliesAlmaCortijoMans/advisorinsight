import React, { useState } from 'react';
import { EarningsCall } from '../types';
import CallListItem from './CallListItem';

interface SidebarProps {
  selectedCompany: string;
  calls: EarningsCall[];
  onSelectCompany: (company: string) => void;
}

type FilterType = 'all' | 'upcoming' | 'live';

const Sidebar: React.FC<SidebarProps> = ({ selectedCompany, calls, onSelectCompany }) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const sortedCalls = [...calls].sort((a, b) => {
    // First sort by date
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    
    // If same date, sort by time
    return a.time.localeCompare(b.time);
  });

  const filteredCalls = sortedCalls.filter(call => {
    // First apply status filter
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'upcoming' ? call.status === 'upcoming' :
      filter === 'live' ? call.status === 'ongoing' : true;

    // Then apply search filter if there's a search term
    const matchesSearch = searchTerm
      ? call.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="w-80 border-r border-gray-200 bg-white">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Earnings Call Advisor</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time earnings call analysis</p>
      </div>
      
      <div className="p-4">
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search company or symbol..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex space-x-2 mb-4">
          <button 
            className={`px-3 py-1 text-xs rounded-full ${
              filter === 'all' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setFilter('all')}
          >
            All Calls
          </button>
          <button 
            className={`px-3 py-1 text-xs rounded-full ${
              filter === 'upcoming' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </button>
          <button 
            className={`px-3 py-1 text-xs rounded-full ${
              filter === 'live' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setFilter('live')}
          >
            Live
          </button>
        </div>
      </div>

      <div className="overflow-y-auto">
        {filteredCalls.length > 0 ? (
          filteredCalls.map(call => (
            <CallListItem
              key={call.symbol}
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