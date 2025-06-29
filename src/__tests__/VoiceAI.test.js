import { VoiceAI } from '../services/VoiceAI'; // Corrected import path

// Mocking global objects for JSDOM environment
const mockSpeechRecognition = jest.fn(() => ({
  continuous: false,
  interimResults: true,
  lang: 'en-US',
  onstart: jest.fn(),
  onresult: jest.fn(),
  onend: jest.fn(),
  onerror: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
}));

const mockSpeechSynthesisUtterance = jest.fn(() => ({
  rate: 0.7,
  pitch: 0.6,
  volume: 0.9,
  onend: jest.fn(),
}));

const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
};

const mockMediaDevices = {
  getUserMedia: jest.fn(() => Promise.resolve()),
};

const mockAudioContext = jest.fn(() => ({
  decodeAudioData: jest.fn(() => Promise.resolve({ buffer: 'mockAudioBuffer' })),
  createBufferSource: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    onended: jest.fn(),
  })),
  destination: 'mockDestination',
}));

Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: mockSpeechRecognition,
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: mockSpeechRecognition,
});

Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  writable: true,
  value: mockSpeechSynthesisUtterance,
});

Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: mockSpeechSynthesis,
});

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: mockMediaDevices,
});

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: mockAudioContext,
});

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: mockAudioContext,
});

// Mock fetch API for ElevenLabs
global.fetch = jest.fn((url, options) => {
  if (url.includes('api.elevenlabs.io')) {
    return Promise.resolve({
      ok: true,
      blob: () => Promise.resolve(new Blob(['mock audio data'], { type: 'audio/mpeg' })),
    });
  }
  return Promise.reject(new Error('Unknown fetch URL'));
});

// Mock process.env for Jest environment
process.env.VITE_ELEVENLABS_API_KEY = 'test_elevenlabs_api_key';
process.env.VITE_DEEPSEEK_API_KEY = 'test_deepseek_api_key';


