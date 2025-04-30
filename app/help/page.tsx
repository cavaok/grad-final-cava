'use client';

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HelpPage() {
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Simple Home Button */}
      <div className="mb-4">
        <Link 
          href="/" 
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md shadow-sm transition-colors inline-block"
        >
          Home
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Understanding Adversarial Examples</h1>
      
      <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">What are Adversarial Examples?</h2>
        <p className="mb-4">
          Adversarial examples are inputs to machine learning models that have been specifically designed to cause the model to make a mistake. 
          These examples are created by adding small, often imperceptible perturbations to valid inputs, resulting in outputs that are 
          significantly different from what would be expected.
        </p>
        <p className="mb-4">
          For instance, in image classification, an adversarial example might involve adding a carefully calculated pattern of noise to 
          an image of a panda that causes a model to classify it as a gibbon with high confidence, even though the image still looks 
          like a panda to human observers.
        </p>
      </div>

      <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Key Metrics</h2>
        
        <h3 className="text-xl font-medium mb-2">Frobenius Norm</h3>
        <p className="mb-4">
          The Frobenius norm measures the magnitude of the perturbation applied to create an adversarial example. 
          Lower values indicate more subtle changes that are harder to detect visually but still cause misclassification.
          The Frobenius norm is calculated as the square root of the sum of the squared differences between the original 
          and adversarial examples.
        </p>
        
        <h3 className="text-xl font-medium mb-2">Kullback-Leibler Divergence (KLD)</h3>
        <p className="mb-4">
          KLD measures the dissimilarity between the probability distributions of the model's predictions for the original 
          and adversarial inputs. A higher KLD indicates a greater change in the model's confidence and predictions.
        </p>
        
        <h3 className="text-xl font-medium mb-2">Mean Squared Error (MSE)</h3>
        <p className="mb-4">
          MSE quantifies the average squared difference between the original and adversarial inputs. It provides another 
          measure of how much the input has been modified to create the adversarial example.
        </p>
      </div>

      <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Using the Visualizations</h2>
        
        <h3 className="text-xl font-medium mb-2">Frobenius Norm Box Plots</h3>
        <p className="mb-4">
          The box plots in the Analytics section show the distribution of Frobenius norm values across different models. 
          Each box represents a different model, with:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>The box representing the interquartile range (25th to 75th percentile)</li>
          <li>The line inside the box showing the median value</li>
          <li>The whiskers extending to the minimum and maximum values (excluding outliers)</li>
          <li>Red dots representing outliers (values more than 1.5 × IQR from the box edges)</li>
        </ul>
        <p className="mb-4">
          Models with lower Frobenius norm values are generally more robust against adversarial attacks, as they 
          require larger perturbations to cause misclassification.
        </p>
        
        <h3 className="text-xl font-medium mb-2">PCA Visualization</h3>
        <p className="mb-4">
          The PCA Projection provides a 3D visualization of adversarial examples in principal component space:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Black spheres represent original inputs</li>
          <li>White semi-transparent spheres represent adversarial versions</li>
          <li>Gray lines connect each original input to its adversarial counterpart</li>
          <li>Hovering over points reveals additional details about each example</li>
        </ul>
        <p>
          This visualization helps to understand how adversarial examples relate to their original inputs in the feature space, 
          and how they move across decision boundaries.
        </p>
      </div>
    </div>
  );
}