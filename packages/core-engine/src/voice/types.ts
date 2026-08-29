export type GeminiLiveVoiceName = 'Aoede' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';

export interface GeminiLiveSessionConfig {
  apiKey: string;
  model?: string; // default: 'gemini-3.1-flash-live-preview'
  voiceName?: GeminiLiveVoiceName;
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  systemInstruction?: string;
  sampleRateInput?: number; // 16000
  sampleRateOutput?: number; // 24000
}

export interface VoiceStreamEvent {
  type: 'connected' | 'audio_chunk' | 'input_transcript' | 'output_transcript' | 'tool_call' | 'interrupted' | 'error' | 'closed';
  payload?: any;
  timestamp: number;
}

export interface VoiceToolCallDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface VoiceSessionState {
  sessionId: string;
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  inputTranscript: string;
  outputTranscript: string;
}
