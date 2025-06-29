// This file will contain the logic for scoring negotiation moves based on the "Getting to Yes" framework.
// It will evaluate user responses as plus, minus, or neutral.

class NegotiationScorer {
  constructor() {
    // Principles of "Getting to Yes"
    // 1. Separate the people from the problem.
    // 2. Focus on interests, not positions.
    // 3. Invent options for mutual gain.
    // 4. Insist on using objective criteria.
    // 5. Know your BATNA (Best Alternative To a Negotiated Agreement) - implicit in strategy, not direct scoring.
  }

  /**
   * Scores a user's negotiation response based on "Getting to Yes" principles.
   * @param {string} userResponse The user's negotiation statement.
   * @param {object} context Additional context for scoring (e.g., current issue, opponent's last statement).
   * @returns {'+' | '-' | '0'} The score: plus, minus, or neutral.
   */
  score(userResponse, context) {
    // Convert userResponse to lowercase for case-insensitive matching
    const response = userResponse.toLowerCase();
    let score = '0'; // Default to neutral

    // --- Positive Indicators (suggesting '+') ---
    // Focusing on interests (why something is important, underlying needs)
    if (response.includes("why is that important") || response.includes("what's your interest") || response.includes("what's the underlying need")) {
      score = '+';
    }
    // Inventing options for mutual gain (brainstorming, win-win solutions)
    if (response.includes("what if we tried") || response.includes("how can we both benefit") || response.includes("other possibilities")) {
      score = '+';
    }
    // Insisting on objective criteria (fair standards, independent benchmarks)
    if (response.includes("what's a fair price") || response.includes("based on market value") || response.includes("independent appraisal")) {
      score = '+';
    }
    // Separating people from the problem (addressing issues, not attacking individuals)
    if (response.includes("let's focus on the issue") || response.includes("i understand your concern") || response.includes("we can work this out")) {
      score = '+';
    }

    // --- Negative Indicators (suggesting '-') ---
    // Attacking the person, not the problem (personal insults, blaming)
    if (response.includes("you're wrong") || response.includes("you always do this") || response.includes("that's a ridiculous idea")) {
      score = '-';
    }
    // Sticking to positions, not interests (demanding, no flexibility)
    if (response.includes("my final offer") || response.includes("take it or leave it") || response.includes("i won't budge")) {
      score = '-';
    }
    // Making threats or ultimatums
    if (response.includes("if you don't") || response.includes("i'll walk away") || response.includes("you'll regret this")) {
      score = '-';
    }
    // Emotional outbursts (anger, frustration, not rational)
    // This is harder to detect via text, might need more advanced NLP or tone analysis.
    // For now, simple keywords can hint at it.
    if (response.includes("i'm furious") || response.includes("this is unacceptable") || response.includes("i'm done with this")) {
      score = '-';
    }

    // A more sophisticated system would use NLP to understand intent and nuance,
    // rather than just keyword matching. This is a basic starting point.
    // The `context` parameter will be crucial for more accurate scoring,
    // as it allows evaluating responses in relation to the ongoing conversation.

    return score;
  }
}

export default NegotiationScorer;
