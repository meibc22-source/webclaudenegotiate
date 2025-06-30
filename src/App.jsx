import React, { useState, useEffect, useRef } from 'react';
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
    this.audioContext = null; // Initialize lazily
    this.audioSource = null; // To keep track of the current audio source for stopping
  }

  // Method to initialize AudioContext
  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
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
    this.initAudioContext(); // Initialize AudioContext here

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


// Genghis Khan Persona Data
import genghisKhanPersona from './personas/genghisKhan';
import benjaminFranklinPersona from './personas/benjaminFranklin';
import johnDRockefellerPersona from './personas/johnDRockefeller';
import { NegotiationEngine } from './negotiation/NegotiationEngine'; // Import NegotiationEngine
import NegotiationTimer from './components/NegotiationTimer'; // Import NegotiationTimer
import { NegotiationScorer } from './negotiation/NegotiationScorer'; // Import NegotiationScorer
import { CarMarketDataService } from './services/CarMarketDataService'; // Import CarMarketDataService

export default function NegotiationLegends() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const conversationRef = useRef(null); // Add this line
  const [negotiationEngine] = useState(new NegotiationEngine()); // Instantiate NegotiationEngine
  const [negotiationScorer] = useState(new NegotiationScorer()); // Instantiate NegotiationScorer
  const [negotiationScore, setNegotiationScore] = useState(0); // New state for negotiation score
  const [negotiationTimerActive, setNegotiationTimerActive] = useState(false); // New state for timer
  const [selectedCar, setSelectedCar] = useState(null);
  const [selectedPersona, setSelectedPersona] = useState(genghisKhanPersona); // New state for selected persona
  const [conversation, setConversation] = useState([]);
  const [userMessage, setUserMessage] = useState(''); // Keep for voice input fallback or general messages
  const [offerPrice, setOfferPrice] = '';
  const [offerDownPayment, setOfferDownPayment] = '';
  const [offerLoanTerm, setOfferLoanTerm] = '';
  const [offerInterestRate, setOfferInterestRate] = '';
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

  useEffect(() => {
    loadMarketCars();
  }, []);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  const loadMarketCars = async () => {
    setIsLoadingCars(true);
    try {
      const popularModels = carMarketService.getPopularModels();
      const carPromises = popularModels.map(async (model) => {
        return await carMarketService.getCarData(model.make, model.model, model.year);
      });
      
      const cars = await Promise.all(carPromises);
      setAvailableCars(cars);
      console.log("Loaded Available Cars:", cars);
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
          async (message) => { // Changed to async here
            if (message.type === 'user_transcript') {
              setInterimTranscript('');
              
              const newUserMessage = {
                speaker: 'user',
                message: message.content,
                timestamp: new Date(),
                isVoice: true
              };
              
              const personaResponse = await generatePersonaResponse(selectedPersona, message.content, conversation); // Await and pass conversation
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

  const generatePersonaResponse = async (persona, userInput, conversationHistory) => {
    const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

    if (!DEEPSEEK_API_KEY) {
      console.error("Deepseek API key is not set. Cannot generate AI response.");
      return "I am unable to respond at the moment. My AI is offline.";
    }

    const userOffer = negotiationEngine.parseUserOffer(userInput); // Use the method from NegotiationEngine

    // Get current car data (assuming selectedCar is available in scope)
    const currentCarData = selectedCar; // This needs to be passed or accessed globally

    // Evaluate the offer using the NegotiationEngine
    const negotiationResult = negotiationEngine.evaluateOffer(persona, userOffer, currentCarData, null); // timeRemaining can be null for now

    let personaSystemContent = `You are ${persona.name}, also known as "${persona.title}". Your persona is: "${persona.description}". Your negotiation stats are: ${JSON.stringify(persona.stats)}.
    You are a car salesman. Respond concisely and in character, reflecting your persona's traits.
    Current negotiation context: The user is interested in a car. Focus on the car sale.
    The user's last offer was: ${JSON.stringify(userOffer)}.
    Your evaluation of the offer is: ${negotiationResult.context}.`;

    if (negotiationResult.counterOffer && negotiationResult.counterOffer.price) {
      personaSystemContent += ` You are countering with a price of $${negotiationResult.counterOffer.price.toLocaleString()}.`;
    }
    if (negotiationResult.counterOffer && negotiationResult.counterOffer.financing) {
      const financingCounter = negotiationResult.counterOffer.financing;
      if (financingCounter.downPayment) {
        personaSystemContent += ` You are countering with a down payment of $${financingCounter.downPayment.toLocaleString()}.`;
      }
      if (financingCounter.loanTerm) {
        personaSystemContent += ` You are countering with a loan term of ${financingCounter.loanTerm} months.`;
      }
      if (financingCounter.interestRate) {
        personaSystemContent += ` You are countering with an interest rate of ${financingCounter.interestRate}%.`;
      }
    }


    const messages = [
      {
        role: "system",
        content: personaSystemContent
      },
      ...conversationHistory.slice(-5).map(msg => ({ // Include last 5 messages for context
        role: msg.speaker === 'user' ? 'user' : 'assistant',
        content: msg.message
      })),
      {
        role: "user",
        content: userInput
      }
    ];

    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat", // Or another appropriate Deepseek model
          messages: messages,
          max_tokens: 150,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deepseek API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();

    } catch (error) {
      console.error("Error generating persona response with Deepseek:", error);
      return "My apologies, I seem to have lost my train of thought. Please repeat that.";
    }
  };

  const startNegotiation = (car) => {
    setSelectedCar(car);
    setNegotiationScore(negotiationScorer.initialUserScore); // Set initial score
    setNegotiationTimerActive(true); // Activate timer
    setConversation([
      {
        speaker: selectedPersona.id,
        message: `Greetings. I am ${selectedPersona.name}, ${selectedPersona.title}. You have chosen to negotiate for this automobile: ${selectedPersona.id === 'benjamin_franklin' ? car.franklin_description : (selectedPersona.id === 'john_d_rockefeller' ? car.rockefeller_description : car.khan_description)}`,
        timestamp: new Date()
      }
    ]);
    setCurrentScreen('negotiation');
  };

  const handleTimeUp = () => {
    setNegotiationTimerActive(false);
    // Optionally add a message to the conversation or end the negotiation
    setConversation(prev => [...prev, {
      speaker: 'system',
      message: `Time is up! The negotiation has concluded.`,
      timestamp: new Date()
    }]);
    // You might want to transition to a results screen or handle negotiation end here
  };

  const sendMessage = async () => {
    let messageContent = userMessage;
    let userOffer = {};

    if (offerPrice || offerDownPayment || offerLoanTerm || offerInterestRate) {
      const parts = [];
      if (offerPrice) {
        parts.push(`price of $${parseFloat(offerPrice).toLocaleString()}`);
        userOffer.price = parseFloat(offerPrice);
      }
      if (offerDownPayment) {
        parts.push(`down payment of $${parseFloat(offerDownPayment).toLocaleString()}`);
        userOffer.financing = { ...userOffer.financing, downPayment: parseFloat(offerDownPayment) };
      }
      if (offerLoanTerm) {
        parts.push(`loan term of ${parseInt(offerLoanTerm)} months`);
        userOffer.financing = { ...userOffer.financing, loanTerm: parseInt(offerLoanTerm) };
      }
      if (offerInterestRate) {
        parts.push(`interest rate of ${parseFloat(offerInterestRate)}%`);
        userOffer.financing = { ...userOffer.financing, interestRate: parseFloat(offerInterestRate) };
      }
      messageContent = `I offer a ${parts.join(', ')}.`;
    } else if (!userMessage.trim()) {
      return;
    } else {
      userOffer = negotiationEngine.parseUserOffer(userMessage);
    }

    const newUserMessage = {
      speaker: 'user',
      message: messageContent,
      timestamp: new Date()
    };
    
    // Add user message to conversation immediately
    setConversation(prev => [...prev, newUserMessage]);

    const personaResponseText = await generatePersonaResponse(selectedPersona, messageContent, conversation);
    
    const tempPersonaResponse = {
      decision: personaResponseText.includes("accept") ? "Accept" :
                personaResponseText.includes("counter") || personaResponseText.includes("propose") ? "Counter" :
                personaResponseText.includes("low") || personaResponseText.includes("cannot accept") ? "Reject" : "Counter",
      counterOffer: {}
    };
    
    const updatedScore = negotiationScorer.evaluateMove(
      negotiationScore,
      userOffer,
      tempPersonaResponse,
      selectedCar
    );
    setNegotiationScore(updatedScore);

    const personaMessage = {
      speaker: selectedPersona.id,
      message: personaResponseText,
      timestamp: new Date()
    };

    // Add persona message after response is generated
    setConversation(prev => [...prev, personaMessage]);
    setUserMessage('');
    setOfferPrice('');
    setOfferDownPayment('');
    setOfferLoanTerm('');
    setOfferInterestRate('');
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
                  onClick={() => setCurrentScreen('settings')}
                  className="inline-flex items-center px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:bg-gray-50"
                >
                  <Settings className="mr-2 h-5 w-5" />
                  About App
                </button>
              </div>
            </div>

            {/* Move "Choose Your Opponent" section here */}
            <div className="bg-white rounded-3xl shadow-xl p-8 mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Opponent</h2>
                <p className="text-gray-600">Each historical figure brings unique negotiation styles and challenges</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="group relative overflow-hidden bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6 hover:border-red-400 transition-all duration-300 cursor-pointer transform hover:scale-105">
                  <div className="text-center">
                    <img src={genghisKhanPersona.avatar} alt={genghisKhanPersona.name} className="h-24 w-24 mx-auto mb-4 rounded-full object-cover" />
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
                
                <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 hover:border-blue-400 transition-all duration-300 cursor-pointer transform hover:scale-105">
                  <div className="text-center">
                    {benjaminFranklinPersona.avatar.startsWith('/') ? (
                      <img src={benjaminFranklinPersona.avatar} alt={benjaminFranklinPersona.name} className="h-24 w-24 mx-auto mb-4 rounded-full object-cover" />
                    ) : (
                      <div className="text-6xl mb-4">{benjaminFranklinPersona.avatar}</div>
                    )}
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
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg font-semibold"
                    >
                      Challenge Franklin
                    </button>
                  </div>
                </div>

                <div className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 hover:border-green-400 transition-all duration-300 cursor-pointer transform hover:scale-105">
                  <div className="text-center">
                    {johnDRockefellerPersona.avatar.startsWith('/') ? (
                      <img src={johnDRockefellerPersona.avatar} alt={johnDRockefellerPersona.name} className="h-24 w-24 mx-auto mb-4 rounded-full object-cover" />
                    ) : (
                      <div className="text-6xl mb-4">{johnDRockefellerPersona.avatar}</div>
                    )}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{johnDRockefellerPersona.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{johnDRockefellerPersona.title}</p>
                    <p className="text-xs text-gray-500 mb-4">{johnDRockefellerPersona.description}</p>
                    
                    <div className="text-left mb-4">
                      <PersonaStat label="Strategy" value={johnDRockefellerPersona.stats.strategy} />
                      <PersonaStat label="Data Focus" value={johnDRockefellerPersona.stats.dataFocus} />
                      <PersonaStat label="Patience" value={johnDRockefellerPersona.stats.patience} />
                    </div>
                    
                    <button 
                      onClick={() => {
                        setSelectedPersona(johnDRockefellerPersona);
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
              Select a car to negotiate for with {selectedPersona.name}. Each vehicle comes with real market data to help you make informed decisions.
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
                      <div className="text-sm text-gray-600 mb-2">{selectedPersona.name}'s Description:</div>
                    <p className="text-sm italic text-gray-700 bg-red-50 p-3 rounded-lg border border-red-100">
                        "{selectedPersona.id === 'benjamin_franklin' ? car.franklin_description : (selectedPersona.id === 'john_d_rockefeller' ? car.rockefeller_description : car.khan_description)}"
                    </p>
                    </div>

                    <button 
                      onClick={() => startNegotiation(car)}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-4 rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-lg font-semibold"
                    >
                      Negotiate with {selectedPersona.name}
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
                  {selectedPersona.avatar && selectedPersona.avatar.startsWith('/') ? (
                    <img src={selectedPersona.avatar} alt={selectedPersona.name} className="h-24 w-24 mx-auto mb-4 rounded-full object-cover" />
                  ) : (
                    <div className="text-6xl mb-4">{selectedPersona.avatar}</div>
                  )}
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
                      {/* Negotiation Timer */}
                      <NegotiationTimer 
                        duration={900} // 15 minutes (900 seconds)
                        onTimeUp={handleTimeUp}
                        isActive={negotiationTimerActive}
                      />
                      {/* Negotiation Score */}
                      <div className="flex items-center space-x-2 p-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg">
                        <TrendingUp className="h-5 w-5" />
                        <span className="font-semibold text-lg">Score: {negotiationScore}</span>
                      </div>

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
                            {voiceStatus === 'listening' && 'Listening...'}
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
                <div ref={conversationRef} className="flex-1 overflow-y-auto p-6 space-y-4 max-h-96">
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
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="offerPrice" className="block text-sm font-medium text-gray-700">Price ($)</label>
                      <input
                        type="number"
                        id="offerPrice"
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                        placeholder="e.g., 25000"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="offerDownPayment" className="block text-sm font-medium text-gray-700">Down Payment ($)</label>
                      <input
                        type="number"
                        id="offerDownPayment"
                        value={offerDownPayment}
                        onChange={(e) => setOfferDownPayment(e.target.value)}
                        placeholder="e.g., 5000"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="offerLoanTerm" className="block text-sm font-medium text-gray-700">Loan Term (months)</label>
                      <input
                        type="number"
                        id="offerLoanTerm"
                        value={offerLoanTerm}
                        onChange={(e) => setOfferLoanTerm(e.target.value)}
                        placeholder="e.g., 60"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="offerInterestRate" className="block text-sm font-medium text-gray-700">Interest Rate (%)</label>
                      <input
                        type="number"
                        id="offerInterestRate"
                        value={offerInterestRate}
                        onChange={(e) => setOfferInterestRate(e.target.value)}
                        placeholder="e.g., 4.5"
                        step="0.1"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-4">
                    <input
                      type="text"
                      value={userMessage}
                      onChange={(e) => setUserMessage(e.target.value)}
                      placeholder="Or type your negotiation message (e.g., 'What's the best price?')"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      disabled={isVoiceEnabled}
                    />
                    <button
                      onClick={sendMessage}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {isVoiceEnabled ? 'Hold the microphone button to speak, or type your message.' : 'Use the fields above for structured offers, or type a natural language message.'}
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
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Features</h1>
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
                    Genghis Khan, Benjamin Franklin, and John D. Rockefeller as personas
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    AI based turn negotiation scoring
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
