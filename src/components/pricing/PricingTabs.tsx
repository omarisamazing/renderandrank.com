import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CheckIcon, ClockIcon, ShieldCheckIcon } from "lucide-react"

export interface PricingTier {
  id: string
  name: string
  badge?: string
  isPopular?: boolean
  price: string
  period: string
  delivery: string
  description: string
  features: string[]
  ctaText: string
  ctaHref: string
  guarantee: string
}

/**
 * DESIGN.md's pill toggle: the selected tab uses the same black surface as the
 * primary CTA, so an active tab reads as an action rather than a passive state.
 */
export function PricingTabs({
  oneTime,
  monthly,
  calNamespace,
  calLink,
}: {
  oneTime: PricingTier[]
  monthly: PricingTier[]
  calNamespace: string
  calLink: string
}) {
  return (
    <Tabs defaultValue="one-time" className="gap-0">
      <div className="flex justify-center">
        <TabsList className="h-auto gap-1 rounded-pill border border-hairline bg-canvas p-1.5">
          <TabsTrigger
            value="one-time"
            className="h-10 rounded-pill px-5 text-[0.9375rem] font-medium tracking-[-0.006em] text-ink after:hidden data-active:bg-ink data-active:text-canvas data-active:shadow-none hover:text-ink"
          >
            One-time cleanup
          </TabsTrigger>
          <TabsTrigger
            value="monthly"
            className="h-10 rounded-pill px-5 text-[0.9375rem] font-medium tracking-[-0.006em] text-ink after:hidden data-active:bg-ink data-active:text-canvas data-active:shadow-none hover:text-ink"
          >
            Monthly retainer
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="one-time" className="mt-12 md:mt-14">
        <TierGrid
          tiers={oneTime}
          calNamespace={calNamespace}
          calLink={calLink}
        />
      </TabsContent>
      <TabsContent value="monthly" className="mt-12 md:mt-14">
        <TierGrid tiers={monthly} calNamespace={calNamespace} calLink={calLink} />
      </TabsContent>
    </Tabs>
  )
}

function TierGrid({
  tiers,
  calNamespace,
  calLink,
}: {
  tiers: PricingTier[]
  calNamespace: string
  calLink: string
}) {
  return (
    <div className="grid items-stretch gap-6 lg:grid-cols-3">
      {tiers.map((tier) => (
        <article
          key={tier.id}
          className={cn(
            "relative flex flex-col rounded-lg bg-canvas p-6 md:p-7",
            tier.isPopular
              ? "border-2 border-ink"
              : "border border-hairline"
          )}
        >
          {tier.isPopular ? (
            <span className="eyebrow absolute -top-3 left-6 rounded-pill bg-ink px-3 py-1 text-canvas">
              Most chosen
            </span>
          ) : null}

          <h3 className="card-title text-ink">{tier.name}</h3>
          <p className="body-sm mt-2.5 text-ink">{tier.description}</p>

          <div className="mt-6 flex items-baseline gap-2 border-y border-hairline py-5">
            <span className="stat numeric text-ink">{tier.price}</span>
            <span className="body-sm text-ink">{tier.period}</span>
          </div>

          <p className="caption mt-4 inline-flex items-center gap-2 text-ink">
            <ClockIcon className="size-4 shrink-0" aria-hidden="true" />
            {tier.delivery}
          </p>

          <ul className="mt-6 flex flex-1 flex-col gap-3">
            {tier.features.map((feature) => (
              <li key={feature} className="flex gap-2.5">
                <CheckIcon
                  className="mt-0.5 size-4 shrink-0 text-success"
                  aria-hidden="true"
                />
                <span className="body-sm text-ink">{feature}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col gap-3 border-t border-hairline pt-6">
            <Button
              render={<a href={tier.ctaHref} />}
              variant={tier.isPopular ? "primary" : "secondary"}
              size="md"
              block
              data-cal-namespace={calNamespace}
              data-cal-link={calLink}
              data-cal-config='{"layout":"month_view"}'
            >
              {tier.ctaText}
            </Button>
            <p className="caption inline-flex items-start gap-2 text-ink">
              <ShieldCheckIcon
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              {tier.guarantee}
            </p>
          </div>
        </article>
      ))}
    </div>
  )
}
