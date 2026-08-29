import * as React from "react"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { getVisitorId } from "../../lib/visitorClient"

const RANK_OPTIONS = [
  {
    value: "invisible",
    label: "Not in the top 10",
    /** Share of local clicks currently going elsewhere that you could win. */
    missedShare: 0.055,
  },
  { value: "mid", label: "Position 4–10", missedShare: 0.035 },
  { value: "top3", label: "Already top 3", missedShare: 0.02 },
] as const

interface HandoffData {
  businessName: string
  category: string
  city: string
  mentionedCount: number
  totalEngines: number
}

/**
 * Visible copy, all optional. Each string falls back to the current English
 * default at the render site, so the component is unchanged when no props are
 * passed. `rankOptions[i]` overrides only the displayed label of RANK_OPTIONS[i];
 * the option values, order and length are untouched.
 */
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
  /** Rendered with {year}, {calls} and {jobs} placeholders. */
  summary?: string
  missedCallsLabel?: string
  missedJobsLabel?: string
  cta?: string
  /** Rendered with {callRate} and {closeRate} placeholders. */
  assumptions?: string
}

export interface RoiCalculatorProps {
  labels?: RoiCalculatorLabels
}

const CALL_RATE = 0.35 // clicks that become a phone call
const CLOSE_RATE = 0.4 // calls that become a job

/** Slider bounds live next to the fill helper so the two can't drift apart. */
const DEAL_MIN = 200
const DEAL_MAX = 15000
const VOLUME_MIN = 300
const VOLUME_MAX = 10000

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})
const number = new Intl.NumberFormat("en-US")

/**
 * Track-fill position as a 0–1 number, read by `.range-brand` to paint the
 * filled portion of the track. No engine exposes that through `accent-color`,
 * so the value has to reach CSS as a custom property.
 */
function trackFill(value: number, min: number, max: number) {
  return { "--range-fill-n": (value - min) / (max - min) } as React.CSSProperties
}

/**
 * Estimator for the revenue sitting with competitors. Deliberately conservative,
 * and it shows its inputs — the point is to open a conversation, not to look
 * precise about something nobody can know exactly.
 */
