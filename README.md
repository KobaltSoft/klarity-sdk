
  

# Klarity STT SDK

  

A powerful Node.js Speech-to-Text SDK with real-time transcription and advanced features.

  

## Contact for API Access

  

For API key requests or further assistance, please contact the Klarity.

  

Email: admin@klarity.in

  
  

## Features

  

  

- Real-time audio transcription from streaming audio input

  

  

- Configurable context length for improved transcription accuracy

  

  

- Text mining capabilities

  

  

- Flexible error handling and callback system

  

  

- Support for long-running audio streams

  

  

- Efficient audio buffer management

  

## Installation

  

To install the Audio Transcription SDK, use npm:

  

```bash

npm  install  klarity-stt

```

  

## Usage

  

### Initialization

  

First, import and initialize the SDK:

  

```javascript

const  KlaritySDK  =  require('klarity-stt');

  

const  sdk  =  new  KlaritySDK({

api_key: 'YOUR_API_KEY',

contextLength: 5,

});

```

  

#### Options

  

-  `api_key` (required): Your API key for authentication.

-  `connectionId` (optional): A unique identifier for the connection. If not provided, a UUID will be generated.

-  `contextLength` (optional): An integer between 2 and 5, determining the context length for transcription.

-  `maxReconnectAttempts` (optional): Maximum number of reconnection attempts (default: 5).

-  `reconnectInterval` (optional): Interval between reconnection attempts in milliseconds (default: 5000).

-  `debug` (optional): Enable debug mode for detailed logging (default: false).

  

### Connecting to the Server

  

Just before sending audio, initialize the socket connection:

  

```javascript

await sdk.establishConnection();

```

  

### Sending Audio

  

To start sending audio:

  

1. Call the `start()` method to initialize the audio stream:

  

```javascript

sdk.start();

```

  

2. Send audio chunks as `Buffer` objects:

  

```javascript

sdk.sendAudioStream(audioChunk);

```

  

Call this method for each audio chunk you want to send.

  

### Handling Responses

  

Set up callbacks to handle transcriptions and generated questions:

  

```javascript

sdk.onTranscription((transcription) => {

console.log('Transcription:', transcription);

});

  

sdk.onQuestion((data) => {

console.log('Transcript:', data.transcript);

console.log('Questions:', data.questions);

});

```

  

### Error Handling

  

Set up an error callback to handle any errors:

  

```javascript

sdk.onError((error) => {

console.error('Error:', error);

});

```

  

### Stopping Transcription

  

To stop the transcription process:

  

```javascript

sdk.stop();

```

  

## API Reference

  

### `AudioTranscriptionSDK`

  

#### Constructor

  

-  `new AudioTranscriptionSDK(options)`: Creates a new instance of the SDK.

  

#### Methods

  

-  `establishConnection()`: Establish server connection.

-  `start()`: Prepares the SDK for receiving audio chunks.

-  `sendAudioStream(chunk)`: Sends an audio chunk for processing.

-  `stop()`: Stops the transcription process and disconnects.

-  `onTranscription(callback)`: Sets the callback for receiving transcriptions.

-  `onQuestion(callback)`: Sets the callback for receiving generated questions.

-  `onError(callback)`: Sets the callback for error handling.

-  `isConnected()`: Returns the current connection status.

-  `setDebugMode(debug)`: Enables or disables debug mode.

  

## Advanced Usage

  

### Debug Mode

  

Enable debug mode for detailed logging:

  

```javascript

sdk.setDebugMode(true);

```

  

## Troubleshooting

  

1.  **Connection Issues**: Ensure your API key is correct and that you have a stable internet connection.

2.  **Audio Not Transcribing**: Verify that you're sending valid audio chunks as `Buffer` objects.

3.  **High Latency**: Consider adjusting the `contextLength` for a balance between accuracy and speed.