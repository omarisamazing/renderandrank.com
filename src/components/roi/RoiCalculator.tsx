import * as React from "react"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/lib/button-variants"
import { getVisitorId } from "../../lib/visitorClient"
import {
  GAP_SHARE,
  CTR_SOURCES,
  bucketForCategory,
  estimateRange,
  type RankTier,
} from "../../data/assumptions"

const RANK_OPTIONS: Array<{ value: RankTier; label: string }> = [
  { value: "invisible", label: "Outside the top 10 (invisible in Maps & AI)" },
  { value: "mid", label: "Positions 4–10" },
  { value: "top3", label: "Top 3 (Maps pack or AI answers)" },
]

interface HandoffData {
  businessName: string
  category: string
  city: string
  visibilityScore?: number
  rankPosition?: string
  diagnosticSummary?: string
  competitorsFound?: string[]
  recommendedDealValue?: number
  recommendedMinDeal?: number
  recommendedMaxDeal?: number
  recommendedSearchVolume?: number
  recommendedRank?: RankTier
  mentionedCount: number
  totalEngines: number
}

export interface RoiCalculatorLabels {
  dealValueLabel?: string
  searchVolumeLabel?: string
  rankLegend?: string
  rankOptions?: readonly (string | undefined)[]
  resultLabel?: string
  perMonthSuffix?: string
  cta?: string
  // Legacy overrides, no longer rendered (card now shows the trace strip):
  // summary, missedCallsLabel, missedJobsLabel, assumptions. Kept optional
  // so existing locale dictionaries keep compiling untouched.
  summary?: string
  missedCallsLabel?: string
  missedJobsLabel?: string
  assumptions?: string
}

export interface RoiCalculatorProps {
  labels?: RoiCalculatorLabels
}

const VOLUME_MIN = 300
const VOLUME_MAX = 15000

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})
const number = new Intl.NumberFormat("en-US")

function trackFill(value: number, min: number, max: number) {
  return { "--range-fill-n": (value - min) / (max - min) } as React.CSSProperties
}

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}

