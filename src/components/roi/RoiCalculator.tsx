import * as React from "react"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/lib/button-variants"
import { getVisitorId } from "../../lib/visitorClient"

const RANK_OPTIONS = [
  {
    value: "invisible",
    label: "Not in top 10 / Invisible in AI",
    /** Share of local clicks currently going elsewhere that you could win. */
    missedShare: 0.055,
  },
  { value: "mid", label: "Position 4–10 (Partial presence)", missedShare: 0.035 },
  { value: "top3", label: "Top 3 / Active AI Recommendation", missedShare: 0.02 },
] as const

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
  recommendedRank?: "invisible" | "mid" | "top3"
  mentionedCount: number
  totalEngines: number
}

export interface RoiCalculatorLabels {
  dealValueLabel?: string
  dealValueMin?: string
  dealValueMax?: string
  searchVolumeLabel?: string
  searchVolumeMin?: string
  searchVolumeMax?: string
  rankLegend?: string
  rankOptions?: readonly (string | undefined)[]
  resultLabel?: string
  perMonthSuffix?: string
  summary?: string
  missedCallsLabel?: string
  missedJobsLabel?: string
  cta?: string
  assumptions?: string
}

export interface RoiCalculatorProps {
  labels?: RoiCalculatorLabels
}

const CALL_RATE = 0.35 // clicks that become a phone call
const CLOSE_RATE = 0.4 // calls that become a job

const DEFAULT_DEAL_MIN = 200
const DEFAULT_DEAL_MAX = 15000
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

