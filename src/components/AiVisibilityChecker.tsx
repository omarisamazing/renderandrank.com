import React, { useState, useEffect } from 'react';
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

export default function AiVisibilityChecker() {
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CheckResponse | null>(null);

  const scanSteps = [
    { title: 'Connecting to Google Search live citation index', desc: 'Querying real-time generative grounding' },
    { title: 'Scanning local Knowledge Graph entity relationships', desc: `Analyzing ${city || 'local market'} provider network` },
    { title: 'Evaluating competitor review velocity & citation rank', desc: 'Comparing entity presence against top competitors' },
    { title: 'Synthesizing Generative Engine Visibility report', desc: 'Calculating authority score and revenue opportunity' },
  ];

  // Progressive scanning animation
  useEffect(() => {
    if (!loading) {
      setProgress(0);
      setScanStep(0);
      return;
    }

    const stepInterval = setInterval(() => {
      setScanStep((prev) => (prev < scanSteps.length - 1 ? prev + 1 : prev));
    }, 1800);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        const inc = Math.floor(Math.random() * 8) + 4;
        return Math.min(95, prev + inc);
      });
    }, 350);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [loading, city]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName.trim() || !category.trim() || !city.trim()) {
      setError('Please fill in your business name, service category, and city/market.');
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
        setError(json.error || 'Diagnostic scan could not be completed. Please try again or book a call.');
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
      setError('Network error connecting to diagnostic servers. Please check your connection.');
      setLoading(false);
    }
  }

  function handleGoToCalculator() {
    window.location.href = '/calculator';
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="rounded-lg border border-hairline bg-canvas p-6 sm:p-8 md:p-10">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label htmlFor="businessName" className="label block text-ink mb-2">
                Business Name
              </label>
              <input
                id="businessName"
                type="text"
                required
                placeholder="e.g. Apex Climate Heating"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={loading}
                className="w-full h-12 rounded-md border border-hairline bg-canvas px-4 py-3 body-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-1 focus:ring-ink transition-all"
              />
            </div>

            <div>
              <label htmlFor="category" className="label block text-ink mb-2">
                Service / Category
              </label>
              <input
                id="category"
                type="text"
                required
                placeholder="e.g. emergency AC repair"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
                className="w-full h-12 rounded-md border border-hairline bg-canvas px-4 py-3 body-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-1 focus:ring-ink transition-all"
              />
            </div>

            <div>
              <label htmlFor="city" className="label block text-ink mb-2">
                City, State / Market
              </label>
              <input
                id="city"
                type="text"
                required
                placeholder="e.g. Austin, TX"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
                className="w-full h-12 rounded-md border border-hairline bg-canvas px-4 py-3 body-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-1 focus:ring-ink transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-surface-soft border border-hairline p-4 text-sm text-[#721c24]" role="alert">
              {error}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="caption text-ink/70">
              Free real-time scan &middot; 3 checks per IP / day
            </span>
            <button
              type="submit"
              disabled={loading}
              className={buttonVariants({ variant: 'primary', size: 'lg', className: 'w-full sm:w-auto text-canvas' })}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin size-4 text-canvas" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running Diagnostic...
                </span>
              ) : (
                'Run AI Visibility Check →'
              )}
            </button>
          </div>
        </form>

        {/* Live Multi-Step Scanning Experience */}
        {loading && (
          <div className="mt-8 pt-8 border-t border-hairline animate-fade-in" aria-live="polite">
            <div className="rounded-lg border border-hairline bg-surface-soft p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <span className="eyebrow text-ink">
                  LIVE DIAGNOSTIC SCAN IN PROGRESS
                </span>
                <span className="numeric text-sm font-medium text-ink">{progress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-canvas rounded-full h-2.5 overflow-hidden border border-hairline mb-6">
                <div
                  className="bg-ink h-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Step Checklist */}
              <div className="space-y-3">
                {scanSteps.map((step, idx) => {
                  const isDone = idx < scanStep;
                  const isActive = idx === scanStep;
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3.5 transition-opacity duration-300 ${
                        isDone || isActive ? 'opacity-100' : 'opacity-40'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isDone ? (
                          <span className="size-4 rounded-full bg-ink text-canvas flex items-center justify-center text-[10px]">
                            ✓
                          </span>
                        ) : isActive ? (
                          <span className="size-4 rounded-full border-2 border-ink border-t-transparent animate-spin block" />
                        ) : (
                          <span className="size-4 rounded-full border border-hairline bg-canvas block" />
                        )}
                      </div>
                      <div>
                        <p className={`body-sm text-ink ${isActive ? 'font-medium' : 'text-ink/80'}`}>
                          {step.title}
                        </p>
                        <p className="caption text-ink/60 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* High-Impact Diagnostic Result */}
        {data && (
          <div className="mt-8 pt-8 border-t border-hairline animate-fade-in" aria-live="polite">
            <div className="rounded-lg border border-hairline bg-surface-soft p-6 sm:p-8 md:p-9 text-ink">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <span className="eyebrow block text-ink/70">
                    DIAGNOSTIC OUTCOME &middot; {data.businessName?.toUpperCase()} ({data.city})
                  </span>
                  <h3 className="display-md text-ink">
                    {(data.mentionedCount ?? 0) > 0
                      ? 'Recommended in AI search answers'
                      : 'Not cited in top AI recommendations'}
                  </h3>
                  <p className="body-sm text-ink/85 max-w-xl">
                    {data.diagnosticSummary}
                  </p>
                </div>

                <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">
                  <button
                    onClick={handleGoToCalculator}
                    className={buttonVariants({ variant: 'primary', size: 'md', className: 'text-canvas justify-center' })}
                  >
                    Calculate Lost Revenue →
                  </button>
                  <a
                    href="/book-a-call"
                    className={buttonVariants({ variant: 'secondary', size: 'md', className: 'justify-center' })}
                  >
                    Book Free 1-on-1 Audit
                  </a>
                </div>
              </div>

              {/* Market Comparison Strip in Clean Cards */}
              <div className="mt-8 pt-6 border-t border-hairline grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1: Entity Status */}
                <div className="rounded-lg border border-hairline bg-canvas p-5">
                  <span className="eyebrow text-ink/60 block text-xs">YOUR CITATION STATUS</span>
                  <div className="mt-2.5">
                    {(data.mentionedCount ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-2 text-ink font-medium">
                        <span className="size-2 rounded-full bg-[#1ea64a]"></span>
                        <span className="card-title text-base text-ink">Active in AI</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-ink font-medium">
                        <span className="size-2 rounded-full bg-[#b42318]"></span>
                        <span className="card-title text-base text-ink">Displaced</span>
                      </span>
                    )}
                  </div>
                  <p className="caption text-ink/60 mt-2">
                    Tested across live generative search models
                  </p>
                </div>

                {/* 2: Competitor Dominance */}
                <div className="rounded-lg border border-hairline bg-canvas p-5">
                  <span className="eyebrow text-ink/60 block text-xs">COMPETITORS WINNING</span>
                  <p className="card-title text-base text-ink mt-2.5 line-clamp-1">
                    {data.competitorsFound && data.competitorsFound.length > 0
                      ? data.competitorsFound.slice(0, 2).join(', ')
                      : 'Local competitors'}
                  </p>
                  <p className="caption text-ink/60 mt-2">
                    Currently capturing direct customer inquiries
                  </p>
                </div>

                {/* 3: Search Demand */}
                <div className="rounded-lg border border-hairline bg-canvas p-5">
                  <span className="eyebrow text-ink/60 block text-xs">LOCAL SEARCH DEMAND</span>
                  <p className="card-title text-base text-ink mt-2.5">
                    ~{data.recommendedSearchVolume?.toLocaleString() || '2,500'}/mo
                  </p>
                  <p className="caption text-ink/60 mt-2">
                    Estimated monthly buyers in {data.city}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
