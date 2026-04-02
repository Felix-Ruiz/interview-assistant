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

  // Sincronización con Redis
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
    if (isProcessing) return;
    
    // Enviamos los últimos 800 caracteres para que Gemini tenga contexto de la pregunta completa
    const contextWindow = allText.slice(-800);
    if (contextWindow.trim().length < 10) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/chat', {
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
            analyzeTextForQuestion(updated);
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

  // Watchdog para mantener vivo el mic en iOS
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
      recognitionRef.current?.stop();
    } else {
      isListeningRef.current = true;
      setIsListening(true);
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
        <button onClick={onBack} className="text-sm font-medium text-gray-400">← Back</button>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-semibold">Phone Emitter</h2>
          <span className="text-xs text-gray-400">{uploadStatus}</span>
        </div>
        <button onClick={() => setRecognitionLang(prev => prev === 'en-US' ? 'es-ES' : 'en-US')} className="w-10 text-xs font-bold bg-gray-700 py-1 rounded text-blue-400">
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
        <button onClick={handleClear} className="w-full py-4 rounded-xl bg-gray-700 text-white font-bold">Clear Data</button>
        <button onClick={toggleListening} className={`w-full py-6 rounded-xl text-white font-black text-2xl uppercase ${isListening ? 'bg-red-500' : 'bg-blue-600'}`}>
          {isListening ? 'Stop Mic' : 'Start Mic'}
        </button>
      </div>
    </div>
  );
}