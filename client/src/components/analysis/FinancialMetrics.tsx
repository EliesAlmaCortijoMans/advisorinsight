import React, { useEffect, useState } from 'react';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useSelectedCompany } from '../../contexts/CompanyContext';
import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:8000';

interface FinancialMetricsData {
  symbol: string;
  financials: {
    EPS: {
      actual: string;
      estimate: string;
      change: string;
    };
    Revenue: {
      actual: string;
      estimate: string;
      change: string;
    };
    'Cash Flow': {
      actual: string;
      change: string;
    };
  };
}

const FinancialMetrics: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { selectedCompany } = useSelectedCompany();
  const [metricsData, setMetricsData] = useState<FinancialMetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFinancialMetrics = async () => {
      if (!selectedCompany?.symbol) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await axios.get<FinancialMetricsData>(`/api/stock/financial-metrics/${selectedCompany.symbol}`);
        setMetricsData(response.data);
      } catch (err) {
        console.error('Error fetching financial metrics:', err);
        setError('Failed to load financial metrics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFinancialMetrics();
  }, [selectedCompany?.symbol]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-lg">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <div className="flex items-center text-red-700">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-6">
        {/* Revenue & Earnings */}
        <div className={`rounded-lg border p-6 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h4 className={`text-lg font-medium mb-4 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>Revenue & Earnings Metrics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <div className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>EPS</div>
              <div className={`text-xl font-bold ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>{metricsData?.financials.EPS.actual}</div>
              <div className={`text-sm ${
                metricsData?.financials.EPS.change.includes('↑') 
                  ? isDarkMode ? 'text-green-400' : 'text-green-600'
                  : isDarkMode ? 'text-red-400' : 'text-red-600'
              }`}>{metricsData?.financials.EPS.change}</div>
            </div>
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <div className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>Revenue</div>
              <div className={`text-xl font-bold ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>{metricsData?.financials.Revenue.actual}</div>
              <div className={`text-sm ${
                metricsData?.financials.Revenue.change.includes('↑')
                  ? isDarkMode ? 'text-green-400' : 'text-green-600'
                  : isDarkMode ? 'text-red-400' : 'text-red-600'
              }`}>{metricsData?.financials.Revenue.change}</div>
            </div>
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <div className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>Cash Flow</div>
              <div className={`text-xl font-bold ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>{metricsData?.financials['Cash Flow'].actual}</div>
              <div className={`text-sm ${
                metricsData?.financials['Cash Flow'].change.includes('↑')
                  ? isDarkMode ? 'text-green-400' : 'text-green-600'
                  : isDarkMode ? 'text-red-400' : 'text-red-600'
              }`}>{metricsData?.financials['Cash Flow'].change}</div>
            </div>
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <div className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>EPS Estimate</div>
              <div className={`text-xl font-bold ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>{metricsData?.financials.EPS.estimate}</div>
              <div className={`text-sm ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>Next Quarter</div>
            </div>
          </div>
        </div>

        {/* Forward Guidance */}
        <div className={`rounded-lg border p-6 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h4 className={`text-lg font-medium mb-4 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>Forward Guidance & Outlook</h4>
          <div className="space-y-4">
            <div className={`flex items-center justify-between p-3 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Revenue Estimate</span>
              <span className={`font-medium ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>{metricsData?.financials.Revenue.estimate}</span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>EPS Estimate</span>
              <span className={`font-medium ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>{metricsData?.financials.EPS.estimate}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Growth Signals */}
        <div className={`rounded-lg border p-6 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h4 className={`text-lg font-medium mb-4 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>Growth Signals</h4>
          <div className="space-y-3">
            <div className={`flex items-center ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <ChevronRight className="w-4 h-4 mr-2 text-green-500" />
              <span>Expansion into APAC market planned for Q2</span>
            </div>
            <div className={`flex items-center ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <ChevronRight className="w-4 h-4 mr-2 text-green-500" />
              <span>New product line launch in development</span>
            </div>
            <div className={`flex items-center ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <ChevronRight className="w-4 h-4 mr-2 text-green-500" />
              <span>Strategic acquisition of TechStart ($500M)</span>
            </div>
          </div>
        </div>

        {/* Risk Factors */}
        <div className={`rounded-lg border p-6 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h4 className={`text-lg font-medium mb-4 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>Risk Factors</h4>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${
              isDarkMode ? 'bg-red-900/20' : 'bg-red-50'
            }`}>
              <div className={`flex items-center ${
                isDarkMode ? 'text-red-400' : 'text-red-700'
              }`}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span>Supply chain disruptions in Asia</span>
              </div>
            </div>
            <div className={`p-3 rounded-lg ${
              isDarkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'
            }`}>
              <div className={`flex items-center ${
                isDarkMode ? 'text-yellow-400' : 'text-yellow-700'
              }`}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span>Regulatory changes in EU market</span>
              </div>
            </div>
            <div className={`p-3 rounded-lg ${
              isDarkMode ? 'bg-orange-900/20' : 'bg-orange-50'
            }`}>
              <div className={`flex items-center ${
                isDarkMode ? 'text-orange-400' : 'text-orange-700'
              }`}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span>Increased competition in core markets</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialMetrics; 