const io = require("socket.io-client");
const { v4: uuidv4 } = require("uuid");
const { PassThrough, pipeline } = require("stream");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg");
const ffmpeg = require("fluent-ffmpeg");

const { promisify } = require("util");

ffmpeg.setFfmpegPath(ffmpegPath.path);

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
  #debug;
  #isTrailEmpty;
  #pauseDuration;
  #onStreamEndCallback;
  #endDurationCheck;
  #bufferQueueGlobal;
  #maxBufferSize = 450;
  #lastDataTimestamp = Date.now();
  #heartbeatInterval = 5000;
  #ffmpegCommand;

  /**
   * @param {AudioTranscriptionSDKOptions} options
   */
  constructor({ api_key, connectionId, debug = false, pauseDuration = 0.6 }) {
    this.#validateConstructorParams({ api_key, pauseDuration });

    this.#socketUrl = "http://54.187.157.3";
    this.#connection_id = connectionId || uuidv4();
    this.#bufferQueue = [];
    this.#startTime = Date.now();
    this.#firstChunkReceived = false;
    this.isConnected = false;
    this.#initialSetup = false;
    this.#api_key = api_key;
    this.#context = 5;

    this.audioBufferQueue = [];
    this.outputStream = new PassThrough();
    this.processStream = new PassThrough();
    this.isSilent = false;

    this.#debug = debug;
    this.#isTrailEmpty = false;
    this.#pauseDuration = pauseDuration;

    this.#bufferQueueGlobal = [];
    this.#endDurationCheck = 0;

    this.#ffmpegCommand = null;
    this.pipeline = promisify(pipeline);

    this.#log("Initializing AudioTranscriptionSDK", {
      connectionId,
      debug,
    });
  }

  #log(message, data = {}) {
    if (this.#debug) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [AudioTranscriptionSDK] ${message}`, data);
    }
  }

  #validateConstructorParams({ api_key, pauseDuration }) {
    if (!api_key || typeof api_key !== "string") {
      throw new Error("Invalid api_key. Must be a non-empty string.");
    }

    if (!Number.isFinite(pauseDuration) || pauseDuration < 0.5) {
      throw new Error(
        "Invalid pause duration mentioned. Must be greater than 0.5"
      );
    }
  }

  establishConnection({ replaceableObjects }) {
    return new Promise(async (resolve, reject) => {
      this.#log("Initializing connection to server");

      this.#socket = await io(this.#socketUrl);
      resolve();

      this.isConnected = true;

      this.#socketListeners();

      this.#socket.emit("join", {
        connection_id: this.#connection_id,
        api_key: this.#api_key,
        replaceable_words_objects: replaceableObjects,
      });

      this.#socket.on("connect_error", (error) => {
        reject(error);
      });
    });
  }

  #socketListeners() {
    this.#socket.on("connect", () => {
      this.#log("Socket connected successfully");
      this.isConnected = true;
    });

    this.#socket.on("disconnect", () => {
      this.#log("Socket disconnected");
      this.isConnected = false;
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

    this.#socket.on("join_error", (error) => {
      this.#log("Socket connection error occurred ", { error });
      if (this.#errorCallback) {
        this.#errorCallback(error);
      }
    });
  }

  #setFirstChunk(chunk) {
    if (this.#bufferQueue.length > 2) return;

    this.#bufferQueue.push(chunk);
  }

  sendAudioStream(audioStream) {
    let audioBufferQueue = [];

    const outputStream = new PassThrough({
      highWaterMark: 1024 * 1024 * 1024 * 1024,
    });

    ffmpeg(audioStream)
      .audioCodec("libopus")
      .audioChannels(1)
      .audioFrequency(16000)
      .withAudioFilter([
        {
          filter: "silencedetect",
          options: { n: "-50dB", d: this.#pauseDuration },
        },
      ])
      .audioBitrate("16k")
      .format("opus")
      .on("stderr", (stderrLine) => {
        if (stderrLine.includes("[silencedetect @")) {
          if (stderrLine.includes("silence_start")) {
            try {
              let duration =
                parseFloat(stderrLine.split(" ").at(-1)) -
                this.#endDurationCheck;

              this.#emitAudioStream(Buffer.concat(audioBufferQueue), duration);

              audioBufferQueue = [];
            } catch (error) {
              console.log("Error ", error);
            }
          } else if (stderrLine.includes("silence_end")) {
            this.#endDurationCheck = parseFloat(stderrLine.split(" ").at(-4));
          }
        }
      })
      .on("error", (err) => {
        console.error("Error converting audio:", err);
      })
      .pipe(outputStream);

    audioStream.on("data", (chunk) => {
      this.#setFirstChunk(Buffer.concat([chunk]));

      console.log("Chunk length: ", chunk.length);

      if (chunk.length < 1000) return;

      audioBufferQueue.push(chunk);

      if (audioBufferQueue.length > 450) {
        this.#emitAudioStream(Buffer.concat(audioBufferQueue), 8);
        audioBufferQueue = [];
      }
    });

    audioStream.on("end", async () => {
      this.stop();

      if (this.#onStreamEndCallback) {
        this.#onStreamEndCallback(data);
      }
    });
  }

  #emitAudioStream(chunk, duration) {
    const concatenatedBuffer = Buffer.concat([
      this.#bufferQueue[0],
      this.#bufferQueue[1],
      chunk,
      this.#bufferQueue[0],
      this.#bufferQueue[1],
    ]);
    const arrayBuffer = this.#bufferToArrayBuffer(concatenatedBuffer);

    this.#log("Duration: ", duration);

    this.#socket.emit("audio_stream", {
      audio: arrayBuffer,
      connection_id: this.#connection_id,
    });
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

  onStreamEnd(callback) {
    if (typeof callback !== "function") {
      throw new Error("onStreamEnd callback must be a function");
    }
    this.#onStreamEndCallback = callback;
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
