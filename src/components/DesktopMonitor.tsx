"use client";

import { useState, useEffect, useRef } from 'react';

type QAPair = {
  id: number;
  text: string;
};

interface DesktopMonitorProps {
  onBack: () => void;
}

export default function DesktopMonitor({ onBack }: DesktopMonitorProps) {
  const [fullTranscript, setFullTranscript] = useState('');
  const [qaFeed, setQaFeed] = useState<QAPair[]>([]);
  
  const feedEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scrolls
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [qaFeed]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [fullTranscript]);

  // Sincronización continua: Lee los datos del teléfono cada segundo
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Le decimos explícitamente al navegador que no guarde esto en caché (cache: 'no-store')
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setFullTranscript(data.fullTranscript || '');
          setQaFeed(data.qaFeed || []);
        }
      } catch (error) {
        console.error('Error sincronizando con el teléfono:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col w-full h-screen p-6 bg-gray-100 space-y-4">
      
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm shrink-0">
        <h1 className="text-2xl font-bold text-gray-800">Desktop Monitor <span className="text-sm font-normal text-gray-500">(Receiving data from Phone...)</span></h1>
        <button onClick={onBack} className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors">
          Back to Menu
        </button>
      </div>

      <div className="flex flex-row w-full h-full gap-6 overflow-hidden">
        
        {/* Panel Izquierdo: Transcripción */}
        <div className="flex flex-col w-1/3 bg-white border rounded-lg shadow-sm">
          <div className="p-4 border-b bg-gray-50 rounded-t-lg">
            <h2 className="text-lg font-semibold text-gray-800">Live Transcript</h2>
          </div>
          <div 
            ref={scrollContainerRef}
            className="flex-1 p-4 text-gray-700 whitespace-pre-wrap overflow-y-auto text-lg leading-relaxed"
          >
            {fullTranscript || 'Waiting for the phone to send data...'}
          </div>
        </div>

        {/* Panel Derecho: Respuestas Inteligentes */}
        <div className="flex flex-col w-2/3 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-blue-200 bg-white rounded-t-lg">
            <h2 className="text-xl font-bold text-blue-900">AI Suggested Answers</h2>
          </div>
          <div className="flex-1 p-6 overflow-y-auto shadow-inner flex flex-col gap-6">
            {qaFeed.length === 0 ? (
              <p className="text-blue-900/50 font-medium italic text-xl text-center mt-10">
                Answers will automatically appear here...
              </p>
            ) : (
              qaFeed.map((qa) => (
                <div key={qa.id} className="p-5 bg-white border-l-4 border-blue-500 rounded-r-lg shadow-md text-blue-900 font-medium whitespace-pre-wrap text-2xl leading-relaxed">
                  {qa.text}
                </div>
              ))
            )}
            <div ref={feedEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
}