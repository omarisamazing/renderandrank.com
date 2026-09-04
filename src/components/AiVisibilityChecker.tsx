import { useState, useEffect, useRef } from 'react';
import { getClientVisitorData, getVisitorId } from '../lib/visitorClient';
import { buttonVariants } from '../lib/button-variants';
import {
  GAP_SHARE,
  bucketForCategory,
  runFunnel,
  type RankTier,
} from '../data/assumptions';

interface EngineResult {
  engine: string;
  available: boolean;
  status: 'mentioned' | 'not_mentioned' | 'error' | 'not_configured';
  snippet: string | null;
  details?: string;
  citation?: 'verified' | 'mention' | 'none';
}

interface KeySignal {
  name: string;
  status: 'good' | 'missing' | 'warning';
  label: string;
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
  keySignals?: KeySignal[];
  recommendedDealValue?: number;
  recommendedMinDeal?: number;
  recommendedMaxDeal?: number;
  recommendedSearchVolume?: number;
  recommendedRank?: 'invisible' | 'mid' | 'top3';
  totalEngines?: number;
  mentionedCount?: number;
  verifiedCount?: number;
  confidence?: 'high' | 'medium' | 'low';
  confidenceNote?: string;
  results?: EngineResult[];
}

export interface AiVisibilityCheckerProps {
  /**
   * Where "See what this costs" goes. The home page renders the ROI calculator
   * on the same page, so it passes an in-page anchor; /check sends people to the
   * standalone calculator.
   */
  resultHref?: string;
  /**
   * Public Cloudflare Turnstile site key. When set, the widget renders above
   * the submit button and its token is sent with the scan request. When empty
   * the form renders exactly as before.
   */
  turnstileSiteKey?: string;
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

declare global {
  interface Window {
    turnstile?: { reset: (widgetId?: string) => void };
  }
}

function readTurnstileToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const input = document.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]');
  return input?.value || undefined;
}

