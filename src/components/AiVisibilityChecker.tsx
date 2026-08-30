import React, { useState, useEffect, useRef } from 'react';
import { getClientVisitorData, getVisitorId } from '../lib/visitorClient';
import { buttonVariants } from '../lib/button-variants';

interface EngineResult {
  engine: string;
  available: boolean;
  status: 'mentioned' | 'not_mentioned' | 'error' | 'not_configured';
  snippet: string | null;
  details?: string;
}

interface CheckResponse {
  ok: boolean;
  error?: string;
  rateLimited?: boolean;
  businessName?: string;
  category?: string;
  city?: string;
  visibilityScore?: number;
  rankPosition?: string;
  diagnosticSummary?: string;
  competitorsFound?: string[];
  recommendedDealValue?: number;
  recommendedMinDeal?: number;
  recommendedMaxDeal?: number;
  recommendedSearchVolume?: number;
  recommendedRank?: 'invisible' | 'mid' | 'top3';
  totalEngines?: number;
  mentionedCount?: number;
  results?: EngineResult[];
}

export interface AiVisibilityCheckerProps {
  /**
   * Where "See what this costs" goes. The home page renders the ROI calculator
   * on the same page, so it passes an in-page anchor; /check sends people to the
   * standalone calculator.
   */
  resultHref?: string;
}

/**
 * What the scan is actually doing, in the order it happens. Kept at module scope
 * so the progress effect can read the count without re-running when the market
 * name changes.
 */
const SCAN_STEPS = [
  {
    title: () => 'Querying the answer engines',
    desc: 'Running your category through live AI search',
  },
  {
    title: (market: string) => `Reading who they name in ${market}`,
    desc: 'Pulling the providers each engine recommends',
  },
  {
    title: () => 'Comparing against local competitors',
    desc: 'Checking which businesses hold the citations',
  },
  {
    title: () => 'Building your result',
    desc: 'Scoring visibility and the revenue gap',
  },
] as const;

const FIELD_CLASS =
  'h-12 w-full rounded-md border border-hairline bg-canvas px-3.5 text-[1.0625rem] text-ink placeholder:text-muted-foreground transition-[border-color] duration-200 focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink disabled:opacity-60';

