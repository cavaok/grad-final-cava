// components/PercentSuccess.jsx
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
      color: "#AD03DE", // Purple
      models: ["mlp"],
      description: "Baseline Performance by a Multilayer Perceptron"
    },
    {
      name: "A",
      prefix: "auto64",
      color: "#0D0877", // Blue
      models: ["auto64_1", "auto64_2", "auto64_3", "auto64_4"],
      description: "Base Architecture A: Autoencoder 64 Bottleneck (Iterations 1-4)"
    },
    {
      name: "B",
      prefix: "auto128",
      color: "#B12A90", // Red
      models: ["auto128_1", "auto128_2", "auto128_3", "auto128_4", "auto128_5", "auto128_6", "auto128_7"],
      description: "Base Architecture B: Autoencoder 128 Bottleneck (Iterations 1-7)"
    },
    {
      name: "C",
      prefix: "auto256",
      color: "#E16462", // orange
      models: ["auto256_1", "auto256_2", "auto256_3", "auto256_4", "auto256_5", 
               "auto256_6", "auto256_7", "auto256_8", "auto256_9", "auto256_10"],
      description: "Base Architecture C: Autoencoder 256 Bottleneck (Iterations 1-10)"
    },
    {
      name: "D",
      prefix: "auto512",
      color: "#FCA636", // peach
      models: ["auto512_1", "auto512_2", "auto512_3", "auto512_4", "auto512_5", 
               "auto512_6", "auto512_7", "auto512_8", "auto512_9", "auto512_10"],
      description: "Base Architecture D: Autoencoder 512 Bottleneck (Iterations 1-10)"
    },
    {
      name: "E",
      prefix: "funkyauto",
      color: "#FFCF20", // yellow
      models: ["funkyauto_1", "funkyauto_2", "funkyauto_3", "funkyauto_4", "funkyauto_5", 
               "funkyauto_6", "funkyauto_7", "funkyauto_8", "funkyauto_9", "funkyauto_10"],
      description: "Base Architecture E: Autoencoder No Bottleneck (Iterations 1-10)"
    },
    {
      name: "F",
      prefix: "hadamard",
      color: "#DCE319", // Amber
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
  // Extract model number (for x-axis label)
  getModelNumber(modelName) {
    const parts = modelName.split('_');
    return parts.length > 1 ? parts[1] : '';
  }
};

