// lib/AudioTranscriptionSDK.js
const io = require("socket.io-client");
const { v4: uuidv4 } = require("uuid");

/**
 * @typedef {Object} AudioTranscriptionSDKOptions
 * @property {string} socketUrl - The URL of the socket server
 * @property {string} api_key - The API key for authentication
 * @property {string} [connectionId] - Optional connection ID
 * @property {number} contextLength - The context length for transcription
 * @property {number} [maxReconnectAttempts=5] - Maximum number of reconnection attempts
 * @property {number} [reconnectInterval=5000] - Interval between reconnection attempts in milliseconds
 * @property {boolean} [debug=false] - Enable debug mode
 */

/**
 * @typedef {Object} TranscriptionData
 * @property {string} transcription - The transcribed text
 */

/**
 * @typedef {Object} QuestionData
 * @property {string} transcript - The transcribed text
 * @property {string[]} questions - Array of generated questions
 */

class AudioTranscriptionSDK {
  #socket;
  #transcriptionCallback;
  #questionCallback;
  #errorCallback;
  #connection_id;
  #bufferQueue;
  #buffer;
  #startTime;
  #firstChunkReceived;
  #isConnected;
  #initialSetup;
  #api_key;
  #context;
  #logStartTime;
  #socketUrl;
  #reconnectAttempts;
  #maxReconnectAttempts;
  #reconnectInterval;
  #debug;

  /**
   * @param {AudioTranscriptionSDKOptions} options
   */

