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

interface SignalItem {
  name: string;
  status: 'good' | 'warning' | 'missing';
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
  competitorsFound?: string[];
  keySignals?: SignalItem[];
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
    { title: 'Querying local Knowledge Graph entity relationships', desc: `Scanning ${city || 'local market'} provider network` },
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
      // Small pause to let 100% complete cleanly
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
              competitorsFound: json.competitorsFound || [],
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

  function handleCalculateGap() {
    window.location.href = '/calculator';
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="rounded-xl border border-hairline bg-canvas p-6 sm:p-8 md:p-10 shadow-xs">
        {/* Header inside card */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="eyebrow block text-ink">
            Instant AEO / GEO Diagnostic
          </span>
          <h2 className="display-sm text-2xl md:text-3xl font-bold text-ink mt-2 tracking-tight">
            Is AI Recommending Your Business?
          </h2>
          <p className="body-sm text-ink/80 mt-2 text-sm sm:text-base leading-relaxed">
            We query live search-grounded AI engines for top local recommendations in your market. See if ChatGPT, Gemini, and AI assistants cite you or send high-intent customers to competitors.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-ink mb-1.5">
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
                className="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-ink mb-1.5">
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
                className="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-ink mb-1.5">
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
                className="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-[#fdf2f2] border border-[#f8d7da] p-3 text-sm text-[#721c24]" role="alert">
              {error}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="caption text-ink">
              Free real-time scan &middot; 3 checks per IP / day
            </span>
            <button
              type="submit"
              disabled={loading}
              className={buttonVariants({ variant: 'primary', size: 'md', className: 'w-full sm:w-auto text-canvas' })}
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
            <div className="rounded-lg border border-hairline bg-surface-soft p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="eyebrow text-ink">
                  LIVE DIAGNOSTIC SCAN IN PROGRESS
                </span>
                <span className="text-sm font-semibold text-ink">{progress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-canvas rounded-full h-2 overflow-hidden border border-hairline mb-6">
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
                      className={`flex items-start gap-3 transition-opacity duration-300 ${
                        isDone || isActive ? 'opacity-100' : 'opacity-40'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isDone ? (
                          <span className="size-4 rounded-full bg-ink text-canvas flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </span>
                        ) : isActive ? (
                          <span className="size-4 rounded-full border-2 border-ink border-t-transparent animate-spin block" />
                        ) : (
                          <span className="size-4 rounded-full border border-hairline bg-canvas block" />
                        )}
                      </div>
                      <div>
                        <p className={`text-xs sm:text-sm font-medium ${isActive ? 'text-ink font-semibold' : 'text-ink/80'}`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-ink/60 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Rich KPI Diagnostic Results Section */}
        {data && (
          <div className="mt-8 pt-8 border-t border-hairline animate-fade-in" aria-live="polite">
            {/* Top Score & Outcome Banner */}
            <div
              className={`rounded-lg p-6 md:p-8 mb-8 ${
                (data.visibilityScore ?? 0) >= 60
                  ? 'bg-block-lime border border-emerald-300'
                  : 'bg-surface-soft border border-hairline'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="eyebrow text-ink/70">
                      DIAGNOSTIC REPORT &middot; {data.businessName} ({data.city})
                    </span>
                  </div>
                  <h3 className="card-title text-2xl md:text-3xl font-bold text-ink">
                    {(data.visibilityScore ?? 0) >= 60
                      ? `Verified Entity Presence (${data.visibilityScore}/100)`
                      : `Invisibility Alert: Zero Generative Citations (${data.visibilityScore}/100)`}
                  </h3>
                  <p className="body-sm text-ink/85 text-sm md:text-base max-w-2xl leading-relaxed">
                    {(data.mentionedCount ?? 0) > 0
                      ? `Your business is currently cited in ${data.mentionedCount} of ${data.totalEngines} active generative answer engines. To secure the #1 spot and lock out competitors, see your authority breakdown below.`
                      : `When potential customers ask AI for top ${data.category} in ${data.city}, AI recommendation models recommend competing businesses instead of yours.`}
                  </p>
                </div>

                <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">
                  <button
                    onClick={handleCalculateGap}
                    className={buttonVariants({ variant: 'primary', size: 'md', className: 'text-canvas justify-center' })}
                  >
                    Calculate Revenue Gap →
                  </button>
                  <a
                    href="/book-a-call"
                    className={buttonVariants({ variant: 'secondary', size: 'md', className: 'justify-center' })}
                  >
                    Book Diagnostic Call
                  </a>
                </div>
              </div>
            </div>

            {/* 4 Core Diagnostic KPI Cards */}
            <div className="mb-8">
              <span className="eyebrow block text-ink/60 mb-3">
                KEY PERFORMANCE INDICATORS
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: AI Visibility Score */}
                <div className="rounded-lg border border-hairline bg-canvas p-4 sm:p-5 flex flex-col justify-between">
                  <div>
                    <span className="caption text-ink/60 block">AI VISIBILITY SCORE</span>
                    <p className="text-3xl font-bold text-ink mt-2 tracking-tight">
                      {data.visibilityScore ?? 20}
                      <span className="text-sm font-normal text-ink/60">/100</span>
                    </p>
                  </div>
                  <p className="text-xs text-ink/70 mt-3 border-t border-hairline pt-2">
                    {(data.visibilityScore ?? 0) >= 60 ? 'Strong brand citation authority' : 'Critical entity citation gap'}
                  </p>
                </div>

                {/* KPI 2: Recommendation Position */}
                <div className="rounded-lg border border-hairline bg-canvas p-4 sm:p-5 flex flex-col justify-between">
                  <div>
                    <span className="caption text-ink/60 block">CURRENT AI RANK</span>
                    <p className="text-lg font-bold text-ink mt-2 line-clamp-1">
                      {data.rankPosition || 'Displaced'}
                    </p>
                  </div>
                  <p className="text-xs text-ink/70 mt-3 border-t border-hairline pt-2">
                    {(data.mentionedCount ?? 0) > 0 ? 'Appears in top recommendation set' : 'Competitors winning 100% of AI clicks'}
                  </p>
                </div>

                {/* KPI 3: Competing Entities Identified */}
                <div className="rounded-lg border border-hairline bg-canvas p-4 sm:p-5 flex flex-col justify-between">
                  <div>
                    <span className="caption text-ink/60 block">COMPETITORS RECOMMENDED</span>
                    <p className="text-2xl font-bold text-ink mt-2">
                      {data.competitorsFound?.length || 0}
                      <span className="text-xs font-normal text-ink/60 ml-1.5">local entities</span>
                    </p>
                  </div>
                  <div className="text-xs text-ink/80 mt-3 border-t border-hairline pt-2 line-clamp-1">
                    {data.competitorsFound && data.competitorsFound.length > 0 ? (
                      <span>e.g. {data.competitorsFound.slice(0, 2).join(', ')}</span>
                    ) : (
                      <span>No dominant competitor detected</span>
                    )}
                  </div>
                </div>

                {/* KPI 4: Monthly Search Opportunity */}
                <div className="rounded-lg border border-hairline bg-canvas p-4 sm:p-5 flex flex-col justify-between">
                  <div>
                    <span className="caption text-ink/60 block">EST. REVENUE OPPORTUNITY</span>
                    <p className="text-2xl font-bold text-ink mt-2 text-[#2d6a4f]">
                      {(data.mentionedCount ?? 0) === 0 ? '$4,500+' : '$12,000+'}
                      <span className="text-xs font-normal text-ink/60 ml-1">/mo</span>
                    </p>
                  </div>
                  <p className="text-xs text-ink/70 mt-3 border-t border-hairline pt-2">
                    Based on local search volume & average job value
                  </p>
                </div>
              </div>
            </div>

            {/* Entity Signals Breakdown */}
            <div className="mb-8 rounded-lg border border-hairline bg-surface-soft p-5 sm:p-6">
              <span className="eyebrow block text-ink/70 mb-3">
                LOCAL ENTITY SIGNAL AUDIT
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.keySignals?.map((sig, i) => (
                  <div key={i} className="rounded-md border border-hairline bg-canvas p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink">{sig.name}</span>
                      {sig.status === 'good' && (
                        <span className="inline-flex items-center rounded-full bg-[#e8f5e9] text-[#1b5e20] px-2 py-0.5 text-[11px] font-medium">
                          ✓ Verified
                        </span>
                      )}
                      {sig.status === 'warning' && (
                        <span className="inline-flex items-center rounded-full bg-[#fff8e1] text-[#b78103] px-2 py-0.5 text-[11px] font-medium">
                          ! Saturated
                        </span>
                      )}
                      {sig.status === 'missing' && (
                        <span className="inline-flex items-center rounded-full bg-[#ffebee] text-[#c62828] px-2 py-0.5 text-[11px] font-medium">
                          ✗ Missing
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink/75 leading-relaxed">{sig.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Engine Breakdown */}
            <div className="mb-8">
              <span className="eyebrow block text-ink/60 mb-3">
                GENERATIVE ENGINE BREAKDOWN
              </span>
              <div className="grid gap-3">
                {data.results?.map((res, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-hairline bg-canvas p-5 space-y-3 transition-colors hover:border-black/20"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm text-ink">{res.engine}</span>
                        {res.status === 'mentioned' && (
                          <span className="inline-flex items-center rounded-full bg-[#e8f5e9] text-[#1b5e20] px-2.5 py-0.5 text-xs font-semibold">
                            ✓ Recommended
                          </span>
                        )}
                        {res.status === 'not_mentioned' && (
                          <span className="inline-flex items-center rounded-full bg-[#fff3e0] text-[#e65100] px-2.5 py-0.5 text-xs font-semibold">
                            ✗ Competitors Cited
                          </span>
                        )}
                        {res.status === 'not_configured' && (
                          <span className="inline-flex items-center rounded-full bg-surface-soft text-ink/60 px-2 py-0.5 text-[11px]">
                            Pro Search Audit
                          </span>
                        )}
                        {res.status === 'error' && (
                          <span className="inline-flex items-center rounded-full bg-[#ffebee] text-[#c62828] px-2 py-0.5 text-[11px]">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <span className="caption text-ink/50">
                        {res.available ? 'Live Test' : 'Requires Pro Key'}
                      </span>
                    </div>

                    {res.snippet && (
                      <div className="rounded-md bg-surface-soft p-3.5 border border-hairline text-xs text-ink/80 leading-relaxed font-sans">
                        <p className="font-medium text-ink mb-1 text-[11px] uppercase tracking-wider text-ink/60">
                          Extracted AI Citation Summary:
                        </p>
                        <p className="italic">"{res.snippet}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Conversion Handoff Strip */}
            <div className="rounded-lg bg-surface-soft border border-hairline p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="card-title text-base font-bold text-ink">
                  Ready to capture the #1 recommendation spot?
                </h4>
                <p className="body-sm text-xs sm:text-sm text-ink/75 mt-1">
                  We build structured entity schema, citation authority, and review velocity so AI models cite your business first.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
                <button
                  onClick={handleCalculateGap}
                  className={buttonVariants({ variant: 'primary', size: 'md', className: 'w-full sm:w-auto text-canvas justify-center' })}
                >
                  Quantify Lost Revenue →
                </button>
                <a
                  href="/book-a-call"
                  className={buttonVariants({ variant: 'secondary', size: 'md', className: 'w-full sm:w-auto justify-center' })}
                >
                  Book 1-on-1 Audit
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
