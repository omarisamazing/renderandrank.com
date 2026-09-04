/**
 * Shared, sourced assumptions for the ROI opportunity estimate.
 *
 * Single source of truth for BOTH the browser calculator
 * (`src/components/roi/RoiCalculator.tsx`) and the server calibration
 * (`functions/api/check.ts estimateIndustryMetrics`, which delegates here).
 * Pure TypeScript, no runtime dependencies — safe to bundle anywhere.
 *
 * Honesty contract: every number below is either measured (with a source) or
 * explicitly labelled an adjustable assumption. Nothing here is a forecast;
 * the UI presents ranges and shows its work.
 */

export interface RateRange {
  /** Pessimistic bound. */
  lo: number;
  /** Base case shown as the headline figure. */
  mid: number;
  /** Optimistic bound. */
  hi: number;
  /** Where the range came from (benchmark name, below). */
  source: string;
}

export interface CategoryBucket {
  id: string;
  /** Short human label, e.g. "High-ticket trades". */
  label: string;
  /** Substring keywords (lowercase) matched against the service category. */
  keywords: string[];
  /** Illustrative ticket + demand calibration for this trade. */
  dealValue: number;
  minDeal: number;
  maxDeal: number;
  searchVolume: number;
  /** Click-to-call rate range. Benchmark: CallRail 2024 lead-conversion benchmarks. */
  call: RateRange;
  /** Call-to-job close-rate range. Benchmark: Jobber/HomeAdvisor contractor surveys. */
  close: RateRange;
}

export const CATEGORY_BUCKETS: CategoryBucket[] = [
  {
    id: 'retail-food',
    label: 'Retail, food & hospitality',
    keywords: [
      'candy', 'sweet', 'chocolat', 'baker', 'cafe', 'coffee', 'ice cream',
      'retail', 'shop', 'boutique', 'store', 'restaurant', 'food',
    ],
    dealValue: 45,
    minDeal: 10,
    maxDeal: 500,
    searchVolume: 3800,
    call: { lo: 0.15, mid: 0.25, hi: 0.35, source: 'CallRail 2024 benchmarks (adapted)' },
    close: { lo: 0.25, mid: 0.35, hi: 0.5, source: 'Hospitality/retail close-rate surveys (adapted)' },
  },
  {
    id: 'high-ticket-trades',
    label: 'High-ticket trades (HVAC, roofing, solar, remodeling)',
    keywords: [
      'hvac', 'heat', 'air condition', 'ac repair', 'roof', 'solar',
      'remodel', 'contractor', 'construct',
    ],
    dealValue: 2400,
    minDeal: 300,
    maxDeal: 15000,
    searchVolume: 2600,
    call: { lo: 0.25, mid: 0.35, hi: 0.45, source: 'CallRail 2024 benchmarks (adapted)' },
    close: { lo: 0.2, mid: 0.3, hi: 0.4, source: 'Contractor quote-to-job surveys (adapted)' },
  },
  {
    id: 'standard-trades',
    label: 'Standard trades (plumbing, electrical, auto)',
    keywords: [
      'plumb', 'electric', 'locksmith', 'pest', 'drain', 'handyman',
      'clean', 'auto', 'mechanic', 'towing',
    ],
    dealValue: 750,
    minDeal: 150,
    maxDeal: 6000,
    searchVolume: 3200,
    call: { lo: 0.3, mid: 0.4, hi: 0.5, source: 'CallRail 2024 benchmarks (adapted)' },
    close: { lo: 0.35, mid: 0.45, hi: 0.6, source: 'Emergency-trade close-rate surveys (adapted)' },
  },
  {
    id: 'professional-services',
    label: 'Professional services (legal, dental, medical, real estate)',
    keywords: [
      'law', 'attorney', 'legal', 'dent', 'doctor', 'med', 'account',
      'cpa', 'chiropract', 'realt', 'estate',
    ],
    dealValue: 3500,
    minDeal: 500,
    maxDeal: 25000,
    searchVolume: 2100,
    call: { lo: 0.15, mid: 0.25, hi: 0.35, source: 'CallRail 2024 benchmarks (adapted)' },
    close: { lo: 0.15, mid: 0.25, hi: 0.35, source: 'Professional-services intake surveys (adapted)' },
  },
  {
    id: 'default-local-service',
    label: 'General local service',
    keywords: [],
    dealValue: 1200,
    minDeal: 200,
    maxDeal: 15000,
    searchVolume: 2500,
    call: { lo: 0.25, mid: 0.35, hi: 0.45, source: 'CallRail 2024 benchmarks (adapted)' },
    close: { lo: 0.3, mid: 0.4, hi: 0.5, source: 'Blended trade benchmarks (adapted)' },
  },
];

/** First bucket whose keyword appears in the category; default bucket otherwise. */
export function bucketForCategory(category: string): CategoryBucket {
  const cat = (category || '').toLowerCase();
  for (const bucket of CATEGORY_BUCKETS) {
    if (bucket.keywords.some((k) => cat.includes(k))) return bucket;
  }
  return CATEGORY_BUCKETS[CATEGORY_BUCKETS.length - 1];
}

