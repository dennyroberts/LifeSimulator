import { createRng } from './rng';
import { generateRandomAspiration, generateRandomName, generateRandomTraits, simulateLife, type SimulationResult, type TraitName, type WorldMode } from './sim';

export const INCOME_PERCENTILES = [25, 50, 75, 95] as const;
const traits: TraitName[] = ['INT', 'WORK', 'NEPO', 'CHAR', 'RISK'];

export interface IncomeBandAnalysis {
  percentile: number;
  lower: number;
  upper: number;
  manifesters: SimulationResult[];
  controls: SimulationResult[];
  traitOffsets: Record<TraitName, number | null>;
  totalTraitOffset: number | null;
  lowN: boolean;
  averageEligibleEvents: number;
  averageEligibleChecks: number;
  averageFlips: number;
  totalFlips: number;
  representatives: SimulationResult[];
}

/** True only when manifestation changed the realized education, career, or event-check outcome. */
export function manifestationChangedOutcome(stage: SimulationResult['stages'][number]): boolean {
  if (stage.education?.manifestationUpgraded || stage.career?.manifestationUpgraded) return true;
  const outcome = stage.eventOutcome;
  return Boolean(outcome?.mainSucceededOnlyBecauseOfManifestation);
}

export interface StageIncomeSeries {
  stage: number;
  manifesters: number | null;
  controls: number | null;
}

/** Deterministic cohort averages, retaining null for stages absent from a cohort. */
export function averageIncomeByStage(manifesters: SimulationResult[], controls: SimulationResult[]): StageIncomeSeries[] {
  let maxStages = 0;
  for (const result of manifesters) maxStages = Math.max(maxStages, result.stages.length);
  for (const result of controls) maxStages = Math.max(maxStages, result.stages.length);
  const accumulate = (items: SimulationResult[]) => {
    const sums = Array(maxStages).fill(0) as number[];
    const counts = Array(maxStages).fill(0) as number[];
    for (const result of items) {
      for (let index = 0; index < result.stages.length; index++) {
        sums[index] += result.stages[index].incomeAfter;
        counts[index]++;
      }
    }
    return sums.map((sum, index) => counts[index] ? sum / counts[index] : null);
  };
  const manifesterAverages = accumulate(manifesters);
  const controlAverages = accumulate(controls);
  return Array.from({ length: maxStages }, (_, index) => ({
    stage: index + 1,
    manifesters: manifesterAverages[index],
    controls: controlAverages[index],
  }));
}

function quantile(sorted: number[], percentile: number) {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * percentile)))];
}
function average(items: SimulationResult[], value: (item: SimulationResult) => number) {
  return items.length ? items.reduce((sum, item) => sum + value(item), 0) / items.length : 0;
}
export function assistedChecks(result: SimulationResult) {
  let applied = 0, flipped = 0;
  for (const stage of result.stages) {
    if (stage.education?.manifestationApplied) applied++;
    if (stage.education?.manifestationUpgraded) flipped++;
    if (stage.career?.manifestationApplied) applied++;
    if (stage.career?.manifestationUpgraded) flipped++;
    const event = stage.eventOutcome;
    if (!event) continue;
    if (event.mainManifestationApplied) applied++;
    if (event.mainSucceededOnlyBecauseOfManifestation) flipped++;
  }
  return { applied, flipped };
}

/** Uses exact dollar bounds from the manifester distribution's ±1 percentile points. */
export function narrowIncomeBands(results: SimulationResult[]): IncomeBandAnalysis[] {
  const manifesters = results.filter(result => result.manifestationEnabled);
  const controls = results.filter(result => !result.manifestationEnabled);
  const earnings = manifesters.map(result => result.lifetimeEarnings).sort((a, b) => a - b);
  return INCOME_PERCENTILES.map(percentile => {
    const lower = quantile(earnings, Math.max(0, (percentile - 1) / 100));
    const upper = quantile(earnings, Math.min(1, (percentile + 1) / 100));
    const group = manifesters.filter(r => r.lifetimeEarnings >= lower && r.lifetimeEarnings <= upper);
    const control = controls.filter(r => r.lifetimeEarnings >= lower && r.lifetimeEarnings <= upper);
    const available = group.length > 0 && control.length > 0;
    const traitOffsets = Object.fromEntries(traits.map(trait => [trait,
      available ? average(control, r => r.traits[trait]) - average(group, r => r.traits[trait]) : null,
    ])) as Record<TraitName, number | null>;
    const target = quantile(earnings, percentile / 100);
    return {
      percentile, lower, upper, manifesters: group, controls: control, traitOffsets,
      totalTraitOffset: available ? traits.reduce((sum, trait) => sum + (traitOffsets[trait] ?? 0), 0) : null,
      lowN: group.length < 5 || control.length < 5,
      averageEligibleEvents: average(group, r => r.stages.filter(stage => stage.eventOutcome?.event.manifestationEligible).length),
      averageEligibleChecks: average(group, r => assistedChecks(r).applied),
      averageFlips: average(group, r => assistedChecks(r).flipped),
      totalFlips: group.reduce((sum, r) => sum + assistedChecks(r).flipped, 0),
      representatives: [...group].sort((a, b) =>
        Math.abs(a.lifetimeEarnings - target) - Math.abs(b.lifetimeEarnings - target) || a.agentIndex - b.agentIndex,
      ).slice(0, 3),
    };
  });
}