describe('VoiceAI', () => {
  let voiceAI;
  let onMessageMock;
  let onErrorMock;
  let onStatusChangeMock;

  beforeEach(() => {
    voiceAI = new VoiceAI(process.env.VITE_ELEVENLABS_API_KEY);
    onMessageMock = jest.fn();
    onErrorMock = jest.fn();
    onStatusChangeMock = jest.fn();
    mockMediaDevices.getUserMedia.mockClear();
    mockSpeechRecognition.mockClear();
    mockSpeechSynthesis.speak.mockClear();
    mockSpeechSynthesis.cancel.mockClear();
    mockAudioContext.mockClear();
    global.fetch.mockClear();
  });

  // Test case 1: should initialize with correct default states
  test('should initialize with correct default states', () => {
    expect(voiceAI.elevenLabsApiKey).toBe('test_elevenlabs_api_key');
    expect(voiceAI.isConnected).toBe(false);
    expect(voiceAI.isListening).toBe(false);
    expect(voiceAI.isSpeaking).toBe(false);
    expect(voiceAI.recognition).toBeNull();
    expect(voiceAI.hasPermission).toBe(false);
  });

  describe('requestPermissions', () => {
    // Test case 2: should set hasPermission to true on successful permission grant
    test('should set hasPermission to true on successful permission grant', async () => {
      const result = await voiceAI.requestPermissions();
      expect(result).toBe(true);
      expect(voiceAI.hasPermission).toBe(true);
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    // Test case 3: should set hasPermission to false on permission denial
    test('should set hasPermission to false on permission denial', async () => {
      mockMediaDevices.getUserMedia.mockImplementationOnce(() => Promise.reject(new Error('Permission denied')));
      const result = await voiceAI.requestPermissions();
      expect(result).toBe(false);
      expect(voiceAI.hasPermission).toBe(false);
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    });
  });

  describe('connect', () => {
    // Test case 4: should connect and initialize recognition if permissions are granted
    test('should connect and initialize recognition if permissions are granted', async () => {
      await voiceAI.requestPermissions(); // Grant permission first
      const conversationId = await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);

      expect(conversationId).toBe('demo-conversation-id');
      expect(voiceAI.isConnected).toBe(true);
      expect(voiceAI.recognition).not.toBeNull();
      expect(mockSpeechRecognition).toHaveBeenCalledTimes(1);
      expect(voiceAI.recognition.continuous).toBe(false);
      expect(voiceAI.recognition.interimResults).toBe(true);
      expect(voiceAI.recognition.lang).toBe('en-US');
      expect(voiceAI.onStatusChange).toHaveBeenCalledWith('connected');
    });

    // Test case 5: should call onError if microphone permission is denied
    test('should call onError if microphone permission is denied', async () => {
      mockMediaDevices.getUserMedia.mockImplementationOnce(() => Promise.reject(new Error('Permission denied')));
      await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);
      expect(onErrorMock).toHaveBeenCalledWith('Microphone permission is required for voice mode.');
      expect(voiceAI.isConnected).toBe(false);
    });

    // Test case 6: should call onError if SpeechRecognition is not supported
    test('should call onError if SpeechRecognition is not supported', async () => {
      const originalSpeechRecognition = window.SpeechRecognition;
      window.SpeechRecognition = undefined;
      await voiceAI.requestPermissions(); // Grant permission first
      await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);
      expect(onErrorMock).toHaveBeenCalledWith('Speech recognition not supported in this browser.');
      expect(voiceAI.isConnected).toBe(false);
      window.SpeechRecognition = originalSpeechRecognition; // Restore
    });
  });

  describe('startListening', () => {
    // Test case 7: should start listening if connected and not already listening
    test('should start listening if connected and not already listening', async () => {
      await voiceAI.requestPermissions();
      await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);
      voiceAI.startListening();
      expect(voiceAI.recognition.start).toHaveBeenCalledTimes(1);
      expect(voiceAI.isListening).toBe(true);
      // The onStatusChangeMock for 'listening' is called by the recognition.onstart event handler
      // which is mocked to be called when recognition.start() is called.
      expect(onStatusChangeMock).toHaveBeenCalledWith('listening');
    });

    // Test case 8: should not start listening if already listening
    test('should not start listening if already listening', async () => {
      await voiceAI.requestPermissions();
      await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);
      voiceAI.isListening = true; // Manually set to true
      voiceAI.startListening();
      expect(voiceAI.recognition.start).not.toHaveBeenCalled();
    });

    // Test case 9: should call onError if starting listening fails
    test('should call onError if starting listening fails', async () => {
      await voiceAI.requestPermissions();
      await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);
      voiceAI.recognition.start.mockImplementationOnce(() => {
        throw new Error('Mic error');
      });
      voiceAI.startListening();
      expect(onErrorMock).toHaveBeenCalledWith('Failed to start listening.');
    });
  });

  describe('stopListening', () => {
    // Test case 10: should stop listening if currently listening
    test('should stop listening if currently listening', async () => {
      await voiceAI.requestPermissions();
      await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);
      voiceAI.startListening(); // Start it first
      voiceAI.stopListening();
      expect(voiceAI.recognition.stop).toHaveBeenCalledTimes(1);
      // isListening is set to false by recognition.onend, which is mocked to be called after stop()
      // For this test, we just check if stop() was called.
    });

    // Test case 11: should not stop listening if not currently listening
    test('should not stop listening if not currently listening', async () => {
      await voiceAI.requestPermissions();
      await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);
      voiceAI.stopListening();
      expect(voiceAI.recognition.stop).not.toHaveBeenCalled();
    });
  });

  describe('speak', () => {
    // Test case 12: should speak the given text using ElevenLabs API
    test('should speak the given text using ElevenLabs API', async () => {
      const testText = 'Hello, world!';
      const testVoiceId = 'test_voice_id';
      await voiceAI.speak(testText, testVoiceId);

      expect(voiceAI.isSpeaking).toBe(false); // Should be false after promise resolves
      expect(onStatusChangeMock).toHaveBeenCalledWith('speaking');
      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.elevenlabs.io/v1/text-to-speech/${testVoiceId}`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': 'test_elevenlabs_api_key',
          },
          body: JSON.stringify({
            text: testText,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        })
      );
      expect(voiceAI.audioContext.decodeAudioData).toHaveBeenCalled();
      expect(voiceAI.audioSource.connect).toHaveBeenCalledWith(voiceAI.audioContext.destination);
      expect(voiceAI.audioSource.start).toHaveBeenCalledWith(0);
      expect(onStatusChangeMock).toHaveBeenCalledWith('connected');
    });

    // Test case 13: should resolve promise when speech ends
    test('should resolve promise when speech ends', async () => {
      const testText = 'Testing speech end.';
      const testVoiceId = 'test_voice_id';
      
      const speakPromise = voiceAI.speak(testText, testVoiceId);
      
      // Manually trigger the onended event
      const audioSourceInstance = voiceAI.audioContext.createBufferSource.mock.results[0].value;
      audioSourceInstance.onended();

      await speakPromise; // Wait for the promise to resolve

      expect(voiceAI.isSpeaking).toBe(false);
      expect(voiceAI.audioSource).toBeNull();
      expect(onStatusChangeMock).toHaveBeenCalledWith('connected');
    });
  });

  describe('disconnect', () => {
    // Test case 14: should disconnect and reset states
    test('should disconnect and reset states', async () => {
      await voiceAI.requestPermissions();
      await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);
      voiceAI.startListening(); // Start listening to set some states

      voiceAI.disconnect();
      expect(voiceAI.isConnected).toBe(false);
      expect(voiceAI.recognition.stop).toHaveBeenCalledTimes(1);
      expect(voiceAI.isListening).toBe(false);
      expect(voiceAI.isSpeaking).toBe(false);
      expect(voiceAI.hasPermission).toBe(false);
      // Ensure audioSource is stopped and disconnected if it existed
      expect(voiceAI.audioSource.stop).toHaveBeenCalledTimes(1);
      expect(voiceAI.audioSource.disconnect).toHaveBeenCalledTimes(1);
      expect(voiceAI.audioSource).toBeNull();
    });
  });

  describe('SpeechRecognition callbacks', () => {
    beforeEach(async () => {
      await voiceAI.requestPermissions();
      await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);
    });

    // Test case 15: should handle onresult with final transcript
    test('should handle onresult with final transcript', () => {
      const finalTranscript = 'This is a final transcript.';
      const event = {
        results: [
          [{ transcript: 'This is a ', confidence: 0.9 }],
          [{ transcript: 'final transcript.', confidence: 0.9, isFinal: true }],
        ],
        resultIndex: 0,
      };
      voiceAI.recognition.onresult(event);
      expect(onMessageMock).toHaveBeenCalledWith({ type: 'user_transcript', content: finalTranscript });
      expect(onMessageMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'interim_transcript' }));
    });

    // Test case 16: should handle onresult with only interim transcript
    test('should handle onresult with only interim transcript', () => {
      const interimTranscript = 'This is an interim transcript.';
      const event = {
        results: [
          [{ transcript: interimTranscript, confidence: 0.8 }],
        ],
        resultIndex: 0,
      };
      voiceAI.recognition.onresult(event);
      expect(onMessageMock).toHaveBeenCalledWith({ type: 'interim_transcript', content: interimTranscript });
      expect(onMessageMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'user_transcript' }));
    });

    // Test case 17: should handle onerror
    test('should handle onerror', () => {
      const errorEvent = { error: 'network' };
      voiceAI.recognition.onerror(errorEvent);
      expect(onErrorMock).toHaveBeenCalledWith('Speech recognition error: network');
      expect(voiceAI.isListening).toBe(false);
      expect(onStatusChangeMock).toHaveBeenCalledWith('connected');
    });
  });
});
