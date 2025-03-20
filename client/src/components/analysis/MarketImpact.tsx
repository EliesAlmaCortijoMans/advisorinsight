import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Bar, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useSelectedCompany } from '../../contexts/CompanyContext';

interface MarketImpactData {
  intraday_range: {
    high: number;
    low: number;
    spread_percent: number;
  };
  volume: {
    total: number;
    unit: string;
  };
  time_range: {
    from: string;
    to: string;
  };
  candlestick_data: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

interface MediumTermData {
  analyst_ratings: {
    buy: number;
    hold: number;
    sell: number;
    price_target: number;
    price_target_high: number;
    price_target_low: number;
  };
  sector_comparison: {
    peer_companies: string[];
    relative_performance: number;
    sector_avg_performance: number;
    stock_performance: number;
    sector_rank: number;
    total_peers: number;
    beta: number;
    peer_performance: Record<string, {
      change_percent: number;
      current_price: number;
      change: number;
    }>;
  };
}

interface LongTermData {
  year: number;
  quarters: Array<{
    quarter: string;
    eps: number | null;
    revenue: number | null;
  }>;
}

const MarketImpact: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'short' | 'medium' | 'long'>('short');
  const [marketData, setMarketData] = useState<MarketImpactData | null>(null);
  const [mediumTermData, setMediumTermData] = useState<MediumTermData | null>(null);
  const [longTermData, setLongTermData] = useState<LongTermData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDarkMode } = useTheme();
  const { selectedCompany } = useSelectedCompany();

  // Format large numbers for display
  const formatValue = (value: number | null): string => {
    if (value === null) return 'No Data';
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    return value.toFixed(2);
  };

  useEffect(() => {
    const fetchMarketImpact = async () => {
      if (!selectedCompany?.symbol) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        if (timeframe === 'short') {
          const response = await fetch(`http://backend-production-2463.up.railway.app/api/stock/market-impact/${selectedCompany.symbol}/`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch market impact data');
          }
          const data = await response.json();
          setMarketData(data);
        } else if (timeframe === 'medium') {
          const response = await fetch(`http://backend-production-2463.up.railway.app/api/stock/market-impact/medium-term/${selectedCompany.symbol}/`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch medium-term data');
          }
          const data = await response.json();
          setMediumTermData(data);
        } else if (timeframe === 'long') {
          const response = await fetch(`http://backend-production-2463.up.railway.app/api/stock/market-impact/long-term/${selectedCompany.symbol}/`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch long-term data');
          }
          const data = await response.json();
          setLongTermData(data);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load market impact data';
        setError(errorMessage);
        console.error('Error fetching market impact data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketImpact();
  }, [selectedCompany?.symbol, timeframe]);

  const renderAnalystRatings = () => {
    if (!mediumTermData?.analyst_ratings) return null;

    const { buy, hold, sell, price_target, price_target_high, price_target_low } = mediumTermData.analyst_ratings;
    const total = buy + hold + sell;
    
    const pieData = [
      { name: 'Buy', value: buy, color: '#22c55e' },
      { name: 'Hold', value: hold, color: '#eab308' },
      { name: 'Sell', value: sell, color: '#ef4444' },
    ];

    return (
      <div className={`rounded-lg border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <h4 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
          Analyst Ratings
        </h4>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center justify-center">
            <PieChart width={200} height={200}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </div>
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Price Target
              </div>
              <div className={`text-xl font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                ${price_target?.toFixed(2)}
              </div>
              <div className="text-sm text-blue-600">
                Range: ${price_target_low?.toFixed(2)} - ${price_target_high?.toFixed(2)}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-green-500 font-medium">{buy}</div>
                <div className="text-xs">Buy</div>
              </div>
              <div className="text-center">
                <div className="text-yellow-500 font-medium">{hold}</div>
                <div className="text-xs">Hold</div>
              </div>
              <div className="text-center">
                <div className="text-red-500 font-medium">{sell}</div>
                <div className="text-xs">Sell</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSectorComparison = () => {
    if (!mediumTermData?.sector_comparison) return null;

    const {
      relative_performance,
      sector_avg_performance,
      stock_performance,
      sector_rank,
      total_peers,
      beta,
      peer_performance
    } = mediumTermData.sector_comparison;

    return (
      <div className={`rounded-lg border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <h4 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
          Sector Comparison
        </h4>
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Stock Performance
            </div>
            <div className="flex items-center">
              <span className={`text-xl font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                {stock_performance > 0 ? '+' : ''}{stock_performance.toFixed(2)}%
              </span>
              {stock_performance > 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500 ml-2" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500 ml-2" />
              )}
            </div>
            <div className="text-sm text-blue-600">
              Sector Avg: {sector_avg_performance.toFixed(2)}%
            </div>
          </div>

          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Relative to Sector
            </div>
            <div className="flex items-center">
              <span className={`text-xl font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                {relative_performance > 0 ? '+' : ''}{relative_performance.toFixed(2)}%
              </span>
              {relative_performance > 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500 ml-2" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500 ml-2" />
              )}
            </div>
            <div className="text-sm text-blue-600">
              Rank: #{sector_rank} of {total_peers}
            </div>
          </div>

          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Beta Value
            </div>
            <div className={`text-xl font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
              {beta?.toFixed(2)}
            </div>
            <div className="text-sm text-blue-600">
              {beta && beta > 1 ? 'More volatile than market' : 'Less volatile than market'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLongTermCharts = () => {
    if (!longTermData) return null;

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border`}>
            <p className="text-sm font-medium">{label}</p>
            {payload.map((entry: any, index: number) => (
              <p key={index} className={`text-sm ${entry.name === 'EPS' ? 'text-blue-500' : 'text-green-500'}`}>
                {entry.name}: {entry.name === 'EPS' ? entry.value?.toFixed(2) : formatValue(entry.value)}
              </p>
            ))}
          </div>
        );
      }
      return null;
    };

    return (
      <div className="grid grid-cols-2 gap-6">
        {/* EPS Chart */}
        <div className={`rounded-lg border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            Expected EPS for {longTermData.year}
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={longTermData.quarters}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                <XAxis 
                  dataKey="quarter" 
                  stroke={isDarkMode ? '#9CA3AF' : '#4B5563'}
                />
                <YAxis 
                  stroke={isDarkMode ? '#9CA3AF' : '#4B5563'}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="eps"
                  name="EPS"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className={`rounded-lg border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            Expected Revenue for {longTermData.year}
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={longTermData.quarters}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                <XAxis 
                  dataKey="quarter" 
                  stroke={isDarkMode ? '#9CA3AF' : '#4B5563'}
                />
                <YAxis 
                  stroke={isDarkMode ? '#9CA3AF' : '#4B5563'}
                  tickFormatter={(value) => formatValue(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const timeframes: Array<{id: 'short' | 'medium' | 'long', label: string, description: string}> = [
    {
      id: 'short',
      label: 'Short Term',
      description: 'Intraday market movements and volatility'
    },
    {
      id: 'medium',
      label: 'Medium Term',
      description: 'Analyst ratings and sector performance'
    },
    {
      id: 'long',
      label: 'Long Term',
      description: 'Quarterly EPS and revenue forecasts'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Time Frame Selector */}
      <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} mb-4`}>
        <div className="flex gap-1 overflow-x-auto pb-1 hide-scrollbar">
          {timeframes.map((frame) => (
            <button
              key={frame.id}
              onClick={() => setTimeframe(frame.id)}
              className={`
                group flex items-center px-3 py-2 rounded-lg transition-all duration-200
                ${timeframe === frame.id
                  ? isDarkMode
                    ? 'bg-blue-900/20 text-blue-400'
                    : 'bg-blue-50 text-blue-700'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
                ${timeframe === frame.id ? 'shadow-sm' : ''}
                relative
              `}
            >
              <div className="flex items-center">
                <span className="text-sm font-medium whitespace-nowrap tracking-wide">
                  {frame.label}
                </span>
              </div>
              
              {/* Active Tab Indicator */}
              {timeframe === frame.id && (
                <div className={`
                  absolute bottom-0 left-0 right-0 h-0.5 rounded-full
                  ${isDarkMode ? 'bg-blue-500' : 'bg-blue-600'}
                  animate-fade-in
                `} />
              )}

              {/* Tooltip */}
              <div className={`
                absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5
                text-xs font-normal rounded-lg whitespace-nowrap opacity-0 invisible
                transition-all duration-200 z-10 shadow-lg
                ${isDarkMode
                  ? 'bg-gray-800 text-gray-200'
                  : 'bg-gray-900 text-white'
                }
                group-hover:opacity-100 group-hover:visible
              `}>
                {frame.description}
                <div className={`
                  absolute top-full left-1/2 transform -translate-x-1/2 -mt-1
                  border-4 border-transparent
                  ${isDarkMode
                    ? 'border-t-gray-800'
                    : 'border-t-gray-900'
                  }
                `} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="text-center text-red-600 p-4">{error}</div>
      ) : timeframe === 'short' && marketData ? (
        <div className="grid grid-cols-1 gap-6">
          {/* Short term content */}
          <div className={`rounded-lg border p-6 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'
          }`}>
            <h4 className={`text-lg font-medium mb-4 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-900'
            }`}>Volatility Analysis</h4>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Intraday Range</div>
                <div className={`text-xl font-bold ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-900'
                }`}>
                  ${marketData.intraday_range.low.toFixed(2)} - ${marketData.intraday_range.high.toFixed(2)}
                </div>
                <div className="text-sm text-blue-600">
                  {marketData.intraday_range.spread_percent.toFixed(1)}% Spread
                </div>
              </div>
              
              <div className={`p-3 rounded-lg ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Volume</div>
                <div className={`font-medium ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-900'
                }`}>
                  {marketData.volume.total}{marketData.volume.unit} shares
                </div>
              </div>
            </div>
          </div>

          {/* Intraday Range Chart */}
          <div className={`rounded-lg border p-6 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'
          }`}>
            <h4 className={`text-lg font-medium mb-4 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-900'
            }`}>Intraday Range Chart</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={marketData.candlestick_data}>
                  <XAxis 
                    dataKey="time"
                    scale="band"
                    stroke={isDarkMode ? '#9CA3AF' : '#4B5563'}
                  />
                  {/* Price YAxis */}
                  <YAxis 
                    yAxisId="price"
                    orientation="left"
                    stroke={isDarkMode ? '#3B82F6' : '#2563EB'}
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value) => `$${value}`}
                  />
                  {/* Volume YAxis */}
                  <YAxis 
                    yAxisId="volume"
                    orientation="right"
                    stroke={isDarkMode ? '#10B981' : '#059669'}
                    tickFormatter={(value) => formatValue(value)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border shadow-lg`}>
                            <p className="text-sm font-medium">{data.time}</p>
                            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              <p className="text-blue-500">Close: ${data.close}</p>
                              <p className="text-emerald-500">Volume: {formatValue(data.volume)}</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={isDarkMode ? '#374151' : '#E5E7EB'} 
                  />
                  <Legend />
                  {/* Close price line */}
                  <Line
                    type="monotone"
                    dataKey="close"
                    name="Close Price"
                    stroke={isDarkMode ? '#3B82F6' : '#2563EB'}
                    strokeWidth={2}
                    dot={false}
                    yAxisId="price"
                  />
                  {/* Volume line */}
                  <Line
                    type="monotone"
                    dataKey="volume"
                    name="Volume"
                    stroke={isDarkMode ? '#10B981' : '#059669'}
                    strokeWidth={2}
                    dot={false}
                    yAxisId="volume"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : timeframe === 'medium' ? (
        <div className="grid grid-cols-2 gap-6">
          {renderAnalystRatings()}
          {renderSectorComparison()}
        </div>
      ) : timeframe === 'long' ? (
        renderLongTermCharts()
      ) : null}
    </div>
  );
};

export default MarketImpact; 