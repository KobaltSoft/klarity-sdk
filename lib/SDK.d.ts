declare module "@klarity-sdk" {
  export interface AudioTranscriptionSDKOptions {
    socketUrl: string;
    api_key: string;
    connectionId?: string;
    contextLength: number;
    maxReconnectAttempts?: number;
    reconnectInterval?: number;
    debug?: boolean;
  }

  export interface TranscriptionData {
    transcription: string;
  }

  export interface QuestionData {
    transcript: string;
    questions: string[];
  }

  class AudioTranscriptionSDK {
    constructor(options: AudioTranscriptionSDKOptions);

    init(): void;
    sendAudioStream(chunk: Buffer): void;
    stopListening(): void;
    leave(): void;
    onTranscription(callback: (transcription: string) => void): void;
    onQuestion(callback: (data: QuestionData) => void): void;
    onError(callback: (error: Error) => void): void;
    isConnected(): boolean;
    setDebugMode(debug: boolean): void;
  }

  export default AudioTranscriptionSDK;
}
