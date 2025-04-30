// components/ModelComparison.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// Define models colors for consistency across charts
const MODEL_COLORS = [
  '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c',
  '#d0ed57', '#ffc658', '#ff8042', '#ff6361', '#bc5090'
];

const ModelComparison = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModels, setSelectedModels] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [metric, setMetric] = useState('frob'); // Default metric is Frobenius norm

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all unique model names
        const { data: modelNames, error: modelError } = await supabase
          .from('adversarial_examples')
          .select('model_name')
          .limit(100); // Limit to avoid excessive data
        
        if (modelError) throw modelError;
        
        // Extract unique model names
        const uniqueModels = [...new Set(modelNames.map(item => item.model_name))];
        setAvailableModels(uniqueModels);
        
        // Select first 5 models by default (or all if less than 5)
        setSelectedModels(uniqueModels.slice(0, Math.min(5, uniqueModels.length)));
        
        // Fetch metrics for selected models
        await fetchMetricsData(uniqueModels.slice(0, Math.min(5, uniqueModels.length)), metric);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch model data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Function to fetch metrics data for selected models
  const fetchMetricsData = async (models, selectedMetric) => {
    try {
      setLoading(true);
      
      // Fetch data for selected models and metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('adversarial_examples')
        .select(`model_name, ${selectedMetric}`)
        .in('model_name', models);
      
      if (metricsError) throw metricsError;
      
      // Group and calculate statistics by model
      const groupedData = {};
      metricsData.forEach(item => {
        const model = item.model_name;
        if (!groupedData[model]) {
          groupedData[model] = [];
        }
        groupedData[model].push(item[selectedMetric]);
      });
      
      // Calculate statistics for each model
      const comparisonData = Object.entries(groupedData).map(([model, values]) => {
        const numValues = values.length;
        const sum = values.reduce((acc, val) => acc + val, 0);
        const mean = sum / numValues;
        
        // Calculate standard deviation
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / numValues;
        const stdDev = Math.sqrt(variance);
        
        // Sort for percentiles
        const sortedValues = [...values].sort((a, b) => a - b);
        
        return {
          model,
          count: numValues,
          min: sortedValues[0],
          max: sortedValues[numValues - 1],
          mean,
          median: numValues % 2 === 0 
            ? (sortedValues[numValues/2 - 1] + sortedValues[numValues/2]) / 2 
            : sortedValues[Math.floor(numValues/2)],
          stdDev,
          p90: sortedValues[Math.floor(numValues * 0.9)]
        };
      });
      
      // Sort by mean value
      comparisonData.sort((a, b) => b.mean - a.mean);
      
      setData(comparisonData);
    } catch (err) {
      console.error('Error fetching metrics data:', err);
      setError('Failed to fetch metrics data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle model selection changes
  const handleModelChange = (model) => {
    const updatedSelection = selectedModels.includes(model)
      ? selectedModels.filter(m => m !== model)
      : [...selectedModels, model];
    
    setSelectedModels(updatedSelection);
    fetchMetricsData(updatedSelection, metric);
  };
  
  // Handle metric change
  const handleMetricChange = (newMetric) => {
    setMetric(newMetric);
    fetchMetricsData(selectedModels, newMetric);
  };
  
  if (loading && data.length === 0) return <div className="flex justify-center items-center h-64">Loading data...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (data.length === 0) return <div className="p-4">No data available. Please select at least one model.</div>;

  // Get the display name for the selected metric
  const getMetricDisplayName = (metricKey) => {
    const metricNames = {
      'frob': 'Frobenius Norm',
      'mse': 'Mean Squared Error',
      'label_kld': 'Label KL Divergence'
    };
    return metricNames[metricKey] || metricKey;
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-center">
        Model Comparison - {getMetricDisplayName(metric)}
      </h2>
      
      {/* Controls */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Metric:</label>
            <select
              value={metric}
              onChange={(e) => handleMetricChange(e.target.value)}
              className="p-2 border border-gray-300 rounded w-full md:w-auto"
            >
              <option value="frob">Frobenius Norm</option>
              <option value="mse">Mean Squared Error</option>
              <option value="label_kld">Label KL Divergence</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Models:</label>
          <div className="flex flex-wrap gap-2">
            {availableModels.map((model, index) => (
              <div key={model} className="flex items-center">
                <input
                  type="checkbox"
                  id={`model-${model}`}
                  checked={selectedModels.includes(model)}
                  onChange={() => handleModelChange(model)}
                  className="mr-1"
                />
                <label 
                  htmlFor={`model-${model}`}
                  className="flex items-center text-sm"
                >
                  <span 
                    className="inline-block w-3 h-3 mr-1 rounded-full" 
                    style={{ backgroundColor: MODEL_COLORS[index % MODEL_COLORS.length] }}
                  ></span>
                  {model}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Bar Chart */}
      <div className="h-96 w-full mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 30, bottom: 70 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="model" 
              angle={-45} 
              textAnchor="end" 
              height={70}
              interval={0}
            />
            <YAxis 
              label={{ 
                value: getMetricDisplayName(metric), 
                angle: -90, 
                position: 'insideLeft' 
              }}
            />
            <Tooltip 
              formatter={(value) => [value.toFixed(4), getMetricDisplayName(metric)]}
              labelFormatter={(label) => `Model: ${label}`}
            />
            <Legend />
            <Bar dataKey="mean" name={`Average ${getMetricDisplayName(metric)}`} fill="#8884d8">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={MODEL_COLORS[index % MODEL_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Statistics Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Model
              </th>
              <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Count
              </th>
              <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Min
              </th>
              <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Max
              </th>
              <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mean
              </th>
              <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Median
              </th>
              <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Std Dev
              </th>
              <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                P90
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
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
                <td className="py-2 px-4 border-b border-gray-200 text-sm text-right">{item.stdDev.toFixed(4)}</td>
                <td className="py-2 px-4 border-b border-gray-200 text-sm text-right">{item.p90.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ModelComparison;