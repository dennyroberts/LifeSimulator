import assert from 'node:assert/strict';
import test from 'node:test';
import eventsData from '../data/events.json';
import {
  createManifestationAssignments,
  resolveEvent,
  runMassSimulation,
  resolveEducation,
  resolveCareer,
  drawEventFromRoll,
  intrinsicExpectedEV,
  getEventDrawWeight,
  getRarityWeight,
  type Event,
  type Traits,
} from './sim';
import { assistedChecks, independentAllTensCohorts, narrowIncomeBands, pairedIdenticalLives, startingPointStrata, averageIncomeByStage, manifestationChangedOutcome } from './manifestationAnalysis';

const averageTraits: Traits = { INT: 10, WORK: 10, NEPO: 10, CHAR: 10, RISK: 10 };
const events = eventsData as Event[];

test('manifestation assignments are balanced and deterministic', () => {
  const first = createManifestationAssignments(100, 'balanced-seed');
  const second = createManifestationAssignments(100, 'balanced-seed');
  assert.deepEqual(first, second);
  assert.equal(first.filter(Boolean).length, 50);
  assert.ok(first.every(value => typeof value === 'boolean'));
});

test('event eligibility includes success and wealth checks but excludes love-only checks', () => {
  const eligible = events
    .filter(event => event.manifestationEligible)
    .map(event => event.id).sort();
  const neverEligible = events
    .filter(event => !event.manifestationEligible)
    .map(event => event.id)
    .sort();

  assert.ok(eligible.includes('you_get_the_nod'));
  assert.ok(eligible.includes('the_exit_everyone_dreams_about'));
  assert.ok(!eligible.includes('you_find_your_person'));
  assert.ok(neverEligible.includes('money_appears_from_nowhere'));
});

test('eligible matching goals receive the bonus without changing the raw roll', () => {
  const promotion = events.find(event => event.id === 'you_get_the_nod');
  assert.ok(promotion);

  const baseline = resolveEvent(promotion, 3, averageTraits, 'normal', () => 0.5, 50_000, 0.02, 10);
  const manifested = resolveEvent(promotion, 3, averageTraits, 'normal', () => 0.5, 50_000, 0.02, 10, true, 2);

  assert.equal(baseline.outcome.mainRoll, manifested.outcome.mainRoll);
  assert.equal(manifested.outcome.mainMod, (baseline.outcome.mainMod ?? 0) + 2);
  assert.equal(manifested.outcome.manifestationApplied, true);
  assert.equal(manifested.outcome.manifestationBonus, 2);
});

test('non-matching and truly random events do not receive manifestation bonuses', () => {
  const promotion = events.find(event => event.id === 'you_get_the_nod');
  const randomMoney = events.find(event => event.id === 'money_appears_from_nowhere');
  assert.ok(promotion);
  assert.ok(randomMoney);

  const wrongGoal = resolveEvent(promotion, 3, averageTraits, 'normal', () => 0.5, 50_000, 0.02, 10, false, 4);
  const randomEvent = resolveEvent(randomMoney, 3, averageTraits, 'normal', () => 0.5, 50_000, 0.02, 10, true, 4);

  assert.equal(wrongGoal.outcome.manifestationApplied, false);
  assert.equal(wrongGoal.outcome.manifestationBonus, 0);
  assert.equal(randomEvent.outcome.manifestationApplied, false);
  assert.equal(randomEvent.outcome.manifestationBonus, 0);
});

test('natural 1 and natural 20 remain critical regardless of manifestation bonus', () => {
  const promotion = events.find(event => event.id === 'you_get_the_nod');
  assert.ok(promotion);

  const criticalFail = resolveEvent(promotion, 3, averageTraits, 'normal', () => 0.5, 50_000, 0.02, 1, true, 20);
  const criticalSuccess = resolveEvent(promotion, 3, averageTraits, 'normal', () => 0.5, 50_000, 0.02, 20, true, 0);

  assert.equal(criticalFail.outcome.success, false);
  assert.equal(criticalFail.outcome.criticalType, 'failure');
  assert.equal(criticalSuccess.outcome.success, true);
  assert.equal(criticalSuccess.outcome.criticalType, 'success');
});