export function RoiCalculator({ labels }: RoiCalculatorProps = {}) {
  const [dealValue, setDealValue] = React.useState(1500)
  const [searchVolume, setSearchVolume] = React.useState(2500)
  const [rank, setRank] = React.useState<string>("mid")
  const [handoff, setHandoff] = React.useState<HandoffData | null>(null)

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        const stored = window.sessionStorage.getItem("rr_handoff")
        if (stored) {
          const parsed = JSON.parse(stored) as HandoffData
          if (parsed && parsed.businessName) {
            setHandoff(parsed)
          }
        }
      } catch {
        // ignore
      }
    }
  }, [])

  const option = RANK_OPTIONS.find((o) => o.value === rank) ?? RANK_OPTIONS[1]

  const missedClicks = Math.round(searchVolume * option.missedShare)
  const missedCalls = Math.max(5, Math.round(missedClicks * CALL_RATE))
  const missedJobs = Math.max(2, Math.round(missedCalls * CLOSE_RATE))
  const monthly = missedJobs * dealValue

  return (
    <div className="flex flex-col gap-6">
      {/* Contextual handoff banner from AI Checker */}
      {handoff ? (
        <div className="rounded-lg bg-block-lime border border-emerald-300 p-5 text-ink animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="eyebrow block text-xs font-mono font-bold uppercase tracking-wider text-ink/70">
                AI Diagnostic Result &middot; {handoff.businessName} ({handoff.city})
              </span>
              <p className="body-sm mt-1 font-semibold text-ink">
                {handoff.mentionedCount === 0
                  ? `Your business wasn't cited in AI search results for "${handoff.category}" in ${handoff.city}.`
                  : `Your business was cited in ${handoff.mentionedCount}/${handoff.totalEngines} tested AI answer engines.`}
              </p>
              <p className="text-xs text-ink/80 mt-0.5">
                Here is an estimate of the monthly call and job volume currently flowing to top-ranked competitors instead.
              </p>
            </div>
            <a
              href="/check"
              className="shrink-0 text-xs font-mono font-medium underline underline-offset-4 text-ink hover:opacity-75"
            >
              Re-run scan &rarr;
            </a>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-black/8 bg-canvas/80 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-ink">
          <span>Curious if ChatGPT and Gemini recommend you right now?</span>
          <a
            href="/check"
            className="font-mono font-semibold underline underline-offset-4 text-ink hover:opacity-75 shrink-0"
          >
            Run free AI Visibility Check &rarr;
          </a>
        </div>
      )}

      <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
      {/* Inputs */}
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-6">
        <fieldset className="rounded-md border border-black/8 bg-canvas p-5">
          <div className="flex items-baseline justify-between gap-4">
            <Label htmlFor="deal-value" className="label text-ink">
              {labels?.dealValueLabel ?? "Average job value"}
            </Label>
            <output
              htmlFor="deal-value"
              className="numeric text-[1.25rem] font-medium text-ink"
            >
              {currency.format(dealValue)}
            </output>
          </div>
          <input
            id="deal-value"
            type="range"
            min={DEAL_MIN}
            max={DEAL_MAX}
            step={100}
            value={dealValue}
            onChange={(e) => setDealValue(Number(e.target.value))}
            style={trackFill(dealValue, DEAL_MIN, DEAL_MAX)}
            className="range-brand mt-4 w-full accent-ink"
          />
          <div className="mt-2 flex justify-between">
            <span className="caption text-ink">{labels?.dealValueMin ?? "$200"}</span>
            <span className="caption text-ink">{labels?.dealValueMax ?? "$15,000"}</span>
          </div>
        </fieldset>

        <fieldset className="rounded-md border border-black/8 bg-canvas p-5">
          <div className="flex items-baseline justify-between gap-4">
            <Label htmlFor="search-volume" className="label text-ink">
              {labels?.searchVolumeLabel ?? "Monthly local searches"}
            </Label>
            <output
              htmlFor="search-volume"
              className="numeric text-[1.25rem] font-medium text-ink"
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
            onChange={(e) => setSearchVolume(Number(e.target.value))}
            style={trackFill(searchVolume, VOLUME_MIN, VOLUME_MAX)}
            className="range-brand mt-4 w-full accent-ink"
          />
          <div className="mt-2 flex justify-between">
            <span className="caption text-ink">{labels?.searchVolumeMin ?? "300"}</span>
            <span className="caption text-ink">{labels?.searchVolumeMax ?? "10,000+"}</span>
          </div>
        </fieldset>

        <fieldset className="min-w-0 rounded-md border border-black/8 bg-canvas p-5">
          {/* Floated so the legend opts out of being laid into the fieldset's
              block-start border, where a string this long straddles the edge and
              gets clipped. As a full-width float inside the padding box it wraps
              freely and lines up with the labels on the cards above; the sibling
              flex container establishes a BFC, so it clears the float on its own. */}
          <legend className="label float-left w-full text-ink break-words">
            {labels?.rankLegend ?? "Where you rank in Maps today"}
          </legend>
          <div className="mt-6 flex clear-both flex-col gap-2">
            {RANK_OPTIONS.map((opt, i) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors has-checked:bg-block-lilac"
              >
                <input
                  type="radio"
                  name="rank"
                  value={opt.value}
                  checked={rank === opt.value}
                  onChange={() => setRank(opt.value)}
                  className="size-4 accent-ink"
                />
                <span className="body-sm text-ink">{labels?.rankOptions?.[i] ?? opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Result */}
      <div className="min-w-0 lg:col-span-6">
        <div className="@container rounded-lg border border-white/16 bg-inverse-canvas p-6 md:p-8">
          <p className="caption text-inverse-ink">
            {labels?.resultLabel ?? "Estimated revenue going to competitors"}
          </p>

          {/* Sized in cqw, not vw: at seven figures the number is wider than
              the card's own column, which vw can't see. */}
          <p
            className="numeric mt-3 text-[clamp(2rem,13cqw,4rem)] leading-none font-medium text-block-lilac"
            aria-live="polite"
          >
            {currency.format(monthly)}
            <span className="body-lg ml-2 align-baseline text-inverse-ink">
              {labels?.perMonthSuffix ?? "/mo"}
            </span>
          </p>

          <p className="body-sm mt-4 text-inverse-ink">
            {labels?.summary
              ? labels.summary
                  .replace("{year}", currency.format(monthly * 12))
                  .replace("{calls}", number.format(missedCalls))
                  .replace("{jobs}", number.format(missedJobs))
              : `About ${currency.format(monthly * 12)} a year, on ${number.format(missedCalls)} calls and ${number.format(missedJobs)} jobs you never saw.`}
          </p>

          <dl className="mt-7 grid grid-cols-2 gap-4 border-t border-white/16 pt-6">
            <div>
              <dt className="caption text-inverse-ink">{labels?.missedCallsLabel ?? "Missed calls / mo"}</dt>
              <dd className="numeric mt-1 text-[1.5rem] font-medium text-inverse-ink">
                {number.format(missedCalls)}
              </dd>
            </div>
            <div>
              <dt className="caption text-inverse-ink">{labels?.missedJobsLabel ?? "Missed jobs / mo"}</dt>
              <dd className="numeric mt-1 text-[1.5rem] font-medium text-inverse-ink">
                {number.format(missedJobs)}
              </dd>
            </div>
          </dl>

          <div className="mt-7">
            <Button
              render={
                /* Navigates to the dedicated /book-a-call page, where the
                   scheduler is already inlined and preloaded — no click-time
                   popup, so nothing to wait on. */
                <a href="/book-a-call" />
              }
              variant="inverse"
              size="lg"
              block
              /* The label is longer than a phone-width card, so let it wrap
                 instead of setting the card's min-content width. */
              className="h-auto min-h-13 py-2.5 text-center whitespace-normal"
            >
              {labels?.cta ?? "Check this against your real grid"}
            </Button>
            <p className="caption mt-3 text-center text-inverse-ink">
              {labels?.assumptions
                ? labels.assumptions
                    .replace("{callRate}", String(Math.round(CALL_RATE * 100)))
                    .replace("{closeRate}", String(Math.round(CLOSE_RATE * 100)))
                : `Assumes a ${Math.round(CALL_RATE * 100)}% click-to-call rate and a ${Math.round(CLOSE_RATE * 100)}% close rate.`}
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}

