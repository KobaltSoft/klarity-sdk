// lib/AudioTranscriptionSDK.js
const io = require("socket.io-client");
const { v4: uuidv4 } = require("uuid");

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
  isConnected;
  #initialSetup;
  #api_key;
  #context;
  #logStartTime;
  #socketUrl;
  #reconnectAttempts;
  #maxReconnectAttempts;
  #reconnectInterval;
  #debug;
  #isTrailEmpty;

  /**
   * @param {AudioTranscriptionSDKOptions} options
   */
  constructor({
    api_key,
    connectionId,
    contextLength,
    maxReconnectAttempts = 5,
    reconnectInterval = 5000,
    debug = false,
  }) {
    this.#validateConstructorParams({ api_key, contextLength });

    this.#socketUrl = "http://15.207.18.197";
    this.#connection_id = connectionId || uuidv4();
    this.#bufferQueue = [];
    this.#startTime = Date.now();
    this.#firstChunkReceived = false;
    this.isConnected = false;
    this.#initialSetup = false;
    this.#api_key = api_key;
    this.#context = contextLength;
    this.#reconnectAttempts = 0;
    this.#maxReconnectAttempts = maxReconnectAttempts;
    this.#reconnectInterval = reconnectInterval;
    this.#debug = debug;
    this.#isTrailEmpty = false;

    this.#log("Initializing AudioTranscriptionSDK", {
      connectionId,
      contextLength,
      maxReconnectAttempts,
      reconnectInterval,
      debug,
    });
  }

  #log(message, data = {}) {
    if (this.#debug) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [AudioTranscriptionSDK] ${message}`, data);
    }
  }

  #validateConstructorParams({ api_key, contextLength }) {
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

  establishConnection() {
    return new Promise(async (resolve, reject) => {
      this.#log("Initializing connection to server");

      this.#socket = await io(this.#socketUrl);

      this.isConnected = true;

      this.#socketListeners();

      this.#socket.emit("join", {
        connection_id: this.#connection_id,
        api_key: this.#api_key,
      });

      resolve();

      this.#socket.on("connect_error", (error) => {
        reject(error);
      });
    });
  }

  #socketListeners() {
    this.#socket.on("connect", () => {
      this.#log("Socket connected successfully");
      this.isConnected = true;
      this.#reconnectAttempts = 0;
    });

    this.#socket.on("disconnect", () => {
      this.#log("Socket disconnected");
      this.isConnected = false;
      // this.#handleReconnect();
    });

    this.#socket.on("trail_empty", (data) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [:::::::::] Trail Empty `, data);

      this.#isTrailEmpty = data.trail;
    });

    this.#socket.on("transcription", (data) => {
      this.#log("Received transcription", {
        responseTime: Date.now() - this.#logStartTime,
      });
      if (this.#transcriptionCallback) {
        this.#transcriptionCallback(data);
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
      this.isConnected = true;

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

  #stopListening() {
    this.#log("Stopping listening");
    if (this.isConnected) {
      this.#socket.disconnect();
    }
    this.isConnected = false;
    // Reset other necessary states
  }

  start() {
    this.#log("Initializing audio stream");

    this.#buffer = Buffer.alloc(0);
    this.#startTime = Date.now();
    this.#firstChunkReceived = false;
    this.#initialSetup = true;
  }

  sendAudioStream(chunk) {
    if (!chunk || !(chunk instanceof Buffer)) {
      throw new Error("Invalid audio chunk. Must be a Buffer.");
    }
    if (!this.#initialSetup) {
      throw new Error(
        "Initial setup required. Please call prepareSendingAudioStream() before sending audio."
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
    }
  }

  stop() {
    this.#log("Leaving conversation");
    if (this.isConnected) {
      this.#socket.emit("leave", { connection_id: this.#connection_id });
    }
    this.#stopListening();
  }

  async #send(data) {
    this.#bufferQueue.push(data);

    const lastStack = this.#getBufferStack();
    const concatenatedBuffer = Buffer.concat(lastStack);
    const arrayBuffer = this.#bufferToArrayBuffer(concatenatedBuffer);

    this.#logStartTime = Date.now();

    this.#socket.emit("audio_transcribe", {
      audio: arrayBuffer,
      context: this.#context,
      connection_id: this.#connection_id,
      chunkLength: Math.min(this.#bufferQueue.length - 1, this.#context),
      isTrailEmpty: this.#isTrailEmpty,
    });
  }

  #getBufferStack() {
    const firstChunk = this.#bufferQueue[0];
    const lastChunk = this.#bufferQueue.length - 1;

    if (this.#isTrailEmpty) {
      this.#bufferQueue = [firstChunk, this.#bufferQueue[lastChunk]];
    }

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
  }

  /**
   * @param {(data: QuestionData) => void} callback
   */
  onQuestion(callback) {
    if (typeof callback !== "function") {
      throw new Error("Question callback must be a function");
    }
    this.#questionCallback = callback;
  }

  /**
   * @param {(error: Error) => void} callback
   */
  onError(callback) {
    if (typeof callback !== "function") {
      throw new Error("Error callback must be a function");
    }
    this.#errorCallback = callback;
  }

  // Public method to check connection status
  isConnected() {
    return this.isConnected;
  }

  // Public method to set debug mode
  setDebugMode(debug) {
    this.#debug = debug;
    this.#log("Debug mode set", { debug });
  }
}

module.exports = AudioTranscriptionSDK;
