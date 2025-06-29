// This module will contain the core logic for the persona's negotiation decisions.

class NegotiationEngine {
  constructor() {
    // Constructor can be used to initialize any shared properties or services
  }

  /**
   * Evaluates the user's offer and determines the persona's response.
   * @param {object} userOffer - The user's current offer (e.g., { price: number, financing: { downPayment: number, term: number, interestRate: number } })
   * @param {object} selectedPersona - The persona object with its negotiation attributes.
   * @param {object} selectedCar - The car object with its market data.
   * @param {object} negotiationState - Current state of the negotiation (e.g., { timeRemaining: number, conversationHistory: array })
   * @returns {object} An object containing the persona's decision (e.g., 'Accept', 'Counter', 'Reject', 'Nudge') and context for AI.
   */
  evaluateOffer(userOffer, selectedPersona, selectedCar, negotiationState) {
    const { price: userPrice } = userOffer;
    const { msrp, price: dealerPrice, marketTrend, marketActivity } = selectedCar;
    const { minAcceptablePriceFactor, initialOfferFactor, patienceThresholds } = selectedPersona;
    const { timeRemaining } = negotiationState;

    // Convert timeRemaining to percentage for patience thresholds
    // Assuming a max negotiation time of 10 minutes (600 seconds) for now, will be dynamic
    const maxNegotiationTime = 600; // This should eventually come from App.jsx based on persona patience
    const timePercentage = timeRemaining / maxNegotiationTime;

    let decision = 'Counter'; // Default decision
    let context = {};

    // 1. Evaluate Price
    const minAcceptablePrice = msrp * minAcceptablePriceFactor;
    let personaTargetPrice = dealerPrice; // Persona's ideal price at the moment, can adjust based on negotiation flow

    // Adjust persona's target price based on market conditions (example logic)
    if (marketTrend === '📈 Rising' || marketActivity === '🔥 High Demand') {
      personaTargetPrice *= 1.05; // Slightly higher target in seller's market
    } else if (marketTrend === '📉 Declining' || marketActivity === '📉 Low Activity') {
      personaTargetPrice *= 0.95; // Slightly lower target in buyer's market
    }

    if (userPrice >= personaTargetPrice) {
      decision = 'Accept';
      context.reason = 'User offer meets or exceeds persona\'s target price.';
      context.offerDetails = { userPrice };
    } else if (userPrice < minAcceptablePrice) {
      decision = 'Reject';
      context.reason = 'User offer is below persona\'s minimum acceptable price.';
      context.offerDetails = { userPrice, minAcceptablePrice };
    } else {
      // User offer is within range but not ideal, so counter
      let counterPrice = Math.max(userPrice * 1.05, minAcceptablePrice); // Counter higher than user's offer, but not below min
      counterPrice = Math.min(counterPrice, personaTargetPrice); // Don't counter above current target

      decision = 'Counter';
      context.reason = 'User offer is acceptable but not ideal. Persona is countering.';
      context.offerDetails = { userPrice, counterPrice };
    }

    // 2. Evaluate Financing (Placeholder for now)
    // This part will be expanded in Phase 3
    if (userOffer.financing) {
      // Logic to evaluate userOffer.financing against selectedPersona.financingPreferences
      // and adjust decision/context accordingly.
      // For now, just acknowledge it.
      context.financingOffer = userOffer.financing;
    }

    // 3. Time-based Nudging (Phase 2)
    if (timePercentage > patienceThresholds.impatientAtPercent && timePercentage <= patienceThresholds.ultimatumAtPercent) {
      decision = 'Nudge';
      context.reason = 'Time is running out. Persona is becoming impatient.';
      context.nudgeType = 'impatient';
    } else if (timePercentage > patienceThresholds.ultimatumAtPercent) {
      decision = 'Nudge';
      context.reason = 'Time is almost up. Persona is giving an ultimatum.';
      context.nudgeType = 'ultimatum';
    }


    return { decision, context };
  }
}

export default NegotiationEngine;
