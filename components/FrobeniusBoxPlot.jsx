// components/FrobeniusBoxPlot.jsx
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
      color: "#7BBCA5", // Green
      models: ["mlp"]
    },
    {
      name: "A",
      prefix: "auto64",
      color: "#0D47A1", // Blue
      models: ["auto64_1", "auto64_2", "auto64_3", "auto64_4"]
    },
    {
      name: "B",
      prefix: "auto128",
      color: "#E53935", // Red
      models: ["auto128_1", "auto128_2", "auto128_3", "auto128_4", "auto128_5", "auto128_6", "auto128_7"]
    },
    {
      name: "C",
      prefix: "auto256",
      color: "#B07732", // Brown
      models: ["auto256_1", "auto256_2", "auto256_3", "auto256_4", "auto256_5", 
               "auto256_6", "auto256_7", "auto256_8", "auto256_9", "auto256_10"]
    },
    {
      name: "D",
      prefix: "auto512",
      color: "#6A1B9A", // Purple
      models: ["auto512_1", "auto512_2", "auto512_3", "auto512_4", "auto512_5", 
               "auto512_6", "auto512_7", "auto512_8", "auto512_9", "auto512_10"]
    },
    {
      name: "E",
      prefix: "funkyauto",
      color: "#00695C", // Teal
      models: ["funkyauto_1", "funkyauto_2", "funkyauto_3", "funkyauto_4", "funkyauto_5", 
               "funkyauto_6", "funkyauto_7", "funkyauto_8", "funkyauto_9", "funkyauto_10"]
    },
    {
      name: "F",
      prefix: "hadamard",
      color: "#F57F17", // Amber
      models: ["hadamard_1", "hadamard_2", "hadamard_3"]
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

const FrobeniusBoxPlot = () => {
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
          .lte('frob', frobThreshold); // Added frob threshold filter
        
        if (countError) throw countError;
        
        const totalRows = count || 0;
        setTotalCount(totalRows);
        setLoadProgress(prev => ({ ...prev, total: totalRows }));
        console.log(`Total rows in database with KLD ≤ ${kldThreshold}: ${totalRows}`);
        
        // Group data structure to collect all results
        const groupedData = {};
        let processedCount = 0;
        let totalRowsFetched = 0;
        let totalValidRows = 0;
        let totalInvalidFrob = 0;
        
        // Adjust to Supabase's apparent 1000 row limit
        const pageSize = 1000; // Set to 1000 to match Supabase's limit
        
        // Calculate how many pages we need to fetch
        const totalPages = Math.ceil(totalRows / pageSize);
        console.log(`Total rows: ${totalRows}, total pages: ${totalPages}`);
        
        // Fetch all pages
        for (let page = 0; page < totalPages; page++) {
          const startIndex = page * pageSize;
          
          // Display progress every 5 pages to avoid console spam
          if (page % 5 === 0 || page === totalPages - 1) {
            console.log(`Fetching page ${page + 1}/${totalPages}, rows ${startIndex} to ${startIndex + pageSize - 1}`);
          }
          
          const { data: pageData, error: pageError } = await supabase
            .from('adversarial_examples')
            .select('model_name, frob, label_kld')
            .lte('label_kld', kldThreshold)
            .lte('frob', frobThreshold) // Added frob threshold filter
            .range(startIndex, startIndex + pageSize - 1);
          
          if (pageError) {
            console.error(`Error fetching page ${page + 1}:`, pageError);
            throw pageError;
          }
          
          totalRowsFetched += pageData.length;
          
          // Display progress every 5 pages to avoid console spam
          if (page % 5 === 0 || page === totalPages - 1) {
            console.log(`Received ${pageData.length} rows for page ${page + 1}`);
          }
          
          // Validate and log details about the frob values in this batch
          let pageValidRows = 0;
          let pageInvalidFrob = 0;
          
          // Process this batch of data
          pageData.forEach(item => {
            // Skip items with invalid frob values
            if (item.frob === null || item.frob === undefined || isNaN(item.frob)) {
              pageInvalidFrob++;
              return;
            }
            
            pageValidRows++;
            
            if (!groupedData[item.model_name]) {
              groupedData[item.model_name] = [];
            }
            groupedData[item.model_name].push(item.frob);
          });
          
          totalValidRows += pageValidRows;
          totalInvalidFrob += pageInvalidFrob;
          
          // Only log detailed stats occasionally to avoid console spam
          if (page % 5 === 0 || page === totalPages - 1 || pageInvalidFrob > 0) {
            console.log(`Page ${page + 1} stats: Valid frob values: ${pageValidRows}, Invalid frob values: ${pageInvalidFrob}`);
          }
          
          processedCount += pageData.length;
          
          // Update progress
          setLoadProgress({
            current: processedCount,
            total: totalRows,
            percentage: Math.round((processedCount / totalRows) * 100)
          });
          
          // If we got less data than expected and it's not the last page, log a warning
          if (pageData.length < pageSize && page < totalPages - 1) {
            console.warn(`Page ${page + 1} returned fewer rows (${pageData.length}) than expected (${pageSize})`);
          }
          
          // Add a small delay to avoid overwhelming the API
          if (page % 10 === 9) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        // Log summary statistics about data fetching
        console.log(`Data fetching summary:`);
        console.log(`- Total rows in database: ${totalRows}`);
        console.log(`- Total rows fetched: ${totalRowsFetched}`);
        console.log(`- Total valid rows: ${totalValidRows}`);
        console.log(`- Total invalid frob values: ${totalInvalidFrob}`);
        console.log(`- Data loss percentage: ${((totalRows - totalValidRows) / totalRows * 100).toFixed(2)}%`);
        
        // Log the total number of data points collected
        let totalDataPoints = 0;
        Object.values(groupedData).forEach(values => {
          totalDataPoints += values.length;
        });
        console.log(`Total data points collected: ${totalDataPoints}`);
        console.log(`Models found: ${Object.keys(groupedData).length}`);
        
        // Convert to array format for D3
        const formattedData = Object.keys(groupedData).map(model => {
          // Sort values for calculating quartiles
          const values = groupedData[model].sort((a, b) => a - b);
          console.log(`Model ${model}: ${values.length} data points`);
          
          return {
            model,
            values
          };
        });
        
        // Filter out models with no valid data
        let filteredData = formattedData.filter(item => item.values && item.values.length > 0);
        
        // Sort the data according to our predefined order
        const modelOrder = modelConfig.getAllModels();
        filteredData.sort((a, b) => {
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
        
        console.log(`Final dataset size: ${filteredData.length} models with data`);
        setData(filteredData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(`Failed to fetch data from Supabase: ${err.message}`);
      } finally {
        setLoading(false);
        console.log('Data loading complete');
      }
    };
    
    fetchData();
  }, [kldThreshold]); // Re-fetch when KLD threshold changes

  useEffect(() => {
    if (loading || error || !data || data.length === 0) return;

    // Clear any existing SVG
    d3.select(svgRef.current).selectAll('*').remove();

    // Chart dimensions
    const margin = { top: 40, right: 30, bottom: 120, left: 50 }; // Increased bottom margin for architecture labels
    const width = 1200 - margin.left - margin.right; // Wider to accommodate all models
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
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('border', 'solid')
      .style('border-width', '1px')
      .style('border-radius', '5px')
      .style('padding', '10px')
      .style('position', 'absolute')
      .style('font-weight', 'bold');

    // X scale (categorical)
    const x = d3.scaleBand()
      .domain(data.map(d => d.model))
      .range([0, width])
      .paddingInner(0.3)
      .paddingOuter(0.2);

    // Find min and max values across all models for y-scale
    const allValues = data.flatMap(d => d.values);
    const yMin = Math.min(...allValues);
    const yMax = Math.max(...allValues);

    // Y scale (continuous)
    const y = d3.scaleLinear()
      .domain([0, safeParse(yMax * 1.1, 10)]) // Start at 0 and add 10% padding on top
      .range([height, 0]);

    // Axes
    // X-axis with model numbers instead of full names
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => {
        // Display only the model number (digits after the underscore)
        return modelConfig.getModelNumber(d);
      }))
      .selectAll('text')
      .style('text-anchor', 'middle') // Center align the model numbers
      .attr('dy', '0.5em')
      .style('fill', '#7C807C')
      .style('font-weight', 'bold');

    svg.append('g')
      .call(d3.axisLeft(y))
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
      .text(`Frobenius Norm Distribution by Model (KLD ≤ ${kldThreshold}, Frobenius Norm ≤ ${frobThreshold})`);

    // Y-axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -height / 2)
      .attr('text-anchor', 'middle')
      .text('Frobenius Norm')
      .style('fill', '#7C807C');

    // Group rectangles for architecture labels
    const architectureBars = svg.append('g')
      .attr('class', 'architecture-bars')
      .attr('transform', `translate(0,${height + 30})`); // Position below the x-axis

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
          
          // Draw the architecture bar
          architectureBars.append('rect')
            .attr('x', groupStartX)
            .attr('y', 0)
            .attr('width', groupWidth)
            .attr('height', 30)
            .attr('fill', currentGroup.color || '#999')
            .attr('opacity', 0.8);
          
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
      
      architectureBars.append('rect')
        .attr('x', groupStartX)
        .attr('y', 0)
        .attr('width', groupWidth)
        .attr('height', 30)
        .attr('fill', currentGroup.color || '#999')
        .attr('opacity', 0.8);
      
      architectureBars.append('text')
        .attr('x', groupStartX + groupWidth / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .style('font-weight', 'bold')
        .text(currentGroup.name);
    }

    // Draw box plots
    data.forEach((modelData, i) => {
      const values = modelData.values;
      
      // Skip if no valid values
      if (!values || values.length === 0) return;
      
      // Get the appropriate color for this model
      const modelGroup = modelConfig.getGroupForModel(modelData.model);
      const boxColor = modelGroup ? modelGroup.color : d3.schemeCategory10[i % 10];
      
      // Calculate quartiles safely
      let q1, median, q3, min, max, iqr, outliers;
      
      try {
        q1 = d3.quantile(values, 0.25) || 0;
        median = d3.quantile(values, 0.5) || 0;
        q3 = d3.quantile(values, 0.75) || 0;
        iqr = q3 - q1;
        min = Math.max(safeParse(d3.min(values)), safeParse(q1 - 1.5 * iqr));
        max = Math.min(safeParse(d3.max(values)), safeParse(q3 + 1.5 * iqr));
        
        // Outliers (values outside the whiskers)
        outliers = values.filter(v => v < min || v > max);
      } catch (err) {
        console.error('Error calculating box plot statistics:', err);
        return; // Skip this model if there's an error
      }
      
      const boxWidth = x.bandwidth();
      const boxX = x(modelData.model);
      
      // Draw vertical line (min to max)
      svg.append('line')
        .attr('x1', boxX + boxWidth / 2)
        .attr('x2', boxX + boxWidth / 2)
        .attr('y1', y(safeParse(min)))
        .attr('y2', y(safeParse(max)))
        .attr('stroke', '#000')
        .attr('stroke-width', 1);
      
      // Draw box (q1 to q3)
      svg.append('rect')
        .attr('x', boxX)
        .attr('y', y(safeParse(q3)))
        .attr('width', boxWidth)
        .attr('height', safeParse(y(safeParse(q1)) - y(safeParse(q3))))
        .attr('stroke', '#000')
        .attr('fill', boxColor)
        .attr('fill-opacity', 0.3)
        .on('mouseover', function(event) {
          tooltip.transition()
            .duration(200)
            .style('opacity', 0.9);
          tooltip.html(`
            Min: ${safeParse(min).toFixed(4)}<br/>
            Q1: ${safeParse(q1).toFixed(4)}<br/>
            Median: ${safeParse(median).toFixed(4)}<br/>
            Q3: ${safeParse(q3).toFixed(4)}<br/>
            Max: ${safeParse(max).toFixed(4)}<br/>
            Count: ${values.length}<br/>
            Outliers: ${outliers ? outliers.length : 0}
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          tooltip.transition()
            .duration(500)
            .style('opacity', 0);
        });
      
      // Draw median line
      svg.append('line')
        .attr('x1', boxX)
        .attr('x2', boxX + boxWidth)
        .attr('y1', y(safeParse(median)))
        .attr('y2', y(safeParse(median)))
        .attr('stroke', '#000')
        .attr('stroke-width', 2);
      
      // Draw whiskers (horizontal lines at min and max)
      svg.append('line')
        .attr('x1', boxX + boxWidth * 0.25)
        .attr('x2', boxX + boxWidth * 0.75)
        .attr('y1', y(safeParse(min)))
        .attr('y2', y(safeParse(min)))
        .attr('stroke', '#000')
        .attr('stroke-width', 1);
      
      svg.append('line')
        .attr('x1', boxX + boxWidth * 0.25)
        .attr('x2', boxX + boxWidth * 0.75)
        .attr('y1', y(safeParse(max)))
        .attr('y2', y(safeParse(max)))
        .attr('stroke', '#000')
        .attr('stroke-width', 1);
      
      // Draw outliers
      if (outliers && outliers.length > 0) {
        // Limit the number of outliers to render for performance
        const maxOutliersToRender = 100;
        const outliersToRender = outliers.length > maxOutliersToRender 
          ? outliers.slice(0, maxOutliersToRender) 
          : outliers;
        
        outliersToRender.forEach(outlier => {
          if (outlier === null || outlier === undefined || isNaN(outlier)) return;
          
          svg.append('circle')
            .attr('cx', boxX + boxWidth / 2)
            .attr('cy', y(safeParse(outlier)))
            .attr('r', 3)
            .attr('fill', boxColor)
            .attr('fill-opacity', 0.2)
            .attr('stroke', 'none')
            .on('mouseover', function(event) {
              tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);
              tooltip.html(`
                Outlier value: ${safeParse(outlier).toFixed(4)}
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
        
        // If we limited the outliers, add a note
        if (outliers.length > maxOutliersToRender) {
          svg.append('text')
            .attr('x', boxX + boxWidth / 2)
            .attr('y', y(safeParse(min)) + 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', 'red')
            .text(`+ ${outliers.length - maxOutliersToRender} more outliers`);
        }
      }
    });

  }, [data, loading, error, kldThreshold]);

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

  // Calculate total examples across all models
  const totalExamples = data.reduce((sum, model) => sum + (model.values ? model.values.length : 0), 0);

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
              className="px-4 py-2 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'FILTER'}
            </button>
          </div>
          <div className="flex items-center gap-2 flex-grow">
            <span className="text-sm text-gray-500">
              Showing {totalExamples.toLocaleString()} examples across {data.length} models
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
                  className="bg-blue-600 h-2.5 rounded-full" 
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
      {!loading && !error && (!data || data.length === 0) && <div className="p-4">No data available for the current KLD threshold</div>}
      
      {!loading && !error && data && data.length > 0 && (
        <div className="overflow-x-auto">
          <div ref={tooltipRef} className="absolute opacity-0 pointer-events-none"></div>
          <svg ref={svgRef}></svg>
          <div className="mt-4 text-sm text-gray-600">
            <p className="mb-2"><strong>Box Plot Explanation:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Each box represents the interquartile range (IQR) from 25th to 75th percentile</li>
              <li>The line inside the box shows the median value</li>
              <li>The whiskers extend to the minimum and maximum values (excluding outliers)</li>
              <li>Red dots represent outliers (values more than 1.5 × IQR from the box edges)</li>
              <li>For performance, only up to 100 outliers are shown per model</li>
            </ul>
            <p className="mt-2">
              <strong>Interpretation:</strong> Models with lower Frobenius norm values are generally more robust against 
              adversarial attacks, as they require larger perturbations to cause misclassification.
            </p>
            <p className="mt-2">
              <strong>Current Filters:</strong> 
            </p>
            <ul className="list-disc pl-5 mt-1">
                <li>KLD ≤ {kldThreshold}</li>
                <li>Frobenius Norm ≤ {frobThreshold}</li>
            </ul>
            <p className="mt-2">
              <strong>Data Details:</strong> Visualizing {totalExamples.toLocaleString()} examples from a total of {totalCount.toLocaleString()} in the database
              {totalCount > 0 && ` (${((totalExamples / totalCount) * 100).toFixed(1)}%)`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FrobeniusBoxPlot;