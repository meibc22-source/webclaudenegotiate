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
  // Negotiation specific attributes
  minAcceptablePriceFactor: 0.95, // Will not go below 95% of MSRP
  initialOfferFactor: 1.1,       // Starts negotiation at 110% of MSRP
  financingPreferences: {
    cashPreference: 0.9,         // High preference for cash deals
    interestRateFlexibility: 0.2, // Low flexibility on interest rates (wants high)
    termFlexibility: 0.2           // Low flexibility on loan terms (prefers short)
  },
  patienceThresholds: {
    impatientAtPercent: 0.7,     // Starts nudging when 70% of time is left
    ultimatumAtPercent: 0.9      // Gives ultimatum when 90% of time is left
  }
};

export default genghisKhanPersona;
