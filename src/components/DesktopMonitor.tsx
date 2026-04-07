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
  const [syncStatus, setSyncStatus] = useState('🟡 Connecting...');
  
  // ESTADO NUEVO: Controla qué respuesta está abierta actualmente (guarda el id)
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const qaContainerRef = useRef<HTMLDivElement>(null);

  // AUTO-FOCO: Cuando llega una nueva pregunta, la abrimos automáticamente
  useEffect(() => {
    if (qaFeed.length > 0) {
      setExpandedId(qaFeed[qaFeed.length - 1].id);
    }
  }, [qaFeed]);

  const smartScroll = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    const { scrollTop, scrollHeight, clientHeight } = ref.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (isAtBottom) {
      ref.current.scrollTop = scrollHeight;
    }
  };

  // El scroll inteligente ahora también reacciona cuando abres un acordeón
  useEffect(() => {
    smartScroll(qaContainerRef);
  }, [qaFeed, expandedId]);

  useEffect(() => {
    smartScroll(scrollContainerRef);
  }, [fullTranscript]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const timestamp = Date.now();
        const res = await fetch(`/api/state?t=${timestamp}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setFullTranscript(data.fullTranscript || '');
          setQaFeed(data.qaFeed || []);
          setSyncStatus('🟢 Live Synced');
        }
      } catch (error) {
        setSyncStatus('🔴 Sync Error');
      }
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col w-full h-screen p-6 bg-gray-100 space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Desktop Monitor <span className="text-lg text-gray-500">/ Bilingüe</span></h1>
          <p className="text-sm font-medium text-gray-500">Status: {syncStatus}</p>
        </div>
        <button onClick={onBack} className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">Back / Volver</button>
      </div>

      <div className="flex flex-row w-full h-full gap-6 overflow-hidden">
        <div className="flex flex-col w-1/3 bg-white border rounded-lg shadow-sm">
          <div className="p-4 border-b bg-gray-50 rounded-t-lg"><h2 className="font-semibold text-gray-800">Transcript</h2></div>
          <div ref={scrollContainerRef} className="flex-1 p-4 text-gray-700 whitespace-pre-wrap overflow-y-auto text-lg">
            {fullTranscript || 'Waiting for data...'}
          </div>
        </div>

        <div className="flex flex-col w-2/3 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-blue-200 bg-white rounded-t-lg"><h2 className="text-xl font-bold text-blue-900">AI Suggested Answers</h2></div>
          <div ref={qaContainerRef} className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
            {qaFeed.length === 0 ? (
              <p className="text-blue-900/50 italic text-xl text-center mt-10">Answers will appear here...</p>
            ) : (
              qaFeed.map((qa) => {
                const isExpanded = expandedId === qa.id;
                
                // LÓGICA DE SEPARACIÓN: Extraemos el título y el cuerpo del texto
                const splitIndex = qa.text.indexOf('🇬🇧 Answer:');
                let title = qa.text;
                let body = '';
                
                if (splitIndex !== -1) {
                  title = qa.text.substring(0, splitIndex).trim();
                  body = qa.text.substring(splitIndex).trim();
                } else {
                  // Fallback por si la IA usa otro formato de salto de línea
                  const fallbackSplit = qa.text.split('\n\n');
                  if (fallbackSplit.length > 1) {
                    title = fallbackSplit[0];
                    body = fallbackSplit.slice(1).join('\n\n');
                  }
                }

                return (
                  <div key={qa.id} className="bg-white border-l-4 border-blue-500 rounded-r-lg shadow-md flex flex-col overflow-hidden transition-all duration-300">
                    
                    {/* CABECERA CLICKEABLE (Siempre visible) */}
                    <div 
                      className="p-5 cursor-pointer flex justify-between items-start hover:bg-blue-50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : qa.id)}
                    >
                      <div className="text-blue-900 font-bold whitespace-pre-wrap text-xl leading-relaxed">
                        {title}
                      </div>
                      <div className="text-blue-500 ml-4 shrink-0 mt-1 text-xl select-none">
                        {isExpanded ? '▲' : '▼'}
                      </div>
                    </div>

                    {/* CUERPO DE RESPUESTA (Visible solo si está expandido) */}
                    {isExpanded && body && (
                      <div className="px-5 pb-5 text-blue-900 font-medium whitespace-pre-wrap text-2xl leading-relaxed border-t border-blue-100 pt-4 bg-white/50">
                        {body}
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}