import { basePrices } from '../data/vehicledata.json';

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
      khan_description: this.generateKhanDescription(make, model, year),
      franklin_description: this.generateFranklinDescription(make, model, year),
      rockefeller_description: this.generateRockefellerDescription(make, model, year)
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

  generateFranklinDescription(make, model, year) {
    const descriptions = [
      `Indeed, a fine ${year} ${make} ${model}! A prudent choice for any discerning individual seeking both utility and a touch of elegance.`,
      `This ${year} ${make} ${model} represents a sound investment. Its reliability and efficiency will serve you well, ensuring a comfortable journey.`,
      `A most advantageous ${year} ${make} ${model}! Consider the long-term benefits of such a well-crafted machine.`,
      `One could not ask for a more sensible ${year} ${make} ${model}. It combines practical design with a certain understated charm.`,
      `I find this ${year} ${make} ${model} to be quite agreeable. It possesses the qualities of a dependable companion for your daily endeavors.`
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  generateRockefellerDescription(make, model, year) {
    const descriptions = [
      `A shrewd acquisition, this ${year} ${make} ${model}. Its market value and potential for appreciation are undeniable.`,
      `Invest wisely in this ${year} ${make} ${model}. Data suggests it will yield substantial returns in the long run.`,
      `This ${year} ${make} ${model} is a strategic asset. Its efficiency and robust performance align with sound business principles.`,
      `Observe the market data for this ${year} ${make} ${model}. It presents a compelling opportunity for the discerning buyer.`,
      `Only a fool would overlook the intrinsic value of this ${year} ${make} ${model}. It's a calculated decision for financial growth.`
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