export default function AiVisibilityChecker({
  resultHref = '/calculator',
  turnstileSiteKey = '',
}: AiVisibilityCheckerProps = {}) {
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [data, setData] = useState<CheckResponse | null>(null);

  const businessRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef(0);

  const market = city.trim() || 'your market';
  const steps = SCAN_STEPS.map((step) => ({
    title: step.title(market),
    desc: step.desc,
  }));

  useEffect(() => {
    if (!loading) {
      setProgress(0);
      setScanStep(0);
      setElapsed(0);
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

    const elapsedInterval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 500);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      clearInterval(elapsedInterval);
    };
  }, [loading]);

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();

    if (!businessName.trim() || !category.trim() || !city.trim()) {
      setError('Add your business name, category and city so we know what to look for.');
      setRateLimited(false);
      const firstEmpty = !businessName.trim()
        ? businessRef
        : !category.trim()
          ? categoryRef
          : cityRef;
      firstEmpty.current?.focus();
      return;
    }

    setError(null);
    setRateLimited(false);
    setLoading(true);
    setData(null);
    startedAtRef.current = Date.now();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const visitor = getClientVisitorData();
      const visitorId = getVisitorId();

      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          businessName: businessName.trim(),
          category: category.trim(),
          city: city.trim(),
          visitorId,
          turnstileToken: readTurnstileToken(),
          ...visitor,
        }),
      });

      const json = (await res.json()) as CheckResponse;

      if (!res.ok || !json.ok) {
        setError(json.error || 'The scan could not finish. Try again, or book a call and we will run it for you.');
        setRateLimited(Boolean(json.rateLimited));
        setLoading(false);
        return;
      }

      setProgress(100);
      setTimeout(() => {
        setData(json);
        setLoading(false);
        // Move focus to the verdict so keyboard and screen-reader users land
        // on the result instead of the (now unmounted) form.
        requestAnimationFrame(() => resultHeadingRef.current?.focus());
      }, 400);

      persistHandoff(json);
    } catch (err) {
      if (controller.signal.aborted) {
        setError('Scan cancelled. Your inputs are kept — run it again whenever you are ready.');
      } else {
        console.error('AI check request failed:', err);
        setError('Could not reach the diagnostic server. Check your connection and try again.');
      }
      setRateLimited(false);
      setLoading(false);
    } finally {
      abortRef.current = null;
      if (typeof window !== 'undefined' && window.turnstile) {
        try {
          window.turnstile.reset();
        } catch {
          // ignore widget reset failure
        }
      }
    }
  }

  /** Save handoff data for the ROI calculator: sessionStorage (primary) plus
   *  URL params (fallback for new tabs, expired storage, or shared links). */
  function persistHandoff(json: CheckResponse) {
    if (typeof window === 'undefined') return;
    const handoff = {
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
    };
    try {
      window.sessionStorage?.setItem('rr_handoff', JSON.stringify(handoff));
    } catch {
      // ignore storage error
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('biz', String(json.businessName ?? ''));
      url.searchParams.set('cat', String(json.category ?? ''));
      url.searchParams.set('city', String(json.city ?? ''));
      window.history.replaceState(null, '', url);
    } catch {
      // ignore history error
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  function handleCheckAnother() {
    setData(null);
    setError(null);
    setRateLimited(false);
    setBusinessName('');
    // Category and city are kept so a retry is one field, not three. The
    // shared URL params are left intact so the calculator handoff survives.
    requestAnimationFrame(() => businessRef.current?.focus());
  }

  const cited = (data?.mentionedCount ?? 0) > 0;
  const competitors = data?.competitorsFound ?? [];
  const engines = (data?.results ?? []).filter((r) => r.available);
  const signals = data?.keySignals ?? [];

  // Inline revenue preview, using the same sourced math as the ROI calculator
  // (base case of the estimate range for this category).
  const inlineBucket = bucketForCategory(data?.category ?? '');
  const inlineTier: RankTier =
    data?.recommendedRank === 'mid' || data?.recommendedRank === 'top3'
      ? data.recommendedRank
      : 'invisible';
  const inlineFigure = runFunnel({
    searchVolume: data?.recommendedSearchVolume ?? 2500,
    gapShare: GAP_SHARE[inlineTier].mid,
    callRate: inlineBucket.call.mid,
    closeRate: inlineBucket.close.mid,
    dealValue: data?.recommendedDealValue ?? 1200,
  });
  const inlineCalls = inlineFigure.calls;
  const inlineMonthly = inlineFigure.monthly;

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
              aria-invalid={Boolean(error && !businessName.trim())}
              aria-describedby={error ? 'check-form-error' : undefined}
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
                aria-invalid={Boolean(error && !category.trim())}
                aria-describedby={error ? 'check-form-error' : undefined}
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
                aria-invalid={Boolean(error && !city.trim())}
                aria-describedby={error ? 'check-form-error' : undefined}
                className={`mt-2 ${FIELD_CLASS}`}
              />
            </div>
          </div>

          {error && (
            <p
              id="check-form-error"
              className="body-sm rounded-md border border-destructive bg-canvas p-3.5 text-destructive"
              role="alert"
            >
              {error}{' '}
              {rateLimited && (
                <a href="/book-a-call" className="underline underline-offset-2">
                  Book a call and we will run the full audit for you.
                </a>
              )}
            </p>
          )}

          {turnstileSiteKey && (
            <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />
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
              Free live scan &middot; about 15 seconds &middot; three checks per day &middot; no pitch attached.
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
          <p className="caption text-ink">
            {elapsed}s elapsed &middot; usually about 15 seconds. You can cancel any time — your inputs are kept.
          </p>

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

          <div>
            <button
              type="button"
              onClick={handleCancel}
              className={buttonVariants({ variant: 'secondary', size: 'md' })}
            >
              Cancel scan
            </button>
          </div>
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
              {data.businessName} &middot; {data.category} &middot; {data.city}
            </span>
            <h3 ref={resultHeadingRef} tabIndex={-1} className="card-title mt-2.5 text-ink outline-none">
              {cited
                ? 'Recommended in AI search answers'
                : 'Not cited in top AI recommendations'}
            </h3>
            {typeof data.visibilityScore === 'number' && (
              <div className="mt-4">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="eyebrow text-ink">Visibility score</span>
                  <span className="label numeric text-ink">{data.visibilityScore}/100</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-pill border border-black/10 bg-canvas/60">
                  <div
                    className="h-full origin-left bg-ink"
                    style={{ transform: `scaleX(${(data.visibilityScore ?? 0) / 100})` }}
                  />
                </div>
                {data.rankPosition && (
                  <p className="caption mt-2 text-ink">{data.rankPosition}</p>
                )}
              </div>
            )}
            {data.diagnosticSummary && (
              <p className="body-sm mt-2.5 text-ink">{data.diagnosticSummary}</p>
            )}
            {data.confidence && (
              <p className="caption mt-3 inline-flex items-center gap-2 text-ink">
                <span
                  className={`size-2 shrink-0 rounded-full ${
                    data.confidence === 'high'
                      ? 'bg-success'
                      : data.confidence === 'medium'
                        ? 'bg-ink'
                        : 'bg-destructive'
                  }`}
                  aria-hidden="true"
                />
                {data.confidence === 'high'
                  ? 'High confidence'
                  : data.confidence === 'medium'
                    ? 'Medium confidence'
                    : 'Limited evidence'}
                {data.confidenceNote ? ` — ${data.confidenceNote}` : ''}
              </p>
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
              <dd className="label mt-2 text-ink">
                {competitors.length > 0 ? competitors.join(', ') : 'Local competitors'}
              </dd>
            </div>

            <div className="min-w-0 rounded-md border border-hairline bg-surface-soft p-3.5">
              <dt className="eyebrow text-ink">Local searches</dt>
              <dd className="label numeric mt-2 text-ink">
                ~{(data.recommendedSearchVolume ?? 2500).toLocaleString('en-US')}/mo
              </dd>
            </div>
          </dl>

          {/* Authority signals the backend already computes. */}
          {signals.length > 0 && (
            <ul className="flex flex-col gap-2.5">
              {signals.map((signal) => (
                <li
                  key={signal.name}
                  className="flex items-start gap-2.5 rounded-md border border-hairline bg-canvas p-3.5"
                >
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      signal.status === 'good'
                        ? 'bg-success'
                        : signal.status === 'warning'
                          ? 'bg-ink'
                          : 'bg-destructive'
                    }`}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="body-sm block font-medium text-ink">{signal.name}</span>
                    <span className="caption block text-ink">{signal.label}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Per-engine evidence. */}
          {engines.length > 0 && (
            <div className="rounded-md border border-hairline bg-canvas">
              <p className="eyebrow border-b border-hairline px-3.5 py-3 text-ink">
                Checked across {data.totalEngines ?? engines.length} sample{(data.totalEngines ?? engines.length) === 1 ? '' : 's'}
              </p>
              <ul className="flex flex-col divide-y divide-hairline">
                {engines.map((engine) => (
                  <li key={engine.engine} className="px-3.5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="body-sm font-medium text-ink">{engine.engine}</span>
                      <span className="caption inline-flex shrink-0 items-center gap-1.5 text-ink">
                        <span
                          className={`size-2 rounded-full ${
                            engine.citation === 'verified'
                              ? 'bg-success'
                              : engine.status === 'mentioned'
                                ? 'bg-success'
                                : engine.status === 'error'
                                  ? 'bg-destructive'
                                  : 'bg-ink'
                          }`}
                          aria-hidden="true"
                        />
                        {engine.citation === 'verified'
                          ? 'Verified by Google Search'
                          : engine.status === 'mentioned'
                            ? 'Cited you'
                            : engine.status === 'error'
                              ? 'Check failed'
                              : 'Did not cite'}
                      </span>
                    </div>
                    {engine.snippet && (
                      <details className="mt-2">
                        <summary className="caption cursor-pointer text-ink underline underline-offset-2">
                          What the engine returned
                        </summary>
                        <p className="body-sm mt-2 text-ink">{engine.snippet}</p>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Inline revenue preview — same math as the calculator deep-dive. */}
          <p className="body-sm rounded-md border border-hairline bg-surface-soft p-3.5 text-ink">
            Estimated{' '}
            <strong>
              {inlineMonthly.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
              })}
              /mo
            </strong>{' '}
            going to competitors on ~{inlineCalls.toLocaleString('en-US')} missed calls. Fine-tune it below.
          </p>

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
