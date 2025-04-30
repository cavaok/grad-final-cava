// components/FrobeniusNormDistribution.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Scatter,
  ReferenceLine,
} from 'recharts';

// Define models colors for consistency across charts
const MODEL_COLORS = [
  '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c',
  '#d0ed57', '#ffc658', '#ff8042', '#ff6361', '#bc5090'
];

const FrobeniusNormDistribution = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOutliers, setShowOutliers] = useState(true);
  const [showReferenceLine, setShowReferenceLine] = useState(true);
  const [threshold, setThreshold] = useState(2.0);
  const [selectedModels, setSelectedModels] = useState<never[]>([]);
  const [availableModels, setAvailableModels] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch unique model names
        const { data: modelData, error: modelError } = await supabase
          .from('adversarial_examples')
          .select('model_name')
          .limit(100);
        
        if (modelError) throw modelError;
        
        // Get unique model names
        const uniqueModels = [...new Set(modelData.map(item => item.model_name))];
        setAvailableModels(uniqueModels as never[]);
        
        // By default, select all models (or limit to 10 if there are too many)
        setSelectedModels(uniqueModels.slice(0, Math.min(10, uniqueModels.length)));
        
        // Fetch Frobenius norm data for these models
        await fetchFrobeniusData(uniqueModels.slice(0, Math.min(10, uniqueModels.length)));
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const fetchFrobeniusData = async (models) => {
    try {
      // Fetch Frobenius norm values for selected models
      const { data: frobData, error: frobError } = await supabase
        .from('adversarial_examples')
        .select('model_name, frob, case_idx')
        .in('model_name', models);
      
      if (frobError) throw frobError;
      
      // Group data by model_name
      const groupedData = {};
      frobData.forEach(item => {
        if (!groupedData[item.model_name]) {
          groupedData[item.model_name] = [];
        }
        groupedData[item.model_name].push({
          frob: item.frob,
          caseIdx: item.case_idx
        });
      });
      
      // Calculate box plot statistics for each model
      const boxPlotData = Object.entries(groupedData).map(([model, values]) => {
        // Extract just the frob values for calculations
        const frobValues = values.map(item => item.frob);
        
        // Sort values for percentile calculations
        const sortedValues = [...frobValues].sort((a, b) => a - b);
        const count = sortedValues.length;
        
        if (count === 0) return null;
        
        // Calculate basic statistics
        const min = sortedValues[0];
        const max = sortedValues[count - 1];
        const q1 = sortedValues[Math.floor(count * 0.25)];
        const median = count % 2 === 0 
          ? (sortedValues[count/2 - 1] + sortedValues[count/2]) / 2 
          : sortedValues[Math.floor(count/2)];
        const q3 = sortedValues[Math.floor(count * 0.75)];
        
        // Calculate IQR for outlier detection
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        // Identify outliers and non-outliers
        const outliers = values.filter(item => item.frob < lowerBound || item.frob > upperBound)
          .map(item => ({
            frob: item.frob,
            caseIdx: item.caseIdx,
            model: model
          }));
        
        // Calculate min and max excluding outliers
        const filteredValues = sortedValues.filter(val => val >= lowerBound && val <= upperBound);
        const boundedMin = filteredValues.length > 0 ? filteredValues[0] : min;
        const boundedMax = filteredValues.length > 0 ? filteredValues[filteredValues.length - 1] : max;
        
        // Calculate mean
        const mean = sortedValues.reduce((acc, val) => acc + val, 0) / count;
        
        return {
          model,
          // Box plot data
          min: boundedMin,
          q1,
          median,
          q3,
          max: boundedMax,
          // Additional statistics
          mean,
          outliers,
          outliersCount: outliers.length,
          count
        };
      }).filter(Boolean);
      
      // Sort models alphabetically
      boxPlotData.sort((a, b) => a.model.localeCompare(b.model));
      
      setData(boxPlotData);
    } catch (err) {
      console.error('Error fetching Frobenius data:', err);
      setError('Failed to fetch Frobenius norm data. Please try again later.');
    }
  };
  
  // Toggle a model's selection
  const handleModelToggle = (model) => {
    const updatedSelection = selectedModels.includes(model)
      ? selectedModels.filter(m => m !== model)
      : [...selectedModels, model];
    
    setSelectedModels(updatedSelection);
    fetchFrobeniusData(updatedSelection);
  };
  
  if (loading) return <div className="flex justify-center items-center h-64">Loading data...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (data.length === 0) return <div className="p-4">No data available. Please select at least one model.</div>;
  
  // Format data for chart
  const chartData = data.map(item => ({
    name: item.model,
    min: item.min,
    q1: item.q1,
    median: item.median,
    q3: item.q3,
    max: item.max,
    mean: item.mean,
    count: item.count,
    outliersCount: item.outliersCount
  }));
  
  // Collect all outliers for scatter plot
  const allOutliers = data.flatMap((item, index) => 
    item.outliers.map(outlier => ({
      ...outlier,
      index: index // Keep track of the model index for consistent coloring
    }))
  );
  
  // Calculate overall statistics for all selected models combined
  const allFrobValues = data.flatMap(item => 
    [...Array(item.count)].map((_, i) => i < item.min ? item.min : i > item.max ? item.max : i)
  );
  const overallMean = data.reduce((sum, item) => sum + (item.mean * item.count), 0) / 
                      data.reduce((sum, item) => sum + item.count, 0);

  // Custom tooltip formatter for box plots
  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    
    // Find the corresponding model data
    const modelData = data.find(d => d.model === label);
    if (!modelData) return null;
    
    return (
      <div className="bg-white p-2 border border-gray-200 shadow-md">
        <p className="font-bold">{label}</p>
        <p>Count: {modelData.count}</p>
        <p>Min: {modelData.min.toFixed(4)}</p>
        <p>Q1: {modelData.q1.toFixed(4)}</p>
        <p>Median: {modelData.median.toFixed(4)}</p>
        <p>Q3: {modelData.q3.toFixed(4)}</p>
        <p>Max: {modelData.max.toFixed(4)}</p>
        <p>Mean: {modelData.mean.toFixed(4)}</p>
        <p>Outliers: {modelData.outliersCount}</p>
      </div>
    );
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-center">Frobenius Norm Distribution by Model</h2>
      
      {/* Controls */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showOutliers"
              checked={showOutliers}
              onChange={(e) => setShowOutliers(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="showOutliers" className="text-sm">Show Outliers</label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showReferenceLine"
              checked={showReferenceLine}
              onChange={(e) => setShowReferenceLine(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="showReferenceLine" className="text-sm">Show Threshold</label>
          </div>
          
          <div className="flex items-center">
            <label htmlFor="threshold" className="text-sm mr-2">Threshold:</label>
            <input
              type="number"
              id="threshold"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              step="0.1"
              min="0"
              className="w-16 p-1 border border-gray-300 rounded text-sm"
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
                  id={`model-${model}`}
                  checked={selectedModels.includes(model)}
                  onChange={() => handleModelToggle(model)}
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
      
      {/* Box Plot Chart */}
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 30, bottom: 70 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={70} 
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              label={{ value: 'Frobenius Norm', angle: -90, position: 'insideLeft' }}
              domain={[0, 'auto']}
            />
            <Tooltip content={customTooltip} />
            <Legend />
            
            {/* Box plots */}
            <BoxPlot 
              name="Frobenius Norm" 
              dataKey="min" 
              q1Key="q1" 
              medianKey="median" 
              q3Key="q3" 
              maxKey="max" 
              fill="#8884d8" 
              stroke="#8884d8" 
              fillOpacity={0.3}
            />
            
            {/* Scatter plot for outliers */}
            {showOutliers && (
              <Scatter
                name="Outliers"
                data={allOutliers}
                dataKey="frob"
                fill="#FF5733"
                shape="circle"
              >
                {allOutliers.map((entry, index) => (
                  <cell key={`cell-${index}`} fill={MODEL_COLORS[entry.index % MODEL_COLORS.length]} />
                ))}
              </Scatter>
            )}
            
            {/* Threshold reference line */}
            {showReferenceLine && (
              <ReferenceLine 
                y={threshold} 
                stroke="green" 
                strokeDasharray="3 3" 
                label={{ 
                  value: `Threshold: ${threshold.toFixed(1)}`,
                  position: 'right', 
                  fill: 'green',
                  fontSize: 12
                }} 
              />
            )}
            
            {/* Overall average reference line */}
            {showReferenceLine && (
              <ReferenceLine 
                y={overallMean} 
                stroke="#8884d8" 
                strokeDasharray="5 5" 
                label={{ 
                  value: `Overall Avg: ${overallMean.toFixed(2)}`,
                  position: 'left', 
                  fill: '#8884d8',
                  fontSize: 12
                }} 
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-3 rounded">
          <h3 className="font-semibold">Overall Statistics</h3>
          <p>Models: {data.length}</p>
          <p>Total Examples: {data.reduce((sum, item) => sum + item.count, 0)}</p>
          <p>Overall Average: {overallMean.toFixed(4)}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <h3 className="font-semibold">Model Highlights</h3>
          <p>Lowest Median: {data.reduce((min, item) => item.median < min.median ? item : min, data[0]).model}</p>
          <p>Highest Median: {data.reduce((max, item) => item.median > max.median ? item : max, data[0]).model}</p>
          <p>Most Outliers: {data.reduce((max, item) => item.outliersCount > max.outliersCount ? item : max, data[0]).model}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <h3 className="font-semibold">Threshold Analysis</h3>
          <p>Models Below Threshold: {data.filter(model => model.median < threshold).length}</p>
          <p>Models Above Threshold: {data.filter(model => model.median >= threshold).length}</p>
          <p>Threshold: {threshold.toFixed(1)}</p>
        </div>
      </div>
      
      {/* Legend explanation */}
      <div className="mt-6 text-sm text-gray-600">
        <p className="mb-2"><strong>Box Plot Explanation:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Each box represents the interquartile range (IQR) from 25th to 75th percentile</li>
          <li>The line inside the box shows the median value</li>
          <li>The whiskers extend to the minimum and maximum values (excluding outliers)</li>
          <li>Points represent outliers (values more than 1.5 × IQR from the box edges)</li>
          <li>The green dashed line shows the configurable threshold</li>
          <li>The purple dashed line represents the overall average across all models</li>
        </ul>
        <p className="mt-2">
          <strong>Interpretation:</strong> Models with lower Frobenius norm values are generally more robust against 
          adversarial attacks, as they require larger perturbations to cause misclassification.
        </p>
      </div>
    </div>
  );
};

export default FrobeniusNormDistribution;