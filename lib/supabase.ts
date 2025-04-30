// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fxwzblzdvwowourssdih.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Type definitions for the adversarial examples data
export interface AdversarialExample {
  id: number;
  created_at: string;
  case_idx: number;
  model_name: string;
  image: number[];
  label: number;
  original_prediction: number[];
  adversarial_image: number[];
  prediction: number[];
  label_kld: number;
  mse: number;
  frob: number;
}

// Helper function to fetch all adversarial examples
export const fetchAdversarialExamples = async () => {
  const { data, error } = await supabase
    .from('adversarial_examples')
    .select('*');
  
  if (error) throw error;
  return data as AdversarialExample[];
};

// Helper function to fetch summary statistics
export const fetchModelStatistics = async () => {
  const { data, error } = await supabase
    .from('adversarial_examples')
    .select('model_name, frob');
  
  if (error) throw error;
  
  // Group by model_name
  const groupedData: { [key: string]: number[] } = data.reduce((acc, curr) => {
    if (!acc[curr.model_name]) {
      acc[curr.model_name] = [];
    }
    acc[curr.model_name].push(curr.frob);
    return acc;
  }, {} as { [key: string]: number[] });
  
  // Calculate statistics for each model
  const statistics = Object.entries(groupedData).map(([model, values]) => {
    // Sort values for percentile calculations
    const sortedValues = [...values].sort((a, b) => a - b);
    const count = sortedValues.length;
    
    return {
      model,
      count,
      min: sortedValues[0],
      max: sortedValues[count - 1],
      mean: sortedValues.reduce((sum, val) => sum + val, 0) / count,
      median: count % 2 === 0 
        ? (sortedValues[count/2 - 1] + sortedValues[count/2]) / 2 
        : sortedValues[Math.floor(count/2)]
    };
  });
  
  return statistics;
};

// Helper function to fetch data by model
export const fetchDataByModel = async (modelName: string) => {
  const { data, error } = await supabase
    .from('adversarial_examples')
    .select('*')
    .eq('model_name', modelName);
  
  if (error) throw error;
  return data as AdversarialExample[];
};

// Helper function to calculate statistics from a dataset
export function calculateStatistics(data: number[]) {
  if (!data || data.length === 0) return null;
  
  // Sort the data
  const sortedData = [...data].sort((a, b) => a - b);
  const length = sortedData.length;
  
  // Calculate basic statistics
  const min = sortedData[0];
  const max = sortedData[length - 1];
  const q1 = sortedData[Math.floor(length * 0.25)];
  const median = length % 2 === 0 
    ? (sortedData[length / 2 - 1] + sortedData[length / 2]) / 2 
    : sortedData[Math.floor(length / 2)];
  const q3 = sortedData[Math.floor(length * 0.75)];
  
  // Calculate mean
  const mean = sortedData.reduce((sum, val) => sum + val, 0) / length;
  
  // Calculate standard deviation
  const variance = sortedData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate IQR and identify outliers
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const outliers = sortedData.filter(val => val < lowerBound || val > upperBound);
  
  return {
    min,
    q1,
    median,
    q3,
    max,
    mean,
    stdDev,
    iqr,
    outliers,
    count: length,
    rawData: sortedData
  };
}