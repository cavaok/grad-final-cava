// components/ComparativeRobustness.jsx
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as d3 from 'd3';

// Initialize Supabase client
const supabaseUrl = 'https://fxwzblzdvwowourssdih.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to safely handle NaN values
const safeParse = (value, fallback = 0) => {
  if (value === undefined || value === null || isNaN(value)) {
    return fallback;
  }
  return value;
};

// Model ordering and grouping configuration
const modelConfig = {
  groups: [
    {
      name: "*",
      prefix: "mlp",
      color: "#AD03DE", // Purple for MLP
      models: ["mlp"],
      description: "Baseline Performance by a Multilayer Perceptron"
    },
    {
      name: "A",
      prefix: "auto64",
      color: "#0D0877", // Blue for 64 Bottleneck
      models: ["auto64_1", "auto64_2", "auto64_3", "auto64_4"],
      description: "Base Architecture A: Autoencoder 64 Bottleneck (Iterations 1-4)"
    },
    {
      name: "B",
      prefix: "auto128",
      color: "#B12A90", // Pink for 128 Bottleneck
      models: ["auto128_1", "auto128_2", "auto128_3", "auto128_4", "auto128_5", "auto128_6", "auto128_7"],
      description: "Base Architecture B: Autoencoder 128 Bottleneck (Iterations 1-7)"
    },
    {
      name: "C",
      prefix: "auto256",
      color: "#E16462", // Orange for 256 Bottleneck
      models: ["auto256_1", "auto256_2", "auto256_3", "auto256_4", "auto256_5", 
               "auto256_6", "auto256_7", "auto256_8", "auto256_9", "auto256_10"],
      description: "Base Architecture C: Autoencoder 256 Bottleneck (Iterations 1-10)"
    },
    {
      name: "D",
      prefix: "auto512",
      color: "#FCA636", // Peach for 512 Bottleneck
      models: ["auto512_1", "auto512_2", "auto512_3", "auto512_4", "auto512_5", 
               "auto512_6", "auto512_7", "auto512_8", "auto512_9", "auto512_10"],
      description: "Base Architecture D: Autoencoder 512 Bottleneck (Iterations 1-10)"
    },
    {
      name: "E",
      prefix: "funkyauto",
      color: "#FFCF20", // Yellow for No Bottleneck
      models: ["funkyauto_1", "funkyauto_2", "funkyauto_3", "funkyauto_4", "funkyauto_5", 
               "funkyauto_6", "funkyauto_7", "funkyauto_8", "funkyauto_9", "funkyauto_10"],
      description: "Base Architecture E: Autoencoder No Bottleneck (Iterations 1-10)"
    },
    {
      name: "F",
      prefix: "hadamard",
      color: "#DCE319", // Yellow-green for Hadamard
      models: ["hadamard_1", "hadamard_2", "hadamard_3"],
      description: "Base Architecture F: Hadamard Model (Iterations 1-3)"
    }
  ],
  // Extract all model names to use for ordering
  getAllModels() {
    return this.groups.flatMap(group => group.models);
  },
  // Get group for a model
  getGroupForModel(modelName) {
    return this.groups.find(group => 
      group.models.includes(modelName) || 
      modelName.startsWith(group.prefix)
    );
  },
  // Extract model number (for point label)
  getModelNumber(modelName) {
    const parts = modelName.split('_');
    return parts.length > 1 ? parts[1] : '';
  }
};

