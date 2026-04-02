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
  
  const recognitionRef = useRef<any>(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const syncState = async () => {
      try {
        setUploadStatus('Syncing...');
        // CACHE BUSTER para asegurar que la escritura pase
        const timestamp = Date.now();
        const res = await fetch(`/api/state?t=${timestamp}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullTranscript, qaFeed }),
        });
        
        if (res.ok) {
          setUploadStatus('Synced');
        } else {
          setUploadStatus('Error Saving');
        }
      } catch (error) {
        setUploadStatus('Network Error');
        console.error('Error sincronizando al servidor:', error);
      }
    };
    syncState();
  }, [fullTranscript, qaFeed]);

  const analyzeTextForQuestion = async (textChunk: string) => {
    if (textChunk.trim().length < 10) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textChunk }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.isQuestion && data.suggestion) {
          setQaFeed((prev) => [...prev, { id: Date.now(), text: data.suggestion }]);
        }
      }
    } catch (error: any) {
      console.error('Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

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
          setFullTranscript((prev) => prev + newFinal);
          analyzeTextForQuestion(newFinal);
        }
        setInterimTranscript(currentInterim);
      };

      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'no-speech') return;
        setIsListening(false);
        isListeningRef.current = false;
      };
      
      recognitionRef.current.onend = () => {
         if (isListeningRef.current) {
             try { recognitionRef.current.start(); } catch(e) {}
         }
      }
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
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
    if (isListening) {
      recognitionRef.current?.abort();
      setTimeout(() => {
        if (isListeningRef.current) {
          try { recognitionRef.current?.start(); } catch (e) {}
        }
      }, 300);
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen p-4 bg-gray-900 text-white space-y-6">
      
      <div className="flex items-center justify-between w-full p-4 bg-gray-800 rounded-lg">
        <button onClick={onBack} className="text-sm font-medium text-gray-400 hover:text-white shrink-0">← Back</button>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-semibold text-center w-full">Phone Emitter</h2>
          <span className="text-xs text-gray-400">{uploadStatus}</span>
        </div>
        <div className="w-10"></div> {/* Espaciador */}
      </div>

      {isProcessing && <div className="text-blue-400 text-sm animate-pulse">Gemini is thinking...</div>}

      <div className="flex flex-col w-full p-4 bg-gray-800 rounded-lg shadow-sm space-y-4 flex-1">
        <div className="w-full min-h-37.5 max-h-60 p-3 bg-gray-700 rounded-md text-gray-200 whitespace-pre-wrap overflow-y-auto">
          <span>{fullTranscript}</span>
          <span className="text-gray-400 italic">{interimTranscript}</span>
          {!fullTranscript && !interimTranscript && 'Phone is ready to listen...'}
        </div>
      </div>

      <div className="flex flex-col w-full gap-4 pb-8 shrink-0">
        <button
          onClick={handleClear}
          className="w-full py-4 rounded-xl bg-gray-700 text-white font-bold text-lg hover:bg-gray-600 active:bg-gray-500 transition-colors"
        >
          Clear Data
        </button>
        <button
          onClick={toggleListening}
          className={`w-full py-6 rounded-xl text-white font-black text-2xl uppercase transition-colors shadow-lg ${
            isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isListening ? 'Stop Mic' : 'Start Mic'}
        </button>
      </div>

    </div>
  );
}