test('matching manifestation bonuses apply only to event checks, never risk gates', () => {
  const startup = events.find(event => event.id === 'the_exit_everyone_dreams_about');
  assert.ok(startup);

  const baseline = resolveEvent(startup, 3, averageTraits, 'normal', () => 0.5, 50_000, 0.02, 16);
  const manifested = resolveEvent(startup, 3, averageTraits, 'normal', () => 0.5, 50_000, 0.02, 16, true, 3);

  assert.equal(baseline.outcome.gateFailed, false);
  assert.equal(manifested.outcome.gateFailed, false);
  assert.equal(manifested.outcome.gateMod, baseline.outcome.gateMod);
  assert.equal(baseline.outcome.success, false);
  assert.equal(manifested.outcome.success, true);
  assert.equal(manifested.outcome.mainRoll, 16);
});

test('woo manifestation increases good-card frequency and decreases bad-card frequency', () => {
  const stage = 5;
  const counts = (strength: number) => {
    let good = 0, bad = 0;
    for (let index = 0; index < 10_000; index++) {
      const event = drawEventFromRoll((index + 0.5) / 10_000, strength, stage);
      const quality = intrinsicExpectedEV(event, stage);
      if (quality > 0) good++;
      if (quality < 0) bad++;
    }
    return { good, bad };
  };
  const ordinary = counts(0);
  const woo = counts(10);
  assert.ok(woo.good > ordinary.good);
  assert.ok(woo.bad < ordinary.bad);
});

test('woo draw weights use the exact bounded positive, negative, and neutral formula', () => {
  const stage = 5;
  const positive = events.find(event => intrinsicExpectedEV(event, stage) > 0)!;
  const negative = events.find(event => intrinsicExpectedEV(event, stage) < 0)!;
  const neutral: Event = {
    id: 'neutral-test', name: 'Neutral', rarity: 'common', rollRequired: false, DC: null,
    checkTraits: {}, riskGated: false, riskGateDC: null, riskGateWeight: 0,
    success: { jumpPct: 0, growthDelta: 0 }, fail: { jumpPct: 0, growthDelta: 0 },
  };
  assert.equal(getEventDrawWeight(positive, stage, 10), getRarityWeight(positive.rarity) * 1.1);
  assert.equal(getEventDrawWeight(negative, stage, 10), getRarityWeight(negative.rarity) * 0.9);
  assert.equal(getEventDrawWeight(neutral, stage, 10), getRarityWeight(neutral.rarity));
  assert.equal(getEventDrawWeight(positive, stage, -20), getRarityWeight(positive.rarity));
  assert.equal(getEventDrawWeight(negative, stage, 200), 0);
});

test('woo mode changes deterministic card draws without adding roll bonuses', () => {
  const options = {
    manifestationEnabled: true,
    manifestationMode: 'woo' as const,
    manifestationBonus: 20,
    wooStrength: 50,
    totalRunSize: 20,
    baseManifestationSeed: 'woo-deck',
  };
  const lives = runMassSimulation(20, 'normal', 'woo-deck', true, true, undefined, options);
  const manifesters = lives.filter(life => life.manifestationEnabled);
  const controls = lives.filter(life => !life.manifestationEnabled);
  assert.ok(manifesters.every(life => life.manifestationBonus === 0 && life.wooStrength === 50));
  assert.ok(manifesters.every(life => !life.stages[1].career?.manifestationApplied));
  const eventIds = (life: typeof lives[number]) => life.stages.slice(2).map(stage => stage.eventOutcome?.event.id);
  manifesters.slice(1).forEach(life => assert.deepEqual(eventIds(life), eventIds(manifesters[0])));
  controls.slice(1).forEach(life => assert.deepEqual(eventIds(life), eventIds(controls[0])));
  assert.notDeepEqual(eventIds(manifesters[0]), eventIds(controls[0]));
  assert.deepEqual(
    lives.map(life => [life.agentIndex, life.manifestationEnabled, eventIds(life)]),
    runMassSimulation(20, 'normal', 'woo-deck', true, true, undefined, options).map(life => [life.agentIndex, life.manifestationEnabled, eventIds(life)]),
  );
});

