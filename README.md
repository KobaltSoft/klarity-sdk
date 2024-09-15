
  

# Klarity STT SDK

  

A powerful Node.js Speech-to-Text SDK with real-time transcription and advanced features.


  
  ##  Contact for API Access
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

  

```bash

npm  install  klarity-stt

```

  

## Usage

  

```javascript

const  KlaritySDK  =  require('klarity-stt');

  

const  sdk  =  new  KlaritySDK ({

api_key: 'YOUR_API_KEY',

connectionId: 'optional-custom-id',

contextLength: 3,

debug: true

});

  

sdk.onTranscription((transcription) => {

console.log('Transcription:', transcription);

});

  

sdk.onQuestion(({ transcript, questions }) => {

console.log('Transcript:', transcript);

console.log('Generated Questions:', questions);

});

  

sdk.onError((error) => {

console.error('Error:', error);

});

  

sdk.init();

  

// Start sending audio data

const  audioChunk  =  Buffer.from(/* your audio data */);

sdk.sendAudioStream(audioChunk);

  

// When finished

sdk.leave();

```

  

## API Reference

  

### Constructor

  

```javascript

new  AudioTranscriptionSDK(options)

```

  

-  `options.api_key` (string, required): Your Klarity STT API key

-  `options.connectionId` (string, optional): Custom connection ID (UUID v4 generated if not provided)

-  `options.contextLength` (number, required): Integer between 2 and 5, determines the context window for transcription

-  `options.maxReconnectAttempts` (number, optional): Maximum number of reconnection attempts (default: 5)

-  `options.reconnectInterval` (number, optional): Interval between reconnection attempts in milliseconds (default: 5000)

-  `options.debug` (boolean, optional): Enable debug logging (default: false)

  

### Methods

  

-  `init()`: Initialize the audio stream and prepare for transcription

-  `sendAudioStream(audioChunk)`: Send an audio chunk (Buffer) for transcription

-  `stopListening()`: Stop listening and disconnect the socket

-  `leave()`: Leave the conversation and clean up resources

-  `onTranscription(callback)`: Set callback for receiving transcriptions

-  `onQuestion(callback)`: Set callback for receiving generated questions

-  `onError(callback)`: Set callback for error handling

-  `isConnected()`: Check if the SDK is currently connected

-  `setDebugMode(boolean)`: Enable or disable debug mode

  

## Advanced Usage

  

### Long-running Audio Streams

  

The SDK is designed to handle long-running audio streams efficiently. It manages audio buffers internally, sending chunks to the server at regular intervals to ensure consistent performance.

  

## Error Handling

  

The SDK provides comprehensive error handling. Make sure to set up an error callback to catch and handle any issues:

  

```javascript

sdk.onError((error) => {

console.error('An error occurred:', error);

// Implement your error handling logic here

});

```

  

## Best Practices

  

1. Always initialize the SDK with `init()` before sending audio data.

2. Send audio data in small chunks for optimal performance.

3. Use the `onTranscription` and `onQuestion` callbacks to process results in real-time.

4. Call `leave()` when you're done to properly clean up resources.

  

## Troubleshooting

  

If you encounter issues:

  

1. Enable debug mode to get more detailed logs.

2. Ensure you're using a valid API key.

3. Check your network connection and firewall settings.

4. Verify that the audio data you're sending is in a supported format.

