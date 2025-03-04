import React from 'react';
import { EarningsCall } from '../types';

interface CallListItemProps {
  call: EarningsCall;
  isSelected: boolean;
  onSelect: () => void;
}

const CallListItem: React.FC<CallListItemProps> = ({ call, isSelected, onSelect }) => {
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

  return (
    <button
      onClick={onSelect}
      className={`w-full px-4 py-3 flex flex-col text-left hover:bg-gray-50 ${
        isSelected ? 'bg-gray-50' : ''
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <span className="font-medium text-gray-900">{call.company}</span>
          <span className="ml-2 text-sm text-gray-500">({call.symbol})</span>
        </div>
        <span className={`px-2 py-0.5 text-xs rounded-full ${
          call.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
          call.status === 'ongoing' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {call.status}
        </span>
      </div>
      
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-gray-500">{formatDateTime(call.date, call.time)}</span>
        {call.actualEPS ? (
          <span className={`font-medium ${
            call.actualEPS > call.expectedEPS ? 'text-green-600' : 'text-red-600'
          }`}>
            EPS: {call.actualEPS} vs {call.expectedEPS}
          </span>
        ) : (
          <span className="text-gray-500">Est. EPS: {call.expectedEPS}</span>
        )}
      </div>
    </button>
  );
};

export default CallListItem; 