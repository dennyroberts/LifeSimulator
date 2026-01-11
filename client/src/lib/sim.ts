import { createRng, rollD20, roll3d6Plus2 } from './rng';
import configData from '../data/config.json';
import eventsData from '../data/events.json';
import worldModesData from '../data/worldModes.json';
import namesData from '../data/names.json';

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

export interface Event {
  id: string;
  name: string;
  rarity: Rarity;
  rollRequired: boolean;
  DC: number | null;
  checkTraits: Partial<Record<TraitName, number>>;
  riskGated: boolean;
  riskGateDC: number | null;
  riskGateWeight: number;
  success: { jumpPct: number; growthDelta: number };
  fail: { jumpPct: number; growthDelta: number };
}

export interface EducationOutcome {
  roll: number;
  totalMod: number;
  total: number;
  label: string;
  growthDelta: number;
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
}

export interface StageResult {
  stage: number;
  isEducation: boolean;
  education?: EducationOutcome;
  eventOutcome?: EventOutcome;
  incomeAfter: number;
}

export interface LuckAnalysis {
  evBaselineHand: number;
  evHand: number;
  evExpected: number;
  evRealized: number;
  opportunityLuck: number;
  rollLuck: number;
  netLuck: number;
  traitAdvantage: number;
}

export interface SimulationResult {
  name: string;
  traits: Traits;
  stages: StageResult[];
  finalIncome: number;
  luck: LuckAnalysis;
}

export interface Agent {
  name: string;
  traits: Traits;
  index: number;
}

const config = configData;
const events: Event[] = eventsData as Event[];
const worldModes = worldModesData as Record<WorldMode, Record<TraitName, number>>;
const names = namesData;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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

export function computeEvSuccess(stage: number, event: Event): number {
  const g0 = config.baseGrowthEV;
  const remaining = 8 - stage + 1;
  const jumpSuccess = event.success.jumpPct;
  const growthSuccess = event.success.growthDelta;
  
  let baseline = 0;
  let withSuccess = 0;
  
  for (let i = 0; i < remaining; i++) {
    baseline += Math.pow(1 + g0, i);
    if (i === 0) {
      withSuccess += (1 + jumpSuccess) * Math.pow(1 + g0 + growthSuccess, i);
    } else {
      withSuccess += Math.pow(1 + g0 + growthSuccess, i);
    }
  }
  
  return withSuccess - baseline;
}

export function computeEvFail(stage: number, event: Event): number {
  const g0 = config.baseGrowthEV;
  const remaining = 8 - stage + 1;
  const jumpFail = event.fail.jumpPct;
  const growthFail = event.fail.growthDelta;
  
  let baseline = 0;
  let withFail = 0;
  
  for (let i = 0; i < remaining; i++) {
    baseline += Math.pow(1 + g0, i);
    if (i === 0) {
      withFail += (1 + jumpFail) * Math.pow(1 + g0 + growthFail, i);
    } else {
      withFail += Math.pow(1 + g0 + growthFail, i);
    }
  }
  
  return withFail - baseline;
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
  const pMain = event.rollRequired && event.DC
    ? pSuccess(event.DC, mainMod)
    : 1;
  
  const evSuccess = computeEvSuccess(stage, event);
  const evFail = computeEvFail(stage, event);
  
  return pGate * (pMain * evSuccess + (1 - pMain) * evFail);
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

export function resolveEducation(
  traits: Traits,
  worldMode: WorldMode,
  rng: () => number
): EducationOutcome {
  const roll = rollD20(rng);
  const totalMod = computeTotalMod(traits, config.education.checkTraits as Partial<Record<TraitName, number>>, worldMode);
  const total = roll + totalMod;
  
  for (const threshold of config.education.thresholds) {
    if (total >= threshold.minTotal) {
      return {
        roll,
        totalMod,
        total,
        label: threshold.label,
        growthDelta: threshold.growthDelta
      };
    }
  }
  
  return {
    roll,
    totalMod,
    total,
    label: 'Straight to workforce',
    growthDelta: 0
  };
}

export function resolveEvent(
  event: Event,
  stage: number,
  traits: Traits,
  worldMode: WorldMode,
  rng: () => number,
  currentIncome: number,
  currentGrowth: number
): { outcome: EventOutcome; newIncome: number; newGrowth: number } {
  let gateFailed = false;
  let gateRoll: number | undefined;
  let gateMod: number | undefined;
  let gateDC: number | undefined;
  let gatePass: boolean | undefined;
  
  if (event.riskGated && event.riskGateDC) {
    gateRoll = rollD20(rng);
    gateMod = computeTotalMod(traits, { RISK: event.riskGateWeight }, worldMode);
    gateDC = event.riskGateDC;
    gatePass = gateRoll + gateMod >= gateDC;
    gateFailed = !gatePass;
  }
  
  let mainRoll: number | undefined;
  let mainMod: number | undefined;
  let mainDC: number | undefined;
  let success = true;
  
  if (!gateFailed) {
    if (event.rollRequired && event.DC) {
      mainRoll = rollD20(rng);
      mainMod = computeTotalMod(traits, event.checkTraits, worldMode);
      mainDC = event.DC;
      success = mainRoll + mainMod >= mainDC;
    }
  }
  
  let jumpPct = 0;
  let growthDelta = 0;
  let evRealized = 0;
  
  if (gateFailed) {
    evRealized = 0;
  } else if (success) {
    jumpPct = event.success.jumpPct;
    growthDelta = event.success.growthDelta;
    evRealized = computeEvSuccess(stage, event);
  } else {
    jumpPct = event.fail.jumpPct;
    growthDelta = event.fail.growthDelta;
    evRealized = computeEvFail(stage, event);
  }
  
  let newGrowth = clamp(
    currentGrowth + growthDelta,
    config.growthClamp.min,
    config.growthClamp.max
  );
  
  let newIncome = currentIncome * (1 + newGrowth) * (1 + jumpPct);
  newIncome = Math.max(config.incomeFloor, newIncome);
  
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
    evRealized
  };
  
  return { outcome, newIncome, newGrowth };
}

