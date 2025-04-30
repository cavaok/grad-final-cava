// app/dashboard/page.jsx
"use client";

import FrobeniusBoxPlot from '@/components/FrobeniusBoxPlot';

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Adversarial Examples Analysis</h1>
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