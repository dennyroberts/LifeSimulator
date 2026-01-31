import { createRng, rollD20, roll2d10 } from './rng';
import configData from '../data/config.json';
import eventsData from '../data/events.json';
import worldModesData from '../data/worldModes.json';
import namesData from '../data/names.json';
import careersData from '../data/careers.json';

export type TraitName = 'INT' | 'WORK' | 'NEPO' | 'CHAR' | 'RISK';
export type WorldMode = 'normal' | 'nepo' | 'meritocracy';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'jackpot' | 'sinkhole';

export interface Traits {
  INT: number;
  WORK: number;
  NEPO: number;
  CHAR: number;
  RISK: number;
}

export interface EventOutcomes {
  success: string;
  fail: string;
  critSuccess?: string;
  critFail?: string;
  traitSuccess?: Partial<Record<TraitName, string>>;
  traitFail?: Partial<Record<TraitName, string>>;
}

export interface Event {
  id: string;
  name: string;
  icon?: string;
  rarity: Rarity;
  rollRequired: boolean;
  DC: number | null;
  checkTraits: Partial<Record<TraitName, number>>;
  riskGated: boolean;
  riskGateDC: number | null;
  riskGateWeight: number;
  success: { jumpPct: number; growthDelta: number };
  fail: { jumpPct: number; growthDelta: number };
  outcomes?: EventOutcomes;
}

export interface EducationOutcome {
  roll: number;
  totalMod: number;
  total: number;
  label: string;
  growthDelta: number;
  outcomeMessage?: string;
  traitContributions: TraitContribution[];
}

export interface CareerDefinition {
  name: string;
  minRoll: number;
  maxRoll: number;
  baseSalary: number;
  baseGrowth: number;
}

export interface CareerOutcome {
  roll: number;
  totalMod: number;
  total: number;
  educationBonus: number;
  educationLabel: string;
  career: CareerDefinition;
  isNat20: boolean;
  salaryMultiplier: number;
  finalSalary: number;
  finalGrowth: number;
  traitContributions: TraitContribution[];
  outcomeMessage?: string;
}

export interface TraitContribution {
  trait: TraitName;
  contribution: number;
}

export interface EventOutcome {
  event: Event;
  stage: number;
  gateRoll?: number;
  gateMod?: number;
  gateDC?: number;
  gatePass?: boolean;
  mainRoll?: number;
  mainMod?: number;
  mainDC?: number;
  success: boolean;
  gateFailed: boolean;
  jumpPct: number;
  growthDelta: number;
  incomeAfter: number;
  evRealized: number;
  isCritical?: boolean;
  criticalType?: 'success' | 'failure';
  traitContributions?: TraitContribution[];
  outcomeMessage?: string;
  decidingTrait?: TraitName; // The trait that made the difference (if any)
}

export interface StageResult {
  stage: number;
  isEducation: boolean;
  isCareer?: boolean;
  education?: EducationOutcome;
  career?: CareerOutcome;
  eventOutcome?: EventOutcome;
  incomeAfter: number;
  growthAfter: number;
}

export interface LuckAnalysis {
  evBaselineHand: number;
  evHand: number;
  evExpected: number;
  evRealized: number;
  opportunityLuck: number;
  rollLuck: number;
  educationRollLuck: number;
  careerRollLuck: number;
  eventRollLuck: number;
  netLuck: number;
  traitAdvantage: number;
  rawRollDeviation: number;
  opportunityLuckZ: number;
  rollLuckZ: number;
  totalLuckZ: number;
}

export interface SimulationResult {
  name: string;
  traits: Traits;
  aspiration: CareerAspiration;
  agentIndex: number;
  stages: StageResult[];
  finalIncome: number;
  peakIncome: number;
  lifetimeEarnings: number;
  luck: LuckAnalysis;
}

export type CareerAspiration = 'Healthcare' | 'Creative Fields' | 'Marketing' | 'Tech' | 'Finance' | 'Lawyer' | 'Doctor' | null;

export interface Agent {
  name: string;
  traits: Traits;
  index: number;
  aspiration?: CareerAspiration;
}

const config = configData;
const events: Event[] = eventsData as Event[];
const worldModes = worldModesData as Record<WorldMode, Record<TraitName, number>>;
const names = namesData;
const careers: CareerDefinition[] = careersData as CareerDefinition[];

const educationBonusMap: Record<string, number> = {
  'Elite institution': 3,
  'Strong university': 2,
  'Regional / state school': 1,
  'Community / vocational': 0,
  'Straight to workforce': -2,
};

