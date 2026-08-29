import React, { useState, useEffect } from 'react';
import { getClientVisitorData, getVisitorId } from '../lib/visitorClient';

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
  totalEngines?: number;
  mentionedCount?: number;
  results?: EngineResult[];
}

export default function AiVisibilityChecker() {
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CheckResponse | null>(null);

  // Cycling loading text to show real-time progress
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 3);
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  const loadingMessages = [
    'Connecting to live Google Search grounding...',
    'Querying AI recommendation models...',
    'Analyzing local citations and entity graph...',
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName.trim() || !category.trim() || !city.trim()) {
      setError('Please fill in your business name, service category, and city.');
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
        setError(json.error || 'Check could not be completed. Please try again or book a call.');
        setLoading(false);
        return;
      }

      setData(json);

      // Save handoff to sessionStorage for connected funnel
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          window.sessionStorage.setItem(
            'rr_handoff',
            JSON.stringify({
              businessName: json.businessName,
              category: json.category,
              city: json.city,
              totalEngines: json.totalEngines ?? 0,
              mentionedCount: json.mentionedCount ?? 0,
              timestamp: Date.now(),
            })
          );
        } catch {
          // ignore storage quota error
        }
      }
    } catch (err) {
      console.error('AI check request failed:', err);
      setError('Network error running the check. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  }

  function handleCalculateGap() {
    window.location.href = '/calculator';
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="rounded-lg border border-hairline bg-canvas p-6 sm:p-8 md:p-10 shadow-xs">
        {/* Header inside card */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="eyebrow block text-ink uppercase tracking-wider text-xs md:text-sm font-mono">
            Instant AEO / GEO Diagnostic
          </span>
          <h2 className="card-title text-2xl md:text-3xl font-bold text-ink mt-2">
            Is AI Recommending Your Business?
          </h2>
          <p className="body-sm text-ink/80 mt-2">
            We query live search-grounded AI engines for top local recommendations in your market. See if ChatGPT, Gemini, and AI assistants cite you or your competitors.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="businessName" className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5 font-medium">
                Business Name
              </label>
              <input
                id="businessName"
                type="text"
                required
                placeholder="e.g. Apex Climate HVAC"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={loading}
                className="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5 font-medium">
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
                className="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5 font-medium">
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
                className="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-ink/60 font-mono">
              Free real-time scan &middot; 3 checks per IP / day
            </p>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-pill bg-primary px-7 py-3 text-sm font-medium text-on-primary hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Scanning AI Answers...
                </span>
              ) : (
                'Run AI Visibility Check →'
              )}
            </button>
          </div>
        </form>

        {/* Loading Progress State */}
        {loading && (
          <div className="mt-8 pt-8 border-t border-hairline text-center animate-fade-in">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-surface-soft border border-hairline text-xs font-mono text-ink">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{loadingMessages[loadingStep]}</span>
            </div>
            <div className="mt-6 grid gap-3 max-w-lg mx-auto">
              <div className="h-12 rounded-md bg-surface-soft animate-pulse" />
              <div className="h-12 rounded-md bg-surface-soft animate-pulse" />
            </div>
          </div>
        )}

        {/* Results Section */}
        {data && (
          <div className="mt-8 pt-8 border-t border-hairline animate-fade-in">
            {/* Outcome Banner */}
            <div
              className={`rounded-lg p-5 md:p-6 mb-6 ${
                (data.mentionedCount ?? 0) > 0
                  ? 'bg-block-lime border border-emerald-300'
                  : 'bg-surface-soft border border-hairline'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="eyebrow block text-xs font-mono text-ink/70">
                    Scan Results For: {data.businessName} in {data.city}
                  </span>
                  <h3 className="card-title text-xl font-bold text-ink mt-1">
                    {(data.mentionedCount ?? 0) > 0
                      ? `Found! Cited in ${data.mentionedCount} of ${data.totalEngines} tested AI models`
                      : `Invisibility Alert: Not cited in ${data.totalEngines} tested AI answer engines`}
                  </h3>
                  <p className="body-sm text-ink/80 mt-1">
                    {(data.mentionedCount ?? 0) > 0
                      ? 'Your business has entity presence in AI recommendation systems. To lock in dominance across all generative engines, see next steps below.'
                      : `When potential customers ask AI for top ${data.category} in ${data.city}, AI assistants currently recommend competing businesses instead.`}
                  </p>
                </div>

                <div className="shrink-0">
                  {(data.mentionedCount ?? 0) === 0 ? (
                    <button
                      onClick={handleCalculateGap}
                      className="inline-flex items-center justify-center rounded-pill bg-primary px-5 py-2.5 text-xs font-medium text-on-primary hover:opacity-90 transition-all cursor-pointer whitespace-nowrap"
                    >
                      Calculate Revenue Loss →
                    </button>
                  ) : (
                    <a
                      href="/book-a-call"
                      className="inline-flex items-center justify-center rounded-pill bg-primary px-5 py-2.5 text-xs font-medium text-on-primary hover:opacity-90 transition-all cursor-pointer whitespace-nowrap"
                    >
                      Book Strategy Call →
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Engine Breakdown Cards */}
            <h4 className="text-xs font-mono uppercase tracking-wider text-ink/60 mb-3">
              Engine Breakdown
            </h4>
            <div className="grid gap-3">
              {data.results?.map((res, i) => (
                <div
                  key={i}
                  className="rounded-md border border-hairline bg-canvas p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-sm text-ink">{res.engine}</span>
                      {res.status === 'mentioned' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-medium">
                          ✓ Recommended
                        </span>
                      )}
                      {res.status === 'not_mentioned' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[11px] font-medium">
                          ✗ Not Mentioned
                        </span>
                      )}
                      {res.status === 'not_configured' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-soft text-ink/60 px-2 py-0.5 text-[11px] font-mono">
                          Pro Tier
                        </span>
                      )}
                      {res.status === 'error' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-[11px] font-mono">
                          Unavailable
                        </span>
                      )}
                    </div>
                    {res.snippet && (
                      <p className="text-xs text-ink/75 font-mono leading-relaxed bg-surface-soft/60 p-2 rounded border border-hairline-soft">
                        "{res.snippet}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Next Steps CTA Strip */}
            <div className="mt-6 pt-6 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-mono text-ink/60">
                Want to rank #1 in ChatGPT, Gemini, and Google Maps 3-Pack?
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleCalculateGap}
                  className="w-full sm:w-auto text-xs font-medium underline underline-offset-4 text-ink hover:opacity-75 cursor-pointer"
                >
                  Quantify in ROI Calculator
                </button>
                <a
                  href="/book-a-call"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-pill bg-primary px-4 py-2 text-xs font-medium text-on-primary hover:opacity-90 transition-all cursor-pointer"
                >
                  Book Discovery Call
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
