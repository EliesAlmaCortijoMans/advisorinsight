import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  GitCompare,
  Search,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  BarChart2,
  Activity,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Download
} from 'lucide-react';

interface CompanyMetrics {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  peRatio: number;
  revenue: number;
  revenueGrowth: number;
  employees: number;
  profitMargin: number;
  dividendYield: number;
}

const CompareCompanies: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['price', 'marketCap', 'peRatio']);

  // Mock company data
  const [companies, setCompanies] = useState<CompanyMetrics[]>([
    {
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      price: 173.45,
      change: 2.34,
      changePercent: 1.37,
      marketCap: 2800000000000,
      peRatio: 28.5,
      revenue: 394328000000,
      revenueGrowth: 7.8,
      employees: 164000,
      profitMargin: 25.3,
      dividendYield: 0.5
    },
    {
      symbol: 'MSFT',
      companyName: 'Microsoft Corporation',
      price: 378.92,
      change: -1.23,
      changePercent: -0.32,
      marketCap: 2500000000000,
      peRatio: 32.1,
      revenue: 211915000000,
      revenueGrowth: 18.2,
      employees: 221000,
      profitMargin: 37.1,
      dividendYield: 0.8
    }
  ]);

  const formatNumber = (num: number, type: string = ''): string => {
    if (type === 'percent') {
      return `${num.toFixed(2)}%`;
    }
    if (type === 'currency') {
      if (num >= 1000000000000) {
        return `$${(num / 1000000000000).toFixed(2)}T`;
      }
      if (num >= 1000000000) {
        return `$${(num / 1000000000).toFixed(2)}B`;
      }
      if (num >= 1000000) {
        return `$${(num / 1000000).toFixed(2)}M`;
      }
      return `$${num.toLocaleString()}`;
    }
    return num.toLocaleString();
  };

  const handleAddCompany = () => {
    // Mock adding a new company
    const newCompany: CompanyMetrics = {
      symbol: 'GOOGL',
      companyName: 'Alphabet Inc.',
      price: 142.56,
      change: 0.89,
      changePercent: 0.63,
      marketCap: 1800000000000,
      peRatio: 25.7,
      revenue: 282836000000,
      revenueGrowth: 9.5,
      employees: 156000,
      profitMargin: 26.1,
      dividendYield: 0
    };
    setCompanies([...companies, newCompany]);
  };

  const handleRemoveCompany = (symbol: string) => {
    setCompanies(companies.filter(company => company.symbol !== symbol));
  };

  const metrics = [
    { key: 'price', label: 'Stock Price', type: 'currency' },
    { key: 'marketCap', label: 'Market Cap', type: 'currency' },
    { key: 'peRatio', label: 'P/E Ratio', type: 'number' },
    { key: 'revenue', label: 'Revenue', type: 'currency' },
    { key: 'revenueGrowth', label: 'Revenue Growth', type: 'percent' },
    { key: 'profitMargin', label: 'Profit Margin', type: 'percent' },
    { key: 'dividendYield', label: 'Dividend Yield', type: 'percent' },
    { key: 'employees', label: 'Employees', type: 'number' }
  ];

  return (
    <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <GitCompare className="w-8 h-8 mr-3 text-blue-500" />
            <h1 className="text-2xl font-bold">Compare Companies</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsLoading(prev => !prev)}
              className={`p-2 rounded-lg transition-colors duration-200
                ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              className={`px-4 py-2 rounded-lg flex items-center
                ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'}
                shadow-lg transition-colors duration-200`}
            >
              <Download className="w-5 h-5 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Company Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {companies.map((company) => (
            <div
              key={company.symbol}
              className={`p-4 rounded-xl shadow-lg
                ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">{company.symbol}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{company.companyName}</p>
                </div>
                <button
                  onClick={() => handleRemoveCompany(company.symbol)}
                  className={`p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700
                    transition-colors duration-200`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">${company.price.toFixed(2)}</span>
                <div className={`flex items-center ${
                  company.change >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {company.change >= 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  <span>{company.change > 0 ? '+' : ''}{company.changePercent.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          ))}

          {/* Add Company Card */}
          <button
            onClick={handleAddCompany}
            className={`p-4 rounded-xl shadow-lg border-2 border-dashed
              ${isDarkMode
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                : 'bg-white border-gray-200 hover:border-gray-300'
              } transition-colors duration-200`}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <Plus className="w-6 h-6 mb-2 text-gray-400" />
              <span className="text-gray-500">Add Company</span>
            </div>
          </button>
        </div>

        {/* Metrics Selection */}
        <div className={`p-4 rounded-xl shadow-lg mb-8 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart2 className="w-5 h-5 mr-2" />
            Select Metrics to Compare
          </h2>
          <div className="flex flex-wrap gap-3">
            {metrics.map((metric) => (
              <button
                key={metric.key}
                onClick={() => setSelectedMetrics(prev =>
                  prev.includes(metric.key)
                    ? prev.filter(m => m !== metric.key)
                    : [...prev, metric.key]
                )}
                className={`px-3 py-1 rounded-lg text-sm transition-colors duration-200
                  ${selectedMetrics.includes(metric.key)
                    ? isDarkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comparison Table */}
        {companies.length > 0 && (
          <div className={`rounded-xl shadow-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className="px-6 py-4 text-left">Metric</th>
                    {companies.map(company => (
                      <th key={company.symbol} className="px-6 py-4 text-right">{company.symbol}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {metrics
                    .filter(metric => selectedMetrics.includes(metric.key))
                    .map(metric => (
                      <tr
                        key={metric.key}
                        className={`
                          ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}
                          transition-colors duration-150
                        `}
                      >
                        <td className="px-6 py-4 font-medium">{metric.label}</td>
                        {companies.map(company => (
                          <td key={`${company.symbol}-${metric.key}`} className="px-6 py-4 text-right">
                            {formatNumber(company[metric.key as keyof CompanyMetrics], metric.type)}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {companies.length === 0 && (
          <div className={`mt-8 p-8 rounded-xl text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-xl font-semibold mb-2">No companies to compare</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Add companies to start comparing their metrics
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompareCompanies; 