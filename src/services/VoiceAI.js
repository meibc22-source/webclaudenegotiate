export class VoiceAI {
  constructor(elevenLabsApiKey) {
    this.elevenLabsApiKey = elevenLabsApiKey;
    this.elevenLabsApiUrl = 'https://api.elevenlabs.io/v1/text-to-speech/'; // ElevenLabs API Base URL
    this.isConnected = false;
    this.isListening = false;
    this.isSpeaking = false;
    this.recognition = null;
    this.synthesis = window.speechSynthesis; // This will be replaced for ElevenLabs speech
    this.hasPermission = false;
    this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)(); // For playing ElevenLabs audio
    this.audioSource = null; // To keep track of the current audio source for stopping
    this.onMessage = () => {}; // Initialize with no-op function
    this.onError = () => {};   // Initialize with no-op function
    this.onStatusChange = () => {}; // Initialize with no-op function
  }

  async requestPermissions() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      this.hasPermission = true;
      return true;
    } catch (error) {
      this.hasPermission = false;
      return false;
    }
  }

  async connect(onMessage, onError, onStatusChange) {
    this.onMessage = onMessage;
    this.onError = onError;
    this.onStatusChange = onStatusChange;
    
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      this.onError('Microphone permission is required for voice mode.');
      return null;
    }

    if (this.SpeechRecognition) {
      this.recognition = new this.SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStatusChange('listening');
      };

      this.recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (interimTranscript) {
          this.onMessage({ type: 'interim_transcript', content: interimTranscript });
        }

        if (finalTranscript) {
          this.onMessage({ type: 'user_transcript', content: finalTranscript.trim() });
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onStatusChange('connected');
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        this.onStatusChange('connected');
        this.onError('Speech recognition error: ' + event.error);
      };

      this.isConnected = true;
      return 'demo-conversation-id';
    } else {
      this.onError('Speech recognition not supported in this browser.');
      return null;
    }
  }

  startListening() {
    if (this.recognition && this.isConnected && !this.isListening) {
      try {
        this.recognition.start();
      } catch (error) {
        this.onError('Failed to start listening.');
      }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  async speak(text, voiceId) { // Added voiceId parameter
    if (!this.elevenLabsApiKey || !voiceId) {
      console.error("ElevenLabs API key or Voice ID is missing. Falling back to browser synthesis.");
      // Fallback to browser synthesis if ElevenLabs is not configured
      return new Promise((resolve) => {
        if (this.synthesis) {
          this.synthesis.cancel();
          this.isSpeaking = true;
          this.onStatusChange('speaking');
          
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.7;
          utterance.pitch = 0.6;
          utterance.volume = 0.9;
          
          utterance.onend = () => {
            this.isSpeaking = false;
            this.onStatusChange('connected');
            resolve();
          };
          
          this.synthesis.speak(utterance);
        } else {
          resolve();
        }
      });
    }

    this.isSpeaking = true;
    this.onStatusChange('speaking');

    try {
      const response = await fetch(`${this.elevenLabsApiUrl}${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_monolingual_v1", // Or another appropriate model_id
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.statusText} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      if (this.audioSource) {
        this.audioSource.stop();
        this.audioSource.disconnect();
      }

      this.audioSource = this.audioContext.createBufferSource();
      this.audioSource.buffer = audioBuffer;
      this.audioSource.connect(this.audioContext.destination);
      this.audioSource.start(0);

      return new Promise(resolve => {
        this.audioSource.onended = () => {
          this.isSpeaking = false;
          this.onStatusChange('connected');
          this.audioSource = null;
          resolve();
        };
      });

    } catch (error) {
      console.error("Error speaking with ElevenLabs:", error);
      return Promise.resolve(); 
    } finally {
      this.isSpeaking = false;
      this.onStatusChange('connected');
    }
  }

  disconnect() {
    this.isConnected = false;
    if (this.recognition) {
      this.recognition.stop();
      this.isListening = false;
    }
    if (this.audioSource) {
      this.audioSource.stop();
      this.audioSource.disconnect();
      this.audioSource = null;
    }
    this.isSpeaking = false;
    this.hasPermission = false;
  }
}
