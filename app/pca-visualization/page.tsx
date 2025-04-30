'use client';

import React from 'react';
import Link from 'next/link';
import PCAVisualization from '@/components/PCAVisualization';

export default function PCAVisualizationPage() {
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
      
      <h1 className="text-2xl font-bold mb-6">PCA Visualization</h1>
      <div className="bg-black p-1 rounded-lg">
        <PCAVisualization />
      </div>
    </div>
  );
}
