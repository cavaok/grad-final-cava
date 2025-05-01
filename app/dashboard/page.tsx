// app/dashboard/page.jsx
"use client";

import FrobeniusBoxPlot from '@/components/FrobeniusBoxPlot';
import ExploreFrob from '@/components/ExploreFrob';
import PercentSuccess from '@/components/PercentSuccess';
import ComparativeRobustness from '@/components/ComparativeRobustness';
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
      
      <h1 className="text-2xl font-bold mb-2">Analysis of Adversarial Attacks</h1>

      <h2 className="text-xl mb-8">In the following visualizations we will evaluate the attacks through two main metrics: 
        <li> Perturbation Severity: Quantified by the Frobenius norm (distance between original image and adversarial example) </li>
        <li> Percent Success: # of Successful Attacks / 900 Total Attacks * 100</li>
      </h2>

      <h1 className="text-2xl font-bold mb-2">Severity of Perturbations</h1>
      
      
      {/* Toggle button for the explorer */}
      <div className="mb-4">
        <button
          onClick={() => setShowExplorer(!showExplorer)}
          className="px-4 py-2 bg-purple-600 text-white rounded shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
          >
          {showExplorer ? 'Hide Perturbation Explorer' : 'Show Perturbation Explorer'}
        </button>
      </div>
      
      {/* ExploreFrob component - conditionally rendered */}
      {showExplorer && (
        <div className="mb-8 bg-white rounded-lg shadow-md overflow-x-auto">
          <ExploreFrob />
        </div>
      )}
      
      {/* Main visualization */}
      <div className="mb-8 bg-white rounded-lg shadow-md overflow-x-auto">
        <FrobeniusBoxPlot />
      </div>

      <h1 className="text-2xl font-bold mb-2">Percent Success of Attacks</h1>
      <div className="mb-8 bg-white rounded-lg shadow-md overflow-x-auto">
        <PercentSuccess />
      </div>

      <h1 className="text-2xl font-bold mb-2">Combined Metrics</h1>
      <div className="mb-8 bg-white rounded-lg shadow-md overflow-x-auto">
        <ComparativeRobustness />
      </div>
    </div>
  );
}