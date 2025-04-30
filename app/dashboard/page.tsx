// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { fetchModelStatistics } from '@/lib/supabase';
import FrobeniusNormDistribution from '@/components/FrobeniusNormDistribution';
import ModelComparison from '@/components/ModelComparison';
import StatsSummary from '@/components/StatsSummary';
import ThresholdAnalysis from '@/components/ThresholdAnalysis';

export default function DashboardPage() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('boxplot');

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        setLoading(true);
        const modelStats = await fetchModelStatistics();
        setStats(modelStats);
      } catch (err) {
        console.error('Error loading statistics:', err);
        setError('Failed to load model statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'boxplot':
        return <FrobeniusNormDistribution />;
      case 'comparison':
        return <ModelComparison />;
      case 'threshold':
        return <ThresholdAnalysis />;
      case 'summary':
        return <StatsSummary statistics={stats} loading={loading} error={error} />;
      default:
        return <FrobeniusNormDistribution />;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Adversarial Examples Analysis</h1>
        <p className="text-gray-600">
          Interactive visualization of Frobenius norm distributions and model comparisons
        </p>
      </header>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px">
          <li className="mr-2">
            <button
              className={`inline-block py-2 px-4 text-sm font-medium ${
                activeTab === 'boxplot'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('boxplot')}
            >
              Distribution
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block py-2 px-4 text-sm font-medium ${
                activeTab === 'comparison'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('comparison')}
            >
              Model Comparison
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block py-2 px-4 text-sm font-medium ${
                activeTab === 'threshold'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('threshold')}
            >
              Threshold Analysis
            </button>
          </li>
          <li>
            <button
              className={`inline-block py-2 px-4 text-sm font-medium ${
                activeTab === 'summary'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('summary')}
            >
              Summary Statistics
            </button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-md">
        {renderTabContent()}
      </div>

      {/* Additional Information */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">About This Dashboard</h2>
        <p className="mb-2">
          This dashboard visualizes the Frobenius norm distributions across different models in adversarial
          examples. The Frobenius norm is a measure of the magnitude of perturbation applied to create
          adversarial examples.
        </p>
        <p>
          Use the tabs above to explore different views of the data, including box plots showing 
          distribution by model, comparisons between models, threshold-based analysis, and summary statistics.
        </p>
      </div>
    </div>
  );
}