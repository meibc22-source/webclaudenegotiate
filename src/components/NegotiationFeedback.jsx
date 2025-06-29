import React from 'react';

import { ArrowRight, RotateCcw } from 'lucide-react';

const NegotiationFeedback = ({ finalScore, initialScore, negotiationHistory, persona, onRedoNegotiation, onReturnToMain }) => {
  const scoreDifference = finalScore - initialScore;
  const isPositive = scoreDifference >= 0;

  const renderFeedback = () => {
    let feedbackMessages = [];

    // General score feedback
    if (isPositive) {
      feedbackMessages.push(
        <p key="score-good" className="text-green-600">
          Great job! Your final score of {finalScore} is {scoreDifference} points above your starting point.
        </p>
      );
    } else {
      feedbackMessages.push(
        <p key="score-bad" className="text-red-600">
          Your final score of {finalScore} is {Math.abs(scoreDifference)} points below your starting point.
        </p>
      );
    }

    // Analyze negotiation history for contributing factors
    if (negotiationHistory && negotiationHistory.length > 0) {
      feedbackMessages.push(<h3 key="history-title" className="text-lg font-semibold mt-4">Key Moments:</h3>);
      negotiationHistory.forEach((turn, index) => {
        feedbackMessages.push(
          <div key={`turn-${index}`} className="mb-2 p-2 border rounded">
            <p><strong>Turn {index + 1}:</strong></p>
            {turn.userOffer && turn.userOffer.price && <p>Your Offer: ${turn.userOffer.price.toLocaleString()}</p>}
            {turn.personaResponse && <p>{persona.name}'s Response: {turn.personaResponse.decision}</p>}
            {turn.personaResponse && turn.personaResponse.context && <p>Context: {turn.personaResponse.context}</p>}
          </div>
        );
      });
    }

    // Persona-specific coaching (placeholder - will be enhanced with persona data)
    feedbackMessages.push(<h3 key="coaching-title" className="text-lg font-semibold mt-4">Coaching for Next Time:</h3>);
    if (persona && persona.coachingTips) {
      persona.coachingTips.forEach((tip, index) => {
        feedbackMessages.push(<p key={`tip-${index}`}>- {tip}</p>);
      });
    } else {
      feedbackMessages.push(<p key="no-tips">Consider the persona's traits: {persona.personality}. Try to adjust your approach to their style.</p>);
    }

    return feedbackMessages;
  };

  return (
    <div className="negotiation-feedback p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto my-8">
      <h2 className="text-2xl font-bold mb-4 text-center">Negotiation Complete!</h2>
      <div className="text-center mb-6">
        <p className="text-xl">Your Final Score: <span className="font-bold text-blue-700">{finalScore}</span>/100</p>
      </div>
      {renderFeedback()}

      <div className="flex justify-center space-x-4 mt-8">
        <button
          onClick={onRedoNegotiation}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 transition-colors"
        >
          <RotateCcw className="h-5 w-5 mr-2" />
          Redo Negotiation
        </button>
        <button
          onClick={onReturnToMain}
          className="inline-flex items-center px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl shadow-md hover:bg-gray-300 transition-colors"
        >
          <ArrowRight className="h-5 w-5 mr-2 rotate-180" />
          Main Menu
        </button>
      </div>
    </div>
  );
};

export default NegotiationFeedback;
