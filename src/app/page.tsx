"use client";

import { useState } from 'react';
import PhoneMicrophone from '@/components/PhoneMicrophone';
import DesktopMonitor from '@/components/DesktopMonitor';

export default function Home() {
  const [view, setView] = useState<'menu' | 'phone' | 'desktop'>('menu');

  if (view === 'phone') {
    return <PhoneMicrophone onBack={() => setView('menu')} />;
  }

  if (view === 'desktop') {
    return <DesktopMonitor onBack={() => setView('menu')} />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-100">
      <div className="w-full max-w-2xl space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">AI Interview System</h1>
          <p className="text-lg text-gray-500">Select the role for this device</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => setView('phone')}
            className="flex flex-col items-center justify-center p-10 bg-white border-2 border-transparent hover:border-blue-500 rounded-2xl shadow-md transition-all group"
          >
            <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">📱</span>
            <h2 className="text-2xl font-bold text-gray-800">Phone Mic</h2>
            <p className="text-gray-500 mt-2 text-center">Capture audio & send to AI</p>
          </button>

          <button 
            onClick={() => setView('desktop')}
            className="flex flex-col items-center justify-center p-10 bg-white border-2 border-transparent hover:border-blue-500 rounded-2xl shadow-md transition-all group"
          >
            <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">💻</span>
            <h2 className="text-2xl font-bold text-gray-800">Desktop Monitor</h2>
            <p className="text-gray-500 mt-2 text-center">View transcript & answers</p>
          </button>
        </div>
      </div>
    </main>
  );
}