test('batched mass runs preserve exact cohorts and deterministic outcomes', () => {
  const options = {
    manifestationEnabled: true,
    manifestationBonus: 2,
    totalRunSize: 20,
    baseManifestationSeed: 'mass-seed',
  };
  const first = runMassSimulation(10, 'normal', 'mass-seed', false, true, undefined, {
    ...options,
    globalOffset: 0,
  });
  const second = runMassSimulation(10, 'normal', 'mass-seed', false, true, undefined, {
    ...options,
    globalOffset: 10,
  });
  const rerun = runMassSimulation(20, 'normal', 'mass-seed', false, true, undefined, {
    ...options,
    globalOffset: 0,
  });
  const combined = [...first, ...second];

  assert.equal(combined.filter(result => result.manifestationEnabled).length, 10);
  assert.deepEqual(
    combined.map(result => [result.agentIndex, result.manifestationEnabled, result.lifetimeEarnings]),
    rerun.map(result => [result.agentIndex, result.manifestationEnabled, result.lifetimeEarnings]),
  );
  assert.ok(combined.filter(result => !result.manifestationEnabled).every(result => result.manifestationBonus === 0));
});

test('education ignores manifestation while career retains counterfactual placement', () => {
  const education = resolveEducation(averageTraits, 'normal', () => 0.5, 12);
  const career = resolveCareer(averageTraits, 'normal', () => 0.5, education.label, null, 12, true, 2);
  assert.equal(education.total, education.roll + education.totalMod);
  assert.equal(career.total - career.counterfactualTotal, 2);
  assert.equal(career.manifestationApplied, true);
});

test('career counterfactual removes the direct manifestation bonus', () => {
  const career = resolveCareer(averageTraits, 'normal', () => 0.5, 'Elite institution', null, 12, true, 2);
  assert.equal(career.total, 17);
  assert.equal(career.counterfactualTotal, 15);
  assert.notEqual(career.career.name, career.counterfactualCareer.name);
  assert.equal(career.manifestationUpgraded, true);
});

test('narrow income bands and assisted counts are deterministic', () => {
  const lives = runMassSimulation(40, 'normal', 'bands', false, true, undefined, { manifestationEnabled: true, manifestationBonus: 2, totalRunSize: 40, baseManifestationSeed: 'bands' });
  const bands = narrowIncomeBands(lives);
  assert.deepEqual(bands.map(b => [b.lower, b.upper, b.manifesters.length, b.controls.length]), narrowIncomeBands(lives).map(b => [b.lower, b.upper, b.manifesters.length, b.controls.length]));
  assert.equal(bands.length, 4);
  bands.forEach(band => band.representatives.forEach(life => assert.ok(life.lifetimeEarnings >= band.lower && life.lifetimeEarnings <= band.upper)));
  const count = assistedChecks(lives.find(life => life.manifestationEnabled)!);
  assert.ok(count.applied >= count.flipped);
});

