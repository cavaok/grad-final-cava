'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as d3 from 'd3';

// Initialize Supabase client
const supabaseUrl = 'https://fxwzblzdvwowourssdih.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const ExploreFrob = () => {
  const [frobValue, setFrobValue] = useState(2); // Initial value
  const [example, setExample] = useState(null);
  const [loading, setLoading] = useState(true);
  const [histogramData, setHistogramData] = useState([]);
  const [histogramLoading, setHistogramLoading] = useState(true);
  const [totalExamples, setTotalExamples] = useState(0);
  const sliderRef = useRef(null);
  const tooltipRef = useRef(null);

  // Format the image data for display
  const formatImageData = (imageArray) => {
    if (!imageArray || !Array.isArray(imageArray)) return null;
    
    // Assuming the image is a 28x28 grayscale image (MNIST-like)
    const width = 28;
    const height = 28;
    
    // Create a canvas element to draw the image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Create an ImageData object
    const imageData = ctx.createImageData(width, height);
    
    // Fill the ImageData with the values from the array
    for (let i = 0; i < imageArray.length; i++) {
      // Calculate x, y coordinates
      const x = i % width;
      const y = Math.floor(i / width);
      const idx = (y * width + x) * 4;
      
      // Scale the value to 0-255 range
      const pixelValue = Math.max(0, Math.min(255, Math.round(imageArray[i] * 255)));
      
      // Set RGBA values (grayscale with full alpha)
      imageData.data[idx] = pixelValue;     // R
      imageData.data[idx + 1] = pixelValue; // G
      imageData.data[idx + 2] = pixelValue; // B
      imageData.data[idx + 3] = 255;        // Alpha (fully opaque)
    }
    
    // Put the ImageData onto the canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Return the canvas data URL
    return canvas.toDataURL('image/png', 1.0); // Full quality
  };

  // Fetch data for histogram
  useEffect(() => {
    const fetchHistogramData = async () => {
      try {
        setHistogramLoading(true);
        
        // Get the histogram data from the optimized SQL function
        const { data, error } = await supabase.rpc('get_frob_histogram');
        
        if (error) {
          console.error('Error calling get_frob_histogram:', error);
          throw error;
        }
        
        console.log('Received histogram data:', data?.length || 0, 'bins');
        
        // Process the data into our format
        const formattedData = [];
        let total = 0;
        
        // data should already include all bins (even empty ones)
        for (const bin of data) {
          formattedData.push({
            binStart: bin.bin_start,
            binEnd: bin.bin_end,
            count: bin.count,
            x: bin.bin_start,
            width: 0.25
          });
          
          total += bin.count;
        }
        
        console.log(`Processed ${formattedData.length} bins, total examples: ${total}`);
        setHistogramData(formattedData);
        setTotalExamples(total);
        
      } catch (err) {
        console.error('Failed to get histogram data:', err);
        
        // Get total count of rows to report
        try {
          const { count } = await supabase
            .from('adversarial_examples')
            .select('*', { count: 'exact', head: true });
            
          console.log(`Database has ${count} total rows`);
          setTotalExamples(count || 0);
        } catch (countErr) {
          console.error('Count query failed:', countErr);
        }
        
        // Create a fallback direct count query
        try {
          console.log('Attempting direct SQL count query by bins...');
          
          // Create empty bins (we'll fill client-side if needed)
          const emptyBins = Array.from({ length: 40 }, (_, i) => ({
            binStart: i * 0.25,
            binEnd: (i + 1) * 0.25,
            count: 0,
            x: i * 0.25,
            width: 0.25
          }));
          
          setHistogramData(emptyBins);
          
          // Try to get a sample to fill some bins
          const { data: sampleData, error: sampleError } = await supabase
            .from('adversarial_examples')
            .select('frob')
            .limit(5000); // Get as much as Supabase will allow
            
          if (sampleError) throw sampleError;
          
          if (sampleData && sampleData.length > 0) {
            console.log(`Got ${sampleData.length} samples for fallback binning`);
            
            // Create bins from sample (at least we'll have some representation)
            const sampleBins = [...emptyBins];
            
            // Count samples in each bin
            sampleData.forEach(item => {
              if (item.frob !== null && !isNaN(item.frob)) {
                const binIndex = Math.floor(item.frob / 0.25);
                if (binIndex >= 0 && binIndex < 40) {
                  sampleBins[binIndex].count++;
                }
              }
            });
            
            setHistogramData(sampleBins);
            console.log('Created sample bins from available data');
          }
        } catch (fallbackErr) {
          console.error('All fallback approaches failed:', fallbackErr);
        }
      } finally {
        setHistogramLoading(false);
      }
    };
    
    fetchHistogramData();
  }, []);

  // Initialize the histogram slider using D3
  useEffect(() => {
    if (!sliderRef.current || histogramData.length === 0) return;
    
    // Clear any existing slider
    d3.select(sliderRef.current).selectAll('*').remove();
    
    const margin = { top: 20, right: 30, bottom: 40, left: 30 };
    const width = 900 - margin.left - margin.right;
    // Reduce height for more compact visualization
    const height = 160 - margin.top - margin.bottom;
    
    // Create the SVG
    const svg = d3.select(sliderRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Add a white background
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#ffffff')
      .attr('rx', 8)
      .attr('ry', 8);
    
    // Find max count for scaling
    const maxCount = Math.max(1, d3.max(histogramData, d => d.count));
    
    // Create scales
    const x = d3.scaleLinear()
      .domain([0, 10])
      .range([0, width])
      .clamp(true);
    
    // Create tooltip div if it doesn't exist
    if (!document.getElementById('histogram-tooltip')) {
      const tooltipDiv = document.createElement('div');
      tooltipDiv.id = 'histogram-tooltip';
      tooltipDiv.style.position = 'fixed'; // Use fixed instead of absolute
      tooltipDiv.style.display = 'none';
      tooltipDiv.style.background = 'rgba(0, 0, 0, 0.8)';
      tooltipDiv.style.color = 'white';
      tooltipDiv.style.padding = '8px 12px';
      tooltipDiv.style.borderRadius = '4px';
      tooltipDiv.style.fontSize = '12px';
      tooltipDiv.style.pointerEvents = 'none';
      tooltipDiv.style.zIndex = '100';
      // Remove the transform that was causing issues
      // tooltipDiv.style.transform = 'translate(-50%, -100%)';
      // tooltipDiv.style.marginTop = '-5px';
      document.body.appendChild(tooltipDiv); // Append to body instead of sliderRef
      tooltipRef.current = tooltipDiv;
    }
    
    // Apply log scaling for better visualization of large differences
    const logScale = (count) => {
      // Use log scale with +1 to handle zeros
      return count > 0 ? height - (Math.log(count + 1) / Math.log(maxCount + 1)) * height : height;
    };
    
    // Create a gradient for the histogram bars
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "histogramGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
      
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#9e7de8")
      .attr("stop-opacity", 0.9);
      
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#6a51a3")
      .attr("stop-opacity", 0.7);
    
    // Draw the histogram bars
    svg.selectAll('.hist-bar')
      .data(histogramData)
      .enter()
      .append('rect')
      .attr('class', 'hist-bar')
      .attr('x', d => x(d.binStart))
      .attr('y', d => (d.count > 0) ? logScale(d.count) : height) // Use log scaling for better visualization
      .attr('width', d => Math.max(1, x(d.binStart + d.width) - x(d.binStart))) // Ensure minimum width of 1px
      .attr('height', d => (d.count > 0) ? height - logScale(d.count) : 0) // Height based on log scale
      .attr('fill', 'url(#histogramGradient)') // Use gradient instead of solid color
      .attr('stroke', 'none')
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        // Highlight the bar
        d3.select(this)
          .transition()
          .duration(100)
          .attr('fill', '#9e7de8');
        
        // Show tooltip
        const tooltip = d3.select('#histogram-tooltip');
        tooltip.style('display', 'block')
          .html(`
            <div style="text-align: center;">
              <strong>${d.count.toLocaleString()}</strong> examples<br>
              Frob: ${d.binStart.toFixed(2)} - ${d.binEnd.toFixed(2)}
            </div>
          `)
          // Position tooltip directly at cursor with small offset
          .style('left', `${event.clientX - 50}px`)
          .style('top', `${event.clientY - 60}px`);
      })
      .on('mouseout', function() {
        // Restore original color
        d3.select(this)
          .transition()
          .duration(100)
          .attr('fill', 'url(#histogramGradient)');
        
        // Hide tooltip
        d3.select('#histogram-tooltip').style('display', 'none');
      })
      .on('click', function(event, d) {
        // Set the frob value to the middle of the bin
        const newValue = d.binStart + (d.width / 2);
        setFrobValue(newValue);
      });
    
    // Add the x-axis
    svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => d).ticks(10))
      .selectAll('text')
      .style('fill', '#000000')
      .style('font-weight', 'bold');
    
    // Add the slider line
    svg.append('line')
      .attr('class', 'track')
      .attr('x1', x.range()[0])
      .attr('x2', x.range()[1])
      .attr('y1', height)
      .attr('y2', height)
      .attr('stroke', '#222222')
      .attr('stroke-width', 10)
      .attr('stroke-linecap', 'round')
      .style('cursor', 'pointer')
      .on('click', function(event) {
        // Allow clicking on the track to jump to that position
        const trackX = d3.pointer(event)[0];
        const value = x.invert(trackX);
        const roundedValue = Math.round(value * 100) / 100;
        setFrobValue(roundedValue);
      });
    
    // Add the handle
    const handle = svg.append('circle')
      .attr('class', 'handle')
      .attr('r', 15)
      .attr('cx', x(frobValue))
      .attr('cy', height)
      .attr('fill', '#ffffff')
      .attr('stroke', '#000000')
      .attr('stroke-width', 2)
      .style('cursor', 'grab')
      .style('filter', 'drop-shadow(0 0 6px white)');
    
    // Add the value text
    const valueText = svg.append('text')
      .attr('class', 'value-text')
      .attr('x', x(frobValue))
      .attr('y', height)
      .attr('dy', '.3em')
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#000000')
      .text(frobValue.toFixed(2));
    
    // Create dragging behavior - FIXED VERSION
    const drag = d3.drag()
      .on('start', function() {
        d3.select(this).style('cursor', 'grabbing');
      })
      .on('drag', function(event) {
        // Calculate new position with constraints
        // Use the mouse position relative to the svg container
        const svgBounds = sliderRef.current.querySelector('svg').getBoundingClientRect();
        const relativeX = event.sourceEvent.clientX - svgBounds.left - margin.left;
        
        // Ensure we stay within bounds
        const newX = Math.max(0, Math.min(width, relativeX));
        const value = x.invert(newX);
        const roundedValue = Math.round(value * 100) / 100;
        
        // Update handle position
        d3.select(this).attr('cx', x(roundedValue));
        
        // Update text position and content
        valueText
          .attr('x', x(roundedValue))
          .text(roundedValue.toFixed(2));
        
        // Update state
        setFrobValue(roundedValue);
      })
      .on('end', function() {
        d3.select(this).style('cursor', 'grab');
      });
    
    // Apply drag behavior to handle
    handle.call(drag);
    
    // Return cleanup function
    return () => {
      d3.select(sliderRef.current).selectAll('*').remove();
      if (tooltipRef.current) {
        tooltipRef.current.remove();
      }
    };
  }, [histogramData, frobValue]);

  // Update slider when frobValue changes programmatically
  useEffect(() => {
    if (!sliderRef.current) return;
    
    const svg = d3.select(sliderRef.current).select('svg g');
    if (svg.empty()) return;
    
    const width = 900 - 30 - 30;
    
    // Create scale for positioning
    const x = d3.scaleLinear()
      .domain([0, 10])
      .range([0, width])
      .clamp(true);
    
    // Update handle position
    svg.select('.handle')
      .transition()
      .duration(200)
      .attr('cx', x(frobValue));
    
    // Update value text
    svg.select('.value-text')
      .transition()
      .duration(200)
      .attr('x', x(frobValue))
      .text(frobValue.toFixed(2));
  }, [frobValue]);

  // Fetch data when frobValue changes
  useEffect(() => {
    const fetchData = async () => {
      // Don't show loading indicator for small slider adjustments
      const isLargeChange = !example || Math.abs((example?.frob || 0) - frobValue) > 0.3;
      if (isLargeChange) {
        setLoading(true);
      }
      
      try {
        // Find the example with the closest Frobenius norm from any model
        const { data, error } = await supabase
          .from('adversarial_examples')
          .select('*')
          .filter('frob', 'gte', frobValue - 0.1)
          .filter('frob', 'lte', frobValue + 0.1)
          .order('frob', { ascending: frobValue > 0 })
          .limit(5);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Find the example with the closest Frobenius norm
          let closestExample = data[0];
          let minDiff = Math.abs(data[0].frob - frobValue);
          
          for (let i = 1; i < data.length; i++) {
            const diff = Math.abs(data[i].frob - frobValue);
            if (diff < minDiff) {
              minDiff = diff;
              closestExample = data[i];
            }
          }
          
          setExample(closestExample);
        } else {
          // If no examples found in the narrow range, try a wider search
          const { data: widerData, error: widerError } = await supabase
            .from('adversarial_examples')
            .select('*')
            .filter('frob', 'gte', frobValue - 0.5)
            .filter('frob', 'lte', frobValue + 0.5)
            .order('frob', { ascending: frobValue > 0 })
            .limit(5);
            
          if (widerError) throw widerError;
          
          if (widerData && widerData.length > 0) {
            // Find the example with the closest Frobenius norm
            let closestExample = widerData[0];
            let minDiff = Math.abs(widerData[0].frob - frobValue);
            
            for (let i = 1; i < widerData.length; i++) {
              const diff = Math.abs(widerData[i].frob - frobValue);
              if (diff < minDiff) {
                minDiff = diff;
                closestExample = widerData[i];
              }
            }
            
            setExample(closestExample);
          } else {
            setExample(null);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setExample(null);
      } finally {
        setLoading(false);
      }
    };
    
    // Add debounce to prevent too many API calls
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [frobValue]);

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Title Box */}
      <div className="mb-4 bg-gray-100 p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap items-center">
          <div className="flex-1">
            <h2 className="text-lg text-black font-semibold">The Visual Impact of Perturbation Magnitude</h2>
            <p className="text-sm text-gray-600 mt-1">
              Move the slider to compare the impact of various Frobenius (Frob) norm. This visualization pulls from the entire dataset 
              of adversarial examples, and displays the original image and adversarial example pair with a Frob value closest to the
              one you selected. The histogram shows the distribution of Frob norms across the dataset (40,440 rows). 
            </p>
          </div>
        </div>
      </div>

      {/* Dataset Info - Moved above the slider */}
      <div className="mb-2 text-center text-sm text-gray-600">
        {!histogramLoading && (
          <span>
            Distribution of Frobenius norm values across entire dataset
          </span>
        )}
      </div>
      
      {/* D3 Histogram Slider */}
      <div className="mb-6 flex justify-center">
        <div ref={sliderRef} className="w-full relative"></div>
      </div>
      
      {/* Loading indicator for histogram */}
      {histogramLoading && (
        <div className="text-center py-2 text-purple-800 font-medium">
          Loading histogram data...
        </div>
      )}
      
      {/* Display the images */}
      {loading ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : example ? (
        <div className="flex justify-center items-center mt-4">
          <div className="flex items-center gap-2">
            {/* Original Image */}
            <div className="flex flex-col items-center">
              <div className="bg-gray-800 p-4 inline-block">
                <img 
                  src={formatImageData(example.image)} 
                  alt="Original Image"
                  style={{ 
                    imageRendering: 'pixelated',
                    width: '252px',
                    height: '252px',
                    filter: 'drop-shadow(0 0 8px gray)'
                  }}
                />
              </div>
              <p className="mt-2 text-center text-black"><b>Original Image</b></p>
            </div>
            
            {/* Arrow with metrics */}
            <div className="mx-2">
              <svg width="160" height="60">
                <defs>
                  <linearGradient id="purple-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#a855f7" /> {/* light purple */}
                    <stop offset="100%" stopColor="#7e22ce" /> {/* dark purple */}
                  </linearGradient>
                </defs>
                <rect x="0" y="15" width="130" height="30" fill="url(#purple-gradient)" rx="5" />
                <polygon points="125,5 125,55 160,30" fill="#7e22ce" />
                <text x="65" y="35" textAnchor="middle" fill="#ffffff" fontWeight="bold" fontSize="14">
                  Actual Frob: {example.frob.toFixed(2)}
                </text>
              </svg>
            </div>
            
            {/* Adversarial Image */}
            <div className="flex flex-col items-center">
              <div className="bg-gray-800 p-4 inline-block">
                <img 
                  src={formatImageData(example.adversarial_image)} 
                  alt="Adversarial Image"
                  style={{ 
                    imageRendering: 'pixelated',
                    width: '252px',
                    height: '252px',
                    filter: 'drop-shadow(0 0 8px gray)'
                  }}
                />
              </div>
              <p className="mt-2 text-center text-black"><b>Adversarial Example</b></p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-500">No example found with Frobenius norm close to {frobValue.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
};

export default ExploreFrob;