const PercentSuccess = () => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [data, setData] = useState([]);
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

  useEffect(() => {
    // Fetch data from Supabase with pagination handling
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
        
        // Model count dictionary to collect counts by model
        const modelCounts = {};
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
            .select('model_name')
            .lte('label_kld', kldThreshold)
            .lte('frob', frobThreshold)
            .range(startIndex, startIndex + pageSize - 1);
          
          if (pageError) {
            console.error(`Error fetching page ${page + 1}:`, pageError);
            throw pageError;
          }
          
          // Count models in this batch
          pageData.forEach(item => {
            if (!modelCounts[item.model_name]) {
              modelCounts[item.model_name] = 0;
            }
            modelCounts[item.model_name]++;
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
        
        // Convert to array format with percentage calculation
        const formattedData = Object.keys(modelCounts).map(model => {
          const count = modelCounts[model];
          const percentage = (count / TOTAL_SAMPLES) * 100;
          console.log(`Model ${model}: ${count} samples (${percentage.toFixed(2)}%)`);
          
          return {
            model,
            count,
            percentage
          };
        });
        
        // Sort the data according to our predefined order
        const modelOrder = modelConfig.getAllModels();
        formattedData.sort((a, b) => {
          const indexA = modelOrder.indexOf(a.model);
          const indexB = modelOrder.indexOf(b.model);
          
          // If both models are in our order list, use that order
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          // If only one is in the list, prioritize it
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          
          // Otherwise, sort alphabetically
          return a.model.localeCompare(b.model);
        });
        
        setData(formattedData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(`Failed to fetch data from Supabase: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [kldThreshold, frobThreshold]); // Re-fetch when thresholds change

  useEffect(() => {
    if (loading || error || !data || data.length === 0) return;

    // Clear any existing SVG
    d3.select(svgRef.current).selectAll('*').remove();

    // Chart dimensions
    const margin = { top: 40, right: 30, bottom: 120, left: 60 };
    const width = 1200 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

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
      .style('background-color', 'rgba(0, 0, 0, 0.85)')
      .style('color', 'white')
      .style('border', 'solid')
      .style('border-width', '1px')
      .style('border-radius', '5px')
      .style('padding', '8px')
      .style('position', 'absolute')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.3)')
      .style('transition', 'opacity 0.2s ease-in-out');

    // X scale (categorical)
    const x = d3.scaleBand()
      .domain(data.map(d => d.model))
      .range([0, width])
      .paddingInner(0.1)
      .paddingOuter(0.2);

    // Y scale (percentage, 0-100)
    const y = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    // Axes
    // X-axis with model numbers
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => {
        return modelConfig.getModelNumber(d);
      }))
      .selectAll('text')
      .style('text-anchor', 'middle')
      .attr('dy', '0.5em')
      .style('fill', '#7C807C')
      .style('font-weight', 'bold');

    svg.append('g')
      .call(d3.axisLeft(y).tickFormat(d => `${d}%`))
      .selectAll('text')
      .style('fill', '#7C807C')
      .style('font-weight', 'bold');

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(`Sample Count as Percentage of ${TOTAL_SAMPLES} by Model Type (KLD ≤ ${kldThreshold}, Frobenius Norm ≤ ${frobThreshold})`);

    // Y-axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -height / 2)
      .attr('text-anchor', 'middle')
      .text('Percentage of 900 Samples (%)')
      .style('fill', '#7C807C');

    // Group rectangles for architecture labels
    const architectureBars = svg.append('g')
      .attr('class', 'architecture-bars')
      .attr('transform', `translate(0,${height + 30})`);

    // Draw architecture label bars
    let currentGroup = null;
    let groupStartX = 0;
    let groupEndX = 0;
    
    data.forEach((modelData, i) => {
      const modelGroup = modelConfig.getGroupForModel(modelData.model);
      
      // If this is the first model or a new group
      if (!currentGroup || (modelGroup && currentGroup.name !== modelGroup.name)) {
        // If we were tracking a group, draw its bar
        if (currentGroup) {
          const groupWidth = groupEndX - groupStartX + x.bandwidth();
          const groupDescription = currentGroup.description || `Architecture ${currentGroup.name}`;
          
          // Draw the architecture bar
          const archBar = architectureBars.append('rect')
            .attr('x', groupStartX)
            .attr('y', 0)
            .attr('width', groupWidth)
            .attr('height', 30)
            .attr('fill', currentGroup.color || '#999')
            .attr('opacity', 0.8)
            .style('cursor', 'pointer')
            .attr('data-description', groupDescription)
            .attr('class', 'arch-bar');

          // Create a larger invisible overlay for better hover detection
          architectureBars.append('rect')
            .attr('x', groupStartX)
            .attr('y', -5)
            .attr('width', groupWidth)
            .attr('height', 40)
            .attr('fill', 'transparent')
            .style('cursor', 'pointer')
            .attr('data-description', groupDescription)
            .attr('class', 'arch-bar-hover-area')
            .on('mouseover', function(event) {
              const description = d3.select(this).attr('data-description');
              
              const barX = d3.select(this).attr('x');
              d3.selectAll('.arch-bar')
                .filter(function() {
                  return d3.select(this).attr('x') === barX;
                })
                .transition()
                .duration(100)
                .attr('opacity', 1.0);
              
              tooltip.transition()
                .duration(50)
                .style('opacity', 0.95);
                
              tooltip.html(`
                <div style="font-weight: bold; padding: 6px 10px; min-width: 200px;">
                  ${description}
                </div>
              `)
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 40) + 'px');
            })
            .on('mouseout', function() {
              const barX = d3.select(this).attr('x');
              d3.selectAll('.arch-bar')
                .filter(function() {
                  return d3.select(this).attr('x') === barX;
                })
                .transition()
                .duration(200)
                .attr('opacity', 0.8);
              
              tooltip.transition()
                .duration(300)
                .style('opacity', 0);
            });
          
          // Add tooltip behavior
          archBar
            .on('mouseover', function(event) {
              const description = d3.select(this).attr('data-description');
              
              tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);
              tooltip.html(`
                <div style="font-weight: bold; padding: 4px 8px;">
                  ${description}
                </div>
              `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
              tooltip.transition()
                .duration(500)
                .style('opacity', 0);
            });
          
          // Add the architecture label
          architectureBars.append('text')
            .attr('x', groupStartX + groupWidth / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .style('font-weight', 'bold')
            .text(currentGroup.name);
        }
        
        // Start tracking the new group
        currentGroup = modelGroup;
        groupStartX = x(modelData.model);
      }
      
      groupEndX = x(modelData.model);
    });
    
    // Draw the last group bar if we have one
    if (currentGroup) {
      const groupWidth = groupEndX - groupStartX + x.bandwidth();
      const groupDescription = currentGroup.description || `Architecture ${currentGroup.name}`;
      
      // Draw the architecture bar
      const archBar = architectureBars.append('rect')
        .attr('x', groupStartX)
        .attr('y', 0)
        .attr('width', groupWidth)
        .attr('height', 30)
        .attr('fill', currentGroup.color || '#999')
        .attr('opacity', 0.8)
        .style('cursor', 'pointer')
        .attr('data-description', groupDescription)
        .attr('class', 'arch-bar');

      // Create a larger invisible overlay for better hover detection
      architectureBars.append('rect')
        .attr('x', groupStartX)
        .attr('y', -5)
        .attr('width', groupWidth)
        .attr('height', 40)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .attr('data-description', groupDescription)
        .attr('class', 'arch-bar-hover-area')
        .on('mouseover', function(event) {
          const description = d3.select(this).attr('data-description');
          
          const barX = d3.select(this).attr('x');
          d3.selectAll('.arch-bar')
            .filter(function() {
              return d3.select(this).attr('x') === barX;
            })
            .transition()
            .duration(100)
            .attr('opacity', 1.0);
          
          tooltip.transition()
            .duration(50)
            .style('opacity', 0.95);
            
          tooltip.html(`
            <div style="font-weight: bold; padding: 6px 10px; min-width: 200px;">
              ${description}
            </div>
          `)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 40) + 'px');
        })
        .on('mouseout', function() {
          const barX = d3.select(this).attr('x');
          d3.selectAll('.arch-bar')
            .filter(function() {
              return d3.select(this).attr('x') === barX;
            })
            .transition()
            .duration(200)
            .attr('opacity', 0.8);
          
          tooltip.transition()
            .duration(300)
            .style('opacity', 0);
        });
      
      // Add tooltip behavior
      archBar
        .on('mouseover', function(event) {
          const description = d3.select(this).attr('data-description');
          
          tooltip.transition()
            .duration(200)
            .style('opacity', 0.9);
          tooltip.html(`
            <div style="font-weight: bold; padding: 4px 8px;">
              ${description}
            </div>
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          tooltip.transition()
            .duration(500)
            .style('opacity', 0);
        });
      
      architectureBars.append('text')
        .attr('x', groupStartX + groupWidth / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .style('font-weight', 'bold')
        .text(currentGroup.name);
    }

    // Draw the bars
    data.forEach(modelData => {
      // Get the color for this model's group
      const modelGroup = modelConfig.getGroupForModel(modelData.model);
      const barColor = modelGroup ? modelGroup.color : '#999';
      
      // Draw the bar
      svg.append('rect')
        .attr('x', x(modelData.model))
        .attr('y', y(modelData.percentage))
        .attr('width', x.bandwidth())
        .attr('height', height - y(modelData.percentage))
        .attr('fill', barColor)
        .attr('opacity', 0.7)
        .on('mouseover', function(event) {
          tooltip.transition()
            .duration(200)
            .style('opacity', 0.9);
          tooltip.html(`
            <div>Count: ${modelData.count} / ${TOTAL_SAMPLES}</div>
            <div>Percentage: ${modelData.percentage.toFixed(1)}%</div>
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          tooltip.transition()
            .duration(500)
            .style('opacity', 0);
        });
    });

    // Add a reference line at MLP model percentage for comparison
    const mlpModel = data.find(model => model.model === "mlp");
    if (mlpModel) {
      const mlpPercentage = mlpModel.percentage;
      
      svg.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(mlpPercentage))
        .attr('y2', y(mlpPercentage))
        .attr('stroke', '#AD03DE') // Using the MLP color
        .attr('stroke-opacity', 0.5)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('pointer-events', 'none');
    }

    // Add x-axis label
    svg.append('text')
      .attr('transform', `translate(${width / 2},${height + margin.bottom - 10})`)
      .attr('text-anchor', 'middle')
      .style('fill', '#7C807C')
      .style('font-size', '16px')
      .text('Trainable Model Architectures');

  }, [data, loading, error, kldThreshold, frobThreshold]);

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

  // Get the average percentage across all models
  const averagePercentage = data.length > 0 
    ? data.reduce((sum, model) => sum + model.percentage, 0) / data.length 
    : 0;

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
          <div className="flex items-center gap-2 flex-grow">
            <span className="text-sm text-gray-500">
              Average success rate: {averagePercentage.toFixed(1)}% across {data.length} models
            </span>
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
      {!loading && !error && (!data || data.length === 0) && <div className="p-4">No data available for the current filter settings</div>}
      
      {!loading && !error && data && data.length > 0 && (
        <div className="overflow-x-auto">
          <div ref={tooltipRef} className="absolute opacity-0 pointer-events-none"></div>
          <svg ref={svgRef}></svg>
          <div className="mt-4 text-sm text-gray-600">
            <p className="mb-2"><strong>Visualization Explanation:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Each bar represents the percentage of successful adversarial attacks out of a total of 900</li>
              <li>The purple dotted line shows the baseline MLP model percentage for comparison</li>
              <li>Hover over bars for exact counts and percentages</li>
            </ul>
            <p className="mt-2 text-purple-600">
              <strong>NOTE:</strong> Models with <b>lower percentages</b> were harder to attack and had fewer adversarial 
              examples meeting the KLD and Frobenius norm thresholds, indicating better performance and robustness.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PercentSuccess;