export function RoiCalculator({ labels }: RoiCalculatorProps = {}) {
  const [dealValue, setDealValue] = React.useState(1500)
  const [searchVolume, setSearchVolume] = React.useState(2500)
  const [rank, setRank] = React.useState<RankTier>("mid")
  const [callRate, setCallRate] = React.useState(0.35)
  const [closeRate, setCloseRate] = React.useState(0.4)
  const [bucketLabel, setBucketLabel] = React.useState("General local service")
  const [handoff, setHandoff] = React.useState<HandoffData | null>(null)
  const [bannerDismissed, setBannerDismissed] = React.useState(false)

  const dirtyRef = React.useRef(false)
  const trackTimer = React.useRef<number | null>(null)
  const bannerHeadingRef = React.useRef<HTMLHeadingElement>(null)
  const handoffAnnounced = React.useRef(false)

  const bucket = React.useMemo(() => bucketForCategory(handoff?.category ?? ""), [handoff?.category])
  const dealMin = handoff?.recommendedMinDeal ?? (dealValue < 100 ? 10 : 200)
  const dealMax = handoff?.recommendedMaxDeal ?? (dealValue < 100 ? 500 : 15000)
  const dealStep = dealMax <= 500 ? 5 : 100

  const estimate = React.useMemo(
    () =>
      estimateRange({
        searchVolume,
        gap: GAP_SHARE[rank],
        call: { lo: callRate, mid: callRate, hi: callRate, source: "" },
        close: { lo: closeRate, mid: closeRate, hi: closeRate, source: "" },
        dealValue,
      }),
    [searchVolume, rank, dealValue, callRate, closeRate]
  )

  // Range ends use the bucket's published lo/hi while the headline uses the
  // visitor's (possibly adjusted) rates.
  const ranged = React.useMemo(
    () =>
      estimateRange({
        searchVolume,
        gap: GAP_SHARE[rank],
        call: bucket.call,
        close: bucket.close,
        dealValue,
      }),
    [searchVolume, rank, dealValue, bucket]
  )

  const base = estimate.base

  function handleClearHandoff() {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.removeItem("rr_handoff")
    }
    setHandoff(null)
    setBannerDismissed(false)
    applyBucket(bucketForCategory(""), 1500, 2500, "mid")
  }

  function applyBucket(b: ReturnType<typeof bucketForCategory>, deal: number, vol: number, r: RankTier) {
    setBucketLabel(b.label)
    setCallRate(b.call.mid)
    setCloseRate(b.close.mid)
    setDealValue(deal)
    setSearchVolume(vol)
    setRank(r)
  }

  function sendTrack() {
    try {
      const visitorId = getVisitorId()
      if (!visitorId || typeof window === "undefined") return
      fetch("/api/track-funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          visitorId,
          eventType: "calculator",
          payload: {
            dealValue,
            searchVolume,
            monthlyGap: base.monthly,
            monthlyLo: ranged.pessimistic.monthly,
            monthlyHi: ranged.optimistic.monthly,
            rank,
            callRate,
            closeRate,
            businessName: handoff?.businessName ?? null,
          },
        }),
      }).catch(() => {
        // telemetry is best-effort
      })
    } catch {
      // ignore
    }
  }

  function markDirtyAndTrack() {
    dirtyRef.current = true
    if (typeof window === "undefined") return
    if (trackTimer.current) window.clearTimeout(trackTimer.current)
    trackTimer.current = window.setTimeout(sendTrack, 2500)
  }

  function trackNow() {
    dirtyRef.current = true
    if (typeof window === "undefined") return
    if (trackTimer.current) window.clearTimeout(trackTimer.current)
    sendTrack()
  }

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        const stored = window.sessionStorage.getItem("rr_handoff")
        if (stored) {
          const parsed = JSON.parse(stored) as HandoffData & { timestamp?: number }
          // Stored handoff is valid for 30 minutes
          if (
            parsed &&
            parsed.businessName &&
            (!parsed.timestamp || Date.now() - parsed.timestamp < 30 * 60 * 1000)
          ) {
            const b = bucketForCategory(parsed.category ?? "")
            setHandoff(parsed)
            setBucketLabel(b.label)
            setCallRate(b.call.mid)
            setCloseRate(b.close.mid)
            if (parsed.recommendedDealValue) {
              setDealValue(
                clamp(parsed.recommendedDealValue, parsed.recommendedMinDeal ?? 10, parsed.recommendedMaxDeal ?? 15000)
              )
            }
            if (parsed.recommendedSearchVolume) {
              setSearchVolume(clamp(parsed.recommendedSearchVolume, VOLUME_MIN, VOLUME_MAX))
            }
            if (parsed.recommendedRank) {
              setRank(parsed.recommendedRank)
            }
            return
          } else {
            window.sessionStorage.removeItem("rr_handoff")
          }
        }
        // Fallback: the checker mirrors its inputs into ?biz=&cat=&city= so a
        // new tab, an expired store, or a shared link still carries context.
        // No auto-calibration here — sliders stay on defaults.
        const params = new URLSearchParams(window.location.search)
        const biz = (params.get("biz") || "").slice(0, 100)
        const cat = (params.get("cat") || "").slice(0, 80)
        const cityParam = (params.get("city") || "").slice(0, 80)
        if (biz && cat && cityParam) {
          setHandoff({
            businessName: biz,
            category: cat,
            city: cityParam,
            mentionedCount: 0,
            totalEngines: 0,
          })
        }
      } catch {
        // ignore
      }
    }
  }, [])

  // When a calibrated handoff arrives, move focus to it (no scroll jump) and
  // announce the calibration once — separate from the dollar-figure notices.
  const [calibrationNotice, setCalibrationNotice] = React.useState("")
  React.useEffect(() => {
    if (handoff && !bannerDismissed && !handoffAnnounced.current) {
      handoffAnnounced.current = true
      const calibrated = handoff.recommendedDealValue !== undefined
      setCalibrationNotice(
        calibrated
          ? `Scan results applied for ${handoff.businessName}: ticket ${currency.format(dealValue)}, ${number.format(searchVolume)} searches.`
          : `Showing context for ${handoff.businessName}. Run a scan to auto-calibrate.`
      )
      requestAnimationFrame(() => bannerHeadingRef.current?.focus({ preventScroll: true }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoff, bannerDismissed])

  // A live region on the figure itself fires on every drag tick, which is
  // unusable with a screen reader. One debounced summary announces the settled
  // result instead; the sliders announce their own values via aria-valuetext.
  // Gated on interaction so the figure is not announced on page load.
  const [announcement, setAnnouncement] = React.useState("")

  React.useEffect(() => {
    if (!dirtyRef.current) return
    const timer = setTimeout(() => {
      setAnnouncement(
        `Estimated ${currency.format(base.monthly)} per month going to competitors, between ${currency.format(ranged.pessimistic.monthly)} and ${currency.format(ranged.optimistic.monthly)}, on ${number.format(
          base.calls
        )} missed calls and ${number.format(base.jobs)} missed jobs.`
      )
    }, 700)
    return () => clearTimeout(timer)
  }, [base.monthly, base.calls, base.jobs, ranged.pessimistic.monthly, ranged.optimistic.monthly])

  const calibrated = handoff !== null && handoff.recommendedDealValue !== undefined && !bannerDismissed ? handoff : null
  const contextOnly = handoff !== null && handoff.recommendedDealValue === undefined && !bannerDismissed ? handoff : null

  return (
    <div className="flex flex-col gap-8">
      <p className="sr-only" role="status">
        {calibrationNotice}
      </p>
      <p className="sr-only" role="status">
        {announcement}
      </p>

      {/* Contextual handoff banner from AI Diagnostic */}
      {calibrated ? (
        <div className="rounded-lg bg-canvas border border-black/8 p-6 sm:p-7 text-ink animate-fade-in">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="eyebrow block text-ink/70">
                  YOUR SCAN RESULT &middot; {calibrated.businessName.toUpperCase()} ({calibrated.city})
                </span>
              </div>
              <h3 ref={bannerHeadingRef} tabIndex={-1} className="headline text-ink outline-none">
                {calibrated.mentionedCount === 0
                  ? `In our test, AI answers sent ${calibrated.category} inquiries to competitors instead of ${calibrated.businessName}.`
                  : `Your business has partial AI visibility, but competitors are capturing overflow calls.`}
              </h3>
              <p className="body-sm text-ink/80">
                Ticket and volume preset from {bucketLabel} averages — adjust freely
                {calibrated.competitorsFound && calibrated.competitorsFound.length > 0
                  ? `; inquiries are routing to ${calibrated.competitorsFound.slice(0, 2).join(' and ')}`
                  : ''}
                .
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-black/10 bg-canvas px-3.5 py-1.5 text-xs font-medium text-ink transition-[background-color,border-color] duration-200 hover:border-black/25 hover:bg-surface-soft cursor-pointer"
                title="Hide this banner, keep my numbers"
              >
                <span aria-hidden="true">✕</span>
                <span>Dismiss</span>
              </button>
              <button
                type="button"
                onClick={handleClearHandoff}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-black/10 bg-canvas px-3.5 py-1.5 text-xs font-medium text-ink transition-[background-color,border-color] duration-200 hover:border-black/25 hover:bg-surface-soft cursor-pointer"
                title="Reset to default calculator values"
              >
                <svg className="size-3 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>Reset to default</span>
              </button>
              <a
                href="/check"
                className={buttonVariants({
                  variant: "primary",
                  size: "sm",
                })}
              >
                <span>Re-run scan</span>
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      ) : contextOnly ? (
        <div className="rounded-lg bg-canvas border border-black/8 p-6 sm:p-7 text-ink animate-fade-in">
          <div className="space-y-1.5 max-w-2xl">
            <span className="eyebrow block text-ink/70">
              YOUR SCAN RESULT &middot; {contextOnly.businessName.toUpperCase()} ({contextOnly.city})
            </span>
            <h3 ref={bannerHeadingRef} tabIndex={-1} className="headline text-ink outline-none">
              Estimate for {contextOnly.businessName} — {contextOnly.category} in {contextOnly.city}.
            </h3>
            <p className="body-sm text-ink/80">
              Sliders use defaults — <a href="/check" className="underline underline-offset-2">run the free scan</a> to auto-calibrate.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-black/8 bg-canvas p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-ink">
          <div className="space-y-1">
            <p className="label text-ink">
              Want to see your real-time AI recommendation status?
            </p>
            <p className="caption text-ink">
              Run a free ~15-second scan to automatically calibrate this calculator to your exact business and market.
            </p>
          </div>
          <a
            href="/check"
            className={buttonVariants({
              variant: "secondary",
              size: "sm",
              className: "shrink-0 w-full sm:w-auto text-center justify-center",
            })}
          >
            Run Free AI Check →
          </a>
        </div>
      )}

      {/* Main Calculator Grid */}
      <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
        {/* Left Inputs */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-6">
          <div className="rounded-lg border border-black/8 bg-canvas p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <Label htmlFor="deal-value" className="label text-ink">
                {labels?.dealValueLabel ?? "Job value"}
              </Label>
              <input
                id="deal-value-number"
                type="number"
                aria-label="Job value, exact amount"
                min={dealMin}
                max={dealMax}
                step={dealStep}
                value={dealValue}
                onChange={(e) => {
                  setDealValue(clamp(Number(e.target.value), dealMin, dealMax));
                  markDirtyAndTrack();
                }}
                onBlur={(e) => setDealValue(clamp(Number(e.target.value), dealMin, dealMax))}
                className="card-title numeric w-36 rounded-md border border-hairline bg-canvas px-2.5 py-1 text-right text-ink focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-ink"
              />
            </div>
            <input
              id="deal-value"
              type="range"
              min={dealMin}
              max={dealMax}
              step={dealStep}
              value={dealValue}
              aria-valuetext={currency.format(dealValue)}
              onChange={(e) => {
                setDealValue(Number(e.target.value));
                markDirtyAndTrack();
              }}
              style={trackFill(dealValue, dealMin, dealMax)}
              className="range-brand mt-4 w-full accent-ink"
            />
          </div>

          <div className="rounded-lg border border-black/8 bg-canvas p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <Label htmlFor="search-volume" className="label text-ink">
                {labels?.searchVolumeLabel ?? "Searches/mo"}
              </Label>
              <input
                id="search-volume-number"
                type="number"
                aria-label="Searches per month, exact number"
                min={VOLUME_MIN}
                max={VOLUME_MAX}
                step={100}
                value={searchVolume}
                onChange={(e) => {
                  setSearchVolume(clamp(Number(e.target.value), VOLUME_MIN, VOLUME_MAX));
                  markDirtyAndTrack();
                }}
                onBlur={(e) => setSearchVolume(clamp(Number(e.target.value), VOLUME_MIN, VOLUME_MAX))}
                className="card-title numeric w-36 rounded-md border border-hairline bg-canvas px-2.5 py-1 text-right text-ink focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-ink"
              />
            </div>
            <input
              id="search-volume"
              type="range"
              min={VOLUME_MIN}
              max={VOLUME_MAX}
              step={100}
              value={searchVolume}
              aria-valuetext={`${number.format(searchVolume)} searches per month`}
              onChange={(e) => {
                setSearchVolume(Number(e.target.value));
                markDirtyAndTrack();
              }}
              style={trackFill(searchVolume, VOLUME_MIN, VOLUME_MAX)}
              className="range-brand mt-4 w-full accent-ink"
            />
          </div>

          <fieldset className="min-w-0 rounded-lg border border-black/8 bg-canvas p-5 sm:p-6">
            {/* The visible label is a plain paragraph: a `legend` that has to wrap
                needs a float/clear hack to sit above the options, and floats and
                flex do not mix well. The sr-only legend keeps the group named. */}
            <legend className="sr-only">
              {labels?.rankLegend ?? "Your position today"}
            </legend>
            <p className="label text-ink" aria-hidden="true">
              {labels?.rankLegend ?? "Your position"}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {RANK_OPTIONS.map((opt, i) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-transparent px-3.5 py-2.5 transition-[background-color,border-color] duration-200 hover:bg-surface-soft has-checked:border-ink has-checked:bg-surface-soft has-focus-visible:border-ink has-focus-visible:ring-2 has-focus-visible:ring-ink/40"
                >
                  <input
                    type="radio"
                    name="rank"
                    value={opt.value}
                    checked={rank === opt.value}
                    onChange={() => {
                      setRank(opt.value);
                      markDirtyAndTrack();
                    }}
                    className="size-5 shrink-0 accent-ink"
                  />
                  <span className="body-sm text-ink">
                    {labels?.rankOptions?.[i] ?? opt.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Right Result Card */}
        <div className="min-w-0 lg:col-span-6">
          <div className="on-inverse @container rounded-lg border border-hairline bg-inverse-canvas p-6 sm:p-8 text-inverse-ink">
            <span className="eyebrow block text-inverse-ink/70">
              {labels?.resultLabel ?? "Estimated revenue going to competitors"}
            </span>

            {/* The one figure this panel exists to show. Range merged into the
                same line so the eye lands once, not three times. */}
            <p className="stat-xl mt-3 text-inverse-ink">
              {currency.format(base.monthly)}
              <span className="body-sm ml-2 align-baseline font-normal text-inverse-ink/70">
                {labels?.perMonthSuffix ?? "/mo"}
              </span>
            </p>
            <p className="caption mt-2 text-inverse-ink/70">
              Likely {currency.format(ranged.pessimistic.monthly)} – {currency.format(ranged.optimistic.monthly)}/mo
            </p>

            {/* Show-your-work trace as a scannable strip: same auditable math,
                one glance instead of four read lines. */}
            <ol
              aria-label={`${number.format(searchVolume)} searches lead to ${number.format(base.clicks)} clicks, ${number.format(base.calls)} calls, ${number.format(base.jobs)} jobs, worth ${currency.format(base.monthly)} a month`}
              className="mt-5 grid grid-cols-2 gap-2 border-t border-white/24 pt-5 @sm:grid-cols-4"
            >
              {[
                { value: number.format(searchVolume), tag: 'SEARCHES' },
                { value: number.format(base.clicks), tag: 'CLICKS' },
                { value: number.format(base.calls), tag: 'CALLS' },
                { value: `${number.format(base.jobs)} · ${currency.format(base.monthly)}`, tag: 'JOBS / MO' },
              ].map((chip) => (
                <li
                  key={chip.tag}
                  aria-hidden="true"
                  className="rounded-md bg-white/8 px-3 py-2.5 text-center"
                >
                  <span className="label numeric block text-inverse-ink">{chip.value}</span>
                  <span className="caption mt-1 block text-inverse-ink/70">{chip.tag}</span>
                </li>
              ))}
            </ol>

            <details className="body-sm mt-5 rounded-md border border-white/24 p-3.5 text-inverse-ink/85">
              <summary className="cursor-pointer font-medium text-inverse-ink">
                How this is calculated — adjust the rates
              </summary>
              <p className="caption mt-2.5">
                {number.format(searchVolume)} searches × {(GAP_SHARE[rank].mid * 100).toFixed(1)}% capturable gap × {Math.round(callRate * 100)}% call × {Math.round(closeRate * 100)}% close × {currency.format(dealValue)} ticket. {bucketLabel} averages — {bucket.call.source}; {bucket.close.source}. Top-3 dominance per {CTR_SOURCES}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="caption text-inverse-ink/70">Click-to-call % (range {Math.round(bucket.call.lo * 100)}–{Math.round(bucket.call.hi * 100)})</span>
                  <input
                    type="number"
                    min={5}
                    max={80}
                    step={1}
                    value={Math.round(callRate * 100)}
                    onChange={(e) => {
                      setCallRate(clamp(Number(e.target.value), 5, 80) / 100);
                      markDirtyAndTrack();
                    }}
                    className="rounded-md border border-white/24 bg-transparent px-2.5 py-2 text-inverse-ink [color-scheme:dark] focus-visible:border-white focus-visible:outline-2 focus-visible:outline-white"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="caption text-inverse-ink/70">Close rate % (range {Math.round(bucket.close.lo * 100)}–{Math.round(bucket.close.hi * 100)})</span>
                  <input
                    type="number"
                    min={5}
                    max={80}
                    step={1}
                    value={Math.round(closeRate * 100)}
                    onChange={(e) => {
                      setCloseRate(clamp(Number(e.target.value), 5, 80) / 100);
                      markDirtyAndTrack();
                    }}
                    className="rounded-md border border-white/24 bg-transparent px-2.5 py-2 text-inverse-ink [color-scheme:dark] focus-visible:border-white focus-visible:outline-2 focus-visible:outline-white"
                  />
                </label>
              </div>
            </details>

            <div className="mt-6">
              <Button
                render={<a href="/book-a-call" />}
                variant="inverse"
                size="lg"
                block
                className="h-auto min-h-13 py-3 text-center whitespace-normal justify-center"
                onClick={trackNow}
              >
                {labels?.cta ?? "Book a 30-min call to win it back"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