const careerCheckTraits: Partial<Record<TraitName, number>> = {
  NEPO: 1.5,
  INT: 0.75,
  CHAR: 0.5,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const YEARS_PER_STAGE = 6;

export function compoundIncome(startingIncome: number, growthRate: number, years: number = YEARS_PER_STAGE): { income: number; growth: number } {
  let income = startingIncome;
  let growth = growthRate;
  for (let y = 0; y < years; y++) {
    income *= (1 + growth);
    // Apply income floor and growth reset during compounding
    if (income <= config.incomeFloor) {
      income = config.incomeFloor;
      if (growth < 0) growth = 0;
    }
  }
  return { income, growth };
}

export function computeStageEarnings(startingIncome: number, growthRate: number, years: number = YEARS_PER_STAGE): number {
  let total = 0;
  let income = startingIncome;
  let growth = growthRate;
  for (let y = 0; y < years; y++) {
    total += income;
    income *= (1 + growth);
    // Apply income floor and growth reset during compounding
    if (income <= config.incomeFloor) {
      income = config.incomeFloor;
      if (growth < 0) growth = 0;
    }
  }
  return total;
}

export function getMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function pSuccess(dc: number, bonus: number): number {
  const needed = dc - bonus;
  if (needed <= 1) return 1.0;
  if (needed >= 21) return 0.0;
  return (21 - needed) / 20;
}

export function getRarityWeight(rarity: Rarity): number {
  const weights = config.rarityWeights as Record<Rarity, number>;
  return weights[rarity] || 1;
}

export function getTotalDeckWeight(): number {
  return events.reduce((sum, e) => sum + getRarityWeight(e.rarity), 0);
}

export function drawEvent(rng: () => number): Event {
  const totalWeight = getTotalDeckWeight();
  let roll = rng() * totalWeight;
  for (const event of events) {
    roll -= getRarityWeight(event.rarity);
    if (roll <= 0) return event;
  }
  return events[events.length - 1];
}

export function computeTotalMod(
  traits: Traits,
  checkTraits: Partial<Record<TraitName, number>>,
  worldMode: WorldMode
): number {
  const multipliers = worldModes[worldMode];
  let total = 0;
  for (const [trait, weight] of Object.entries(checkTraits)) {
    const t = trait as TraitName;
    const mod = getMod(traits[t]);
    total += mod * (multipliers[t] || 1) * (weight || 0);
  }
  return Math.floor(total);
}

export function computeTraitContributions(
  traits: Traits,
  checkTraits: Partial<Record<TraitName, number>>,
  worldMode: WorldMode
): TraitContribution[] {
  const multipliers = worldModes[worldMode];
  const contributions: TraitContribution[] = [];
  for (const [trait, weight] of Object.entries(checkTraits)) {
    const t = trait as TraitName;
    const mod = getMod(traits[t]);
    const contribution = Math.floor(mod * (multipliers[t] || 1) * (weight || 0));
    contributions.push({ trait: t, contribution });
  }
  return contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

// Compute EV for any given jump% and growth delta (with annual compounding)
export function computeEV(stage: number, jumpPct: number, growthDelta: number): number {
  const g0 = config.baseGrowthEV;
  const remainingStages = 8 - stage + 1;
  const remainingYears = remainingStages * YEARS_PER_STAGE;
  
  let baseline = 0;
  let withEffect = 0;
  
  for (let year = 0; year < remainingYears; year++) {
    baseline += Math.pow(1 + g0, year);
    // Jump applies at year 0, then growth delta affects all subsequent years
    if (year === 0) {
      withEffect += (1 + jumpPct);
    } else {
      withEffect += (1 + jumpPct) * Math.pow(1 + g0 + growthDelta, year);
    }
  }
  
  return withEffect - baseline;
}

export function computeEvSuccess(stage: number, event: Event): number {
  return computeEV(stage, event.success.jumpPct, event.success.growthDelta);
}

export function computeEvFail(stage: number, event: Event): number {
  return computeEV(stage, event.fail.jumpPct, event.fail.growthDelta);
}

// Compute EV for critical success (1.5x multiplier on top of base, always positive outcome)
export function computeEvCritSuccess(stage: number, event: Event): number {
  const critMultiplier = 1.5;
  let jumpPct = event.success.jumpPct * critMultiplier;
  let growthDelta = event.success.growthDelta * critMultiplier;
  // Critical success flips negative to positive
  if (jumpPct < 0) jumpPct = Math.abs(jumpPct);
  if (growthDelta < 0) growthDelta = Math.abs(growthDelta);
  return computeEV(stage, jumpPct, growthDelta);
}

// Compute EV for critical failure (1.5x multiplier on top of base, always negative outcome)
export function computeEvCritFail(stage: number, event: Event): number {
  const critMultiplier = 1.5;
  let jumpPct = event.fail.jumpPct * critMultiplier;
  let growthDelta = event.fail.growthDelta * critMultiplier;
  // Critical failure flips positive to negative with minimum penalties
  if (jumpPct > 0) jumpPct = -Math.abs(jumpPct);
  if (growthDelta > 0) growthDelta = -Math.abs(growthDelta);
  if (jumpPct > -0.05) jumpPct = -0.05;
  if (growthDelta > -0.005) growthDelta = -0.005;
  return computeEV(stage, jumpPct, growthDelta);
}

export function intrinsicExpectedEV(event: Event, stage: number): number {
  const pGate = event.riskGated && event.riskGateDC
    ? pSuccess(event.riskGateDC, 0)
    : 1;
  
  const pMain = event.rollRequired && event.DC
    ? pSuccess(event.DC, 0)
    : 1;
  
  const evSuccess = computeEvSuccess(stage, event);
  const evFail = computeEvFail(stage, event);
  
  return pGate * (pMain * evSuccess + (1 - pMain) * evFail);
}

export function agentExpectedEV(
  event: Event,
  stage: number,
  traits: Traits,
  worldMode: WorldMode
): number {
  const gateMod = event.riskGated
    ? computeTotalMod(traits, { RISK: event.riskGateWeight }, worldMode)
    : 0;
  const pGate = event.riskGated && event.riskGateDC
    ? pSuccess(event.riskGateDC, gateMod)
    : 1;
  
  const mainMod = computeTotalMod(traits, event.checkTraits, worldMode);
  const DC = event.DC || 0;
  
  // Critical probabilities: nat 20 = 5%, nat 1 = 5%
  const pCritSuccess = 0.05; // Always succeeds
  const pCritFail = 0.05;    // Always fails
  
  // For non-critical rolls (90%), compute regular success probability
  // Adjusted to exclude crit outcomes already counted
  const regularSuccessProb = event.rollRequired && DC
    ? Math.max(0, Math.min(1, (21 - DC + mainMod) / 20)) // Unadjusted pSuccess
    : 1;
  
  // Probability of regular success (excluding crit success which auto-succeeds)
  // Probability of regular fail (excluding crit fail which auto-fails)
  const pRegularSuccess = Math.max(0, regularSuccessProb - pCritSuccess);
  const pRegularFail = Math.max(0, (1 - regularSuccessProb) - pCritFail);
  
  const evSuccess = computeEvSuccess(stage, event);
  const evFail = computeEvFail(stage, event);
  const evCritSuccess = computeEvCritSuccess(stage, event);
  const evCritFail = computeEvCritFail(stage, event);
  
  if (!event.rollRequired) {
    return pGate * evSuccess;
  }
  
  return pGate * (
    pCritSuccess * evCritSuccess +
    pCritFail * evCritFail +
    pRegularSuccess * evSuccess +
    pRegularFail * evFail
  );
}

export function computeEvBaselineHand(): number {
  const totalWeight = getTotalDeckWeight();
  let total = 0;
  
  for (const stage of config.eventStages) {
    let stageEV = 0;
    for (const event of events) {
      const weight = getRarityWeight(event.rarity) / totalWeight;
      stageEV += weight * intrinsicExpectedEV(event, stage);
    }
    total += stageEV;
  }
  
  return total;
}

// Compute EV for education outcome (growth delta affects all remaining years)
export function computeEducationEV(growthDelta: number): number {
  const g0 = config.baseGrowthEV;
  const remainingStages = 8; // stages 2-9
  const remainingYears = remainingStages * YEARS_PER_STAGE;
  
  let baseline = 0;
  let withEducation = 0;
  
  for (let year = 0; year < remainingYears; year++) {
    baseline += Math.pow(1 + g0, year);
    withEducation += Math.pow(1 + g0 + growthDelta, year);
  }
  
  return withEducation - baseline;
}

// Expected education EV given traits
export function computeEducationExpectedEV(traits: Traits, worldMode: WorldMode): number {
  const totalMod = computeTotalMod(traits, config.education.checkTraits as Partial<Record<TraitName, number>>, worldMode);
  let expectedEV = 0;
  
  // For each possible 2d10 roll (2-20), compute probability and resulting threshold
  // 2d10 probability: roll k has (10 - |k - 11|) ways out of 100
  for (let roll = 2; roll <= 20; roll++) {
    const ways = 10 - Math.abs(roll - 11); // Number of ways to get this sum
    const probability = ways / 100;
    const total = roll + totalMod;
    let growthDelta = 0;
    
    // Find which threshold this total hits
    for (const threshold of config.education.thresholds) {
      if (total >= threshold.minTotal) {
        growthDelta = threshold.growthDelta;
        break;
      }
    }
    
    expectedEV += probability * computeEducationEV(growthDelta);
  }
  
  return expectedEV;
}

// Compute EV for career outcome (salary and growth affect all remaining years with annual compounding)
// Returns raw delta in the same units as education/event EV
export function computeCareerEV(salary: number, growth: number, isNat20: boolean): number {
  const remainingStages = 8; // stages 2-9
  const remainingYears = remainingStages * YEARS_PER_STAGE;
  const nat20Multiplier = isNat20 ? 1.2 : 1.0;
  
  // Compute baseline (what you'd get with average career)
  // Using average career: ~§52K salary, ~0.03 growth (mid-tier)
  const avgSalary = 52000;
  const avgGrowth = 0.03;
  
  let baseline = 0;
  let withCareer = 0;
  
  for (let year = 0; year < remainingYears; year++) {
    baseline += avgSalary * Math.pow(1 + avgGrowth, year);
    withCareer += salary * nat20Multiplier * Math.pow(1 + growth, year);
  }
  
  // Normalize to EV scale (same as education: relative growth impact)
  // Divide by baseline to get a unitless ratio comparable to other EV measures
  return (withCareer - baseline) / (baseline || 1);
}

// Expected career EV given traits and education bonus
export function computeCareerExpectedEV(
  traits: Traits, 
  worldMode: WorldMode, 
  educationBonus: number
): number {
  const nepoMod = getMod(traits.NEPO) * (worldModes[worldMode].NEPO || 1) * 1.5;
  const intMod = getMod(traits.INT) * (worldModes[worldMode].INT || 1) * 0.75;
  const charMod = getMod(traits.CHAR) * (worldModes[worldMode].CHAR || 1) * 0.5;
  const totalMod = Math.floor(nepoMod + intMod + charMod + educationBonus);
  
  let expectedEV = 0;
  
  // For each possible 2d10 roll (2-20), compute probability and resulting career
  // 2d10 probability: roll k has (10 - |k - 11|) ways out of 100
  for (let roll = 2; roll <= 20; roll++) {
    const ways = 10 - Math.abs(roll - 11); // Number of ways to get this sum
    const probability = ways / 100;
    const total = roll + totalMod;
    const isMaxRoll = roll === 20;
    
    // Find which career this total maps to
    let career = careers[0]; // Default to lowest
    for (const c of careers) {
      if (total >= c.minRoll && total <= c.maxRoll) {
        career = c;
        break;
      } else if (total > c.maxRoll) {
        career = c; // Keep updating to higher tiers
      }
    }
    
    expectedEV += probability * computeCareerEV(career.baseSalary, career.baseGrowth, isMaxRoll);
  }
  
  return expectedEV;
}

const educationOutcomes: Record<string, string> = {
  'Elite PhD': 'Your research opens doors to high-paying consulting gigs',
  'Top PhD': 'Academia or industry—either way, your expertise commands a premium',
  'PhD': 'Years of study pay off with specialized career opportunities',
  'Elite Masters': 'Your graduate degree fast-tracks you into management',
  'Top Masters': 'The network you built is worth more than the degree',
  'Masters': 'An extra credential means an extra §10K starting salary',
  'Elite Bachelors': 'Recruiters are already fighting over you',
  'Top Bachelors': 'Big companies are sliding into your inbox',
  'Bachelors': 'You check the box most employers are looking for',
  'Some College': 'You learned enough to be dangerous, now prove yourself',
  'Straight to workforce': 'No debt, but you\'ll need to work harder to stand out'
};

const educationTraitSuccess: Partial<Record<TraitName, string>> = {
  INT: 'Your brilliant mind made the coursework look easy',
  WORK: 'Your relentless study habits paid off big time',
  NEPO: 'Your family connections bought your way into an elite program',
  CHAR: 'Your charm won over the admissions committee'
};

const educationTraitFail: Partial<Record<TraitName, string>> = {
  INT: 'You never were book-smart... maybe college isn\'t for you',
  WORK: 'Your lack of discipline caught up with you—too many skipped classes',
  NEPO: 'With no connections to pull strings, you\'re on your own',
  CHAR: 'Your application essay was... underwhelming'
};

function selectTraitMessage(
  traitContributions: TraitContribution[],
  successMessages: Partial<Record<TraitName, string>>,
  failMessages: Partial<Record<TraitName, string>>,
  isSuccess: boolean,
  defaultMessage: string
): string {
  if (isSuccess) {
    const topPositive = traitContributions.find(tc => tc.contribution > 0);
    if (topPositive && successMessages[topPositive.trait]) {
      return successMessages[topPositive.trait]!;
    }
  } else {
    const worstNegative = traitContributions
      .filter(tc => tc.contribution < 0)
      .sort((a, b) => a.contribution - b.contribution)[0];
    if (worstNegative && failMessages[worstNegative.trait]) {
      return failMessages[worstNegative.trait]!;
    }
  }
  return defaultMessage;
}

export function resolveEducation(
  traits: Traits,
  worldMode: WorldMode,
  rng: () => number,
  forcedRoll?: number
): EducationOutcome {
  const roll = forcedRoll ?? roll2d10(rng);
  const checkTraits = config.education.checkTraits as Partial<Record<TraitName, number>>;
  const totalMod = computeTotalMod(traits, checkTraits, worldMode);
  const total = roll + totalMod;
  const traitContributions = computeTraitContributions(traits, checkTraits, worldMode);
  
  const isGoodOutcome = total >= 15;
  const isBadOutcome = total < 10;
  
  for (const threshold of config.education.thresholds) {
    if (total >= threshold.minTotal) {
      let outcomeMessage = educationOutcomes[threshold.label] || 'Your education shapes your path';
      
      if (isGoodOutcome) {
        outcomeMessage = selectTraitMessage(traitContributions, educationTraitSuccess, educationTraitFail, true, outcomeMessage);
      } else if (isBadOutcome) {
        outcomeMessage = selectTraitMessage(traitContributions, educationTraitSuccess, educationTraitFail, false, outcomeMessage);
      }
      
      return {
        roll,
        totalMod,
        total,
        label: threshold.label,
        growthDelta: threshold.growthDelta,
        outcomeMessage,
        traitContributions
      };
    }
  }
  
  const outcomeMessage = selectTraitMessage(traitContributions, educationTraitSuccess, educationTraitFail, false, educationOutcomes['Straight to workforce']);
  
  return {
    roll,
    totalMod,
    total,
    label: 'Straight to workforce',
    growthDelta: 0,
    outcomeMessage,
    traitContributions
  };
}

const careerOutcomes: Record<string, { normal: string; nat20: string }> = {
  'Food Service': { 
    normal: 'Minimum wage, maximum hustle required', 
    nat20: 'Started at the bottom, but with signing bonus' 
  },
  'Retail': { 
    normal: 'Steady hours and employee discount', 
    nat20: 'Management fast-track from day one' 
  },
  'Construction': { 
    normal: 'Hard work, honest pay', 
    nat20: 'Union gig with full benefits' 
  },
  'Truck Driver': { 
    normal: 'Long hours, but the pay is decent', 
    nat20: 'Prime routes and overtime bonuses' 
  },
  'Healthcare': { 
    normal: 'Job security in a growing field', 
    nat20: 'Top hospital, top tier compensation' 
  },
  'Creative Fields': { 
    normal: 'Following your passion, bills willing', 
    nat20: 'Your talent got noticed by the right people' 
  },
  'Marketing': { 
    normal: 'Commission-based, ceiling unlimited', 
    nat20: 'Premium territory with established accounts' 
  },
  'Tech': { 
    normal: 'Solid starting salary with growth potential', 
    nat20: 'FAANG offer with stock options' 
  },
  'Finance': { 
    normal: 'Numbers add up to a nice paycheck', 
    nat20: 'Wall Street calls, bonuses await' 
  },
  'Lawyer': { 
    normal: 'Billable hours translate to real money', 
    nat20: 'Big Law associate with partner track' 
  },
  'Doctor': { 
    normal: 'Long residency, but the payoff is coming', 
    nat20: 'Chief resident at a prestigious hospital' 
  }
};

const careerTraitSuccess: Partial<Record<TraitName, string>> = {
  INT: 'Your sharp mind landed you a job others only dream of',
  WORK: 'Your reputation as a hard worker preceded you',
  NEPO: 'Uncle\'s golf buddy pulled some strings—welcome aboard',
  CHAR: 'You charmed your way through every interview round'
};

const careerTraitFail: Partial<Record<TraitName, string>> = {
  INT: 'The technical interview didn\'t go so well...',
  WORK: 'They saw through your embellished work history',
  NEPO: 'Without connections, your resume went straight to the bottom of the pile',
  CHAR: 'The interviewer said you lacked "executive presence"'
};

export function resolveCareer(
  traits: Traits,
  worldMode: WorldMode,
  rng: () => number,
  educationLabel: string,
  aspiration?: CareerAspiration,
  forcedRoll?: number
): CareerOutcome {
  const roll = forcedRoll ?? roll2d10(rng);
  const isMaxRoll = roll === 20; // Max roll on 2d10
  
  const traitMod = computeTotalMod(traits, careerCheckTraits, worldMode);
  const educationBonus = educationBonusMap[educationLabel] ?? 0;
  const totalMod = traitMod + educationBonus;
  
  const total = Math.max(0, roll + totalMod);
  
  let bestCareer = careers[0];
  for (const career of careers) {
    if (total >= career.minRoll && total <= career.maxRoll) {
      bestCareer = career;
      break;
    }
  }
  
  let selectedCareer = bestCareer;
  if (aspiration) {
    const aspirationCareer = careers.find(c => c.name === aspiration);
    if (aspirationCareer && total >= aspirationCareer.minRoll) {
      selectedCareer = aspirationCareer;
    }
  }
  
  const salaryMultiplier = isMaxRoll ? 1.2 : 1.0;
  const finalSalary = selectedCareer.baseSalary * salaryMultiplier;
  const finalGrowth = selectedCareer.baseGrowth;
  
  const traitContributions = computeTraitContributions(traits, careerCheckTraits, worldMode);
  
  const careerMessages = careerOutcomes[selectedCareer.name] || { normal: 'Your career begins', nat20: 'Your career begins with a bang' };
  let outcomeMessage = isMaxRoll ? careerMessages.nat20 : careerMessages.normal;
  
  const isGoodCareer = total >= 20;
  const isBadCareer = total < 10;
  
  if (isGoodCareer && !isMaxRoll) {
    outcomeMessage = selectTraitMessage(traitContributions, careerTraitSuccess, careerTraitFail, true, outcomeMessage);
  } else if (isBadCareer) {
    outcomeMessage = selectTraitMessage(traitContributions, careerTraitSuccess, careerTraitFail, false, outcomeMessage);
  }
  
  return {
    roll,
    totalMod,
    total,
    educationBonus,
    educationLabel,
    career: selectedCareer,
    isNat20: isMaxRoll,
    salaryMultiplier,
    finalSalary,
    finalGrowth,
    traitContributions,
    outcomeMessage
  };
}

export function resolveEvent(
  event: Event,
  stage: number,
  traits: Traits,
  worldMode: WorldMode,
  rng: () => number,
  currentIncome: number,
  currentGrowth: number,
  forcedRoll?: number
): { outcome: EventOutcome; newIncome: number; newGrowth: number } {
  let gateFailed = false;
  let gateRoll: number | undefined;
  let gateMod: number | undefined;
  let gateDC: number | undefined;
  let gatePass: boolean | undefined;
  
  if (event.riskGated && event.riskGateDC) {
    gateRoll = forcedRoll ?? rollD20(rng);
    gateMod = computeTotalMod(traits, { RISK: event.riskGateWeight }, worldMode);
    gateDC = event.riskGateDC;
    gatePass = gateRoll + gateMod >= gateDC;
    gateFailed = !gatePass;
  }
  
  let mainRoll: number | undefined;
  let mainMod: number | undefined;
  let mainDC: number | undefined;
  let success = true;
  let isCritical = false;
  let criticalType: 'success' | 'failure' | undefined;
  
  let traitContributions: TraitContribution[] = [];
  
  if (!gateFailed) {
    if (event.rollRequired && event.DC) {
      mainRoll = forcedRoll ?? rollD20(rng);
      mainMod = computeTotalMod(traits, event.checkTraits, worldMode);
      traitContributions = computeTraitContributions(traits, event.checkTraits, worldMode);
      mainDC = event.DC;
      
      // Check for critical success (nat 20) or critical failure (nat 1)
      // Nat 20 always succeeds, Nat 1 always fails, regardless of modifiers
      const isNat20 = mainRoll === 20;
      const isNat1 = mainRoll === 1;
      
      if (isNat20) {
        success = true;
        isCritical = true;
        criticalType = 'success';
      } else if (isNat1) {
        success = false;
        isCritical = true;
        criticalType = 'failure';
      } else {
        success = mainRoll + mainMod >= mainDC;
      }
    }
  }
  
  let jumpPct = 0;
  let growthDelta = 0;
  let evRealized = 0;
  
  const multiplier = (config as any).effectMultiplier || 1.0;
  const criticalMultiplier = isCritical ? 1.5 : 1.0;
  
  if (gateFailed) {
    evRealized = 0;
  } else if (success) {
    jumpPct = event.success.jumpPct * multiplier * criticalMultiplier;
    growthDelta = event.success.growthDelta * multiplier * criticalMultiplier;
    
    // Critical success (nat 20): flip any negative outcomes to positive
    if (isCritical && criticalType === 'success') {
      if (jumpPct < 0) jumpPct = Math.abs(jumpPct);
      if (growthDelta < 0) growthDelta = Math.abs(growthDelta);
    }
    
    // Use actual values with critical effects for evRealized
    evRealized = computeEV(stage, jumpPct, growthDelta);
  } else {
    jumpPct = event.fail.jumpPct * multiplier * criticalMultiplier;
    growthDelta = event.fail.growthDelta * multiplier * criticalMultiplier;
    
    // Critical failure (nat 1): flip any positive outcomes to negative
    // and ensure at least some minimum negative effect
    if (isCritical && criticalType === 'failure') {
      if (jumpPct > 0) jumpPct = -Math.abs(jumpPct);
      if (growthDelta > 0) growthDelta = -Math.abs(growthDelta);
      // Ensure minimum negative effects on critical failure
      if (jumpPct > -0.05) jumpPct = -0.05;
      if (growthDelta > -0.005) growthDelta = -0.005;
    }
    
    // Use actual values with critical effects for evRealized
    evRealized = computeEV(stage, jumpPct, growthDelta);
  }
  
  let newGrowth = currentGrowth + growthDelta;
  
  // Event applies jump% directly to current income (compounding is handled externally)
  let newIncome = currentIncome * (1 + jumpPct);
  const hitFloor = newIncome <= config.incomeFloor;
  newIncome = Math.max(config.incomeFloor, newIncome);
  
  // Reset growth to 0 if we hit the income floor with negative growth
  if (hitFloor && newGrowth < 0) {
    newGrowth = 0;
  }
  
  // Select outcome message with trait-deciding logic
  let outcomeMessage: string | undefined;
  let decidingTrait: TraitName | undefined;
  
  if (gateFailed) {
    outcomeMessage = "You decided not to take the risk";
  } else if (event.outcomes) {
    if (isCritical && criticalType === 'success' && event.outcomes.critSuccess) {
      outcomeMessage = event.outcomes.critSuccess;
    } else if (isCritical && criticalType === 'failure' && event.outcomes.critFail) {
      outcomeMessage = event.outcomes.critFail;
    } else {
      // Calculate if traits mattered for this roll (only if roll was actually required)
      let traitsMattered = false;
      if (event.rollRequired && mainRoll !== undefined && mainDC !== undefined) {
        // 1. Find min and max trait contributions
        const contributions = traitContributions?.map(tc => tc.contribution) || [];
        const minContrib = contributions.length > 0 ? Math.min(...contributions) : 0;
        const maxContrib = contributions.length > 0 ? Math.max(...contributions) : 0;
        
        // 2. Calculate the range where traits could have mattered
        // lowerBound = DC - max (if roll is below this, would have failed regardless)
        // upperBound = DC - min (if roll is above this, would have succeeded regardless)
        const lowerBound = mainDC - maxContrib;
        const upperBound = mainDC - minContrib;
        
        // 3. Check if the natural roll falls within the "traits mattered" range
        traitsMattered = mainRoll >= lowerBound && mainRoll <= upperBound;
      }
      
      if (success) {
        if (traitsMattered && event.outcomes.traitSuccess && traitContributions && traitContributions.length > 0) {
          // Find the trait with the biggest positive contribution
          const sortedPositive = traitContributions
            .filter(tc => tc.contribution > 0)
            .sort((a, b) => b.contribution - a.contribution);
          const topTrait = sortedPositive[0];
          if (topTrait && event.outcomes.traitSuccess[topTrait.trait]) {
            outcomeMessage = event.outcomes.traitSuccess[topTrait.trait];
            decidingTrait = topTrait.trait;
          } else {
            outcomeMessage = event.outcomes.success;
          }
        } else {
          outcomeMessage = event.outcomes.success;
        }
      } else {
        if (traitsMattered && event.outcomes.traitFail && traitContributions && traitContributions.length > 0) {
          // Find the trait with the most negative contribution (hurt them most)
          const sortedNegative = traitContributions
            .filter(tc => tc.contribution < 0)
            .sort((a, b) => a.contribution - b.contribution);
          const worstTrait = sortedNegative[0];
          if (worstTrait && event.outcomes.traitFail[worstTrait.trait]) {
            outcomeMessage = event.outcomes.traitFail[worstTrait.trait];
            decidingTrait = worstTrait.trait;
          } else {
            outcomeMessage = event.outcomes.fail;
          }
        } else {
          outcomeMessage = event.outcomes.fail;
        }
      }
    }
  }
  
  const outcome: EventOutcome = {
    event,
    stage,
    gateRoll,
    gateMod,
    gateDC,
    gatePass,
    mainRoll,
    mainMod,
    mainDC,
    success: !gateFailed && success,
    gateFailed,
    jumpPct,
    growthDelta,
    incomeAfter: newIncome,
    evRealized,
    isCritical,
    criticalType,
    traitContributions,
    outcomeMessage,
    decidingTrait
  };
  
  return { outcome, newIncome, newGrowth };
}

export function simulateLife(
  agent: Agent,
  worldMode: WorldMode,
  seed: string,
  sameDeck: boolean,
  sharedEvents?: Map<number, Event>,
  forcedRoll?: number
): SimulationResult {
  const agentRng = createRng(`${seed}|agent${agent.index}`);
  
  let lifetimeEarnings = 0;
  let peakIncome = 0;
  const stages: StageResult[] = [];
  const drawnEvents: { event: Event; stage: number }[] = [];
  
  const educationOutcome = resolveEducation(agent.traits, worldMode, agentRng, forcedRoll);
  
  stages.push({
    stage: 1,
    isEducation: true,
    education: educationOutcome,
    incomeAfter: 0,
    growthAfter: 0
  });
  
  const careerOutcome = resolveCareer(agent.traits, worldMode, agentRng, educationOutcome.label, agent.aspiration, forcedRoll);
  
  let income = careerOutcome.finalSalary;
  let growth = careerOutcome.finalGrowth + educationOutcome.growthDelta;
  
  peakIncome = Math.max(peakIncome, income);
  
  stages.push({
    stage: 2,
    isEducation: false,
    isCareer: true,
    career: careerOutcome,
    incomeAfter: income,
    growthAfter: growth
  });
  // Career stage (ages 24-30): income compounds annually for 6 years
  lifetimeEarnings += computeStageEarnings(income, growth);
  
  // Compound income to get end-of-career-stage income (going into first event)
  const careerCompound = compoundIncome(income, growth, YEARS_PER_STAGE);
  income = careerCompound.income;
  growth = careerCompound.growth;
  peakIncome = Math.max(peakIncome, income);
  
  for (const stageNum of config.eventStages) {
    let event: Event;
    
    if (sameDeck && sharedEvents) {
      event = sharedEvents.get(stageNum)!;
    } else if (sameDeck) {
      const stageRng = createRng(`${seed}|stage${stageNum}`);
      event = drawEvent(stageRng);
    } else {
      event = drawEvent(agentRng);
    }
    
    drawnEvents.push({ event, stage: stageNum });
    
    // Event applies at start of stage: jump% to current income, modify growth
    const result = resolveEvent(event, stageNum, agent.traits, worldMode, agentRng, income, growth, forcedRoll);
    
    // Update income and growth from event result
    income = result.newIncome;
    growth = result.newGrowth;
    peakIncome = Math.max(peakIncome, income);
    
    // Earnings for this stage: work at post-event income/growth for 6 years
    lifetimeEarnings += computeStageEarnings(income, growth);
    
    // Compound income for 6 years (going into next event)
    const stageCompound = compoundIncome(income, growth, YEARS_PER_STAGE);
    income = stageCompound.income;
    growth = stageCompound.growth;
    peakIncome = Math.max(peakIncome, income);
    
    stages.push({
      stage: stageNum,
      isEducation: false,
      eventOutcome: result.outcome,
      incomeAfter: result.newIncome,
      growthAfter: result.newGrowth
    });
  }
  
  const evBaselineHand = computeEvBaselineHand();
  const evHand = drawnEvents.reduce(
    (sum, { event, stage }) => sum + intrinsicExpectedEV(event, stage),
    0
  );
  const evExpected = drawnEvents.reduce(
    (sum, { event, stage }) => sum + agentExpectedEV(event, stage, agent.traits, worldMode),
    0
  );
  const evRealized = stages
    .filter(s => !s.isEducation && s.eventOutcome)
    .reduce((sum, s) => sum + (s.eventOutcome?.evRealized || 0), 0);
  
  // Roll luck is now calculated purely from raw roll deviations from average
  // This measures "did the dice favor you?" independent of trait modifiers
  const D2D10_AVERAGE = 11; // Average of 2d10 (range 2-20)
  const D20_AVERAGE = 10.5; // Average of 1d20 (events still use d20)
  
  // Education roll luck: raw roll deviation from 2d10 average
  // Scale by a factor to make it comparable to EV units (approx growth delta impact)
  const educationRollDeviation = educationOutcome.roll - D2D10_AVERAGE;
  const educationRollLuck = educationRollDeviation * 0.05; // Scale factor for display
  
  // Career roll luck: raw roll deviation from 2d10 average
  // Max roll (20) bonus is already reflected in the roll itself
  const careerRollDeviation = careerOutcome.roll - D2D10_AVERAGE;
  const careerRollLuck = careerRollDeviation * 0.05; // Scale factor for display
  
  // Event roll luck: sum of all raw roll deviations from events
  let eventRollDeviationSum = 0;
  for (const stage of stages) {
    if (stage.eventOutcome) {
      const outcome = stage.eventOutcome;
      // Add gate roll deviation if there was a risk gate check
      if (outcome.gateRoll !== undefined) {
        eventRollDeviationSum += outcome.gateRoll - D20_AVERAGE;
      }
      // Add main roll deviation if there was a main check
      if (outcome.mainRoll !== undefined) {
        eventRollDeviationSum += outcome.mainRoll - D20_AVERAGE;
      }
    }
  }
  const eventRollLuck = eventRollDeviationSum * 0.05; // Scale factor for display
  
  // Total roll luck combines all roll-based luck (now purely dice-based)
  const rollLuck = educationRollLuck + careerRollLuck + eventRollLuck;
  
  // Raw roll deviation (sum of all d20 deviations from 10.5)
  const rawRollDeviation = educationRollDeviation + careerRollDeviation + eventRollDeviationSum;
  
  const opportunityLuck = evHand - evBaselineHand;
  const netLuck = opportunityLuck + rollLuck;
  const traitAdvantage = evExpected - evHand;
  
  // Z-score normalization using calibration constants
  // Roll deviation: d20 variance = (20^2-1)/12 = 33.25, std = 5.77
  // With ~10 rolls (edu + career + ~8 events), total std ≈ 5.77 * sqrt(10) ≈ 18.2
  // Opportunity luck: based on event EV variance across the deck
  // Empirically calibrated from 10k simulations: std ≈ 0.50
  const OPPORTUNITY_LUCK_STD = 0.50;
  const ROLL_DEVIATION_STD = 18.2;
  
  const opportunityLuckZ = opportunityLuck / OPPORTUNITY_LUCK_STD;
  const rollLuckZ = rawRollDeviation / ROLL_DEVIATION_STD;
  // Average the two z-scores (both have zero mean by construction)
  const totalLuckZ = (opportunityLuckZ + rollLuckZ) / 2;
  
  return {
    name: agent.name,
    traits: agent.traits,
    aspiration: agent.aspiration ?? null,
    agentIndex: agent.index,
    stages,
    finalIncome: income,
    peakIncome,
    lifetimeEarnings,
    luck: {
      evBaselineHand,
      evHand,
      evExpected,
      evRealized,
      opportunityLuck,
      rollLuck,
      educationRollLuck,
      careerRollLuck,
      eventRollLuck,
      netLuck,
      traitAdvantage,
      rawRollDeviation,
      opportunityLuckZ,
      rollLuckZ,
      totalLuckZ
    }
  };
}

export function generateRandomTraits(rng: () => number): Traits {
  return {
    INT: roll2d10(rng),
    WORK: roll2d10(rng),
    NEPO: roll2d10(rng),
    CHAR: roll2d10(rng),
    RISK: roll2d10(rng)
  };
}

export function generateRandomName(rng: () => number): string {
  const firstName = names.firstNames[Math.floor(rng() * names.firstNames.length)];
  const lastName = names.lastNames[Math.floor(rng() * names.lastNames.length)];
  return `${firstName} ${lastName}`;
}

const ASPIRATIONS: CareerAspiration[] = ['Healthcare', 'Creative Fields', 'Marketing', 'Tech', 'Finance', 'Lawyer', 'Doctor', null];

export function generateRandomAspiration(rng: () => number): CareerAspiration {
  return ASPIRATIONS[Math.floor(rng() * ASPIRATIONS.length)];
}

// Generate shared events for "same deck" mode - call once before batching
export function generateSharedEvents(seed: string): Map<number, Event> {
  const sharedEvents = new Map<number, Event>();
  for (const stageNum of config.eventStages) {
    const stageRng = createRng(`${seed}|stage${stageNum}`);
    sharedEvents.set(stageNum, drawEvent(stageRng));
  }
  return sharedEvents;
}

export function runMassSimulation(
  numAgents: number,
  worldMode: WorldMode,
  seed: string,
  sameDeck: boolean,
  aspirationsEnabled: boolean = true,
  preGeneratedSharedEvents?: Map<number, Event>
): SimulationResult[] {
  const masterRng = createRng(seed);
  
  // Use pre-generated shared events if provided, otherwise generate (for backwards compatibility)
  let sharedEvents: Map<number, Event> | undefined;
  if (sameDeck) {
    sharedEvents = preGeneratedSharedEvents || generateSharedEvents(seed);
  }
  
  const results: SimulationResult[] = [];
  
  for (let i = 0; i < numAgents; i++) {
    const agentSeedRng = createRng(`${seed}|agent${i}|init`);
    const traits = generateRandomTraits(agentSeedRng);
    const name = generateRandomName(agentSeedRng);
    const aspiration = aspirationsEnabled ? generateRandomAspiration(agentSeedRng) : null;
    
    const agent: Agent = { name, traits, index: i, aspiration };
    const result = simulateLife(agent, worldMode, seed, sameDeck, sharedEvents);
    results.push(result);
  }
  
  return results;
}

export function formatCurrency(value: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
  return `§${formatted}`;
}

export interface LifetimeGrade {
  grade: string;
  color: string;
}

export function getLifetimeGrade(lifetimeEarnings: number): LifetimeGrade {
  if (lifetimeEarnings >= 20_000_000) {
    return { grade: 'A++', color: 'text-yellow-400' };
  } else if (lifetimeEarnings >= 12_000_000) {
    return { grade: 'A+', color: 'text-yellow-500' };
  } else if (lifetimeEarnings >= 8_000_000) {
    return { grade: 'A', color: 'text-green-400' };
  } else if (lifetimeEarnings >= 6_000_000) {
    return { grade: 'A-', color: 'text-green-500' };
  } else if (lifetimeEarnings >= 4_500_000) {
    return { grade: 'B+', color: 'text-emerald-400' };
  } else if (lifetimeEarnings >= 3_500_000) {
    return { grade: 'B', color: 'text-emerald-500' };
  } else if (lifetimeEarnings >= 2_800_000) {
    return { grade: 'B-', color: 'text-teal-400' };
  } else if (lifetimeEarnings >= 2_200_000) {
    return { grade: 'C+', color: 'text-blue-400' };
  } else if (lifetimeEarnings >= 1_800_000) {
    return { grade: 'C', color: 'text-blue-500' };
  } else if (lifetimeEarnings >= 1_400_000) {
    return { grade: 'C-', color: 'text-sky-400' };
  } else if (lifetimeEarnings >= 1_100_000) {
    return { grade: 'D+', color: 'text-orange-400' };
  } else if (lifetimeEarnings >= 800_000) {
    return { grade: 'D', color: 'text-orange-500' };
  } else if (lifetimeEarnings >= 500_000) {
    return { grade: 'D-', color: 'text-orange-600' };
  } else if (lifetimeEarnings >= 350_000) {
    return { grade: 'F', color: 'text-red-500' };
  } else {
    return { grade: 'F-', color: 'text-red-600' };
  }
}

export function formatEV(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(3)}`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}%`;
}