export function RoiCalculator({ labels }: RoiCalculatorProps = {}) {
  const [dealValue, setDealValue] = React.useState(1500)
  const [searchVolume, setSearchVolume] = React.useState(2500)
  const [rank, setRank] = React.useState<string>("mid")
  const [handoff, setHandoff] = React.useState<HandoffData | null>(null)

  function handleClearHandoff() {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.removeItem("rr_handoff")
    }
    setHandoff(null)
    setDealValue(1500)
    setSearchVolume(2500)
    setRank("mid")
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
            setHandoff(parsed)
            if (parsed.recommendedDealValue) {
              setDealValue(parsed.recommendedDealValue)
            }
            if (parsed.recommendedSearchVolume) {
              setSearchVolume(parsed.recommendedSearchVolume)
            }
            if (parsed.recommendedRank) {
              setRank(parsed.recommendedRank)
            }
          } else {
            window.sessionStorage.removeItem("rr_handoff")
          }
        }
      } catch {
        // ignore
      }
    }
  }, [])

  const option = RANK_OPTIONS.find((o) => o.value === rank) ?? RANK_OPTIONS[1]

  const dealMin = handoff?.recommendedMinDeal ?? (dealValue < 100 ? 10 : DEFAULT_DEAL_MIN)
  const dealMax = handoff?.recommendedMaxDeal ?? (dealValue < 100 ? 500 : DEFAULT_DEAL_MAX)
  const dealStep = dealMax <= 500 ? 5 : 100

  const missedClicks = Math.round(searchVolume * option.missedShare)
  const missedCalls = Math.max(5, Math.round(missedClicks * CALL_RATE))
  const missedJobs = Math.max(2, Math.round(missedCalls * CLOSE_RATE))
  const monthly = missedJobs * dealValue

  // A live region on the figure itself fires on every drag tick, which is
  // unusable with a screen reader. One debounced summary announces the settled
  // result instead; the sliders announce their own values via aria-valuetext.
  const [announcement, setAnnouncement] = React.useState("")

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setAnnouncement(
        `Estimated ${currency.format(monthly)} per month going to competitors, on ${number.format(
          missedCalls
        )} missed calls and ${number.format(missedJobs)} missed jobs.`
      )
    }, 700)
    return () => clearTimeout(timer)
  }, [monthly, missedCalls, missedJobs])

  return (
    <div className="flex flex-col gap-8">
      <p className="sr-only" role="status">
        {announcement}
      </p>

      {/* Contextual handoff banner from AI Diagnostic */}
      {handoff ? (
        <div className="rounded-lg bg-canvas border border-black/8 p-6 sm:p-7 text-ink animate-fade-in">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="eyebrow block text-ink/70">
                  DIAGNOSTIC CONTEXT &middot; {handoff.businessName.toUpperCase()} ({handoff.city})
                </span>
              </div>
              <h3 className="headline text-ink">
                {handoff.mentionedCount === 0
                  ? `AI search engines are directing 100% of ${handoff.category} inquiries to competitors.`
                  : `Your business has partial AI visibility, but competitors are capturing overflow calls.`}
              </h3>
              <p className="body-sm text-ink/80">
                {handoff.competitorsFound && handoff.competitorsFound.length > 0 ? (
                  <span>
                    Inquiries for <strong>{handoff.category}</strong> in {handoff.city} are being routed to competitors like{" "}
                    <strong>{handoff.competitorsFound.slice(0, 2).join(" and ")}</strong>. We've auto-calibrated your estimated ticket size (<strong>{currency.format(dealValue)}</strong>) and search volume below.
                  </span>
                ) : (
                  <span>
                    We've auto-calibrated your estimated ticket size (<strong>{currency.format(dealValue)}</strong>) and search volume below based on your local market.
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
              <button
                type="button"
                onClick={handleClearHandoff}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-canvas px-3.5 py-1.5 text-xs font-medium text-ink transition-[background-color,border-color] duration-200 hover:border-black/25 hover:bg-surface-soft cursor-pointer"
                title="Reset to default calculator values"
              >
                <svg className="size-3 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      ) : (
        <div className="rounded-lg border border-black/8 bg-canvas p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-ink">
          <div className="space-y-1">
            <p className="label text-ink">
              Want to see your real-time AI recommendation status first?
            </p>
            <p className="caption text-ink">
              Run a free 10-second scan to automatically calibrate this calculator to your exact business and market.
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
          <fieldset className="rounded-lg border border-black/8 bg-canvas p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <Label htmlFor="deal-value" className="label text-ink">
                {labels?.dealValueLabel ?? "Average customer / job value"}
              </Label>
              <output
                htmlFor="deal-value"
                className="card-title numeric text-ink"
              >
                {currency.format(dealValue)}
              </output>
            </div>
            <input
              id="deal-value"
              type="range"
              min={dealMin}
              max={dealMax}
              step={dealStep}
              value={dealValue}
              aria-valuetext={currency.format(dealValue)}
              onChange={(e) => setDealValue(Number(e.target.value))}
              style={trackFill(dealValue, dealMin, dealMax)}
              className="range-brand mt-4 w-full accent-ink"
            />
            <div className="mt-2 flex justify-between">
              <span className="caption text-ink">{currency.format(dealMin)}</span>
              <span className="caption text-ink">{currency.format(dealMax)}</span>
            </div>
          </fieldset>

          <fieldset className="rounded-lg border border-black/8 bg-canvas p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <Label htmlFor="search-volume" className="label text-ink">
                {labels?.searchVolumeLabel ?? "Monthly local search demand"}
              </Label>
              <output
                htmlFor="search-volume"
                className="card-title numeric text-ink"
              >
                {number.format(searchVolume)}
              </output>
            </div>
            <input
              id="search-volume"
              type="range"
              min={VOLUME_MIN}
              max={VOLUME_MAX}
              step={100}
              value={searchVolume}
              aria-valuetext={`${number.format(searchVolume)} searches per month`}
              onChange={(e) => setSearchVolume(Number(e.target.value))}
              style={trackFill(searchVolume, VOLUME_MIN, VOLUME_MAX)}
              className="range-brand mt-4 w-full accent-ink"
            />
            <div className="mt-2 flex justify-between">
              <span className="caption text-ink">{number.format(VOLUME_MIN)} searches</span>
              <span className="caption text-ink">{number.format(VOLUME_MAX)}+ searches</span>
            </div>
          </fieldset>

          <fieldset className="min-w-0 rounded-lg border border-black/8 bg-canvas p-5 sm:p-6">
            {/* The visible label is a plain paragraph: a `legend` that has to wrap
                needs a float/clear hack to sit above the options, and floats and
                flex do not mix well. The sr-only legend keeps the group named. */}
            <legend className="sr-only">
              {labels?.rankLegend ?? "Where you rank in Maps & AI answers today"}
            </legend>
            <p className="label text-ink" aria-hidden="true">
              {labels?.rankLegend ?? "Where you rank in Maps & AI answers today"}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {RANK_OPTIONS.map((opt, i) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-transparent px-3.5 py-2.5 transition-[background-color,border-color] duration-200 hover:bg-surface-soft has-checked:border-ink has-checked:bg-surface-soft"
                >
                  <input
                    type="radio"
                    name="rank"
                    value={opt.value}
                    checked={rank === opt.value}
                    onChange={() => setRank(opt.value)}
                    className="size-4 accent-ink"
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
          <div className="@container rounded-lg border border-hairline bg-inverse-canvas p-6 sm:p-8 text-inverse-ink">
            <span className="eyebrow block text-inverse-ink/70">
              {labels?.resultLabel ?? "Estimated Monthly Revenue Lost to Competitors"}
            </span>

            {/* The one figure this panel exists to show, so it outranks the two
                supporting figures below rather than matching them. */}
            <p className="stat-xl mt-3 text-inverse-ink">
              {currency.format(monthly)}
              <span className="body-sm ml-2 align-baseline font-normal text-inverse-ink/70">
                {labels?.perMonthSuffix ?? "/mo"}
              </span>
            </p>

            <p className="body-sm mt-4 text-inverse-ink/85">
              {labels?.summary
                ? labels.summary
                    .replace("{year}", currency.format(monthly * 12))
                    .replace("{calls}", number.format(missedCalls))
                    .replace("{jobs}", number.format(missedJobs))
                : `About ${currency.format(monthly * 12)} annually in missed jobs. That represents approximately ${number.format(
                    missedCalls
                  )} direct customer phone calls per month currently going to competing businesses.`}
            </p>

            <dl className="mt-7 grid grid-cols-2 gap-4 border-t border-white/16 pt-6">
              <div>
                <dt className="caption text-inverse-ink/70">
                  {labels?.missedCallsLabel ?? "Missed customer calls / mo"}
                </dt>
                <dd className="card-title numeric mt-1.5 text-inverse-ink">
                  {number.format(missedCalls)}
                </dd>
              </div>
              <div>
                <dt className="caption text-inverse-ink/70">
                  {labels?.missedJobsLabel ?? "Missed closed jobs / mo"}
                </dt>
                <dd className="card-title numeric mt-1.5 text-inverse-ink">
                  {number.format(missedJobs)}
                </dd>
              </div>
            </dl>

            <div className="mt-8">
              <Button
                render={<a href="/book-a-call" />}
                variant="inverse"
                size="lg"
                block
                className="h-auto min-h-13 py-3 text-center whitespace-normal justify-center"
              >
                {labels?.cta ?? "Claim Your Spot — Book a 20-Min Strategy Call →"}
              </Button>
              <p className="caption mt-3 text-center text-inverse-ink/60">
                {labels?.assumptions
                  ? labels.assumptions
                      .replace("{callRate}", String(Math.round(CALL_RATE * 100)))
                      .replace("{closeRate}", String(Math.round(CLOSE_RATE * 100)))
                  : `Assumes conservative ${Math.round(CALL_RATE * 100)}% click-to-call rate and ${Math.round(
                      CLOSE_RATE * 100
                    )}% close rate.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
