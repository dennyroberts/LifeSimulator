import assert from 'node:assert/strict';
import test from 'node:test';
import eventsData from '../data/events.json';
import {
  createManifestationAssignments,
  resolveEvent,
  runMassSimulation,
  type Event,
  type Traits,
} from './sim';

const averageTraits: Traits = { INT: 10, WORK: 10, NEPO: 10, CHAR: 10, RISK: 10 };
const events = eventsData as Event[];

test('manifestation assignments are balanced and deterministic', () => {
  const first = createManifestationAssignments(100, 'balanced-seed');
  const second = createManifestationAssignments(100, 'balanced-seed');
  assert.deepEqual(first, second);
  assert.equal(first.filter(Boolean).length, 50);
  assert.ok(first.some(goal => goal === 'money'));
  assert.ok(first.some(goal => goal === 'career'));
  assert.ok(first.some(goal => goal === 'love'));
});

test('eligible matching goals receive the bonus without changing the raw roll', () => {
  const promotion = events.find(event => event.id === 'you_get_the_nod');
  assert.ok(promotion);

  const baseline = resolveEvent(promotion, 3, averageTraits, 'normal', () => 0.5, 50_000, 0.02, 10);
  const manifested = resolveEvent(promotion, 3, averageTraits, 'normal', () => 0.5, 50_000, 0.02, 10, 'career', 2);

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

  const wrongGoal = resolveEvent(promotion, 3, averageTraits, 'normal', () => 0.5, 50_000, 0.02, 10, 'love', 4);
  const randomEvent = resolveEvent(randomMoney, 3, averageTraits, 'normal', () => 0.5, 50_000, 0.02, 10, 'money', 4);

  assert.equal(wrongGoal.outcome.manifestationApplied, false);
  assert.equal(wrongGoal.outcome.manifestationBonus, 0);
  assert.equal(randomEvent.outcome.manifestationApplied, false);
  assert.equal(randomEvent.outcome.manifestationBonus, 0);
});

test('natural 1 and natural 20 remain critical regardless of manifestation bonus', () => {
  const promotion = events.find(event => event.id === 'you_get_the_nod');
  assert.ok(promotion);

  const criticalFail = resolveEvent(promotion, 3, averageTraits, 'normal', () => 0.5, 50_000, 0.02, 1, 'career', 20);
  const criticalSuccess = resolveEvent(promotion, 3, averageTraits, 'normal', () => 0.5, 50_000, 0.02, 20, 'career', 0);

  assert.equal(criticalFail.outcome.success, false);
  assert.equal(criticalFail.outcome.criticalType, 'failure');
  assert.equal(criticalSuccess.outcome.success, true);
  assert.equal(criticalSuccess.outcome.criticalType, 'success');
});

test('matching manifestation bonuses apply to risk gates as well as main checks', () => {
  const startup = events.find(event => event.id === 'the_exit_everyone_dreams_about');
  assert.ok(startup);

  const baseline = resolveEvent(startup, 3, averageTraits, 'normal', () => 0.5, 50_000, 0.02, 13);
  const manifested = resolveEvent(startup, 3, averageTraits, 'normal', () => 0.5, 50_000, 0.02, 13, 'money', 3);

  assert.equal(baseline.outcome.gateFailed, true);
  assert.equal(manifested.outcome.gateFailed, false);
  assert.equal(manifested.outcome.gateMod, (baseline.outcome.gateMod ?? 0) + 3);
  assert.equal(manifested.outcome.mainRoll, 13);
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
    combined.map(result => [result.agentIndex, result.manifestationGoal, result.lifetimeEarnings]),
    rerun.map(result => [result.agentIndex, result.manifestationGoal, result.lifetimeEarnings]),
  );
  assert.ok(combined.filter(result => !result.manifestationEnabled).every(result => result.manifestationGoal === null));
});