export default function AiVisibilityChecker({
  resultHref = '/calculator',
}: AiVisibilityCheckerProps = {}) {
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CheckResponse | null>(null);

  const businessRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);

  const market = city.trim() || 'your market';
  const steps = SCAN_STEPS.map((step) => ({
    title: step.title(market),
    desc: step.desc,
  }));

  useEffect(() => {
    if (!loading) {
      setProgress(0);
      setScanStep(0);
      return;
    }

    const stepInterval = setInterval(() => {
      setScanStep((prev) => (prev < SCAN_STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);

    // Decelerating fill rather than random jumps: quick off the mark, then
    // asymptotic towards 95% so it never stalls on a round number and never
    // claims to have finished before the response lands.
    let tick = 0;
    const progressInterval = setInterval(() => {
      tick += 1;
      setProgress(Math.round(95 * (1 - Math.exp(-tick / 9))));
    }, 240);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!businessName.trim() || !category.trim() || !city.trim()) {
      setError('Add your business name, category and city so we know what to look for.');
      const firstEmpty = !businessName.trim()
        ? businessRef
        : !category.trim()
          ? categoryRef
          : cityRef;
      firstEmpty.current?.focus();
      return;
    }

    setError(null);
    setLoading(true);
    setData(null);

    try {
      const visitor = getClientVisitorData();
      const visitorId = getVisitorId();

      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          category: category.trim(),
          city: city.trim(),
          visitorId,
          ...visitor,
        }),
      });

      const json = (await res.json()) as CheckResponse;

      if (!res.ok || !json.ok) {
        setError(json.error || 'The scan could not finish. Try again, or book a call and we will run it for you.');
        setLoading(false);
        return;
      }

      setProgress(100);
      setTimeout(() => {
        setData(json);
        setLoading(false);
      }, 400);

      // Save handoff data to sessionStorage for the ROI Calculator
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          window.sessionStorage.setItem(
            'rr_handoff',
            JSON.stringify({
              businessName: json.businessName,
              category: json.category,
              city: json.city,
              visibilityScore: json.visibilityScore ?? 20,
              rankPosition: json.rankPosition ?? 'Displaced',
              diagnosticSummary: json.diagnosticSummary,
              competitorsFound: json.competitorsFound || [],
              recommendedDealValue: json.recommendedDealValue ?? 1200,
              recommendedMinDeal: json.recommendedMinDeal ?? 200,
              recommendedMaxDeal: json.recommendedMaxDeal ?? 15000,
              recommendedSearchVolume: json.recommendedSearchVolume ?? 2500,
              recommendedRank: json.recommendedRank ?? 'invisible',
              totalEngines: json.totalEngines ?? 0,
              mentionedCount: json.mentionedCount ?? 0,
              timestamp: Date.now(),
            })
          );
        } catch {
          // ignore storage error
        }
      }
    } catch (err) {
      console.error('AI check request failed:', err);
      setError('Could not reach the diagnostic server. Check your connection and try again.');
      setLoading(false);
    }
  }

  function handleCheckAnother() {
    setData(null);
    setError(null);
    setBusinessName('');
    setCategory('');
    setCity('');
    // The panel has just swapped back to the form, so the first field is the
    // only sensible place for focus to land.
    requestAnimationFrame(() => businessRef.current?.focus());
  }

  const cited = (data?.mentionedCount ?? 0) > 0;

  /**
   * One persistent status line for assistive tech. A live region that is
   * conditionally rendered does not reliably announce, because it does not exist
   * at the moment the content changes.
   */
  const status = loading
    ? steps[scanStep].title
    : data
      ? cited
        ? 'Check complete. Your business is cited in AI recommendations.'
        : 'Check complete. Your business is not cited in AI recommendations.'
      : (error ?? '');

  return (
    <div className="rounded-lg border border-black/8 bg-canvas p-6 md:p-8">
      <p className="sr-only" role="status">
        {status}
      </p>

      {/* Form */}
      {!data && !loading && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div>
            <label htmlFor="check-business-name" className="label block text-ink">
              Business name
              <span className="text-destructive" aria-hidden="true"> *</span>
            </label>
            <input
              id="check-business-name"
              ref={businessRef}
              name="businessName"
              type="text"
              required
              autoComplete="organization"
              spellCheck={false}
              placeholder="e.g. Apex Climate Heating"
              maxLength={120}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={`mt-2 ${FIELD_CLASS}`}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="check-category" className="label block text-ink">
                Service or category
                <span className="text-destructive" aria-hidden="true"> *</span>
              </label>
              <input
                id="check-category"
                ref={categoryRef}
                name="category"
                type="text"
                required
                autoComplete="off"
                placeholder="e.g. emergency AC repair"
                maxLength={120}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`mt-2 ${FIELD_CLASS}`}
              />
            </div>

            <div>
              <label htmlFor="check-city" className="label block text-ink">
                City and state
                <span className="text-destructive" aria-hidden="true"> *</span>
              </label>
              <input
                id="check-city"
                ref={cityRef}
                name="city"
                type="text"
                required
                autoComplete="address-level2"
                spellCheck={false}
                placeholder="e.g. Austin, TX"
                maxLength={120}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={`mt-2 ${FIELD_CLASS}`}
              />
            </div>
          </div>

          {error && (
            <p
              className="body-sm rounded-md border border-destructive bg-canvas p-3.5 text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}

          <div>
            <button
              type="submit"
              className={buttonVariants({
                variant: 'primary',
                size: 'lg',
                block: true,
              })}
            >
              Run the check
            </button>
            <p className="caption mt-3 text-center text-ink">
              Free live scan &middot; three checks per day &middot; no pitch attached.
            </p>
          </div>
        </form>
      )}

      {/* Scanning */}
      {loading && (
        <div className="flex flex-col gap-4 animate-fade-in" aria-busy="true">
          <div className="flex items-baseline justify-between gap-4">
            <span className="eyebrow text-ink">Checking the answer engines</span>
            <span className="label numeric text-ink">{progress}%</span>
          </div>

          {/* Scales rather than resizing, so the fill stays off the layout path. */}
          <div className="h-2 w-full overflow-hidden rounded-pill border border-hairline bg-surface-soft">
            <div
              className="h-full w-full origin-left bg-ink transition-transform duration-300 ease-out"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>

          <ul className="mt-2 flex flex-col gap-3.5">
            {steps.map((step, idx) => {
              const isDone = idx < scanStep;
              const isActive = idx === scanStep;
              return (
                <li
                  key={step.title}
                  className={`flex items-start gap-3 transition-opacity duration-300 ${
                    isDone || isActive ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  <span className="mt-0.5 shrink-0" aria-hidden="true">
                    {isDone ? (
                      <svg
                        className="size-4 rounded-full bg-ink p-0.5 text-canvas"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : isActive ? (
                      <span className="block size-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                    ) : (
                      <span className="block size-4 rounded-full border border-hairline bg-canvas" />
                    )}
                  </span>
                  <span>
                    <span className={`body-sm block text-ink ${isActive ? 'font-medium' : ''}`}>
                      {step.title}
                    </span>
                    <span className="caption block text-ink">{step.desc}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Result */}
      {data && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* The verdict carries the colour, so it reads before the detail does. */}
          <div
            className={`rounded-lg p-5 md:p-6 ${cited ? 'bg-block-lime' : 'bg-block-pink'}`}
          >
            <span className="eyebrow block text-ink">
              {data.businessName} &middot; {data.city}
            </span>
            <h3 className="card-title mt-2.5 text-ink">
              {cited
                ? 'Recommended in AI search answers'
                : 'Not cited in top AI recommendations'}
            </h3>
            {data.diagnosticSummary && (
              <p className="body-sm mt-2.5 text-ink">{data.diagnosticSummary}</p>
            )}
          </div>

          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="min-w-0 rounded-md border border-hairline bg-surface-soft p-3.5">
              <dt className="eyebrow text-ink">Citation status</dt>
              <dd className="label mt-2 inline-flex items-center gap-2 text-ink">
                <span
                  className={`size-2 shrink-0 rounded-full ${cited ? 'bg-success' : 'bg-destructive'}`}
                  aria-hidden="true"
                />
                {cited ? 'Active in AI' : 'Displaced'}
              </dd>
            </div>

            <div className="min-w-0 rounded-md border border-hairline bg-surface-soft p-3.5">
              <dt className="eyebrow text-ink">Competitors cited</dt>
              <dd className="label mt-2 line-clamp-1 text-ink">
                {data.competitorsFound && data.competitorsFound.length > 0
                  ? data.competitorsFound.slice(0, 2).join(', ')
                  : 'Local competitors'}
              </dd>
            </div>

            <div className="min-w-0 rounded-md border border-hairline bg-surface-soft p-3.5">
              <dt className="eyebrow text-ink">Local searches</dt>
              <dd className="label numeric mt-2 text-ink">
                ~{(data.recommendedSearchVolume ?? 2500).toLocaleString('en-US')}/mo
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={resultHref}
              className={buttonVariants({
                variant: 'primary',
                size: 'md',
                className: 'flex-1',
              })}
            >
              See what this is costing you
            </a>
            <button
              type="button"
              onClick={handleCheckAnother}
              className={buttonVariants({ variant: 'secondary', size: 'md' })}
            >
              Check another business
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