  constructor({
    socketUrl,
    api_key,
    connectionId,
    contextLength,
    maxReconnectAttempts = 5,
    reconnectInterval = 5000,
    debug = false,
  }) {
    this.#validateConstructorParams({ socketUrl, api_key, contextLength });

    this.#socketUrl = socketUrl;
    this.#connection_id = connectionId || uuidv4();
    this.#bufferQueue = [];
    this.#startTime = Date.now();
    this.#firstChunkReceived = false;
    this.#isConnected = false;
    this.#initialSetup = false;
    this.#api_key = api_key;
    this.#context = contextLength;
    this.#reconnectAttempts = 0;
    this.#maxReconnectAttempts = maxReconnectAttempts;
    this.#reconnectInterval = reconnectInterval;
    this.#debug = debug;

    this.#log("Initializing AudioTranscriptionSDK", {
      socketUrl,
      connectionId,
      contextLength,
      maxReconnectAttempts,
      reconnectInterval,
      debug,
    });
    this.#initializeSocket();
  }

  #log(message, data = {}) {
    if (this.#debug) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [AudioTranscriptionSDK] ${message}`, data);
    }
  }

  #validateConstructorParams({ socketUrl, api_key, contextLength }) {
    if (!socketUrl || typeof socketUrl !== "string") {
      throw new Error("Invalid socketUrl. Must be a non-empty string.");
    }
    if (!api_key || typeof api_key !== "string") {
      throw new Error("Invalid api_key. Must be a non-empty string.");
    }
    if (
      !Number.isInteger(contextLength) ||
      contextLength < 2 ||
      contextLength > 5
    ) {
      throw new Error(
        "Invalid contextLength. Must be an integer between 2 and 5."
      );
    }
  }

  #initializeSocket() {
    this.#log("Initializing socket connection");
    this.#socket = io(this.#socketUrl);

    this.#socketListeners();

    this.#socket.emit("join", {
      connection_id: this.#connection_id,
      api_key: this.#api_key,
    });
  }

  #socketListeners() {
    this.#socket.on("connect", () => {
      this.#log("Socket connected successfully");
      this.#isConnected = true;
      this.#reconnectAttempts = 0;
    });

    this.#socket.on("disconnect", () => {
      this.#log("Socket disconnected");
      this.#isConnected = false;
      this.#handleReconnect();
    });

    this.#socket.on("transcription", (data) => {
      this.#log("Received transcription", {
        responseTime: Date.now() - this.#logStartTime,
      });
      if (this.#transcriptionCallback) {
        this.#transcriptionCallback(data.transcription);
      }
    });

    this.#socket.on("questions", (data) => {
      this.#log("Received questions", { questions: data });
      if (this.#questionCallback) {
        this.#questionCallback({
          transcript: data.transcription,
          questions: data.questions,
        });
      }
    });

    this.#socket.on("joined", () => {
      this.#log("Successfully joined conversation", {
        connectionId: this.#connection_id,
      });
    });

    this.#socket.on("leave", (data) => {
      this.#log("Received leave signal", { data });
      this.stopListening();
    });

    this.#socket.on("transcription_error", (error) => {
      this.#log("Transcription error occurred", { error });
      if (this.#errorCallback) {
        this.#errorCallback(error);
      }
    });

    this.#socket.on("error", (error) => {
      this.#log("Socket error occurred", { error });
      if (this.#errorCallback) {
        this.#errorCallback(error);
      }
    });
  }

  #handleReconnect() {
    if (this.#reconnectAttempts < this.#maxReconnectAttempts) {
      this.#reconnectAttempts++;
      this.#log("Attempting to reconnect", {
        attempt: this.#reconnectAttempts,
        maxAttempts: this.#maxReconnectAttempts,
      });
      setTimeout(() => this.#initializeSocket(), this.#reconnectInterval);
    } else {
      this.#log("Max reconnection attempts reached", {
        attempts: this.#reconnectAttempts,
      });
      if (this.#errorCallback) {
        this.#errorCallback(new Error("Max reconnection attempts reached"));
      }
    }
  }

  stopListening() {
    this.#log("Stopping listening");
    if (this.#isConnected) {
      this.#socket.disconnect();
    }
    this.#isConnected = false;
    // Reset other necessary states
  }

  init() {
    this.#log("Initializing audio stream");
    if (!this.#isConnected) {
      throw new Error(
        "Socket is not connected. Please ensure the SDK is properly initialized."
      );
    }
    this.#buffer = Buffer.alloc(0);
    this.#startTime = Date.now();
    this.#firstChunkReceived = false;
    this.#initialSetup = true;
  }

  sendAudioStream(chunk) {
    if (!this.#isConnected) {
      throw new Error(
        "Socket is not connected. Please ensure the SDK is properly initialized."
      );
    }
    if (!chunk || !(chunk instanceof Buffer)) {
      throw new Error("Invalid audio chunk. Must be a Buffer.");
    }
    if (!this.#initialSetup) {
      throw new Error(
        "Initial setup required. Please call init() before sending audio."
      );
    }

    this.#buffer = Buffer.concat([this.#buffer, chunk]);

    if (!this.#firstChunkReceived) {
      this.#handleFirstChunk();
    }

    this.#handleChunkSending();
  }

  #handleFirstChunk() {
    const currentTime = Date.now();
    if (currentTime - this.#startTime >= 200) {
      this.#bufferQueue.push(this.#buffer);
      this.#startTime = currentTime;
      this.#buffer = Buffer.alloc(0);
      this.#firstChunkReceived = true;
      this.#log("First chunk received and processed");
    }
  }

  #handleChunkSending() {
    const currentTime = Date.now();
    if (currentTime - this.#startTime >= 3000) {
      const startIndex =
        this.#buffer.byteLength -
        Math.floor((currentTime - this.#startTime) / 1000) * 176400;
      const chunkToSend = this.#buffer.slice(startIndex);
      this.#send(chunkToSend);
      this.#startTime = currentTime;
      this.#buffer = Buffer.alloc(0);
      this.#log("Audio chunk sent", { chunkSize: chunkToSend.length });
    }
  }

  leave() {
    this.#log("Leaving conversation");
    if (this.#isConnected) {
      this.#socket.emit("leave", { connection_id: this.#connection_id });
    }
    this.stopListening();
  }

  async #send(data) {
    this.#bufferQueue.push(data);

    const lastStack = this.#getBufferStack();
    const concatenatedBuffer = Buffer.concat(lastStack);
    const arrayBuffer = this.#bufferToArrayBuffer(concatenatedBuffer);

    this.#log("Sending audio chunk to server", {
      bufferSize: concatenatedBuffer.length,
    });
    this.#logStartTime = Date.now();

    this.#socket.emit("audio_transcribe", {
      audio: arrayBuffer,
      context: this.#context,
      connection_id: this.#connection_id,
    });
  }

  #getBufferStack() {
    const firstChunk = this.#bufferQueue[0];
    const lastStack = [this.#bufferQueue[0]];

    if (this.#bufferQueue.length > this.#context) {
      for (
        let i = this.#bufferQueue.length - this.#context + 1;
        i < this.#bufferQueue.length;
        i++
      ) {
        lastStack.push(this.#bufferQueue[i]);
      }
    } else {
      for (let i = 1; i < this.#bufferQueue.length; i++) {
        lastStack.push(this.#bufferQueue[i]);
      }
    }

    if (lastStack[lastStack.length - 1] !== firstChunk) {
      lastStack.push(firstChunk);
    }

    return lastStack;
  }

  #bufferToArrayBuffer(buffer) {
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
  }

  /**
   * @param {(transcription: string) => void} callback
   */
  onTranscription(callback) {
    if (typeof callback !== "function") {
      throw new Error("Transcription callback must be a function");
    }
    this.#transcriptionCallback = callback;
    this.#log("Transcription callback set");
  }

  /**
   * @param {(data: QuestionData) => void} callback
   */
  onQuestion(callback) {
    if (typeof callback !== "function") {
      throw new Error("Question callback must be a function");
    }
    this.#questionCallback = callback;
    this.#log("Question callback set");
  }

  /**
   * @param {(error: Error) => void} callback
   */
  onError(callback) {
    if (typeof callback !== "function") {
      throw new Error("Error callback must be a function");
    }
    this.#errorCallback = callback;
    this.#log("Error callback set");
  }

  // Public method to check connection status
  isConnected() {
    return this.#isConnected;
  }

  // Public method to set debug mode
  setDebugMode(debug) {
    this.#debug = debug;
    this.#log("Debug mode set", { debug });
  }
}

module.exports = AudioTranscriptionSDK;
