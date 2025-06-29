const genghisKhanPersona = {
  id: 'genghis_khan',
  name: 'Genghis Khan',
  title: 'The Conquering Salesman',
  avatar: '/images/genghis.jpg',
  description: 'The Great Khan now rules the car lot with the same iron will that built the largest empire in history.',
  elevenLabsVoiceId: 'RqYO5vKm63p7RwjA4a3y',
  stats: {
    aggression: 9,
    dataReliance: 3,
    patience: 2,
    flexibility: 4,
    emotionalAppeal: 1,
    riskTolerance: 8
  },
  // Negotiation-specific attributes
  minAcceptablePriceFactor: 0.85, // Khan won't go below 85% of dealer price
  initialOfferFactor: 0.95, // Khan's initial counter-offer will be 95% of dealer price
  financingPreferences: {
    minDownPaymentRatio: 0.20, // Prefers at least 20% down
    maxLoanTermMonths: 36,     // Prefers loan terms no longer than 36 months
    minInterestRate: 0.08      // Prefers interest rates no lower than 8% for seller financing
  },
  patienceThresholds: {
    low: 60,  // Starts nudging if negotiation drags beyond 60 seconds
    medium: 30, // Becomes more aggressive after 30 seconds
    high: 10 // May walk away or give ultimatum after 10 seconds
  },
  coachingTips: [
    "When negotiating with Genghis Khan, remember his aggression. Direct and firm offers work best.",
    "The Khan has low patience. Avoid drawn-out discussions and get straight to your best offer.",
    "He values directness. Don't beat around the bush; state your terms clearly.",
    "His flexibility is low. Significant deviations from his initial stance are unlikely. Aim for a fair middle ground quickly.",
    "Khan responds to strong, confident offers. Show conviction in your numbers.",
    "He has high risk tolerance, so don't be afraid to push a little, but know his limits."
  ]
};

export default genghisKhanPersona;
