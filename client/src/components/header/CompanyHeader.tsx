import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface CompanyHeaderProps {
  company: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  lastUpdate: number;
}

const CompanyHeader: React.FC<CompanyHeaderProps> = ({
  company,
  currentPrice,
  priceChange,
  priceChangePercent,
  lastUpdate
}) => {
  const [isFlashing, setIsFlashing] = useState(false);

  // Flash effect when price updates
  useEffect(() => {
    if (currentPrice > 0) {  // Only flash when we have a valid price
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [currentPrice]);  // React to price changes

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900">{company}</h2>
      <div className={`mt-2 flex items-baseline transition-colors duration-300 ${
        isFlashing ? 'bg-blue-50' : ''
      }`}>
        <span className="text-3xl font-bold">${currentPrice.toFixed(2)}</span>
        <span className={`ml-2 flex items-center ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {priceChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {Math.abs(priceChangePercent).toFixed(2)}%
        </span>
        <span className="ml-2 text-xs text-gray-500">
          {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default CompanyHeader; 