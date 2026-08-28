'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 z-50">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
      <h2 className="text-xl font-semibold text-gray-800">Loading Ingenio AI Studio...</h2>
      <p className="text-gray-500 mt-2">Connecting to backend services</p>
    </div>
  );
}
