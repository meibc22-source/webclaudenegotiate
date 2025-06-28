import React, { useState, useEffect } from 'react';
import { Play, Settings, Trophy, User, Mic, MicOff, Volume2, Phone, PhoneOff, Star, Users, Zap, Target, ArrowRight, CheckCircle, Award, TrendingUp, Clock, Shield, Car, DollarSign, MessageCircle, Send } from 'lucide-react';

// Voice AI Integration
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
      this.onError(`ElevenLabs speech error: ${error.message}`);
      this.isSpeaking = false;
      this.onStatusChange('connected');
      return Promise.resolve(); 
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

// Car Market Data Service
export class CarMarketDataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000;
  }

  async getCarData(make, model, year) {
    const cacheKey = `${make}-${model}-${year}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    const basePrice = this.calculateBasePrice(make, model, year);
    const marketFactors = this.getMarketFactors(make, model, year);
    
    const carData = {
      id: Date.now() + Math.random(),
      make,
      model,
      year,
      price: Math.round(basePrice * marketFactors.dealer),
      msrp: Math.round(basePrice * marketFactors.msrp),
      tradeInValue: Math.round(basePrice * marketFactors.tradeIn),
      privatePartyValue: Math.round(basePrice * marketFactors.privateParty),
      marketTrend: marketFactors.trend,
      marketActivity: this.getMarketActivity(make, model, year),
      fuelEconomy: this.estimateFuelEconomy(make, model, year),
      safetyRating: this.estimateSafetyRating(make, model, year),
      availableListings: Math.floor(Math.random() * 50) + 10,
      lastUpdated: new Date().toLocaleString(),
      khan_description: this.generateKhanDescription(make, model, year)
    };

    this.cache.set(cacheKey, {
      data: carData,
      timestamp: Date.now()
    });

    return carData;
  }

  calculateBasePrice(make, model, year) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;
    
    const basePrices = {
      honda: { civic: 28000, accord: 32000, 'cr-v': 35000, pilot: 42000 },
      toyota: { camry: 32000, corolla: 25000, 'rav4': 38000, highlander: 45000 },
      ford: { 'f-150': 45000, mustang: 38000, escape: 35000, explorer: 42000 },
      chevrolet: { silverado: 43000, malibu: 28000, equinox: 33000, tahoe: 58000 },
      bmw: { '3series': 45000, 'x3': 52000, 'x5': 68000 },
      mercedes: { 'c-class': 48000, 'glc': 55000, 'gle': 72000 },
      tesla: { 'model3': 42000, 'modely': 52000, 'models': 85000 }
    };

    const makeKey = make.toLowerCase();
    const modelKey = model.toLowerCase().replace(/[\s-]/g, '');
    
    let basePrice = 35000;
    if (basePrices[makeKey] && basePrices[makeKey][modelKey]) {
      basePrice = basePrices[makeKey][modelKey];
    }

    const depreciationFactors = {
      0: 1.0, 1: 0.82, 2: 0.70, 3: 0.62, 4: 0.56, 5: 0.52,
      6: 0.48, 7: 0.45, 8: 0.42, 9: 0.40, 10: 0.38
    };

    const depreciationFactor = depreciationFactors[Math.min(age, 10)] || 0.35;
    return Math.round(basePrice * depreciationFactor);
  }

  getMarketFactors(make, model, year) {
    const luxuryBrands = ['bmw', 'mercedes', 'audi', 'lexus', 'tesla'];
    const popularModels = ['civic', 'camry', 'f-150', 'rav4', 'cr-v'];
    
    const isLuxury = luxuryBrands.includes(make.toLowerCase());
    const isPopular = popularModels.includes(model.toLowerCase().replace(/[\s-]/g, ''));
    
    let msrpMultiplier = 1.0;
    let demandMultiplier = 1.0;
    
    if (isLuxury) {
      msrpMultiplier = 1.2;
      demandMultiplier = 0.9;
    }
    
    if (isPopular) {
      demandMultiplier = 1.1;
    }

    return {
      msrp: msrpMultiplier,
      tradeIn: 0.75 * demandMultiplier,
      privateParty: 0.85 * demandMultiplier,
      dealer: 0.92 * demandMultiplier,
      trend: this.getMarketTrend(make, model, year)
    };
  }

  getMarketTrend(make, model, year) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;
    
    const evModels = ['model3', 'modely', 'leaf', 'bolt', 'ioniq'];
    const isEV = evModels.some(ev => model.toLowerCase().includes(ev.replace(/\d/, '')));
    
    if (isEV) return '📈 Rising';
    if (age < 3) return '➡️ Stable';
    if (age > 8) return '📉 Declining';
    return '➡️ Stable';
  }

  generateKhanDescription(make, model, year) {
    const descriptions = [
      `A mighty ${year} ${make} ${model} - this mechanical steed will carry you to victory in your daily conquests!`,
      `Behold the ${year} ${make} ${model}! Like my war horses, reliable and built for the long campaign ahead.`,
      `The ${year} ${make} ${model} - engineered for dominance! This machine commands respect on any battlefield.`,
      `A formidable ${year} ${make} ${model}! Your enemies will tremble as you approach in this war chariot.`,
      `This ${year} ${make} ${model} rivals the finest steeds in my imperial stable. Choose wisely, warrior!`
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  estimateSafetyRating(make, model, year) {
    const ratings = { honda: 5, toyota: 5, subaru: 5, volvo: 5, tesla: 5, bmw: 4, mercedes: 4 };
    return ratings[make.toLowerCase()] || 4;
  }

  estimateFuelEconomy(make, model, year) {
    const economy = { honda: 32, toyota: 31, tesla: 120, ford: 28, chevrolet: 27, bmw: 26 };
    return economy[make.toLowerCase()] || 28;
  }

  getMarketActivity(make, model, year) {
    const activities = ['🔥 High Demand', '📊 Moderate Activity', '📉 Low Activity'];
    return activities[Math.floor(Math.random() * activities.length)];
  }

  getPopularModels() {
    return [
      { make: 'Honda', model: 'Civic', year: 2024 },
      { make: 'Toyota', model: 'Camry', year: 2024 },
      { make: 'Ford', model: 'F-150', year: 2024 },
      { make: 'Tesla', model: 'Model 3', year: 2024 },
      { make: 'Honda', model: 'CR-V', year: 2024 },
      { make: 'Toyota', model: 'RAV4', year: 2024 }
    ];
  }
}

// Genghis Khan Persona Data
const genghisKhanPersona = {
  id: 'genghis_khan',
  name: 'Genghis Khan',
  title: 'The Conquering Salesman',
  avatar: '👑',
  description: 'The Great Khan now rules the car lot with the same iron will that built the largest empire in history.',
  elevenLabsVoiceId: 'RqYO5vKm63p7RwjA4a3y',
  stats: {
    aggression: 9,
    dataReliance: 3,
    patience: 2,
    flexibility: 4,
    emotionalAppeal: 1,
    riskTolerance: 8
  }
};


const benjaminFranklinPersona = {
  id: 'benjamin_franklin',
  name: 'Benjamin Franklin',
  title: 'The Diplomatic Dealer',
  avatar: '🎩',
  description: 'Master of charm and persuasion, uses wit and wisdom to close deals.',
  elevenLabsVoiceId: 'LVWu6fUcVpyUDlzDrQ8u',
  stats: {
    diplomacy: 8,
    patience: 9,
    wit: 10,
    flexibility: 7,
    emotionalAppeal: 8,
    riskTolerance: 3
  }
};

export default function NegotiationLegends() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedCar, setSelectedCar] = useState(null);
  const [selectedPersona, setSelectedPersona] = useState(genghisKhanPersona); // New state for selected persona
  const [conversation, setConversation] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [voiceAI] = useState(new VoiceAI(import.meta.env.VITE_ELEVENLABS_API_KEY)); // Pass API key from environment
  const [voiceStatus, setVoiceStatus] = useState('disconnected');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [carMarketService] = useState(new CarMarketDataService());
  const [availableCars, setAvailableCars] = useState([]);
  const [isLoadingCars, setIsLoadingCars] = useState(false);
  const [userStats, setUserStats] = useState({
    level: 1,
    experience: 0,
    wins: 0,
    totalNegotiations: 0
  });
  const [isSpacebarPressed, setIsSpacebarPressed] = useState(false); // New state for spacebar

  useEffect(() => {
    loadMarketCars();
  }, []);

  // Effect for handling spacebar press for voice input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (currentScreen === 'negotiation' && isVoiceEnabled && e.code === 'Space') {
        // Check if the message input field is focused
        const messageInput = document.getElementById('userMessageInput');
        if (messageInput && document.activeElement === messageInput) {
          // If input is focused, allow spacebar to function as normal text input
          return;
        }

        // Prevent default spacebar behavior (e.g., page scroll)
        e.preventDefault(); 
        // Only start listening if not already listening and not already pressed
        if (!voiceAI.isListening && !isSpacebarPressed) {
          setIsSpacebarPressed(true);
          startListening();
        }
      }
    };

    const handleKeyUp = (e) => {
      if (currentScreen === 'negotiation' && isVoiceEnabled && e.code === 'Space') {
        // Only stop listening if it was started by spacebar press
        if (isSpacebarPressed) {
          setIsSpacebarPressed(false);
          stopListening();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentScreen, isVoiceEnabled, isSpacebarPressed, voiceAI, startListening, stopListening]);

  const loadMarketCars = async () => {
    setIsLoadingCars(true);
    try {
      const popularModels = carMarketService.getPopularModels();
      const carPromises = popularModels.map(async (model) => {
        return await carMarketService.getCarData(model.make, model.model, model.year);
      });
      
      const cars = await Promise.all(carPromises);
      setAvailableCars(cars);
    } catch (error) {
      console.error('Error loading market data:', error);
      setAvailableCars([
        await carMarketService.getCarData('Honda', 'Civic', 2024),
        await carMarketService.getCarData('Toyota', 'Camry', 2024),
        await carMarketService.getCarData('Ford', 'F-150', 2024)
      ]);
    } finally {
      setIsLoadingCars(false);
    }
  };

  const toggleVoiceMode = async () => {
    if (!isVoiceEnabled) {
      setVoiceStatus('connecting');
      setVoiceError('');
      
      try {
        const conversationId = await voiceAI.connect(
          (message) => {
            if (message.type === 'user_transcript') {
              setInterimTranscript('');
              
              const newUserMessage = {
                speaker: 'user',
                message: message.content,
                timestamp: new Date(),
                isVoice: true
              };
              
              const personaResponse = generatePersonaResponse(selectedPersona, message.content);
              const personaMessage = {
                speaker: selectedPersona.id,
                message: personaResponse,
                timestamp: new Date(),
                isVoice: true
              };
              
              setConversation(prev => [...prev, newUserMessage, personaMessage]);
              voiceAI.speak(personaResponse, selectedPersona.elevenLabsVoiceId); // Pass voiceId from selected persona
              
            } else if (message.type === 'interim_transcript') {
              setInterimTranscript(message.content);
            }
          },
          (error) => {
            setVoiceError(error);
            setVoiceStatus('disconnected');
            setIsVoiceEnabled(false);
          },
          (status) => {
            setVoiceStatus(status);
          }
        );
        
        if (conversationId) {
          setVoiceStatus('connected');
          setIsVoiceEnabled(true);
          
          const voiceIntro = {
            speaker: selectedPersona.id,
            message: `${selectedPersona.name} now speaks to you directly! Hold the microphone button and speak your challenges, warrior!`,
            timestamp: new Date(),
            isVoice: true
          };
          setConversation(prev => [...prev, voiceIntro]);
          voiceAI.speak(voiceIntro.message, selectedPersona.elevenLabsVoiceId); // Pass voiceId from selected persona
        }
        
      } catch (error) {
        setVoiceError('Failed to initialize voice mode.');
        setVoiceStatus('disconnected');
        setIsVoiceEnabled(false);
      }
    } else {
      voiceAI.disconnect();
      setVoiceStatus('disconnected');
      setIsVoiceEnabled(false);
      setInterimTranscript('');
      setVoiceError('');
    }
  };

  const startListening = () => {
    if (isVoiceEnabled && voiceStatus === 'connected') {
      setVoiceError('');
      voiceAI.startListening();
    }
  };

  const stopListening = () => {
    if (isVoiceEnabled) {
      voiceAI.stopListening();
    }
  };

  const generatePersonaResponse = (persona, userInput) => {
    const lowerInput = userInput.toLowerCase();
    
    if (persona.id === 'genghis_khan') {
      if (lowerInput.includes('price') || lowerInput.includes('expensive') || lowerInput.includes('cost')) {
        return "The price reflects this vehicle's power to conquer highways! I do not negotiate with those who question the value of victory!";
      } else if (lowerInput.includes('think') || lowerInput.includes('consider') || lowerInput.includes('decide')) {
        return "Warriors do not hesitate when opportunity presents itself! While you ponder, three other buyers circle like vultures!";
      } else if (lowerInput.includes('other') || lowerInput.includes('compare') || lowerInput.includes('shop')) {
        return "You may ride to distant dealerships as my scouts once rode distant lands. You will find only inferior steeds!";
      } else {
        const responses = [
          "The Khan hears your words. What vehicle shall serve your campaigns?",
          "You stand before the greatest seller of steeds in this realm! State your needs clearly!",
          "I have conquered markets as I once conquered nations. Choose wisely!",
          "The Great Khan does not waste time with idle chatter. Do you seek a vehicle?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      }
    } else if (persona.id === 'benjamin_franklin') {
      if (lowerInput.includes('price') || lowerInput.includes('expensive') || lowerInput.includes('cost')) {
        return "A penny saved is a penny earned, my friend. Let us discuss how we might find a price agreeable to both our purses.";
      } else if (lowerInput.includes('think') || lowerInput.includes('consider') || lowerInput.includes('decide')) {
        return "Take your time, for haste makes waste. A well-considered decision benefits all.";
      } else if (lowerInput.includes('other') || lowerInput.includes('compare') || lowerInput.includes('shop')) {
        return "Comparison is the thief of joy, but also a path to wisdom. Yet, I believe you'll find our offer quite reasonable.";
      } else {
        const responses = [
          "Good day! How may I be of assistance in your pursuit of a fine automobile?",
          "Industry and frugality are the means of procuring wealth. Let's talk about value.",
          "I find that a calm discussion often leads to the most agreeable outcomes. What's on your mind?",
          "Let us reason together. What brings you to consider this particular conveyance?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }
    return "I am an AI persona. How can I help you?"; // Default fallback
  };

  const startNegotiation = (car) => {
    setSelectedCar(car);
    setConversation([
      {
        speaker: selectedPersona.id,
        message: `I am ${selectedPersona.name}, ${selectedPersona.title}. You have entered my domain. You show interest in ${car.khan_description}`,
        timestamp: new Date()
      }
    ]);
    setCurrentScreen('negotiation');
  };

  const sendMessage = () => {
    if (!userMessage.trim()) return;

    const newUserMessage = {
      speaker: 'user',
      message: userMessage,
      timestamp: new Date()
    };

    const personaResponse = {
      speaker: selectedPersona.id,
      message: generatePersonaResponse(selectedPersona, userMessage),
      timestamp: new Date()
    };

    setConversation(prev => [...prev, newUserMessage, personaResponse]);
    setUserMessage('');
  };

  const PersonaStat = ({ label, value, max = 10 }) => (
    <div className="mb-3">
      <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-500" 
          style={{ width: `${(value / max) * 100}%` }}
        ></div>
      </div>
    </div>
  );

  // Home Screen
  if (currentScreen === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
            
            <div className="text-center mb-16">
              <div className="flex items-center justify-center mb-6">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Negotiation Legends
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Master the art of negotiation with history's greatest dealmakers. 
                Train against AI-powered historical figures and become unstoppable.
              </p>
              
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-100 to-red-100 border border-orange-200 rounded-full mb-8">
                <Zap className="h-4 w-4 text-orange-600 mr-2" />
                <span className="text-sm font-medium text-orange-800">Built with Bolt.new</span>
                <span className="ml-2 text-sm text-orange-600">• Powered by ElevenLabs Voice AI</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => setCurrentScreen('carSelection')}
                  className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Start Training Now
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => setCurrentScreen('settings')}
                  className="inline-flex items-center px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:bg-gray-50"
                >
                  <Settings className="mr-2 h-5 w-5" />
                  View Demo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{userStats.level}</div>
                <div className="text-sm text-gray-600">Current Level</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">{userStats.experience}</div>
                <div className="text-sm text-gray-600">Experience Points</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">{userStats.wins}</div>
                <div className="text-sm text-gray-600">Successful Deals</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">{userStats.totalNegotiations}</div>
                <div className="text-sm text-gray-600">Total Battles</div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl w-fit mb-4">
                  <Mic className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Voice AI Training</h3>
                <p className="text-gray-600 mb-4">
                  Speak directly with historical figures using cutting-edge voice AI. 
                  Practice real conversations, not just text exchanges.
                </p>
                <div className="flex items-center text-blue-600 font-medium">
                  <span>Powered by ElevenLabs</span>
                  <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl w-fit mb-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Historical Personas</h3>
                <p className="text-gray-600 mb-4">
                  Face legendary negotiators like Genghis Khan, Benjamin Franklin, 
                  and John D. Rockefeller. Each with unique strategies and personalities.
                </p>
                <div className="flex items-center text-purple-600 font-medium">
                  <span>3+ Historical Figures</span>
                  <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
                <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl w-fit mb-4">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Real-World Scenarios</h3>
                <p className="text-gray-600 mb-4">
                  Practice car buying negotiations with real market data. 
                  Build skills that transfer to any negotiation situation.
                </p>
                <div className="flex items-center text-green-600 font-medium">
                  <span>Live Market Data</span>
                  <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Opponent</h2>
                <p className="text-gray-600">Each historical figure brings unique negotiation styles and challenges</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="group relative overflow-hidden bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6 hover:border-red-400 transition-all duration-300 cursor-pointer transform hover:scale-105">
                  <div className="text-center">
                    <div className="text-6xl mb-4">{genghisKhanPersona.avatar}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{genghisKhanPersona.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{genghisKhanPersona.title}</p>
                    <p className="text-xs text-gray-500 mb-4">{genghisKhanPersona.description}</p>
                    
                    <div className="text-left mb-4">
                      <PersonaStat label="Aggression" value={genghisKhanPersona.stats.aggression} />
                      <PersonaStat label="Patience" value={genghisKhanPersona.stats.patience} />
                      <PersonaStat label="Flexibility" value={genghisKhanPersona.stats.flexibility} />
                    </div>
                    
                    <button 
                      onClick={() => {
                        setSelectedPersona(genghisKhanPersona);
                        setCurrentScreen('carSelection');
                      }}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-4 rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-lg font-semibold"
                    >
                      Challenge the Khan
                    </button>
                  </div>
                </div>
                
                <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 hover:border-blue-400 transition-all duration-300 cursor-pointer opacity-60">
                  <div className="text-center">
                    <div className="text-6xl mb-4">{benjaminFranklinPersona.avatar}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{benjaminFranklinPersona.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{benjaminFranklinPersona.title}</p>
                    <p className="text-xs text-gray-500 mb-4">{benjaminFranklinPersona.description}</p>
                    
                    <div className="text-left mb-4">
                      <PersonaStat label="Diplomacy" value={benjaminFranklinPersona.stats.diplomacy} />
                      <PersonaStat label="Patience" value={benjaminFranklinPersona.stats.patience} />
                      <PersonaStat label="Wit" value={benjaminFranklinPersona.stats.wit} />
                    </div>
                    
                    <button 
                      onClick={() => {
                        setSelectedPersona(benjaminFranklinPersona);
                        setCurrentScreen('carSelection');
                      }}
                      className="w-full bg-gradient-to-r from-blue-400 to-blue-500 text-white py-3 px-4 rounded-xl font-semibold opacity-50 cursor-not-allowed">
                      Coming Soon
                    </button>
                  </div>
                </div>

                <div className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 hover:border-green-400 transition-all duration-300 cursor-pointer">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💰</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">John D. Rockefeller</h3>
                    <p className="text-sm text-gray-600 mb-4">The Ruthless Businessman</p>
                    <p className="text-xs text-gray-500 mb-4">Calculates every move, dominates through data and strategic thinking.</p>
                    
                    <div className="text-left mb-4">
                      <PersonaStat label="Strategy" value={10} />
                      <PersonaStat label="Data Focus" value={9} />
                      <PersonaStat label="Patience" value={7} />
                    </div>
                    
                    <button 
                      onClick={() => {
                        setSelectedPersona({
                          id: 'john_d_rockefeller',
                          name: 'John D. Rockefeller',
                          title: 'The Ruthless Businessman',
                          avatar: '💰',
                          description: 'Calculates every move, dominates through data and strategic thinking.',
                          elevenLabsVoiceId: 'MijWJwalV0YTI5cNnz0a',
                          stats: {
                            strategy: 10,
                            dataFocus: 9,
                            patience: 7,
                            flexibility: 5,
                            emotionalAppeal: 2,
                            riskTolerance: 9
                          }
                        });
                        setCurrentScreen('carSelection');
                      }}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-lg font-semibold"
                    >
                      Challenge Rockefeller
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Car Selection Screen
  if (currentScreen === 'carSelection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <button 
              onClick={() => setCurrentScreen('home')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
              Back to Home
            </button>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Negotiation Vehicle</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Select a car to negotiate for with Genghis Khan. Each vehicle comes with real market data to help you make informed decisions.
            </p>
          </div>

          {isLoadingCars ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading market data...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {availableCars.map((car, index) => (
                <div key={car.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Car className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{car.year} {car.make} {car.model}</h3>
                          <p className="text-sm text-gray-500">{car.marketActivity}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">${car.price.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">Dealer Price</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-2">Market Information</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">MSRP:</span>
                          <span className="font-semibold ml-2">${car.msrp.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Trade-in:</span>
                          <span className="font-semibold ml-2">${car.tradeInValue.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Trend:</span>
                          <span className="font-semibold ml-2">{car.marketTrend}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">MPG:</span>
                          <span className="font-semibold ml-2">{car.fuelEconomy}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Safety Rating:</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < car.safetyRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="text-sm text-gray-600 mb-2">Khan's Description:</div>
                      <p className="text-sm italic text-gray-700 bg-red-50 p-3 rounded-lg border border-red-100">
                        "{car.khan_description}"
                      </p>
                    </div>

                    <button 
                      onClick={() => startNegotiation(car)}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-4 rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-lg font-semibold"
                    >
                      Negotiate with Khan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Negotiation Screen
  if (currentScreen === 'negotiation') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <button 
              onClick={() => setCurrentScreen('carSelection')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
              Back to Car Selection
            </button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Car Information Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Negotiating For</h3>
                {selectedCar && (
                  <div>
                    <div className="flex items-center mb-4">
                      <Car className="h-8 w-8 text-blue-600 mr-3" />
                      <div>
                        <h4 className="text-lg font-semibold">{selectedCar.year} {selectedCar.make} {selectedCar.model}</h4>
                        <p className="text-sm text-gray-500">{selectedCar.marketActivity}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Asking Price:</span>
                        <span className="font-semibold">${selectedCar.price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">MSRP:</span>
                        <span className="font-semibold">${selectedCar.msrp.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Trade-in Value:</span>
                        <span className="font-semibold">${selectedCar.tradeInValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Market Trend:</span>
                        <span className="font-semibold">{selectedCar.marketTrend}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Persona Info */}
              <div className={`bg-gradient-to-br ${selectedPersona.id === 'genghis_khan' ? 'from-red-50 to-orange-50 border-red-200' : 'from-blue-50 to-indigo-50 border-blue-200'} border-2 rounded-2xl p-6`}>
                <div className="text-center">
                  <div className="text-6xl mb-4">{selectedPersona.avatar}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedPersona.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{selectedPersona.title}</p>
                  
                  <div className="text-left">
                    {Object.entries(selectedPersona.stats).map(([key, value]) => (
                      <PersonaStat key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={value} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Conversation Panel */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg h-full flex flex-col">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">Negotiation Arena</h3>
                    <div className="flex items-center space-x-4">
                      {/* Voice Controls */}
                      <button
                        onClick={toggleVoiceMode}
                        className={`inline-flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                          isVoiceEnabled 
                            ? 'bg-red-600 text-white hover:bg-red-700' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {isVoiceEnabled ? <PhoneOff className="h-4 w-4 mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
                        {isVoiceEnabled ? 'Disconnect Voice' : 'Enable Voice'}
                      </button>

                      {isVoiceEnabled && (
                        <div className="flex items-center space-x-2">
                          <button
                            onMouseDown={startListening}
                            onMouseUp={stopListening}
                            onMouseLeave={stopListening}
                            className={`p-3 rounded-full transition-all duration-300 ${
                              voiceStatus === 'listening' 
                                ? 'bg-red-600 text-white animate-pulse' 
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {voiceStatus === 'listening' ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                          </button>
                          
                          <div className="text-sm">
                            {voiceStatus === 'connecting' && 'Connecting...'}
                            {voiceStatus === 'connected' && 'Ready'}
                            {voiceStatus === 'listening' && 'Listening (Press Spacebar)'}
                            {voiceStatus === 'speaking' && 'Khan Speaking...'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {voiceError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{voiceError}</p>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-96">
                  {conversation.map((msg, index) => (
                    <div key={index} className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                        msg.speaker === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : (msg.speaker === 'genghis_khan' ? 'bg-gradient-to-r from-red-100 to-orange-100 text-gray-900 border border-red-200' : 'bg-gradient-to-r from-blue-100 to-indigo-100 text-gray-900 border border-blue-200')
                      }`}>
                        <div className="flex items-center mb-1">
                          <span className="font-semibold text-sm">
                            {msg.speaker === 'user' ? 'You' : selectedPersona.name}
                          </span>
                          {msg.isVoice && (
                            <Volume2 className="h-3 w-3 ml-2 opacity-70" />
                          )}
                        </div>
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {interimTranscript && (
                    <div className="flex justify-end">
                      <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-blue-400 text-white opacity-60">
                        <p className="text-sm italic">{interimTranscript}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="p-6 border-t border-gray-200">
                  <div className="flex space-x-4">
                    <input
                      id="userMessageInput" // Added ID for targeting
                      type="text"
                      value={userMessage}
                      onChange={(e) => setUserMessage(e.target.value)}
                      placeholder="Type your negotiation message..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      disabled={voiceStatus === 'listening'}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!userMessage.trim() || voiceStatus === 'listening'}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {isVoiceEnabled ? 'Hold the microphone button or Spacebar to speak, or type your message.' : 'Enable voice mode to speak with Khan directly.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Settings/Demo Screen
  if (currentScreen === 'settings') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <button 
              onClick={() => setCurrentScreen('home')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
              Back to Home
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Demo & Features</h1>
              <p className="text-lg text-gray-600">
                Experience the future of negotiation training with AI-powered historical figures
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">🎯 Core Features</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Voice AI conversations with historical figures
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Real-time car market data integration
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Genghis Khan persona with unique strategies
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Professional UI inspired by 21st.dev
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">🏆 Built For</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center">
                    <Award className="h-4 w-4 text-purple-500 mr-2" />
                    Bolt 2025 Hackathon Competition
                  </li>
                  <li className="flex items-center">
                    <Award className="h-4 w-4 text-purple-500 mr-2" />
                    Voice AI Challenge ($25K prize)
                  </li>
                  <li className="flex items-center">
                    <Award className="h-4 w-4 text-purple-500 mr-2" />
                    Deploy Challenge ($25K prize)
                  </li>
                  <li className="flex items-center">
                    <Award className="h-4 w-4 text-purple-500 mr-2" />
                    Innovation in AI training
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <button 
                onClick={() => setCurrentScreen('carSelection')}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Play className="mr-2 h-5 w-5" />
                Try the Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
