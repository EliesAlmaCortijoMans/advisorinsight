import React from 'react';
import { formatDistanceToNow } from 'date-fns';

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
  const formatPrice = (price: number | null) => {
    return price !== null ? `$${price.toFixed(2)}` : '-';
  };

  const formatChange = (change: number | null, percentChange: number | null) => {
    if (change === null || percentChange === null) return '-';
    const sign = change >= 0 ? '+' : '';
    return `${sign}$${change.toFixed(2)} (${sign}${percentChange.toFixed(2)}%)`;
  };

  const getPriceChangeColor = (change: number | null) => {
    if (change === null) return 'text-gray-500';
    return change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-gray-500';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{company || 'Select a Company'}</h1>
      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
        </div>
      ) : (
        <div className="flex items-center space-x-4">
          <span className="text-xl">{formatPrice(currentPrice)}</span>
          <span className={`${getPriceChangeColor(priceChange)}`}>
            {formatChange(priceChange, priceChangePercent)}
          </span>
        </div>
      )}
    </div>
  );
};

export default CompanyHeader; 