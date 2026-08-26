import * as React from "react"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

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

const CALL_RATE = 0.35 // clicks that become a phone call
const CLOSE_RATE = 0.4 // calls that become a job

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})
const number = new Intl.NumberFormat("en-US")

/**
 * Estimator for the revenue sitting with competitors. Deliberately conservative,
 * and it shows its inputs — the point is to open a conversation, not to look
 * precise about something nobody can know exactly.
 */
export function RoiCalculator() {
  const [dealValue, setDealValue] = React.useState(1500)
  const [searchVolume, setSearchVolume] = React.useState(2500)
  const [rank, setRank] = React.useState<string>("mid")

  const option = RANK_OPTIONS.find((o) => o.value === rank) ?? RANK_OPTIONS[1]

  const missedClicks = Math.round(searchVolume * option.missedShare)
  const missedCalls = Math.max(5, Math.round(missedClicks * CALL_RATE))
  const missedJobs = Math.max(2, Math.round(missedCalls * CLOSE_RATE))
  const monthly = missedJobs * dealValue

  return (
    <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
      {/* Inputs */}
      <div className="flex flex-col gap-4 lg:col-span-6">
        <fieldset className="rounded-md border border-white/15 bg-white/5 p-5">
          <div className="flex items-baseline justify-between gap-4">
            <Label htmlFor="deal-value" className="label text-inverse-ink">
              Average job value
            </Label>
            <output
              htmlFor="deal-value"
              className="numeric text-[1.25rem] font-medium text-block-lime"
            >
              {currency.format(dealValue)}
            </output>
          </div>
          <input
            id="deal-value"
            type="range"
            min={200}
            max={15000}
            step={100}
            value={dealValue}
            onChange={(e) => setDealValue(Number(e.target.value))}
            className="mt-4 w-full accent-[#dceeb1]"
          />
          <div className="mt-2 flex justify-between">
            <span className="caption text-inverse-ink">$200</span>
            <span className="caption text-inverse-ink">$15,000</span>
          </div>
        </fieldset>

        <fieldset className="rounded-md border border-white/15 bg-white/5 p-5">
          <div className="flex items-baseline justify-between gap-4">
            <Label htmlFor="search-volume" className="label text-inverse-ink">
              Monthly local searches
            </Label>
            <output
              htmlFor="search-volume"
              className="numeric text-[1.25rem] font-medium text-block-lime"
            >
              {number.format(searchVolume)}
            </output>
          </div>
          <input
            id="search-volume"
            type="range"
            min={300}
            max={10000}
            step={100}
            value={searchVolume}
            onChange={(e) => setSearchVolume(Number(e.target.value))}
            className="mt-4 w-full accent-[#dceeb1]"
          />
          <div className="mt-2 flex justify-between">
            <span className="caption text-inverse-ink">300</span>
            <span className="caption text-inverse-ink">10,000+</span>
          </div>
        </fieldset>

        <fieldset className="rounded-md border border-white/15 bg-white/5 p-5">
          <legend className="label text-inverse-ink">
            Where you rank in Maps today
          </legend>
          <div className="mt-4 flex flex-col gap-2">
            {RANK_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors has-checked:bg-white/10"
              >
                <input
                  type="radio"
                  name="rank"
                  value={opt.value}
                  checked={rank === opt.value}
                  onChange={() => setRank(opt.value)}
                  className="size-4 accent-[#dceeb1]"
                />
                <span className="body-sm text-inverse-ink">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Result */}
      <div className="lg:col-span-6">
        <div className="rounded-lg border border-white/15 bg-inverse-canvas p-6 md:p-8">
          <p className="caption text-inverse-ink">
            Estimated revenue going to competitors
          </p>

          <p
            className="numeric mt-3 text-[clamp(2.5rem,7vw,4rem)] leading-none font-medium text-block-lime"
            aria-live="polite"
          >
            {currency.format(monthly)}
            <span className="body-lg ml-2 align-baseline text-inverse-ink">
              /mo
            </span>
          </p>

          <p className="body-sm mt-4 text-inverse-ink">
            About {currency.format(monthly * 12)} a year, on{" "}
            {number.format(missedCalls)} calls and {number.format(missedJobs)} jobs
            you never saw.
          </p>

          <dl className="mt-7 grid grid-cols-2 gap-4 border-t border-white/15 pt-6">
            <div>
              <dt className="caption text-inverse-ink">Missed calls / mo</dt>
              <dd className="numeric mt-1 text-[1.5rem] font-medium text-inverse-ink">
                {number.format(missedCalls)}
              </dd>
            </div>
            <div>
              <dt className="caption text-inverse-ink">Missed jobs / mo</dt>
              <dd className="numeric mt-1 text-[1.5rem] font-medium text-inverse-ink">
                {number.format(missedJobs)}
              </dd>
            </div>
          </dl>

          <div className="mt-7">
            <Button
              render={<a href="/book-a-call" />}
              variant="inverse"
              size="lg"
              block
            >
              Check this against your real grid
            </Button>
            <p className="caption mt-3 text-center text-inverse-ink">
              Assumes a {Math.round(CALL_RATE * 100)}% click-to-call rate and a{" "}
              {Math.round(CLOSE_RATE * 100)}% close rate.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