test('controlled paired lives share raw history and are deterministic', () => {
  const one = pairedIdenticalLives('paired', 'normal', 2, 12);
  const two = pairedIdenticalLives('paired', 'normal', 2, 12);
  assert.deepEqual(one.pairs.map(p => p.uplift), two.pairs.map(p => p.uplift));
  one.pairs.forEach(pair => {
    assert.equal(pair.manifested.stages[0].education?.roll, pair.control.stages[0].education?.roll);
    assert.equal(pair.manifested.stages[0].education?.label, pair.control.stages[0].education?.label);
    assert.equal(pair.manifested.stages[1].career?.roll, pair.control.stages[1].career?.roll);
    assert.deepEqual(pair.manifested.stages.slice(2).map(s => s.eventOutcome?.event.id), pair.control.stages.slice(2).map(s => s.eventOutcome?.event.id));
    assert.deepEqual(pair.manifested.stages.slice(2).map(s => [s.eventOutcome?.gateRoll, s.eventOutcome?.mainRoll]), pair.control.stages.slice(2).map(s => [s.eventOutcome?.gateRoll, s.eventOutcome?.mainRoll]));
    assert.deepEqual(pair.manifested.stages.slice(2).map(s => [s.eventOutcome?.gateMod, s.eventOutcome?.gateFailed]), pair.control.stages.slice(2).map(s => [s.eventOutcome?.gateMod, s.eventOutcome?.gateFailed]));
    assert.equal(pair.manifested.luck.rawRollDeviation, pair.control.luck.rawRollDeviation);
    assert.equal(pair.manifested.luck.eventRollLuck, pair.control.luck.eventRollLuck);
  });
});

test('empty income-matched controls report unavailable offsets rather than zero', () => {
  const manifested = runMassSimulation(10, 'normal', 'empty-band', false, true, undefined, { manifestationEnabled: true, manifestationBonus: 2, totalRunSize: 10, baseManifestationSeed: 'empty-band' })
    .filter(life => life.manifestationEnabled);
  narrowIncomeBands(manifested).forEach(band => {
    assert.equal(band.totalTraitOffset, null);
    assert.ok(Object.values(band.traitOffsets).every(offset => offset === null));
  });
});

test('independent all-10 cohorts and adequate starting strata are constructed', () => {
  const experiment = independentAllTensCohorts('all-ten', 'normal', 2, 10);
  assert.equal(experiment.manifesters.length, 10);
  assert.ok(experiment.manifesters.every(life => Object.values(life.traits).every(value => value === 10)));
  assert.notDeepEqual(experiment.manifesters.map(life => life.lifetimeEarnings), experiment.controls.map(life => life.lifetimeEarnings));
  const lives = runMassSimulation(100, 'normal', 'strata', false, true, undefined, { manifestationEnabled: true, manifestationBonus: 2, totalRunSize: 100, baseManifestationSeed: 'strata' });
  startingPointStrata(lives, 1).forEach(stratum => assert.ok(stratum.manifesters.length && stratum.controls.length));
});

test('manifestation marker requires a changed outcome, not merely an applied bonus', () => {
  const appliedOnly = { career: { manifestationApplied: true, manifestationUpgraded: false } } as any;
  const changed = { career: { manifestationApplied: true, manifestationUpgraded: true } } as any;
  const checkChanged = { eventOutcome: { mainSucceededOnlyBecauseOfManifestation: true } } as any;
  assert.equal(manifestationChangedOutcome(appliedOnly), false);
  assert.equal(manifestationChangedOutcome(changed), true);
  assert.equal(manifestationChangedOutcome(checkChanged), true);
});

test('average income by stage is deterministic and preserves cohort gaps', () => {
  const lives = runMassSimulation(20, 'normal', 'trajectory', false, true, undefined, { manifestationEnabled: true, manifestationBonus: 2, totalRunSize: 20, baseManifestationSeed: 'trajectory' });
  const manifesters = lives.filter(life => life.manifestationEnabled);
  const controls = lives.filter(life => !life.manifestationEnabled);
  const first = averageIncomeByStage(manifesters, controls);
  const second = averageIncomeByStage(manifesters, controls);
  assert.deepEqual(first, second);
  assert.equal(first.length, lives[0].stages.length);
  assert.equal(first[0].manifesters, manifesters.reduce((sum, life) => sum + life.stages[0].incomeAfter, 0) / manifesters.length);
});