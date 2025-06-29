export class NegotiationEngine {
  constructor() {
    // Constructor for NegotiationEngine
  }

  /**
   * Evaluates a user's offer against a persona's preferences and market data.
   * @param {object} persona - The persona object with negotiation-specific attributes.
   * @param {object} userOffer - The user's offer, including price and potentially financing terms.
   * @param {object} carData - The current car data from the market service.
   * @param {number} timeRemaining - The time remaining in the negotiation (in seconds).
   * @returns {object} An object containing the persona's decision (Accept, Counter, Reject, Nudge)
   * and context for the AI model.
   */
  evaluateOffer(persona, userOffer, carData, timeRemaining) {
    let decision = 'Counter';
    let context = [];
    let counterOffer = {};

    const personaPriceFactor = persona.minAcceptablePriceFactor || 0.8; // Default if not defined
    const personaInitialOfferFactor = persona.initialOfferFactor || 0.9; // Default if not defined
    const minAcceptablePrice = carData.price * personaPriceFactor;

    // 1. Evaluate Price Offer
    let priceEvaluation = 0; // -1: too low, 0: reasonable, 1: good
    if (userOffer.price !== null) {
      if (userOffer.price >= minAcceptablePrice) {
        priceEvaluation = 1;
        context.push(`The user's price offer of $${userOffer.price.toLocaleString()} is acceptable.`);
      } else if (userOffer.price < carData.price * 0.7) { // Very low offer
        priceEvaluation = -1;
        context.push(`The user's price offer of $${userOffer.price.toLocaleString()} is far too low.`);
      } else {
        priceEvaluation = 0;
        context.push(`The user's price offer of $${userOffer.price.toLocaleString()} is a bit low.`);
      }
    } else {
      context.push("The user did not specify a price.");
    }

    // 2. Evaluate Financing Terms
    let financingEvaluation = 0; // -1: unfavorable, 0: neutral/unknown, 1: favorable
    const personaFinancing = persona.financingPreferences;

    if (personaFinancing && userOffer.financing) {
      const { downPayment, loanTerm, interestRate } = userOffer.financing;
      let financingContext = [];

      // Down Payment
      if (downPayment !== null && personaFinancing.minDownPaymentRatio) {
        const requiredDownPayment = carData.price * personaFinancing.minDownPaymentRatio;
        if (downPayment >= requiredDownPayment) {
          financingEvaluation += 0.5;
          financingContext.push(`Down payment of $${downPayment.toLocaleString()} is favorable.`);
        } else {
          financingEvaluation -= 0.5;
          financingContext.push(`Down payment of $${downPayment.toLocaleString()} is lower than preferred ($${requiredDownPayment.toLocaleString()}).`);
          counterOffer.financing = { ...counterOffer.financing, downPayment: requiredDownPayment };
        }
      }

      // Loan Term
      if (loanTerm !== null && personaFinancing.maxLoanTermMonths) {
        if (loanTerm <= personaFinancing.maxLoanTermMonths) {
          financingEvaluation += 0.5;
          financingContext.push(`Loan term of ${loanTerm} months is acceptable.`);
        } else {
          financingEvaluation -= 0.5;
          financingContext.push(`Loan term of ${loanTerm} months is longer than preferred (${personaFinancing.maxLoanTermMonths} months).`);
          counterOffer.financing = { ...counterOffer.financing, loanTerm: personaFinancing.maxLoanTermMonths };
        }
      }

      // Interest Rate
      if (interestRate !== null && personaFinancing.minInterestRate) {
        if (interestRate >= personaFinancing.minInterestRate) {
          financingEvaluation += 0.5;
          financingContext.push(`Interest rate of ${interestRate}% is acceptable.`);
        } else {
          financingEvaluation -= 0.5;
          financingContext.push(`Interest rate of ${interestRate}% is lower than preferred (${personaFinancing.minInterestRate}%).`);
          counterOffer.financing = { ...counterOffer.financing, interestRate: personaFinancing.minInterestRate };
        }
      }
      if (financingContext.length > 0) {
        context.push("Regarding financing: " + financingContext.join(" "));
      } else if (userOffer.financing && (downPayment !== null || loanTerm !== null || interestRate !== null)) {
         context.push("The financing terms offered were evaluated.");
      } else {
        context.push("No specific financing terms were offered by the user.");
      }
    } else {
      context.push("No financing preferences defined for this persona or no financing offered.");
    }

    // 3. Determine Overall Decision
    let overallScore = priceEvaluation + financingEvaluation;

    if (overallScore >= 1) { // Favorable price and/or financing
      decision = 'Accept';
    } else if (overallScore >= -0.5) { // Needs some adjustment
      decision = 'Counter';
      if (userOffer.price !== null && priceEvaluation < 1) {
        counterOffer.price = Math.max(minAcceptablePrice, userOffer.price * 1.05); // Counter slightly above current offer, but not below min acceptable
        context.push(`I will counter with a price of $${Math.round(counterOffer.price).toLocaleString()}.`);
      } else if (userOffer.price === null) {
        counterOffer.price = carData.price * personaInitialOfferFactor;
        context.push(`I propose a price of $${Math.round(counterOffer.price).toLocaleString()}.`);
      }
    } else { // Very unfavorable
      decision = 'Reject';
    }

    // Adjust decision based on timeRemaining and patience thresholds (if implemented)
    // This part is for future development, but the structure is here.
    if (timeRemaining !== null && persona.patienceThresholds) {
      if (timeRemaining <= persona.patienceThresholds.high && decision !== 'Accept') {
        // Force a more aggressive counter or rejection if time is running out
        if (decision === 'Counter') {
          context.push("Time is running short. My patience wears thin.");
        } else if (decision === 'Reject') {
          context.push("This negotiation has dragged on too long. I am losing patience.");
        }
      }
    }

    return {
      decision: decision,
      context: context.join(" "),
      counterOffer: counterOffer
    };
  }
}