const ComparativeRobustness = () => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const legendRef = useRef(null);
  const [data, setData] = useState({ models: [], grouped: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Current applied filter values
  const [kldThreshold, setKldThreshold] = useState(0.07);
  const [frobThreshold, setFrobThreshold] = useState(10);
  
  // Input values for filters (can be changed without triggering re-fetch)
  const [kldInput, setKldInput] = useState(0.07);
  const [frobInput, setFrobInput] = useState(10);
  
  const [totalCount, setTotalCount] = useState(0);
  const [loadProgress, setLoadProgress] = useState({ current: 0, total: 0, percentage: 0 });

  // Constants
  const TOTAL_SAMPLES = 900; // Total number of samples to calculate percentage
  
  // State for visible model groups
  const [visibleGroups, setVisibleGroups] = useState(
    modelConfig.groups.map(group => group.prefix)
  );

  useEffect(() => {
    // Fetch data from Supabase
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadProgress({ current: 0, total: 0, percentage: 0 });
        
        // First, get the total count for progress tracking
        const { count, error: countError } = await supabase
          .from('adversarial_examples')
          .select('*', { count: 'exact', head: true })
          .lte('label_kld', kldThreshold)
          .lte('frob', frobThreshold);
        
        if (countError) throw countError;
        
        const totalRows = count || 0;
        setTotalCount(totalRows);
        setLoadProgress(prev => ({ ...prev, total: totalRows }));
        console.log(`Total rows in database with KLD ≤ ${kldThreshold} and Frob ≤ ${frobThreshold}: ${totalRows}`);
        
        // Model count and Frobenius values dictionaries
        const modelCounts = {};
        const modelFrobValues = {};
        let processedCount = 0;
        
        // Adjust to Supabase's apparent 1000 row limit
        const pageSize = 1000;
        
        // Calculate how many pages we need to fetch
        const totalPages = Math.ceil(totalRows / pageSize);
        console.log(`Total rows: ${totalRows}, total pages: ${totalPages}`);
        
        // Fetch all pages
        for (let page = 0; page < totalPages; page++) {
          const startIndex = page * pageSize;
          
          if (page % 5 === 0 || page === totalPages - 1) {
            console.log(`Fetching page ${page + 1}/${totalPages}, rows ${startIndex} to ${startIndex + pageSize - 1}`);
          }
          
          const { data: pageData, error: pageError } = await supabase
            .from('adversarial_examples')
            .select('model_name, frob')
            .lte('label_kld', kldThreshold)
            .lte('frob', frobThreshold)
            .range(startIndex, startIndex + pageSize - 1);
          
          if (pageError) {
            console.error(`Error fetching page ${page + 1}:`, pageError);
            throw pageError;
          }
          
          // Process this batch of data
          pageData.forEach(item => {
            // Count models
            if (!modelCounts[item.model_name]) {
              modelCounts[item.model_name] = 0;
              modelFrobValues[item.model_name] = [];
            }
            
            modelCounts[item.model_name]++;
            
            // Store Frobenius norm values for calculating median later
            if (item.frob !== null && !isNaN(item.frob)) {
              modelFrobValues[item.model_name].push(item.frob);
            }
          });
          
          processedCount += pageData.length;
          
          // Update progress
          setLoadProgress({
            current: processedCount,
            total: totalRows,
            percentage: Math.round((processedCount / totalRows) * 100)
          });
          
          // Add a small delay to avoid overwhelming the API
          if (page % 10 === 9) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        // Calculate median Frobenius norm for each model
        const modelMedians = {};
        Object.keys(modelFrobValues).forEach(model => {
          const values = modelFrobValues[model].sort((a, b) => a - b);
          let median;
          
          if (values.length === 0) {
            median = 0;
          } else if (values.length % 2 === 0) {
            median = (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
          } else {
            median = values[Math.floor(values.length / 2)];
          }
          
          modelMedians[model] = median;
        });
        
        // Combine count and median data
        const formattedData = Object.keys(modelCounts).map(model => {
          const count = modelCounts[model];
          const percentage = (count / TOTAL_SAMPLES) * 100;
          const medianFrob = modelMedians[model] || 0;
          const modelNumber = modelConfig.getModelNumber(model);
          
          console.log(`Model ${model}: ${count} samples (${percentage.toFixed(2)}%), median Frob: ${medianFrob.toFixed(2)}`);
          
          return {
            model,
            modelNumber,
            count,
            percentage,
            medianFrob
          };
        });
        
        // Group the data by model type for connecting lines
        const groupedData = {};
        formattedData.forEach(item => {
          const baseModel = item.model.split('_')[0];
          if (!groupedData[baseModel]) {
            groupedData[baseModel] = [];
          }
          groupedData[baseModel].push(item);
        });
        
        // Sort each group by model number
        Object.keys(groupedData).forEach(baseModel => {
          groupedData[baseModel].sort((a, b) => {
            const numA = parseInt(a.modelNumber) || 0;
            const numB = parseInt(b.modelNumber) || 0;
            return numA - numB;
          });
        });
        
        // Set the final data in state
        setData({
          models: formattedData,
          grouped: groupedData
        });
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(`Failed to fetch data from Supabase: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [kldThreshold, frobThreshold]); // Re-fetch when thresholds change

  // Filter data based on visible groups
  const getFilteredData = () => {
    const filteredModels = data.models.filter(model => {
      const baseModel = model.model.split('_')[0];
      return visibleGroups.includes(baseModel);
    });

    const filteredGrouped = {};
    Object.keys(data.grouped).forEach(groupKey => {
      if (visibleGroups.includes(groupKey)) {
        filteredGrouped[groupKey] = data.grouped[groupKey];
      }
    });

    return {
      models: filteredModels,
      grouped: filteredGrouped
    };
  };

  // Toggle a group's visibility
  const toggleGroup = (prefix) => {
    setVisibleGroups(prev => {
      if (prev.includes(prefix)) {
        return prev.filter(p => p !== prefix);
      } else {
        return [...prev, prefix];
      }
    });
  };

  // Render the visualization
  const renderVisualization = () => {
    if (loading || error || !data.models || data.models.length === 0) return;

    // Get filtered data
    const filteredData = getFilteredData();

    // Clear any existing SVG
    d3.select(svgRef.current).selectAll('*').remove();
    d3.select(legendRef.current).selectAll('*').remove();

    // Chart dimensions
    const margin = { top: 40, right: 120, bottom: 60, left: 70 };
    const width = 900 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create tooltip div
    const tooltip = d3.select(tooltipRef.current)
      .style('opacity', 0)
      .attr('class', 'tooltip')
      .style('background-color', 'rgba(255, 255, 255, 0.9)')
      .style('color', 'black')
      .style('border', 'solid')
      .style('border-width', '1px')
      .style('border-radius', '5px')
      .style('padding', '10px')
      .style('position', 'absolute')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.3)')
      .style('font-size', '14px')
      .style('transition', 'opacity 0.2s ease-in-out');

    // Find min and max values for scales based on visible models
    const maxFrob = d3.max(filteredData.models, d => d.medianFrob) * 1.1 || 5; // Add 10% padding, default to 5 if no data
    
    // Find minimum Frobenius norm with padding for better visualization
    const rawMinFrob = d3.min(filteredData.models, d => d.medianFrob) || 0;
    const minFrob = Math.max(0, rawMinFrob * 0.9); // Apply 10% padding below, but don't go below 0
    
    // Find min and max for x-axis (percentage)
    const minPercentage = Math.max(0, d3.min(filteredData.models, d => d.percentage) * 0.9 || 0); // Floor at 0, 10% padding
    const maxPercentage = Math.min(100, d3.max(filteredData.models, d => d.percentage) * 1.1 || 100); // Ceiling at 100, 10% padding

    // X scale (percentage, reversed so 100% is at the origin)
    const x = d3.scaleLinear()
      .domain([maxPercentage, minPercentage]) // Reversed domain with dynamic range
      .range([0, width]);

    // Y scale (median Frobenius norm)
    const y = d3.scaleLinear()
      .domain([minFrob, maxFrob])
      .range([height, 0]);

    // Add gridlines
    // X gridlines
    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x)
        .tickSize(-height)
        .tickFormat(''))
      .selectAll('line')
      .style('stroke', '#e0e0e0');

    // Y gridlines
    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(''))
      .selectAll('line')
      .style('stroke', '#e0e0e0');

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(10))
      .selectAll('text')
      .style('text-anchor', 'middle')
      .style('fill', '#666')
      .style('font-size', '12px');

    svg.append('g')
      .call(d3.axisLeft(y).ticks(10))
      .selectAll('text')
      .style('fill', '#666')
      .style('font-size', '12px');

    // Axis labels
    svg.append('text')
      .attr('transform', `translate(${width/2},${height + 40})`)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Percent Success (%)');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 20)
      .attr('x', -height/2)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Average Frobenius Norm');

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text('Comparative Robustness by Model');

    // "More Robust" label in top right
    svg.append('text')
      .attr('x', width - 20)
      .attr('y', 20)
      .attr('text-anchor', 'end')
      .style('font-size', '14px')
      .style('font-style', 'italic')
      .style('fill', '#888')
      .text('More Robust');

    // "Less Robust" label in bottom left
    svg.append('text')
      .attr('x', 20)
      .attr('y', height - 10)
      .attr('text-anchor', 'start')
      .style('font-size', '14px')
      .style('font-style', 'italic')
      .style('fill', '#888')
      .text('Less Robust');

    // Create line generators for connecting points within model groups
    const line = d3.line()
      .x(d => x(d.percentage))
      .y(d => y(d.medianFrob))
      .curve(d3.curveMonotoneX); // Smooth curve

    // Draw connection lines for each model group
    Object.keys(filteredData.grouped).forEach(groupKey => {
      const group = filteredData.grouped[groupKey];
      if (group.length <= 1) return; // Skip if only one point
      
      const modelGroup = modelConfig.getGroupForModel(group[0].model);
      const color = modelGroup ? modelGroup.color : '#999';
      
      svg.append('path')
        .datum(group)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5') // Dashed line
        .attr('stroke-opacity', 0.7)
        .attr('d', line);
    });

    // Draw scatter plot points
    filteredData.models.forEach(d => {
      const modelGroup = modelConfig.getGroupForModel(d.model);
      const color = modelGroup ? modelGroup.color : '#999';
      const size = d.model === 'mlp' ? 12 : 10; // Make MLP point larger
      
      // Create point group
      const pointGroup = svg.append('g')
        .attr('class', 'point-group')
        .attr('transform', `translate(${x(d.percentage)},${y(d.medianFrob)})`)
        .on('mouseover', function(event) {
          // Highlight point
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', size * 1.3);
            
          // Show tooltip
          tooltip.transition()
            .duration(200)
            .style('opacity', 0.9);
          tooltip.html(`
            <div>Average Frobenius: ${d.medianFrob.toFixed(2)}</div>
            <div>Success Rate: ${d.percentage.toFixed(1)}%</div>
            <div>Samples: ${d.count}/${TOTAL_SAMPLES}</div>
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          // Reset point size
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', size);
            
          // Hide tooltip
          tooltip.transition()
            .duration(500)
            .style('opacity', 0);
        });
      
      // Add the circle point
      pointGroup.append('circle')
        .attr('r', size)
        .attr('fill', color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer');
      
      // Add model number label or asterisk for MLP
      if (d.model === 'mlp') {
        pointGroup.append('text')
          .attr('x', 0)
          .attr('y', 4)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .style('font-size', '20px')
          .style('font-weight', 'bold')
          .style('fill', '#fff')
          .style('pointer-events', 'none')
          .text('*');
      } else {
        pointGroup.append('text')
          .attr('x', 0)
          .attr('y', 0)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .style('font-size', '10px')
          .style('font-weight', 'bold')
          .style('fill', '#fff')
          .style('pointer-events', 'none')
          .text(d.modelNumber);
      }
    });

    // Create interactive legend
    const legend = d3.select(legendRef.current)
      .append('svg')
      .attr('width', 280)
      .attr('height', 400)
      .append('g')
      .attr('transform', 'translate(10, 20)');

    // Legend title
    legend.append('text')
      .attr('x', 10)
      .attr('y', 30)
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Architecture Key');

    // Create legend items for all groups
    const legendItems = [
      { name: 'A: Autoencoder 64 Bottleneck', prefix: 'auto64', color: modelConfig.groups[1].color },
      { name: 'B: Autoencoder 128 Bottleneck', prefix: 'auto128', color: modelConfig.groups[2].color },
      { name: 'C: Autoencoder 256 Bottleneck', prefix: 'auto256', color: modelConfig.groups[3].color },
      { name: 'D: Autoencoder 512 Bottleneck', prefix: 'auto512', color: modelConfig.groups[4].color },
      { name: 'E: Autoencoder No Bottleneck', prefix: 'funkyauto', color: modelConfig.groups[5].color },
      { name: 'F: Hadamard', prefix: 'hadamard', color: modelConfig.groups[6].color },
      { name: 'MLP', prefix: 'mlp', color: modelConfig.groups[0].color }
    ];
    
    legendItems.forEach((item, i) => {
      // Check if this group is visible
      const isVisible = visibleGroups.includes(item.prefix);
      
      // Create legend item group
      const legendItem = legend.append('g')
        .attr('transform', `translate(20, ${60 + i * 30})`)
        .style('cursor', 'pointer')
        .on('click', () => toggleGroup(item.prefix));
      
      // Add color circle or checkbox
      legendItem.append('circle')
        .attr('r', 10)
        .attr('fill', isVisible ? item.color : '#ffffff')
        .attr('stroke', item.color)
        .attr('stroke-width', 2);
      
      // Add checkbox mark if visible
      if (isVisible) {
        legendItem.append('path')
          .attr('d', 'M7,10 L10,14 L14,7')
          .attr('fill', 'none')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2)
          .attr('transform', 'translate(-10, -10)');
      }
      
      // Add text label
      legendItem.append('text')
        .attr('x', 20)
        .attr('y', 0)
        .attr('alignment-baseline', 'middle')
        .style('font-size', '15px')
        .text(item.name);
    });
    
    // Add a note below the legend
    legend.append('text')
      .attr('x', 10)
      .attr('y', 290)
      .style('font-size', '12px')
      .style('font-style', 'italic')
      .text('Click on legend items to toggle visibility');
    
    // Draw border around legend
    legend.append('rect')
      .attr('x', -5)
      .attr('y', -20)
      .attr('width', 260)
      .attr('height', 330)
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1)
      .attr('fill', 'none');
  };

  // Update visualization when data or visibility changes
  useEffect(() => {
    renderVisualization();
  }, [data, visibleGroups, loading, error, kldThreshold, frobThreshold]);

  // Handle KLD input change
  const handleKldInputChange = (e) => {
    let value = parseFloat(e.target.value);
    if (isNaN(value)) value = 0.07; // Default to 0.07 if input is invalid
    setKldInput(value);
  };

  // Handle Frobenius norm input change
  const handleFrobInputChange = (e) => {
    let value = parseFloat(e.target.value);
    if (isNaN(value)) value = 10; // Default to 10 if input is invalid
    setFrobInput(value);
  };
  
  // Apply filters and trigger data fetch
  const applyFilters = () => {
    setKldThreshold(kldInput);
    setFrobThreshold(frobInput);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      {/* Navigation bar with filter controls */}
      <div className="mb-6 bg-gray-100 p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <h2 className="text-lg text-black font-semibold">Filter Controls</h2>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="kld-input" className="font-medium text-gray-700">
              KLD Threshold:
            </label>
            <input
              id="kld-input"
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={kldInput}
              onChange={handleKldInputChange}
              className="w-24 p-2 border border-gray-300 rounded shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black font-medium"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="frob-input" className="font-medium text-gray-700">
              Frobenius Norm:
            </label>
            <input
              id="frob-input"
              type="number"
              step="0.5"
              min="0"
              value={frobInput}
              onChange={handleFrobInputChange}
              className="w-24 p-2 border border-gray-300 rounded shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black font-medium"
            />
          </div>
          <div>
            <button
              onClick={applyFilters}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
              {loading ? 'Loading...' : 'FILTER'}
            </button>
          </div>
        </div>
      </div>
      
      {loading && (
        <div className="flex flex-col justify-center items-center h-64">
          <div className="mb-4">Loading data...</div>
          {loadProgress.total > 0 && (
            <div className="w-64">
              <div className="bg-gray-200 rounded-full h-2.5 mb-2">
                <div 
                  className="bg-purple-600 h-2.5 rounded-full" 
                  style={{ width: `${loadProgress.percentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                {loadProgress.current.toLocaleString()} / {loadProgress.total.toLocaleString()} rows
                ({loadProgress.percentage}%)
              </div>
            </div>
          )}
        </div>
      )}
      
      {error && <div className="text-red-500 p-4">{error}</div>}
      {!loading && !error && (!data.models || data.models.length === 0) && 
        <div className="p-4">No data available for the current filter settings</div>
      }
      
      {!loading && !error && data.models && data.models.length > 0 && (
        <div className="flex flex-row">
          <div className="overflow-x-auto">
            <div ref={tooltipRef} className="absolute opacity-0 pointer-events-none"></div>
            <svg ref={svgRef}></svg>
          </div>
          <div ref={legendRef} className="ml-4"></div>
        </div>
      )}
      
      {!loading && !error && data.models && data.models.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          <p className="mb-2"><strong>Visualization Explanation:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The x-axis shows the percentage of successful adversarial attacks (100% @ the origin, lower values = more robust models)</li>
            <li>The y-axis displays the average Frobenius norm (higher values = more robust models)</li>
            <li>Points are connected by dashed lines to show progression across iterations</li>
            <li>Points heading towards the top right corner indicate a model becoming more robust across iterations</li>
            <li>Numbers inside points indicate the iteration number for that model architecture</li>
          </ul>
          <p className="mt-2 text-purple-600">
            <strong>NOTE:</strong> Models towards the <b>upper-right</b> corner display the <b>best robustness</b> to attacks with higher Frobenius norm and lower percentage of successful attacks.
          </p>
        </div>
      )}
    </div>
  );
};

export default ComparativeRobustness;