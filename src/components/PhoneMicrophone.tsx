"use client";

import { useState, useEffect, useRef } from 'react';

type QAPair = {
  id: number;
  text: string;
};

interface PhoneMicrophoneProps {
  onBack: () => void;
}

export default function PhoneMicrophone({ onBack }: PhoneMicrophoneProps) {
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);

  const [fullTranscript, setFullTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const [qaFeed, setQaFeed] = useState<QAPair[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('Ready');
  const [recognitionLang, setRecognitionLang] = useState('en-US');
  
  const recognitionRef = useRef<any>(null);
  const isFirstMount = useRef(true);
  const wakeLockRef = useRef<any>(null);
  
  const analyzeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sincronización con Redis en la nube
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const syncState = async () => {
      try {
        setUploadStatus('Syncing...');
        const timestamp = Date.now();
        const res = await fetch(`/api/state?t=${timestamp}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullTranscript, qaFeed }),
        });
        if (res.ok) setUploadStatus('Synced');
      } catch (error) {
        setUploadStatus('Sync Error');
      }
    };
    const timer = setTimeout(syncState, 1000);
    return () => clearTimeout(timer);
  }, [fullTranscript, qaFeed]);

  const analyzeTextForQuestion = async (allText: string) => {
    const contextWindow = allText.slice(-800);
    if (contextWindow.trim().length < 10) return;

    setIsProcessing(true);
    try {
      // Agregamos un timestamp dinámico para burlar cualquier caché atrapada en Safari/Vercel
      const cacheBusterTime = Date.now();
      const response = await fetch(`/api/chat?t=${cacheBusterTime}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textChunk: contextWindow }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.isQuestion && data.suggestion) {
          setQaFeed((prev) => [...prev, { id: Date.now(), text: data.suggestion }]);
        }
      }
    } catch (error) {
      console.error('Chat API Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.error('Error al solicitar Wake Lock:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.error('Error al liberar Wake Lock:', err);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      if (recognitionRef.current) recognitionRef.current.stop();

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = recognitionLang;

      recognitionRef.current.onresult = (event: any) => {
        let currentInterim = '';
        let newFinal = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            newFinal += event.results[i][0].transcript + ' ';
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (newFinal) {
          setFullTranscript((prev) => {
            const updated = prev + newFinal;
            
            // SMART DEBOUNCE AUMENTADO: Espera 1200ms para evitar cortar oraciones a la mitad por tomar aire
            if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
            analyzeTimeoutRef.current = setTimeout(() => {
              analyzeTextForQuestion(updated);
            }, 1200);

            return updated;
          });
        }
        setInterimTranscript(currentInterim);
      };

      recognitionRef.current.onend = () => {
        if (isListeningRef.current) {
          setTimeout(() => {
            try { recognitionRef.current.start(); } catch(e) {}
          }, 250);
        }
      };

      if (isListeningRef.current) {
        try { recognitionRef.current.start(); } catch (e) {}
      }
    }
  }, [recognitionLang]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isListeningRef.current) {
          requestWakeLock();
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
            setTimeout(() => {
              try { recognitionRef.current.start(); } catch(e) {}
            }, 500);
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const watchdog = setInterval(() => {
      if (isListeningRef.current && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) {}
      }
    }, 2000);
    return () => clearInterval(watchdog);
  }, []);

  const toggleListening = () => {
    if (isListening) {
      isListeningRef.current = false;
      setIsListening(false);
      releaseWakeLock();
      recognitionRef.current?.stop();
    } else {
      isListeningRef.current = true;
      setIsListening(true);
      requestWakeLock();
      try { recognitionRef.current?.start(); } catch (e) {}
    }
  };

  const handleClear = () => {
    setFullTranscript('');
    setInterimTranscript('');
    setQaFeed([]);
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen p-4 bg-gray-900 text-white space-y-6">
      <div className="flex items-center justify-between w-full p-4 bg-gray-800 rounded-lg">
        <button onClick={onBack} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">← Back</button>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-semibold">Phone Emitter</h2>
          <span className="text-xs text-gray-400">{uploadStatus}</span>
        </div>
        <button onClick={() => setRecognitionLang(prev => prev === 'en-US' ? 'es-ES' : 'en-US')} className="w-10 text-xs font-bold bg-gray-700 py-1 rounded text-blue-400 hover:bg-gray-600 transition-colors">
          {recognitionLang === 'en-US' ? 'EN' : 'ES'}
        </button>
      </div>

      {isProcessing && <div className="text-blue-400 text-sm animate-pulse">AI is analyzing...</div>}

      <div className="flex flex-col w-full p-4 bg-gray-800 rounded-lg shadow-sm space-y-4 flex-1">
        <div className="w-full min-h-37.5 max-h-60 p-3 bg-gray-700 rounded-md text-gray-200 whitespace-pre-wrap overflow-y-auto">
          {fullTranscript}<span className="text-gray-400 italic">{interimTranscript}</span>
          {!fullTranscript && !interimTranscript && 'Listening...'}
        </div>
      </div>

      <div className="flex flex-col w-full gap-4 pb-8">
        <button onClick={handleClear} className="w-full py-4 rounded-xl bg-gray-700 text-white font-bold hover:bg-gray-600 transition-colors">Clear Data</button>
        <button onClick={toggleListening} className={`w-full py-6 rounded-xl text-white font-black text-2xl uppercase shadow-lg transition-colors ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {isListening ? 'Stop Mic' : 'Start Mic'}
        </button>
      </div>
    </div>
  );
}