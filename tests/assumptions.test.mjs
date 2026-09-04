/**
 * Unit tests for src/data/assumptions.ts (calculator model).
 * Run: npm run test:entities (esbuild bundle + node --test, no deps)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bucketForCategory,
  volumeMultiplier,
  GAP_SHARE,
  CTR_CURVE,
  runFunnel,
  estimateRange,
} from '../src/data/assumptions.ts';

describe('bucketForCategory', () => {
  it('routes categories to the right bucket, defaults otherwise', () => {
    assert.equal(bucketForCategory('emergency AC repair').id, 'high-ticket-trades');
    assert.equal(bucketForCategory('Bakery & Coffee').id, 'retail-food');
    assert.equal(bucketForCategory('plumber').id, 'standard-trades');
    assert.equal(bucketForCategory('divorce attorney').id, 'professional-services');
    assert.equal(bucketForCategory('dog walking').id, 'default-local-service');
  });
});

describe('volumeMultiplier', () => {
  it('tiers metros, defaults to 1.0', () => {
    assert.equal(volumeMultiplier('Austin, TX'), 1.25);
    assert.equal(volumeMultiplier('New York, NY'), 1.6);
    assert.equal(volumeMultiplier('Springfield, OH'), 1.0);
  });
});

describe('runFunnel', () => {
  it('straight-through math with no hidden floors', () => {
    // 2500 × 0.04 = 100 clicks → ×0.35 = 35 calls → ×0.4 = 14 jobs → ×1500
    assert.deepEqual(runFunnel({
      searchVolume: 2500, gapShare: 0.04, callRate: 0.35, closeRate: 0.4, dealValue: 1500,
    }), { clicks: 100, calls: 35, jobs: 14, monthly: 21000 });
    // Tiny inputs honestly approach zero
    const tiny = runFunnel({ searchVolume: 300, gapShare: 0.01, callRate: 0.15, closeRate: 0.15, dealValue: 45 });
    assert.ok(tiny.monthly < 100);
  });
});

describe('estimateRange', () => {
  it('orders pessimistic <= base <= optimistic', () => {
    const r = estimateRange({
      searchVolume: 2500,
      gap: GAP_SHARE.mid,
      call: { lo: 0.3, mid: 0.4, hi: 0.5, source: 't' },
      close: { lo: 0.35, mid: 0.45, hi: 0.6, source: 't' },
      dealValue: 750,
    });
    assert.ok(r.pessimistic.monthly <= r.base.monthly);
    assert.ok(r.base.monthly <= r.optimistic.monthly);
    assert.ok(r.base.monthly > 0);
  });
});

describe('CTR_CURVE', () => {
  it('top-3 dominate and curve descends', () => {
    const top3 = CTR_CURVE[0].ctr + CTR_CURVE[1].ctr + CTR_CURVE[2].ctr;
    assert.ok(top3 > 0.5, `top3=${top3}`);
    for (let i = 1; i < CTR_CURVE.length; i++) {
      assert.ok(CTR_CURVE[i].ctr <= CTR_CURVE[i - 1].ctr);
    }
  });
});
