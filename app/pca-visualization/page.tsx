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
      
      <h1 className="text-2xl font-bold mb-6">Adversarial Examples Across Iterations</h1>
      <h2 className="text-xl mb-6">Check out this PCA projection of adversarial examples and their distance
        from the original images in 3D space. These adversarial examples were trained against the Autoencoder 64 Bottleneck 
        model across its 4 iterations. Click <b>ITERATE</b> to observe the adversarial examples backing away from their
        original image counterparts, and begin to <i>disappear</i>... 
      </h2>
      <div className="bg-black p-1 rounded-lg">
        <PCAVisualization />
      </div>
    </div>
  );
}