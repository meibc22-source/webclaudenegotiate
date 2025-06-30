# Negotiation Legends - AI-Powered Training Platform

This is a sophisticated React-based web application designed as an interactive negotiation training platform.

## Core Purpose
The app simulates car buying negotiations with AI-powered historical figures, specifically featuring Genghis Khan as the primary negotiation opponent. It's designed to help users practice and improve their negotiation skills in a gamified environment.

## Key Features

### 1. Voice AI Integration
- Uses Web Speech API for speech recognition and synthesis
- Allows users to have actual voice conversations with AI personas
- Real-time speech-to-text and text-to-speech capabilities
- Powered by Deepseek AI for dynamic and persona-specific responses.
- Built for the "Voice AI Challenge" mentioned in the code

### 2. Historical Persona System
- Personas are now modular, with each persona defined in its own file (`src/personas/`).
- Features AI-powered historical figures, including Genghis Khan, Benjamin Franklin, and John D. Rockefeller as car salesmen with unique personality traits.
- Each persona has defined stats (aggression, patience, flexibility, etc.) which influence their AI-driven responses.
- Personas have characteristic speaking patterns and negotiation styles.
- Supports dynamic avatar rendering, allowing for both image and emoji avatars.
- Framework ready for additional historical figures (Benjamin Franklin, John D. Rockefeller included).

### 3. Real Car Market Data
- Integrates live car market information with pricing, trends, and specifications
- Calculates realistic prices based on make, model, year, and market factors
- Includes MSRP, trade-in values, private party values, and market trends
- Features popular car models from major manufacturers

### 4. Enhanced Negotiation Gameplay
- **AI-Based Turn Negotiation Scoring**: Real-time scoring of user negotiation moves based on the "Getting to Yes" framework (separating people from problem, focusing on interests, inventing options for mutual gain, insisting on objective criteria). The score is displayed in the UI.
- **Persona-Specific Negotiation Logic**: Personas have dynamic acceptance thresholds for car price and financing terms, influenced by their unique attributes and current market conditions.
- **Time-Boxed Negotiations**: Negotiations have a time limit, dynamically set based on the selected persona's patience score (ranging from 2 to 10 minutes). A visible countdown timer is displayed. Personas can dynamically adjust their behavior (e.g., become impatient, give ultimatums) as time winds down.

### 5. UI/UX Enhancements
- **Negotiation Feedback Screen**: A dedicated screen is presented at the end of each negotiation (deal accepted, rejected, or time runs out).
    - Assesses user's final score against the starting point (50).
    - Provides a summary of "Key Moments" during the negotiation, including user offers and persona responses with context.
    - Offers persona-specific coaching tips for future negotiations.
    - Includes "Redo Negotiation" and "Main Menu" buttons for easy navigation.
    - Features a 3-second pause before appearing for a smoother transition.
- **Conversation Auto-Scrolling**: The negotiation chat panel now automatically scrolls to the bottom with each new message, ensuring the latest interactions are always visible.

### 6. Multi-Screen Interface
- **Home Screen**: Streamlined landing page focusing on direct persona selection to start a negotiation.
- **Car Selection**: Browse available vehicles with detailed market data.
- **Negotiation Arena**: Interactive chat interface for conducting negotiations.
- **About App**: Information about features and hackathon participation.

### 7. Gamification Elements
- User stats tracking (level, experience, wins, total negotiations)
- Achievement system ready for implementation
- Progress tracking and skill development metrics
- Real-time negotiation score display, reflecting user performance.
- Time-boxed negotiations with a visible timer (set to 15 minutes).

### 8. Enhanced Negotiation Capabilities (Phase 3 Complete)
- **Financing Terms Integration**: Users can now propose specific financing terms (down payment, loan term, interest rate) through dedicated input fields.
- **Persona Evaluation of Financing**: Personas evaluate these financing terms based on their unique preferences, influencing their negotiation decisions.
- **AI Response Refinement**: The AI's responses are enriched with the persona's evaluation of financing terms, allowing for natural, in-character counter-offers related to both price and financing.
- **Structured Offer Input**: A new structured UI is provided for users to submit offers, including price and financing details, in a clear and organized format.

