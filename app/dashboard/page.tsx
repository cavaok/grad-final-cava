// app/dashboard/page.jsx
"use client";

import FrobeniusBoxPlot from '@/components/FrobeniusBoxPlot';
import ExploreFrob from '@/components/ExploreFrob';
import Link from 'next/link';
import { useState } from 'react';

export default function DashboardPage() {
  const [showExplorer, setShowExplorer] = useState(false);
  
  return (
    <div className="container mx-auto p-4">
      {/* Simple Home Button */}
      <div className="mb-4">
        <Link 
          href="/" 
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md shadow-sm transition-colors inline-block"
        >
          Home
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">Adversarial Examples Analysis</h1>
      
      {/* Toggle button for the explorer */}
      <div className="mb-4">
        <button
          onClick={() => setShowExplorer(!showExplorer)}
          className="px-4 py-2 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          {showExplorer ? 'Hide Example Explorer' : 'Show Example Explorer'}
        </button>
      </div>
      
      {/* ExploreFrob component - conditionally rendered */}
      {showExplorer && (
        <div className="mb-8 bg-white rounded-lg shadow-md overflow-x-auto">
          <ExploreFrob />
        </div>
      )}
      
      {/* Main visualization */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <FrobeniusBoxPlot />
      </div>
      
      <div className="mt-6 p-4 bg-gray-100 rounded-lg text-sm">
        <h2 className="text-lg font-semibold mb-2">About This Visualization</h2>
        <p>
          This visualization shows the distribution of Frobenius norm values across different models in a box and whisker plot.
          The data is filtered based on the KLD (Kullback-Leibler Divergence) threshold you select in the navigation bar.
        </p>
        <p className="mt-2">
          <strong>Key Metrics:</strong>
        </p>
        <ul className="list-disc pl-5 mt-1">
          <li><strong>Frobenius Norm (frob):</strong> Measures the magnitude of perturbation in adversarial examples</li>
          <li><strong>KLD (label_kld):</strong> Measures dissimilarity between original and adversarial predictions</li>
        </ul>
        <p className="mt-2">
          <strong>How to Use:</strong> Adjust the KLD threshold in the navigation bar to filter the examples shown in the visualization.
          A lower threshold will show only examples with smaller KLD values, which typically represent more successful adversarial attacks
          with less detectable changes.
        </p>
      </div>
    </div>
  );
}