export function simulateLife(
  agent: Agent,
  worldMode: WorldMode,
  seed: string,
  sameDeck: boolean,
  sharedEvents?: Map<number, Event>
): SimulationResult {
  const agentRng = createRng(`${seed}|agent${agent.index}`);
  
  let income = config.startingIncome;
  let growth = config.startingGrowth;
  const stages: StageResult[] = [];
  const drawnEvents: { event: Event; stage: number }[] = [];
  
  const educationOutcome = resolveEducation(agent.traits, worldMode, agentRng);
  growth = clamp(
    growth + educationOutcome.growthDelta,
    config.growthClamp.min,
    config.growthClamp.max
  );
  income = income * (1 + growth);
  
  stages.push({
    stage: 1,
    isEducation: true,
    education: educationOutcome,
    incomeAfter: income
  });
  
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
    
    const result = resolveEvent(event, stageNum, agent.traits, worldMode, agentRng, income, growth);
    income = result.newIncome;
    growth = result.newGrowth;
    
    stages.push({
      stage: stageNum,
      isEducation: false,
      eventOutcome: result.outcome,
      incomeAfter: income
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
  
  const opportunityLuck = evHand - evBaselineHand;
  const rollLuck = evRealized - evExpected;
  const netLuck = opportunityLuck + rollLuck;
  const traitAdvantage = evExpected - evHand;
  
  return {
    name: agent.name,
    traits: agent.traits,
    stages,
    finalIncome: income,
    luck: {
      evBaselineHand,
      evHand,
      evExpected,
      evRealized,
      opportunityLuck,
      rollLuck,
      netLuck,
      traitAdvantage
    }
  };
}

export function generateRandomTraits(rng: () => number): Traits {
  return {
    INT: roll3d6Plus2(rng),
    WORK: roll3d6Plus2(rng),
    NEPO: roll3d6Plus2(rng),
    CHAR: roll3d6Plus2(rng),
    RISK: roll3d6Plus2(rng)
  };
}

export function generateRandomName(rng: () => number): string {
  const firstName = names.firstNames[Math.floor(rng() * names.firstNames.length)];
  const lastName = names.lastNames[Math.floor(rng() * names.lastNames.length)];
  return `${firstName} ${lastName}`;
}

export function runMassSimulation(
  numAgents: number,
  worldMode: WorldMode,
  seed: string,
  sameDeck: boolean
): SimulationResult[] {
  const masterRng = createRng(seed);
  
  let sharedEvents: Map<number, Event> | undefined;
  if (sameDeck) {
    sharedEvents = new Map();
    for (const stageNum of config.eventStages) {
      const stageRng = createRng(`${seed}|stage${stageNum}`);
      sharedEvents.set(stageNum, drawEvent(stageRng));
    }
  }
  
  const results: SimulationResult[] = [];
  
  for (let i = 0; i < numAgents; i++) {
    const agentSeedRng = createRng(`${seed}|agent${i}|init`);
    const traits = generateRandomTraits(agentSeedRng);
    const name = generateRandomName(agentSeedRng);
    
    const agent: Agent = { name, traits, index: i };
    const result = simulateLife(agent, worldMode, seed, sameDeck, sharedEvents);
    results.push(result);
  }
  
  return results;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatEV(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(3)}`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}%`;
}
