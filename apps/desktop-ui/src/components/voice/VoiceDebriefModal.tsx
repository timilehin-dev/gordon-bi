import React, { useState, useEffect } from 'react';
import { VoiceModalProps } from './types.js';

export const VoiceDebriefModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  onExecutePrompt,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [geminiResponse, setGeminiResponse] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setIsListening(true);
      setTranscript('Analyzing Q3 cohort churn and marketing ad-spend elasticity...');
      setGeminiResponse('I found a +24% YoY expansion in enterprise revenue, but marketing ad-spend leads pipeline expansion with a 2-month lag (p < 0.001). Would you like me to generate a slide deck for the CRO?');
    } else {
      setIsListening(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
            <h3 className="font-semibold text-lg text-slate-100">Live Executive Voice Debrief</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* Animated Waveform Visualizer */}
        <div className="my-8 flex items-center justify-center gap-1.5 h-16 w-full">
          {[40, 75, 90, 60, 30, 85, 100, 70, 45, 95, 80, 50].map((h, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full bg-gradient-to-t from-blue-500 to-indigo-400 transition-all duration-300 ${
                isListening ? 'animate-pulse' : 'opacity-30'
              }`}
              style={{ height: isListening ? `${h}%` : '20%' }}
            />
          ))}
        </div>

        {/* Live Transcripts */}
        <div className="w-full space-y-3 bg-slate-950/70 rounded-xl p-4 border border-slate-800/80 text-sm">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-blue-400">You (Voice Input):</span>
            <p className="text-slate-200 mt-0.5 italic">{transcript || 'Listening...'}</p>
          </div>
          {geminiResponse && (
            <div className="border-t border-slate-800 pt-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Gordon (Spoken Voice):</span>
              <p className="text-slate-300 mt-0.5">{geminiResponse}</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-6 w-full flex items-center justify-between gap-3">
          <button
            onClick={() => setIsListening(!isListening)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isListening ? '⏸ Pause Mic' : '🎙 Resume Mic'}
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => onExecutePrompt(transcript)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              🚀 Run in Autonomous Loop
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
