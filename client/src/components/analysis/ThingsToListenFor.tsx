import React from 'react';
import { ThingToListenFor } from '../../types';

interface ThingsToListenForProps {
  items: ThingToListenFor[];
}

const ThingsToListenFor: React.FC<ThingsToListenForProps> = ({ items }) => {
  return (
    <div className="bg-white rounded-lg border p-6 mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Things to Listen For</h3>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-start space-x-4">
            <div className={`w-2 h-2 mt-2 rounded-full ${
              item.importance === 'high' ? 'bg-red-500' :
              item.importance === 'medium' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{item.topic}</h4>
                {item.mentioned && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                    Mentioned
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">{item.context}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThingsToListenFor; 