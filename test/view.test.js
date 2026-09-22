import test from 'node:test';
import assert from 'node:assert/strict';
import { BALL, ballScale, displaySecond, formatClock } from '../src/core/view.js';

const state = (phase, phaseElapsed, phaseDuration, extra = {}) => ({
  phase,
  phaseElapsed,
  phaseDuration,
  phaseProgress01: phaseElapsed / phaseDuration,
  done: false,
  ...extra
});

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);

test('шарик растёт на вдохе и уменьшается на выдохе', () => {
  near(ballScale(state('inhale', 0, 4000)), BALL.min);
  near(ballScale(state('inhale', 4000, 4000)), BALL.max);
  assert.ok(ballScale(state('inhale', 2000, 4000)) > (BALL.min + BALL.max) / 2); // замедление к концу
  near(ballScale(state('exhale', 0, 8000)), BALL.max);
  near(ballScale(state('exhale', 8000, 8000)), BALL.min);
});

test('пульсация на задержках — ±амплитуда, период ровно секунда', () => {
  near(ballScale(state('holdIn', 3000, 7000)), BALL.max);
  near(ballScale(state('holdIn', 3250, 7000)), BALL.max * (1 + BALL.pulseAmp));
  near(ballScale(state('holdOut', 1750, 4000)), BALL.min * (1 - BALL.pulseAmp));
});

test('после завершения шарик минимальный', () => {
  near(ballScale(state('inhale', 1000, 4000, { done: true })), BALL.min);
});

test('цифра на шарике — номер секунды фазы', () => {
  assert.equal(displaySecond(state('holdIn', 0, 7000)), 1);
  assert.equal(displaySecond(state('holdIn', 6999, 7000)), 7);
  assert.equal(displaySecond(state('holdIn', 7000, 7000)), 7);
});

test('formatClock', () => {
  assert.equal(formatClock(300_000), '5:00');
  assert.equal(formatClock(59_001), '1:00');
  assert.equal(formatClock(9_000), '0:09');
  assert.equal(formatClock(0), '0:00');
});
