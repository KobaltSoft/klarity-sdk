# Klarity

<p align="center">
  <img src="https://www.klarity.in/logo.png" alt="Klarity Logo" width="150" height="150">
</p>

<p align="center">
  <strong>Blazing-Fast Speech Recognition with Precision Text Mining</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#getting-api-access">API Access</a>
</p>

---

## 🌟 Features

- 🎙️ Real-time audio transcription
- ❓ Automatic question generation based on transcribed content
- 🔇 Customizable silence detection for speech segmentation
- 🔄 Support for replaceable words/objects
- 🐞 Comprehensive error handling and debugging options

## 🚀 Installation

```bash
npm install klarity-stt
```

## 🏁 Quick Start

Here's a basic example of how to use the Klarity SDK:

```javascript
const Klarity = require('klarity-stt');

const klarity = new Klarity({
  api_key: 'your_api_key_here',
});

klarity.establishConnection({ replaceableObjects: [] })
  .then(() => {
    console.log('🎉 Connected to the Klarity service');

    // Assuming you have an audio stream
    const audioStream = getAudioStream();
    klarity.sendAudioStream(audioStream);

    klarity.onTranscription((transcription) => {
      console.log('📝 Transcription:', transcription);
    });

    klarity.onQuestion((data) => {
      console.log('📝 Transcript:', data.transcript);
      console.log('❓ Questions:', data.questions);
    });

    klarity.onError((error) => {
      console.error('❌ Error:', error);
    });

    klarity.onStreamEnd(() => {
      console.log('🏁 Audio stream ended');
    });
  })
  .catch((error) => {
    console.error('❌ Failed to connect:', error);
  });
```

## 📚 API Reference

### `Klarity`

#### Constructor

```javascript
new Klarity(options: KlarityOptions)
```

| Option | Type | Description | Required |
|--------|------|-------------|----------|
| `api_key` | `string` | Your API key for authentication | Yes |
| `connectionId` | `string` | A unique identifier for the connection | No |
| `debug` | `boolean` | Enable debug mode (default: `false`) | No |
| `pauseDuration` | `number` | Duration of silence to detect speech segments (default: `0.6` seconds) | No |

#### Methods

| Method | Description |
|--------|-------------|
| `establishConnection(options: { replaceableObjects?: any[] }): Promise<void>` | Establishes a connection to the Klarity service |
| `sendAudioStream(audioStream: NodeJS.ReadableStream): void` | Sends an audio stream for transcription |
| `onTranscription(callback: (transcription: string) => void): void` | Sets a callback to receive transcriptions |
| `onQuestion(callback: (data: QuestionData) => void): void` | Sets a callback to receive generated questions |
| `onError(callback: (error: Error) => void): void` | Sets a callback to handle errors |
| `onStreamEnd(callback: (data: any) => void): void` | Sets a callback to be called when the audio stream ends |
| `isConnected(): boolean` | Checks if the SDK is currently connected to the service |
| `setDebugMode(debug: boolean): void` | Enables or disables debug mode |
| `stop(): void` | Stops the audio transcription process |

## 🔑 Getting API Access

To use the Klarity SDK, you need to obtain an API key. Please contact our team at [admin@klarity.in](mailto:admin@klarity.in) for API access and further information about pricing and usage limits.

## 🆘 Support

If you encounter any issues or have questions about the Klarity SDK, please don't hesitate to:

- Open an issue on our [GitHub repository](https://github.com/KobaltSoft/klarity-sdk)

---

<p align="center">
  Made with ❤️ by the Kobalt 
</p>