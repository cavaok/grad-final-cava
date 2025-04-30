'use client';

import Link from 'next/link';
import React from 'react';

export default function HomeButton() {
  return (
    <div className="absolute top-4 left-4 z-10">
      <Link 
        href="/" 
        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md shadow-sm transition-colors"
      >
        Home
      </Link>
    </div>
  );
}