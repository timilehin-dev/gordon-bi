import {
  GeminiLiveSessionConfig,
  VoiceStreamEvent,
  VoiceSessionState,
  VoiceToolCallDefinition,
} from './types.js';
import { GeminiLiveVoiceError } from './errors.js';

export class GeminiLiveSessionManager {
  private config: GeminiLiveSessionConfig;
  private state: VoiceSessionState;
  private eventListeners: Array<(evt: VoiceStreamEvent) => void> = [];
  private registeredTools: Map<string, (args: any) => Promise<any>> = new Map();

  constructor(config: GeminiLiveSessionConfig) {
    if (!config.apiKey) {
      throw new GeminiLiveVoiceError('API key is required to initialize Gemini Live session', 'MISSING_API_KEY');
    }
    this.config = {
      model: 'gemini-3.1-flash-live-preview',
      voiceName: 'Aoede',
      thinkingLevel: 'minimal',
      sampleRateInput: 16000,
      sampleRateOutput: 24000,
      systemInstruction: 'You are Gordon, an elite autonomous executive business analyst and quantitative advisor. Respond crisply, cite metrics accurately, and explain drivers clearly.',
      ...config,
    };

    this.state = {
      sessionId: `voice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      isConnected: false,
      isListening: false,
      isSpeaking: false,
      inputTranscript: '',
      outputTranscript: '',
    };
  }

  public registerTool(toolDef: VoiceToolCallDefinition, handler: (args: any) => Promise<any>): void {
    this.registeredTools.set(toolDef.name, handler);
  }

  public onEvent(callback: (evt: VoiceStreamEvent) => void): () => void {
    this.eventListeners.push(callback);
    return () => {
      this.eventListeners = this.eventListeners.filter(cb => cb !== callback);
    };
  }

  public async connect(): Promise<void> {
    this.state.isConnected = true;
    this.state.isListening = true;
    this.emitEvent({
      type: 'connected',
      payload: { sessionId: this.state.sessionId, model: this.config.model, voice: this.config.voiceName },
      timestamp: Date.now(),
    });
  }

  public async sendAudioChunk(pcmBuffer: Buffer): Promise<void> {
    if (!this.state.isConnected) {
      throw new GeminiLiveVoiceError('Cannot send audio chunk: Session is not connected', 'NOT_CONNECTED');
    }
    // In live execution, sends Base64 PCM chunk to Live API WebSocket
  }

  public async sendTextMessage(text: string): Promise<void> {
    if (!this.state.isConnected) {
      throw new GeminiLiveVoiceError('Cannot send text message: Session is not connected', 'NOT_CONNECTED');
    }
    this.state.inputTranscript = text;
    this.emitEvent({
      type: 'input_transcript',
      payload: { text },
      timestamp: Date.now(),
    });
  }

  public handleIncomingServerPayload(payload: {
    audioData?: string;
    inputTranscription?: string;
    outputTranscription?: string;
    toolCall?: { name: string; args: any };
    interrupted?: boolean;
  }): void {
    try {
      if (payload.interrupted) {
        this.state.isSpeaking = false;
        this.emitEvent({ type: 'interrupted', timestamp: Date.now() });
        return;
      }

      if (payload.inputTranscription) {
        this.state.inputTranscript += ` ${payload.inputTranscription}`;
        this.emitEvent({
          type: 'input_transcript',
          payload: { text: payload.inputTranscription },
          timestamp: Date.now(),
        });
      }

      if (payload.outputTranscription) {
        this.state.outputTranscript += ` ${payload.outputTranscription}`;
        this.state.isSpeaking = true;
        this.emitEvent({
          type: 'output_transcript',
          payload: { text: payload.outputTranscription },
          timestamp: Date.now(),
        });
      }

      if (payload.audioData) {
        this.emitEvent({
          type: 'audio_chunk',
          payload: { base64Pcm: payload.audioData },
          timestamp: Date.now(),
        });
      }

      if (payload.toolCall) {
        this.emitEvent({
          type: 'tool_call',
          payload: payload.toolCall,
          timestamp: Date.now(),
        });
      }
    } catch (err: any) {
      this.state.isSpeaking = false;
      this.emitEvent({
        type: 'error',
        payload: { error: err.message },
        timestamp: Date.now(),
      });
    }
  }

  public async disconnect(): Promise<void> {
    this.state.isConnected = false;
    this.state.isListening = false;
    this.state.isSpeaking = false;
    this.emitEvent({
      type: 'closed',
      timestamp: Date.now(),
    });
  }

  public getState(): VoiceSessionState {
    return { ...this.state };
  }

  private emitEvent(evt: VoiceStreamEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(evt);
      } catch {}
    }
  }
}
