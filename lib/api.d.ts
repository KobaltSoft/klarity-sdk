declare module "klarity-sdk" {
  export interface KlarityOptions {
    api_key: string;
    connectionId?: string;
    debug?: boolean;
    pauseDuration?: number;
  }

  export interface QuestionData {
    transcript: string;
    questions: string[];
  }

  export class Klarity {
    constructor(options: KlarityOptions);

    establishConnection(options: { replaceableObjects?: any[] }): Promise<void>;
    sendAudioStream(audioStream: NodeJS.ReadableStream): void;
    onTranscription(callback: (transcription: string) => void): void;
    onQuestion(callback: (data: QuestionData) => void): void;
    onError(callback: (error: Error) => void): void;
    onStreamEnd(callback: (data: any) => void): void;
    isConnected(): boolean;
    setDebugMode(debug: boolean): void;
    stop(): void;
  }

  export default Klarity;
}
