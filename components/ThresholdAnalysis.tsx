// components/ThresholdAnalysis.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  ScatterChart,
  ZAxis,
  ReferenceArea
} from 'recharts';

// Define models colors for consistency across charts
const MODEL_COLORS = [
  '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c',
  '#d0ed57', '#ffc658', '#ff8042', '#ff6361', '#bc5090'
];

const ThresholdAnalysis = () => {
  const [data, setData] = useState([]);
  const [scatterData, setScatterData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [threshold, setThreshold] = useState(2.0);
  const [selectedModels, setSelectedModels] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [viewMode, setViewMode] = useState('distribution'); // 'distribution' or 'scatter'

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all unique model names
        const { data: modelNames, error: modelError } = await supabase
          .from('adversarial_examples')
          .select('model_name');
        
        if (modelError) throw modelError;
        
        // Extract unique model names
        const uniqueModels = [...new Set(modelNames.map(item => item.model_name))];
        setAvailableModels(uniqueModels);
        
        // Select first 3 models by default (or all if less than 3)
        const initialSelectedModels = uniqueModels.slice(0, Math.min(3, uniqueModels.length));
        setSelectedModels(initialSelectedModels);
        
        // Fetch data for the selected models
        await fetchModelData(initialSelectedModels);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const fetchModelData = async (models) => {
    try {
      // Fetch Frobenius norm data for selected models
      const { data: frobData, error: frobError } = await supabase
        .from('adversarial_examples')
        .select('model_name, frob, mse, label_kld')
        .in('model_name', models);
      
      if (frobError) throw frobError;
      
      // Process data for distribution analysis
      const thresholdPoints = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];
      
      const thresholdData = thresholdPoints.map(threshValue => {
        const pointData = { threshold: threshValue };
        
        // Calculate percentage of values below threshold for each model
        models.forEach(model => {
          const modelData = frobData.filter(item => item.model_name === model);
          const totalCount = modelData.length;
          const belowThresholdCount = modelData.filter(item => item.frob <= threshValue).length;
          const percentage = totalCount > 0 ? (belowThresholdCount / totalCount) * 100 : 0;
          
          pointData[model] = percentage;
        });
        
        return pointData;
      });
      
      setData(thresholdData);
      
      // Process data for scatter plot
      const processedScatterData = [];
      
      models.forEach((model, modelIndex) => {
        const modelData = frobData.filter(item => item.model_name === model);
        
        modelData.forEach(item => {
          processedScatterData.push({
            model,
            frob: item.frob,
            mse: item.mse,
            kld: item.label_kld,
            // Add color based on model index for consistent coloring
            color: MODEL_COLORS[modelIndex % MODEL_COLORS.length]
          });
        });
      });
      
      setScatterData(processedScatterData);
      
    } catch (err) {
      console.error('Error fetching model data:', err);
      setError('Failed to fetch model data. Please try again later.');
    }
  };
  
  // Handle threshold change
  const handleThresholdChange = (event) => {
    setThreshold(parseFloat(event.target.value));
  };
  
  // Handle model selection
  const handleModelToggle = (model) => {
    const updatedSelection = selectedModels.includes(model)
      ? selectedModels.filter(m => m !== model)
      : [...selectedModels, model];
    
    setSelectedModels(updatedSelection);
    fetchModelData(updatedSelection);
  };
  
  if (loading) return <div className="flex justify-center items-center h-64">Loading data...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (data.length === 0) return <div className="p-4">No data available. Please select at least one model.</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-center">Threshold Analysis</h2>
      
      {/* Controls */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex flex-wrap items-center mb-4">
            <label className="block text-sm font-medium text-gray-700 mr-4">View Mode:</label>
            <div className="flex">
              <button
                className={`px-3 py-1 text-sm rounded-l-md ${
                  viewMode === 'distribution'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setViewMode('distribution')}
              >
                Distribution
              </button>
              <button
                className={`px-3 py-1 text-sm rounded-r-md ${
                  viewMode === 'scatter'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setViewMode('scatter')}
              >
                Scatter Plot
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Threshold: {threshold.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={threshold}
              onChange={handleThresholdChange}
              className="w-full"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Models:</label>
          <div className="flex flex-wrap gap-2">
            {availableModels.map((model, index) => (
              <div key={model} className="flex items-center">
                <input
                  type="checkbox"
                  id={`threshold-model-${model}`}
                  checked={selectedModels.includes(model)}
                  onChange={() => handleModelToggle(model)}
                  className="mr-1"
                />
                <label 
                  htmlFor={`threshold-model-${model}`}
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
      
      {/* Chart */}
      <div className="h-96 w-full mb-6">
        {viewMode === 'distribution' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="threshold" 
                label={{ value: 'Frobenius Norm Threshold', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: '% of Examples Below Threshold', angle: -90, position: 'insideLeft' }}
                domain={[0, 100]}
              />
              <Tooltip 
                formatter={(value, name) => [`${value.toFixed(1)}%`, name]}
              />
              <Legend />
              
              {/* Reference line for current threshold */}
              <ReferenceLine 
                x={threshold} 
                stroke="#ff6b6b" 
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: `Threshold: ${threshold.toFixed(1)}`,
                  position: 'top',
                  fill: '#ff6b6b',
                  fontSize: 12
                }}
              />
              
              {/* Area charts for each model */}
              {selectedModels.map((model, index) => (
                <Area
                  key={model}
                  type="monotone"
                  dataKey={model}
                  name={model}
                  stroke={MODEL_COLORS[index % MODEL_COLORS.length]}
                  fill={MODEL_COLORS[index % MODEL_COLORS.length]}
                  fillOpacity={0.2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid />
              <XAxis 
                type="number" 
                dataKey="mse" 
                name="Mean Squared Error"
                label={{ value: 'Mean Squared Error (MSE)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                type="number" 
                dataKey="frob" 
                name="Frobenius Norm"
                label={{ value: 'Frobenius Norm', angle: -90, position: 'insideLeft' }}
              />
              <ZAxis 
                type="number" 
                dataKey="kld" 
                range={[50, 500]} 
                name="KL Divergence"
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name) => [value.toFixed(4), name]}
              />
              <Legend />
              
              {/* Reference area for threshold */}
              <ReferenceArea 
                y1={0} 
                y2={threshold} 
                fill="#82ca9d" 
                fillOpacity={0.1}
                stroke="#82ca9d"
                strokeDasharray="3 3"
                label={{
                  value: `Below Threshold (${threshold.toFixed(1)})`,
                  position: 'insideTopRight'
                }}
              />
              
              {/* Scatter data for each selected model */}
              {selectedModels.map((model, index) => {
                const modelScatterData = scatterData.filter(item => item.model === model);
                return (
                  <Scatter
                    key={model}
                    name={model}
                    data={modelScatterData}
                    fill={MODEL_COLORS[index % MODEL_COLORS.length]}
                  />
                );
              })}
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {/* Threshold Analysis Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedModels.map((model, index) => {
          const modelData = scatterData.filter(item => item.model === model);
          const totalCount = modelData.length;
          const belowThresholdCount = modelData.filter(item => item.frob <= threshold).length;
          const percentage = totalCount > 0 ? (belowThresholdCount / totalCount) * 100 : 0;
          
          return (
            <div 
              key={model}
              className="p-4 rounded-lg"
              style={{ backgroundColor: `${MODEL_COLORS[index % MODEL_COLORS.length]}20` }}
            >
              <div className="flex items-center mb-2">
                <span 
                  className="inline-block w-4 h-4 mr-2 rounded-full" 
                  style={{ backgroundColor: MODEL_COLORS[index % MODEL_COLORS.length] }}
                ></span>
                <h3 className="font-semibold">{model}</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="block text-gray-600">Total Examples:</span>
                  <span className="font-medium">{totalCount}</span>
                </div>
                <div>
                  <span className="block text-gray-600">Below Threshold:</span>
                  <span className="font-medium">{belowThresholdCount}</span>
                </div>
                <div>
                  <span className="block text-gray-600">Percentage:</span>
                  <span className="font-medium">{percentage.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="block text-gray-600">Status:</span>
                  <span className={`font-medium ${percentage >= 90 ? 'text-green-600' : percentage >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {percentage >= 90 ? 'Excellent' : percentage >= 70 ? 'Good' : 'Needs Improvement'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Explanation */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg text-sm">
        <h3 className="font-semibold mb-2">How to Interpret This Analysis</h3>
        <p className="mb-2">
          This visualization shows the percentage of adversarial examples that have a Frobenius norm below 
          a given threshold. A lower Frobenius norm indicates a smaller perturbation needed to fool the model,
          which suggests lower robustness.
        </p>
        <p className="mb-2">
          <strong>Distribution View:</strong> Shows how the percentage of examples changes as you adjust the threshold.
          Models with curves that rise quickly at low threshold values are more vulnerable to adversarial attacks.
        </p>
        <p>
          <strong>Scatter View:</strong> Plots the relationship between Mean Squared Error (MSE) and Frobenius norm.
          The size of each point represents the KL Divergence. Points below the threshold line represent adversarial
          examples with minimal perturbations.
        </p>
      </div>
    </div>
  );
};

export default ThresholdAnalysis;