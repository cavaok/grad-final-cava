'use client';

import React from 'react';
import PCAVisualization from '@/components/PCAVisualization';

export default function PCAVisualizationPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">PCA Visualization</h1>
      <div className="bg-black p-1 rounded-lg">
        <PCAVisualization />
      </div>
    </div>
  );
}