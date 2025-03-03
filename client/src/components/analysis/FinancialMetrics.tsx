import React from 'react';
import { ChevronRight, AlertTriangle } from 'lucide-react';

const FinancialMetrics: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-6">
        {/* Revenue & Earnings */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Revenue & Earnings Metrics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">EPS</div>
              <div className="text-xl font-bold text-gray-900">$2.45</div>
              <div className="text-sm text-green-600">↑ 15% vs Expected</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Revenue</div>
              <div className="text-xl font-bold text-gray-900">$89.5B</div>
              <div className="text-sm text-green-600">↑ 8% YoY</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Operating Margin</div>
              <div className="text-xl font-bold text-gray-900">28.5%</div>
              <div className="text-sm text-green-600">↑ 2.5pts</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Cash Flow</div>
              <div className="text-xl font-bold text-gray-900">$12.3B</div>
              <div className="text-sm text-green-600">↑ 12% QoQ</div>
            </div>
          </div>
        </div>

        {/* Forward Guidance */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Forward Guidance & Outlook</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Revenue Forecast</span>
              <span className="font-medium text-green-600">$92-95B (Q1 2024)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">EPS Forecast</span>
              <span className="font-medium text-green-600">$2.50-2.60</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Cost Reduction Target</span>
              <span className="font-medium text-blue-600">$2B by 2024</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Growth Signals */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Growth Signals</h4>
          <div className="space-y-3">
            <div className="flex items-center text-gray-700">
              <ChevronRight className="w-4 h-4 mr-2 text-green-500" />
              <span>Expansion into APAC market planned for Q2</span>
            </div>
            <div className="flex items-center text-gray-700">
              <ChevronRight className="w-4 h-4 mr-2 text-green-500" />
              <span>New product line launch in development</span>
            </div>
            <div className="flex items-center text-gray-700">
              <ChevronRight className="w-4 h-4 mr-2 text-green-500" />
              <span>Strategic acquisition of TechStart ($500M)</span>
            </div>
          </div>
        </div>

        {/* Risk Factors */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Risk Factors</h4>
          <div className="space-y-3">
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="flex items-center text-red-700">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span>Supply chain disruptions in Asia</span>
              </div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center text-yellow-700">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span>Regulatory changes in EU market</span>
              </div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center text-orange-700">
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