/**
 * Demand multiplier by metro tier. Illustrative — population-tier heuristic,
 * not measured search volume. Kept coarse on purpose; the UI labels volume
 * as an editable estimate, not Keyword Planner data.
 */
const METRO_TIERS: Array<{ mult: number; markers: string[] }> = [
  {
    mult: 1.6,
    markers: [
      'new york', 'nyc', 'los angeles', 'chicago', 'houston', 'dallas', 'miami',
      'san francisco', 'phoenix', 'philadelphia', 'atlanta', 'seattle', 'boston',
      'detroit', 'denver', 'las vegas',
    ],
  },
  { mult: 1.25, markers: ['austin', 'nashville', 'charlotte', 'columbus', 'san diego', 'portland', 'orlando', 'tampa'] },
];

export function volumeMultiplier(city: string): number {
  const c = (city || '').toLowerCase();
  for (const tier of METRO_TIERS) {
    if (tier.markers.some((m) => c.includes(m))) return tier.mult;
  }
  return 1.0;
}

/**
 * Illustrative local-pack CTR curve by position, adapted from published CTR
 * studies (FirstPageSage 2024 Google CTR, Backlinko CTR study, Whitespark
 * local search behaviour). It justifies the ORDER (top-3 dominate) behind the
 * method copy; the capturable gap below stays an explicit assumption.
 */
export const CTR_CURVE: Array<{ pos: string; ctr: number }> = [
  { pos: '1', ctr: 0.28 },
  { pos: '2', ctr: 0.16 },
  { pos: '3', ctr: 0.1 },
  { pos: '4', ctr: 0.06 },
  { pos: '5', ctr: 0.045 },
  { pos: '6', ctr: 0.035 },
  { pos: '7', ctr: 0.03 },
  { pos: '8', ctr: 0.025 },
  { pos: '9', ctr: 0.02 },
  { pos: '10+', ctr: 0.015 },
];

export const CTR_SOURCES =
  'Illustrative curve adapted from FirstPageSage 2024 CTR, Backlinko CTR study, Whitespark local behaviour.';

/**
 * Capturable demand gap by visibility tier: the share of monthly searches
 * that could become the visitor's jobs if the visibility gap closed.
 * Explicit assumption (mid) with an adjustable range — NOT measured CTR.
 */
export type RankTier = 'invisible' | 'mid' | 'top3';

export const GAP_SHARE: Record<RankTier, { lo: number; mid: number; hi: number; note: string }> = {
  invisible: {
    lo: 0.05,
    mid: 0.08,
    hi: 0.12,
    note: 'Assumed capturable share outside the top 10 — adjust to your market.',
  },
  mid: {
    lo: 0.025,
    mid: 0.04,
    hi: 0.06,
    note: 'Assumed capturable share at positions 4–10 — adjust to your market.',
  },
  top3: {
    lo: 0.01,
    mid: 0.015,
    hi: 0.025,
    note: 'Overflow + AI-split share even at the top — adjust to your market.',
  },
};

export interface FunnelInputs {
  searchVolume: number;
  gapShare: number;
  callRate: number;
  closeRate: number;
  dealValue: number;
}

export interface FunnelResult {
  clicks: number;
  calls: number;
  jobs: number;
  monthly: number;
}

/** Straight-through funnel math, no hidden floors — callers decide display. */
export function runFunnel(inputs: FunnelInputs): FunnelResult {
  const clicks = Math.round(inputs.searchVolume * inputs.gapShare);
  const calls = Math.round(clicks * inputs.callRate);
  const jobs = Math.round(calls * inputs.closeRate);
  return { clicks, calls, jobs, monthly: jobs * inputs.dealValue };
}

export interface RangedEstimate {
  pessimistic: FunnelResult;
  base: FunnelResult;
  optimistic: FunnelResult;
}

/** Pessimistic/base/optimistic estimates from the lo/mid/hi of each range. */
export function estimateRange(args: {
  searchVolume: number;
  gap: { lo: number; mid: number; hi: number };
  call: RateRange;
  close: RateRange;
  dealValue: number;
}): RangedEstimate {
  return {
    pessimistic: runFunnel({
      searchVolume: args.searchVolume,
      gapShare: args.gap.lo,
      callRate: args.call.lo,
      closeRate: args.close.lo,
      dealValue: args.dealValue,
    }),
    base: runFunnel({
      searchVolume: args.searchVolume,
      gapShare: args.gap.mid,
      callRate: args.call.mid,
      closeRate: args.close.mid,
      dealValue: args.dealValue,
    }),
    optimistic: runFunnel({
      searchVolume: args.searchVolume,
      gapShare: args.gap.hi,
      callRate: args.call.hi,
      closeRate: args.close.hi,
      dealValue: args.dealValue,
    }),
  };
}
