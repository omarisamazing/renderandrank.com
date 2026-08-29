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
    <div className="rounded-lg border border-black/8 bg-canvas p-6 md:p-8">
      {/* Form State */}
      {!data && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="businessName" className="label block text-ink mb-1.5">
              Business Name <span className="text-[#b42318]">*</span>
            </label>
            <input
              id="businessName"
              type="text"
              required
              placeholder="e.g. Apex Climate Heating"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={loading}
              className="w-full h-11 rounded-md border border-hairline bg-canvas px-3.5 py-2.5 body-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-1 focus:ring-ink transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="label block text-ink mb-1.5">
                Service / Category <span className="text-[#b42318]">*</span>
              </label>
              <input
                id="category"
                type="text"
                required
                placeholder="e.g. emergency AC repair"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
                className="w-full h-11 rounded-md border border-hairline bg-canvas px-3.5 py-2.5 body-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-1 focus:ring-ink transition-all"
              />
            </div>

            <div>
              <label htmlFor="city" className="label block text-ink mb-1.5">
                City and state <span className="text-[#b42318]">*</span>
              </label>
              <input
                id="city"
                type="text"
                required
                placeholder="e.g. Austin, TX"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
                className="w-full h-11 rounded-md border border-hairline bg-canvas px-3.5 py-2.5 body-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-1 focus:ring-ink transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-surface-soft border border-hairline p-3 text-sm text-[#721c24]" role="alert">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={buttonVariants({ variant: 'primary', size: 'lg', className: 'w-full text-canvas justify-center' })}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin size-4 text-canvas" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running AI Check...
                </span>
              ) : (
                'Run AI Visibility Check →'
              )}
            </button>
            <p className="caption mt-3 text-center text-ink/60">
              Free real-time scan &middot; 3 checks per IP / day &middot; No pitch attached.
            </p>
          </div>
        </form>
      )}

      {/* Live Multi-Step Scanning Experience */}
      {loading && (
        <div className="space-y-4 animate-fade-in" aria-live="polite">
          <div className="flex items-center justify-between">
            <span className="eyebrow text-ink">
              SCANNING REAL-TIME AI MODELS
            </span>
            <span className="numeric text-sm font-medium text-ink">{progress}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-surface-soft rounded-full h-2 overflow-hidden border border-hairline">
            <div
              className="bg-ink h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step Checklist */}
          <div className="space-y-3 pt-2">
            {scanSteps.map((step, idx) => {
              const isDone = idx < scanStep;
              const isActive = idx === scanStep;
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 transition-opacity duration-300 ${
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
                    <p className="caption text-ink/60">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* High-Impact Diagnostic Result */}
      {data && (
        <div className="space-y-6 animate-fade-in" aria-live="polite">
          <div className="space-y-2">
            <span className="eyebrow block text-ink/70">
              DIAGNOSTIC OUTCOME &middot; {data.businessName?.toUpperCase()} ({data.city})
            </span>
            <h3 className="card-title text-xl text-ink">
              {(data.mentionedCount ?? 0) > 0
                ? 'Recommended in AI Search Answers'
                : 'Not Cited in Top AI Recommendations'}
            </h3>
            <p className="body-sm text-ink/80">
              {data.diagnosticSummary}
            </p>
          </div>

          {/* 3 Clean Market Comparison Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1: Entity Status */}
            <div className="rounded-md border border-hairline bg-surface-soft p-3.5">
              <span className="eyebrow text-ink/60 block text-[11px]">CITATION STATUS</span>
              <div className="mt-1.5">
                {(data.mentionedCount ?? 0) > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-ink font-medium">
                    <span className="size-2 rounded-full bg-[#1ea64a]"></span>
                    <span className="label text-sm text-ink">Active in AI</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-ink font-medium">
                    <span className="size-2 rounded-full bg-[#b42318]"></span>
                    <span className="label text-sm text-ink">Displaced</span>
                  </span>
                )}
              </div>
            </div>

            {/* 2: Competitor Dominance */}
            <div className="rounded-md border border-hairline bg-surface-soft p-3.5">
              <span className="eyebrow text-ink/60 block text-[11px]">COMPETITORS CITED</span>
              <p className="label text-sm text-ink mt-1.5 line-clamp-1">
                {data.competitorsFound && data.competitorsFound.length > 0
                  ? data.competitorsFound.slice(0, 2).join(', ')
                  : 'Local competitors'}
              </p>
            </div>

            {/* 3: Search Demand */}
            <div className="rounded-md border border-hairline bg-surface-soft p-3.5">
              <span className="eyebrow text-ink/60 block text-[11px]">LOCAL SEARCHES</span>
              <p className="label text-sm text-ink mt-1.5">
                ~{data.recommendedSearchVolume?.toLocaleString() || '2,500'}/mo
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleGoToCalculator}
              className={buttonVariants({ variant: 'primary', size: 'md', className: 'flex-1 text-canvas justify-center' })}
            >
              Calculate Lost Revenue →
            </button>
            <button
              onClick={() => setData(null)}
              className={buttonVariants({ variant: 'secondary', size: 'md', className: 'justify-center' })}
            >
              Check another business
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