export function startingPointStrata(results: SimulationResult[], minimumPerCohort = 5) {
  const buckets = new Map<string, SimulationResult[]>();
  for (const result of results) {
    const education = result.stages.find(stage => stage.education)?.education?.label ?? 'Unknown';
    const career = result.stages.find(stage => stage.career)?.career?.career.name ?? 'Unknown';
    const key = `${education} | ${career}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(result);
    else buckets.set(key, [result]);
  }
  return Array.from(buckets.entries()).map(([key, group]: [string, SimulationResult[]]) => {
    const manifesters = group.filter(r => r.manifestationEnabled), controls = group.filter(r => !r.manifestationEnabled);
    return { key, manifesters, controls,
      meanLifetime: average(manifesters, r => r.lifetimeEarnings),
      controlMeanLifetime: average(controls, r => r.lifetimeEarnings),
    };
  }).filter(row => row.manifesters.length >= minimumPerCohort && row.controls.length >= minimumPerCohort);
}

export interface PairedExperiment {
  pairs: Array<{ manifested: SimulationResult; control: SimulationResult; uplift: number }>;
  helped: number; tied: number; harmed: number; meanUplift: number;
  educationUpgrades: number; careerUpgrades: number; checksAffected: number; checksFlipped: number;
  sameStartingStratum: { count: number; helped: number; tied: number; harmed: number; meanUplift: number };
}

/** Capped matched lives: same identity/index/seed makes every raw draw identical. */
export function pairedIdenticalLives(seed: string, worldMode: WorldMode, bonus: number, size = 200): PairedExperiment {
  const count = Math.max(1, Math.min(500, Math.floor(size)));
  const pairs: PairedExperiment['pairs'] = [];
  for (let index = 0; index < count; index++) {
    const init = createRng(`${seed}|paired|${index}|init`);
    const agent = { name: generateRandomName(init), traits: generateRandomTraits(init), aspiration: generateRandomAspiration(init), index };
    const control = simulateLife(agent, worldMode, `${seed}|paired`, false, undefined, undefined, { manifestationEnabled: false, manifestationBonus: bonus });
    const manifested = simulateLife(agent, worldMode, `${seed}|paired`, false, undefined, undefined, { manifestationEnabled: true, manifestationBonus: bonus });
    pairs.push({ manifested, control, uplift: manifested.lifetimeEarnings - control.lifetimeEarnings });
  }
  let helped = 0, tied = 0, harmed = 0, educationUpgrades = 0, careerUpgrades = 0, checksAffected = 0, checksFlipped = 0;
  pairs.forEach(pair => {
    if (pair.uplift > 0) helped++; else if (pair.uplift < 0) harmed++; else tied++;
    const edu = pair.manifested.stages.find(s => s.education)?.education;
    const career = pair.manifested.stages.find(s => s.career)?.career;
    if (edu?.manifestationUpgraded) educationUpgrades++;
    if (career?.manifestationUpgraded) careerUpgrades++;
    const checks = assistedChecks(pair.manifested); checksAffected += checks.applied; checksFlipped += checks.flipped;
  });
  const same = pairs.filter(pair => {
    const starting = (result: SimulationResult) => `${result.stages[0].education?.label}|${result.stages[1].career?.career.name}`;
    return starting(pair.manifested) === starting(pair.control);
  });
  const split = (predicate: (pair: typeof pairs[number]) => boolean) => same.filter(predicate).length;
  return { pairs, helped, tied, harmed, educationUpgrades, careerUpgrades, checksAffected, checksFlipped, meanUplift: pairs.reduce((sum, p) => sum + p.uplift, 0) / count,
    sameStartingStratum: { count: same.length, helped: split(p => p.uplift > 0), tied: split(p => p.uplift === 0), harmed: split(p => p.uplift < 0), meanUplift: same.length ? same.reduce((sum, pair) => sum + pair.uplift, 0) / same.length : 0 } };
}

export interface AllTensExperiment { manifesters: SimulationResult[]; controls: SimulationResult[]; size: number; manifestedChecks: ReturnType<typeof assistedChecks>; }
/** Independent lives deliberately use distinct seeds; this is not a paired-roll study. */
export function independentAllTensCohorts(seed: string, worldMode: WorldMode, bonus: number, size = 200): AllTensExperiment {
  const count = Math.max(1, Math.min(500, Math.floor(size)));
  const traits = { INT: 10, WORK: 10, NEPO: 10, CHAR: 10, RISK: 10 };
  const build = (manifestationEnabled: boolean, cohort: string) => Array.from({ length: count }, (_, index) => {
    const rng = createRng(`${seed}|all10|${cohort}|${index}`);
    return simulateLife({ name: generateRandomName(rng), traits, aspiration: generateRandomAspiration(rng), index }, worldMode, `${seed}|all10|${cohort}`, false, undefined, undefined, { manifestationEnabled, manifestationBonus: bonus });
  });
  const manifesters = build(true, 'manifesters');
  const total = manifesters.reduce((sum, result) => {
    const checks = assistedChecks(result);
    return { applied: sum.applied + checks.applied, flipped: sum.flipped + checks.flipped };
  }, { applied: 0, flipped: 0 });
  return { manifesters, controls: build(false, 'controls'), size: count, manifestedChecks: total };
}