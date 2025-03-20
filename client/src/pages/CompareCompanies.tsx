import React, { useState, useEffect } from 'react';
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
import axios from 'axios';

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
  const [companies, setCompanies] = useState<CompanyMetrics[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Configure axios defaults
  axios.defaults.baseURL = 'https://backend-production-2463.up.railway.app';

  // Function to fetch company data
  const fetchCompanyData = async (symbols: string[]) => {
    if (symbols.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/stock/company-comparison/${symbols.join(',')}/`);
      const data = response.data;
      
      const updatedCompanies = Object.entries(data).map(([symbol, companyData]: [string, any]) => ({
        symbol,
        companyName: companyData.companyName,
        price: companyData.price,
        change: companyData.change,
        changePercent: companyData.changePercent,
        marketCap: companyData.marketCap,
        peRatio: companyData.peRatio,
        revenue: companyData.revenue,
        revenueGrowth: companyData.revenueGrowth,
        employees: companyData.employees,
        profitMargin: companyData.profitMargin,
        dividendYield: companyData.dividendYield
      }));
      
      setCompanies(updatedCompanies);
    } catch (err) {
      console.error('Error fetching company data:', err);
      setError('Failed to load company data');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to search for companies
  const searchCompanies = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // For now, use a simple list of companies. In a real app, you'd call an API endpoint
      const mockResults = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META',
        'NVDA', 'TSLA', 'JPM', 'V', 'WMT'
      ].filter(symbol => symbol.toLowerCase().includes(query.toLowerCase()));
      
      setSearchResults(mockResults);
    } catch (err) {
      console.error('Error searching companies:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Effect to update data periodically
  useEffect(() => {
    const symbols = companies.map(company => company.symbol);
    if (symbols.length > 0) {
      fetchCompanyData(symbols);
      
      // Set up periodic refresh
      const intervalId = setInterval(() => {
        fetchCompanyData(symbols);
      }, 15000); // Refresh every 15 seconds
      
      return () => clearInterval(intervalId);
    }
  }, [companies.map(c => c.symbol).join(',')]);

  // Handle search input changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      searchCompanies(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleAddCompany = (symbol: string) => {
    if (companies.length >= 5) {
      setError('Maximum of 5 companies can be compared');
      return;
    }
    
    if (companies.some(company => company.symbol === symbol)) {
      setError('Company already added to comparison');
      return;
    }
    
    fetchCompanyData([...companies.map(c => c.symbol), symbol]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveCompany = (symbol: string) => {
    setCompanies(companies.filter(company => company.symbol !== symbol));
  };

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
    <div className={`min-h-screen pt-24 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <GitCompare className="w-8 h-8 mr-3 text-blue-500" />
            <h1 className="text-2xl font-bold">Compare Companies</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                const symbols = companies.map(company => company.symbol);
                if (symbols.length > 0) {
                  fetchCompanyData(symbols);
                }
              }}
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

        {/* Search and Company Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Search Box */}
          <div className={`p-4 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search companies..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                }`}
              />
              {searchResults.length > 0 && (
                <div className={`absolute z-10 w-full mt-1 rounded-lg shadow-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-white'
                }`}>
                  {searchResults.map((symbol) => (
                    <button
                      key={symbol}
                      onClick={() => handleAddCompany(symbol)}
                      className={`w-full px-4 py-2 text-left hover:bg-opacity-10 ${
                        isDarkMode
                          ? 'hover:bg-white text-gray-200'
                          : 'hover:bg-gray-900 text-gray-700'
                      }`}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Company Cards */}
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

        
          
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

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
        {companies.length > 0 ? (
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
        ) : (
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