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

const FrobeniusBoxPlot = () => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kldThreshold, setKldThreshold] = useState(0.07);
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
          .lte('label_kld', kldThreshold);
        
        if (countError) throw countError;
        
        setTotalCount(count || 0);
        setLoadProgress(prev => ({ ...prev, total: count || 0 }));
        
        // Group data structure to collect all results
        const groupedData = {};
        let processedCount = 0;
        let startIndex = 0;
        const pageSize = 5000; // Larger page size for efficiency
        
        // Fetch data in batches
        let hasMoreData = true;
        
        while (hasMoreData) {
          const { data: pageData, error: pageError } = await supabase
            .from('adversarial_examples')
            .select('model_name, frob, label_kld')
            .lte('label_kld', kldThreshold)
            .range(startIndex, startIndex + pageSize - 1);
          
          if (pageError) throw pageError;
          
          // Process this batch of data
          pageData.forEach(item => {
            // Skip items with invalid frob values
            if (item.frob === null || item.frob === undefined || isNaN(item.frob)) {
              return;
            }
            
            if (!groupedData[item.model_name]) {
              groupedData[item.model_name] = [];
            }
            groupedData[item.model_name].push(item.frob);
          });
          
          processedCount += pageData.length;
          startIndex += pageSize;
          
          // Update progress
          setLoadProgress({
            current: processedCount,
            total: count || 0,
            percentage: Math.round((processedCount / (count || 1)) * 100)
          });
          
          // Check if we've fetched all data
          hasMoreData = pageData.length === pageSize;
          
          // If no data was returned, break the loop
          if (pageData.length === 0) {
            hasMoreData = false;
          }
        }
        
        // Convert to array format for D3
        const formattedData = Object.keys(groupedData).map(model => {
          // Sort values for calculating quartiles
          const values = groupedData[model].sort((a, b) => a - b);
          
          return {
            model,
            values
          };
        });
        
        // Filter out models with no valid data
        const filteredData = formattedData.filter(item => item.values && item.values.length > 0);
        
        setData(filteredData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data from Supabase');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [kldThreshold]); // Re-fetch when KLD threshold changes

  useEffect(() => {
    if (loading || error || !data || data.length === 0) return;

    // Clear any existing SVG
    d3.select(svgRef.current).selectAll('*').remove();

    // Chart dimensions
    const margin = { top: 40, right: 30, bottom: 90, left: 50 };
    const width = 1000 - margin.left - margin.right;
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
      .style('background-color', 'white')
      .style('border', 'solid')
      .style('border-width', '1px')
      .style('border-radius', '5px')
      .style('padding', '10px')
      .style('position', 'absolute');

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
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    svg.append('g')
      .call(d3.axisLeft(y));

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(`Frobenius Norm Distribution by Model (KLD ≤ ${kldThreshold})`);

    // Y-axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -height / 2)
      .attr('text-anchor', 'middle')
      .text('Frobenius Norm');

    // Color scale for boxes
    const color = d3.scaleOrdinal()
      .domain(data.map(d => d.model))
      .range(d3.schemeCategory10);

    // Draw box plots
    data.forEach((modelData, i) => {
      const values = modelData.values;
      
      // Skip if no valid values
      if (!values || values.length === 0) return;
      
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
      const boxColor = color(modelData.model);
      
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
            <strong>${modelData.model}</strong><br/>
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
            .attr('fill', 'red')
            .attr('stroke', '#000')
            .attr('stroke-width', 0.5)
            .on('mouseover', function(event) {
              tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);
              tooltip.html(`
                <strong>${modelData.model}</strong><br/>
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

  // Handle KLD threshold change
  const handleKldChange = (e) => {
    let value = parseFloat(e.target.value);
    if (isNaN(value)) value = 0.07; // Default to 0.07 if input is invalid
    setKldThreshold(value);
  };

  // Calculate total examples across all models
  const totalExamples = data.reduce((sum, model) => sum + (model.values ? model.values.length : 0), 0);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      {/* Navigation bar with filter controls */}
      <div className="mb-6 bg-gray-100 p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Adversarial Examples Analysis</h2>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="kld-threshold" className="font-medium text-gray-700">
              KLD Threshold:
            </label>
            <input
              id="kld-threshold"
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={kldThreshold}
              onChange={handleKldChange}
              className="w-24 p-2 border border-gray-300 rounded shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Showing {totalExamples.toLocaleString()} examples across {data.length} models
              {totalCount > 0 && ` (${((totalExamples / totalCount) * 100).toFixed(1)}% of ${totalCount.toLocaleString()} total)`}
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
        <>
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
              <strong>Current Filter:</strong> Only showing examples with KLD ≤ {kldThreshold}
            </p>
            <p className="mt-2">
              <strong>Data Details:</strong> Visualizing {totalExamples.toLocaleString()} examples from a total of {totalCount.toLocaleString()} in the database
              {totalCount > 0 && ` (${((totalExamples / totalCount) * 100).toFixed(1)}%)`}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default FrobeniusBoxPlot;