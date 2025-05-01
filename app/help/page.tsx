'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Import ParticleBackground component with dynamic import to prevent SSR issues
const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), {
  ssr: false
});

export default function HelpPage() {
  // State to handle hydration
  const [mounted, setMounted] = useState(false);
  
  // Handle hydration to prevent mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Don't render until after client-side hydration
  if (!mounted) return null;
  
  return (
    <div className="relative min-h-screen font-[family-name:var(--font-geist-sans)]">
      {/* Particle Background */}
      <ParticleBackground />
      
      {/* Content Container */}
      <div className="relative z-10 max-w-4xl mx-auto p-6">
        {/* Navigation */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Home
          </Link>
        </div>
        
        {/* Main Content */}
        <div className="space-y-8 bg-white/90 dark:bg-gray-800/90 p-8 rounded-lg shadow-lg backdrop-blur-sm">
          {/* Title */}
          <div className="border-b border-gray-300 dark:border-gray-700 pb-6">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              What's this all about?
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              In this interactive dashboard, you can explore the results of my research on adversarial examples. For a quick
              guide to get started and demo, watch the video below. I will give background information regarding adversarial examples,
              the dataset collected from my experiments, and the metrics used in the visualizations.
            </p>
          </div>
          
          {/* Video Section */}
          <div className="border-b border-gray-300 dark:border-gray-700 pb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Interactive Visualization Demo
            </h2>
            <div className="aspect-w-16 aspect-h-9 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
              <iframe 
                src="https://www.youtube.com/embed/-l85ILixt5Y" 
                title="Presentation on Adversarial Examples" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="w-full" width="656" height="369"
              ></iframe>
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              This short screencast presentation gives a brief summary and demo of the visualizations.
            </p>
          </div>
          
          {/* Documents Section */}
          <div className="border-b border-gray-300 dark:border-gray-700 pb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Documents
            </h2>
            <h2 className="text-l text-gray-900 dark:text-white mb-4">
              Here's all the relevant documentation for the project, with the main one being the Process Book.
            </h2>

            <div className="space-y-4">
              {/* Process Book */}
              <a 
                href="/ProcessBook.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Process Book</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Detailed documentation of the visualization design process</p>
                </div>
              </a>

              <a 
                href="/CS573_Final_Prospectus.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Project Prospectus</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Initial proposal of this interactive visualization project</p>
                </div>
              </a>
              
              {/* MS Thesis */}
              <a 
                href="/Olivia_Cava_MS_Thesis.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">MS Thesis</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Complete research thesis on adversarial examples</p>
                </div>
              </a>
            </div>
          </div>
          
          {/* Database Access */}
          <div className="border-b border-gray-300 dark:border-gray-700 pb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Data Access
            </h2>
            <h2 className="text-l text-gray-900 dark:text-white mb-4">
            This is a private Supabase database (40,440 rows, 12 columns) with the following schema:
            </h2>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Database Schema</h3>
              <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto text-xs text-gray-300 font-mono mb-4">
                <pre>
{`create table adversarial_examples (
    id bigint primary key generated always as identity,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    case_idx integer not null,
    model_name text not null,
    image float[] not null,                    
    label integer not null,
    original_prediction float[] not null,     
    adversarial_image float[] not null,        
    prediction float[] not null,               
    label_kld double precision not null,
    mse double precision not null,
    frob double precision not null
);`}
                </pre>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <a 
                  href="mailto:okcava@wpi.edu"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm inline-flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  Contact for Access
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