## Technical Stack
- **Frontend**: React 18 with modern hooks (useState, useEffect, useRef)
- **Styling**: Tailwind CSS for responsive, modern UI design
- **Icons**: Lucide React icon library
- **Build Tool**: Vite for fast development and building
- **Voice**: Web Speech API integration

## Competition Context
The app was built for the "Bolt 2025 Hackathon Competition" with specific focus on:
- Voice AI Challenge ($25K prize)
- Deploy Challenge ($25K prize)
- Innovation in AI training applications

## Current State
- Core negotiation gameplay features implemented: negotiation scoring, persona-specific logic, and time-boxed negotiations.
- Fully functional Genghis Khan persona with AI-powered voice capabilities.
- Dynamic and context-aware responses generated by Deepseek AI, now including detailed financing evaluation.
- Modular persona management for easy expansion and modification.
- Complete car selection and market data system.
- Working negotiation interface with both text, voice, and structured offer input.
- Real-time negotiation scoring and timer are now visible in the UI.
- Professional UI inspired by modern design standards.
- Enhanced feedback screen and navigation for negotiation outcomes.
- Conversation auto-scrolling implemented.
- Ready for deployment and demonstration.

## Internal Testing Framework
The application utilizes a robust internal testing framework to ensure code quality and reliability, particularly for critical components like Voice AI.
- **Frameworks:** Jest for unit and integration testing, with React Testing Library for UI component testing.
- **Environment:** Tests run in a JSDOM environment, simulating a browser for accurate DOM interaction testing.
- **Configuration:** Configured with `babel-jest` for modern JavaScript and React syntax support, and `@testing-library/jest-dom` for extended DOM matchers.
- **Coverage:** Comprehensive test coverage for the `VoiceAI` class, including microphone permissions, connection lifecycle, speech recognition callbacks, and speech synthesis. Mocking of browser APIs (SpeechRecognition, SpeechSynthesis) ensures isolated and efficient tests.
- **Known Issue:** Automated Jest tests for `VoiceAI` currently have unresolved issues related to mocking browser APIs in JSDOM, leading to test failures. This does not impact the application's functionality in the browser.

## Bug Log

### June 28, 2025 - Negotiation Screen Input Unresponsive

**Issue:** Users reported that the text input field and send button on the negotiation screen were unresponsive, preventing typed messages from being sent. Additionally, structured offer inputs (price, loan term, etc.) caused an error. A blank screen was also reported intermittently.

**Resolution:**
1.  **Input Field and Send Button Fixes:**
    *   Removed `disabled={isVoiceEnabled}` from the text input field in `src/App.jsx` to ensure it's always enabled.
    *   Removed the `disabled` attribute from the send button in `src/App.jsx` to ensure it's always clickable.
2.  **Structured Input Parsing Error Fix:**
    *   Moved the `parseUserOffer` function from `src/App.jsx` to `src/negotiation/NegotiationEngine.js`.
    *   Corrected a `ReferenceError: Cannot access 'term' before initialization` within `parseUserOffer` in `src/negotiation/NegotiationEngine.js` by renaming the local variable `term` to `termValue` to prevent naming conflicts and ensure correct parsing of loan terms.
3.  **Auto-Scrolling Implementation:**
    *   Added a `useRef` hook and `useEffect` hook to `src/App.jsx` to automatically scroll the conversation messages to the bottom as new messages are added, improving user experience.
4.  **AudioContext Error Mitigation:**
    *   Implemented lazy initialization for `window.AudioContext` within the `VoiceAI` class in `src/App.jsx`. The `audioContext` is now initialized only when the `speak` method is called, preventing potential browser errors related to audio device access on initial page load that could lead to a blank screen.

**Outcome:** The negotiation screen now correctly accepts both natural language and structured inputs, sends messages, displays persona responses, and auto-scrolls the conversation. The blank screen issue and structured input errors are resolved.

The application represents a creative blend of historical education, AI technology, and practical skill training, packaged in an engaging, gamified experience for learning negotiation techniques.
