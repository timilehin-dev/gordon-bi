export class GeminiLiveVoiceError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'VOICE_SESSION_ERROR', details?: any) {
    super(`[GeminiLiveVoiceError] ${message} (Code: ${code})`);
    this.name = 'GeminiLiveVoiceError';
    this.code = code;
    this.details = details;
  }
}
