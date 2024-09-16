// Type definitions for AudioTranscriptionSDK

declare module "AudioTranscriptionSDK" {
  import { Socket } from "socket.io-client";

  export interface AudioTranscriptionSDKOptions {
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

    establishConnection(): Promise<void>;
    start(): void;
    sendAudioStream(chunk: Buffer): void;
    stop(): void;
    onTranscription(callback: (transcription: string) => void): void;
    onQuestion(callback: (data: QuestionData) => void): void;
    onError(callback: (error: Error) => void): void;
    isConnected(): boolean;
    setDebugMode(debug: boolean): void;

    private validateConstructorParams(params: {
      api_key: string;
      contextLength: number;
    }): void;
    private log(message: string, data?: object): void;
    private socketListeners(): void;
    private stopListening(): void;
    private handleFirstChunk(): void;
    private handleChunkSending(): void;
    private send(data: Buffer): Promise<void>;
    private getBufferStack(): Buffer[];
    private bufferToArrayBuffer(buffer: Buffer): ArrayBuffer;
  }

  export default AudioTranscriptionSDK;
}
