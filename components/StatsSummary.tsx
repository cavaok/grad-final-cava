// components/StatsSummary.tsx
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Define models colors for consistency across charts
const MODEL_COLORS = [
  '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c',
  '#d0ed57', '#ffc658', '#ff8042', '#ff6361', '#bc5090'
];

// Custom rendering for pie chart labels
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const StatsSummary = ({ statistics, loading, error }) => {
  if (loading) return <div className="flex justify-center items-center h-64">Loading statistics...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!statistics || statistics.length === 0) return <div className="p-4">No statistical data available.</div>;

  // Prepare data for sample distribution chart
  const sampleDistribution = statistics.map((item, index) => ({
    name: item.model,
    value: item.count,
    color: MODEL_COLORS[index % MODEL_COLORS.length]
  }));

  // Calculate overall statistics
  const totalSamples = statistics.reduce((sum, item) => sum + item.count, 0);
  const allMeans = statistics.map(item => item.mean);
  const overallMinMean = Math.min(...allMeans);
  const overallMaxMean = Math.max(...allMeans);
  const overallAvgMean = statistics.reduce((sum, item) => sum + (item.mean * item.count), 0) / totalSamples;

  // Find models with min and max mean values
  const minMeanModel = statistics.find(item => item.mean === overallMinMean)?.model || 'N/A';
  const maxMeanModel = statistics.find(item => item.mean === overallMaxMean)?.model || 'N/A';

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-center">Summary Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Sample Distribution Chart */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Sample Distribution by Model</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sampleDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sampleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [value, 'Samples']}
                  labelFormatter={(label) => `Model: ${label}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Overall Statistics */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Overall Metrics</h3>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded text-center">
                <div className="text-xl font-bold text-blue-700">{totalSamples}</div>
                <div className="text-sm text-blue-600">Total Samples</div>
              </div>
              <div className="bg-green-50 p-3 rounded text-center">
                <div className="text-xl font-bold text-green-700">{statistics.length}</div>
                <div className="text-sm text-green-600">Models</div>
              </div>
              <div className="bg-purple-50 p-3 rounded text-center">
                <div className="text-xl font-bold text-purple-700">{overallAvgMean.toFixed(4)}</div>
                <div className="text-sm text-purple-600">Avg Frobenius Norm</div>
              </div>
              <div className="bg-orange-50 p-3 rounded text-center">
                <div className="text-xl font-bold text-orange-700">
                  {((overallMaxMean - overallMinMean) / overallMinMean * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-orange-600">Max/Min Variation</div>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Performance Insights:</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li><span className="font-medium">Lowest Average Frob:</span> {minMeanModel} ({overallMinMean.toFixed(4)})</li>
                <li><span className="font-medium">Highest Average Frob:</span> {maxMeanModel} ({overallMaxMean.toFixed(4)})</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Detailed Statistics Table */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Detailed Model Statistics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Samples
                </th>
                <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min Frob
                </th>
                <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Max Frob
                </th>
                <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mean Frob
                </th>
                <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Median Frob
                </th>
              </tr>
            </thead>
            <tbody>
              {statistics.map((item, index) => (
                <tr key={item.model} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="py-2 px-4 border-b border-gray-200 text-sm">
                    <div className="flex items-center">
                      <span 
                        className="inline-block w-3 h-3 mr-2 rounded-full" 
                        style={{ backgroundColor: MODEL_COLORS[index % MODEL_COLORS.length] }}
                      ></span>
                      {item.model}
                    </div>
                  </td>
                  <td className="py-2 px-4 border-b border-gray-200 text-sm text-right">{item.count}</td>
                  <td className="py-2 px-4 border-b border-gray-200 text-sm text-right">{item.min.toFixed(4)}</td>
                  <td className="py-2 px-4 border-b border-gray-200 text-sm text-right">{item.max.toFixed(4)}</td>
                  <td className="py-2 px-4 border-b border-gray-200 text-sm text-right font-medium">{item.mean.toFixed(4)}</td>
                  <td className="py-2 px-4 border-b border-gray-200 text-sm text-right">{item.median.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Insights and Recommendations */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Insights</h3>
        <div className="text-sm space-y-2">
          <p>
            The distribution of Frobenius norm values indicates the relative robustness of different models
            against adversarial attacks. Lower values generally indicate better robustness.
          </p>
          <p>
            {minMeanModel !== 'N/A' && (
              <>
                <span className="font-medium">{minMeanModel}</span> shows the best robustness with the lowest average 
                Frobenius norm of {overallMinMean.toFixed(4)}.
              </>
            )}
          </p>
          <p>
            {maxMeanModel !== 'N/A' && (
              <>
                <span className="font-medium">{maxMeanModel}</span> shows the highest vulnerability with an average 
                Frobenius norm of {overallMaxMean.toFixed(4)}.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatsSummary;