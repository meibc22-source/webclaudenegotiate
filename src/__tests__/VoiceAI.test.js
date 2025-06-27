import { VoiceAI } from '../App.jsx'; // Assuming VoiceAI is exported from App.jsx

// Mocking global objects for JSDOM environment
const mockSpeechRecognition = jest.fn(() => ({
  continuous: false,
  interimResults: true,
  lang: 'en-US',
  onstart: null,
  onresult: null,
  onend: null,
  onerror: null,
  start: jest.fn(),
  stop: jest.fn(),
}));

const mockSpeechSynthesisUtterance = jest.fn(() => ({
  rate: 0.7,
  pitch: 0.6,
  volume: 0.9,
  onend: null,
}));

const mockSpeechSynthesis = {
  cancel: jest.fn(),
  speak: jest.fn(),
};

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
  value: {
    getUserMedia: jest.fn(() => Promise.resolve()),
  },
});


describe('VoiceAI', () => {
  let voiceAI;
  let onMessageMock;
  let onErrorMock;
  let onStatusChangeMock;

  beforeEach(() => {
    voiceAI = new VoiceAI();
    onMessageMock = jest.fn();
    onErrorMock = jest.fn();
    onStatusChangeMock = jest.fn();
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should initialize with correct default states', () => {
    expect(voiceAI.isConnected).toBe(false);
    expect(voiceAI.isListening).toBe(false);
    expect(voiceAI.isSpeaking).toBe(false);
    expect(voiceAI.recognition).toBeNull();
    expect(voiceAI.synthesis).toBe(mockSpeechSynthesis);
    expect(voiceAI.hasPermission).toBe(false);
  });

  describe('requestPermissions', () => {
    it('should set hasPermission to true on successful permission grant', async () => {
      navigator.mediaDevices.getUserMedia.mockResolvedValueOnce();
      const result = await voiceAI.requestPermissions();
      expect(result).toBe(true);
      expect(voiceAI.hasPermission).toBe(true);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    it('should set hasPermission to false on permission denial', async () => {
      navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Permission denied'));
      const result = await voiceAI.requestPermissions();
      expect(result).toBe(false);
      expect(voiceAI.hasPermission).toBe(false);
    });
  });

  describe('connect', () => {
    it('should connect and initialize recognition if permissions are granted', async () => {
      navigator.mediaDevices.getUserMedia.mockResolvedValueOnce();
      const conversationId = await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);

      expect(voiceAI.isConnected).toBe(true);
      expect(voiceAI.recognition).not.toBeNull();
      expect(mockSpeechRecognition).toHaveBeenCalledTimes(1);
      expect(onStatusChangeMock).not.toHaveBeenCalledWith('listening'); // Should not be listening immediately
      expect(conversationId).toBe('demo-conversation-id');
    });

    it('should call onError if microphone permission is denied', async () => {
      navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Permission denied'));
      const conversationId = await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);

      expect(voiceAI.isConnected).toBe(false);
      expect(voiceAI.recognition).toBeNull();
      expect(onErrorMock).toHaveBeenCalledWith('Microphone permission is required for voice mode.');
      expect(conversationId).toBeNull();
    });

    it('should call onError if SpeechRecognition is not supported', async () => {
      // Temporarily remove SpeechRecognition to simulate unsupported browser
      const originalSpeechRecognition = window.SpeechRecognition;
      window.SpeechRecognition = undefined;
      window.webkitSpeechRecognition = undefined;

      const conversationId = await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);

      expect(voiceAI.isConnected).toBe(false);
      expect(voiceAI.recognition).toBeNull();
      expect(onErrorMock).toHaveBeenCalledWith('Speech recognition not supported in this browser.');
      expect(conversationId).toBeNull();

      // Restore original SpeechRecognition
      window.SpeechRecognition = originalSpeechRecognition;
      window.webkitSpeechRecognition = originalSpeechRecognition;
    });
  });

  describe('startListening', () => {
    beforeEach(async () => {
      navigator.mediaDevices.getUserMedia.mockResolvedValueOnce();
      await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);
    });

    it('should start listening if connected and not already listening', () => {
      voiceAI.startListening();
      expect(voiceAI.recognition.start).toHaveBeenCalledTimes(1);
      // onstart is called by the browser, then status change
      voiceAI.recognition.onstart();
      expect(voiceAI.isListening).toBe(true);
      expect(onStatusChangeMock).toHaveBeenCalledWith('listening');
    });

    it('should not start listening if already listening', () => {
      voiceAI.isListening = true; // Manually set to listening
      voiceAI.startListening();
      expect(voiceAI.recognition.start).not.toHaveBeenCalled();
    });

    it('should call onError if starting listening fails', () => {
      voiceAI.recognition.start.mockImplementationOnce(() => { throw new Error('Start failed'); });
      voiceAI.startListening();
      expect(onErrorMock).toHaveBeenCalledWith('Failed to start listening.');
    });
  });

  describe('stopListening', () => {
    beforeEach(async () => {
      navigator.mediaDevices.getUserMedia.mockResolvedValueOnce();
      await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);
      voiceAI.startListening();
      voiceAI.recognition.onstart(); // Simulate start event
    });

    it('should stop listening if currently listening', () => {
      voiceAI.stopListening();
      expect(voiceAI.recognition.stop).toHaveBeenCalledTimes(1);
      // onend is called by the browser, then status change
      voiceAI.recognition.onend();
      expect(voiceAI.isListening).toBe(false);
      expect(onStatusChangeMock).toHaveBeenCalledWith('connected');
    });

    it('should not stop listening if not currently listening', () => {
      voiceAI.isListening = false; // Manually set to not listening
      voiceAI.stopListening();
      expect(voiceAI.recognition.stop).not.toHaveBeenCalled();
    });
  });

  describe('speak', () => {
    beforeEach(async () => {
      navigator.mediaDevices.getUserMedia.mockResolvedValueOnce();
      await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);
    });

    it('should speak the given text', async () => {
      const testText = 'Hello, Khan!';
      await voiceAI.speak(testText);
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalledTimes(1);
      expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);
      expect(mockSpeechSynthesisUtterance).toHaveBeenCalledWith(testText);
      expect(voiceAI.isSpeaking).toBe(true);
      expect(onStatusChangeMock).toHaveBeenCalledWith('speaking');
    });

    it('should resolve promise when speech ends', async () => {
      const speakPromise = voiceAI.speak('Test');
      // Simulate speech ending
      mockSpeechSynthesisUtterance.mock.results[0].value.onend();
      await speakPromise; // Wait for the promise to resolve
      expect(voiceAI.isSpeaking).toBe(false);
      expect(onStatusChangeMock).toHaveBeenCalledWith('connected');
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      navigator.mediaDevices.getUserMedia.mockResolvedValueOnce();
      await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);
      voiceAI.startListening();
      voiceAI.speak('test');
    });

    it('should disconnect and reset states', () => {
      voiceAI.disconnect();
      expect(voiceAI.isConnected).toBe(false);
      expect(voiceAI.recognition.stop).toHaveBeenCalledTimes(1);
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalledTimes(1);
      expect(voiceAI.isListening).toBe(false);
      expect(voiceAI.isSpeaking).toBe(false);
      expect(voiceAI.hasPermission).toBe(false);
    });
  });

  describe('SpeechRecognition callbacks', () => {
    beforeEach(async () => {
      navigator.mediaDevices.getUserMedia.mockResolvedValueOnce();
      await voiceAI.connect(onMessageMock, onErrorMock, onStatusChangeMock);
      voiceAI.startListening();
    });

    it('should handle onresult with final transcript', () => {
      const mockEvent = {
        resultIndex: 0,
        results: [
          [{ transcript: 'final transcript part 1', isFinal: false }],
          [{ transcript: 'final transcript part 2', isFinal: true }],
        ],
      };
      voiceAI.recognition.onresult(mockEvent);
      expect(onMessageMock).toHaveBeenCalledWith({ type: 'user_transcript', content: 'final transcript part 2' });
      expect(onMessageMock).toHaveBeenCalledWith({ type: 'interim_transcript', content: 'final transcript part 1' });
    });

    it('should handle onresult with only interim transcript', () => {
      const mockEvent = {
        resultIndex: 0,
        results: [
          [{ transcript: 'interim transcript', isFinal: false }],
        ],
      };
      voiceAI.recognition.onresult(mockEvent);
      expect(onMessageMock).toHaveBeenCalledWith({ type: 'interim_transcript', content: 'interim transcript' });
      expect(onMessageMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'user_transcript' }));
    });

    it('should handle onerror', () => {
      const mockErrorEvent = { error: 'network' };
      voiceAI.recognition.onerror(mockErrorEvent);
      expect(voiceAI.isListening).toBe(false);
      expect(onStatusChangeMock).toHaveBeenCalledWith('connected');
      expect(onErrorMock).toHaveBeenCalledWith('Speech recognition error: network');
    });
  });
});
