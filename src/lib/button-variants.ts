import { cva, type VariantProps } from "class-variance-authority"

/**
 * Pill is the only button shape in this system (DESIGN.md: "Don't square off
 * CTAs"). Shared between the React `Button` and the Astro `Button` so a CTA
 * looks identical whether or not the island hydrates.
 *
 * Every size clears a 44px tap target at or below the tablet breakpoint.
 */
export const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center gap-2",
    "rounded-pill border border-transparent whitespace-nowrap",
    "cursor-pointer select-none no-underline",
    "transition-[background-color,color,border-color,transform] duration-200 ease-brand",
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
    "active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /* The black pill. One per viewport. */
        primary: "bg-ink text-canvas hover:bg-[#1f1f1f]",
        /* White pill with a hairline — the counterpart to primary. */
        secondary:
          "bg-canvas text-ink border-hairline hover:bg-surface-soft hover:border-[#d4d4d1]",
        /* Text link styled as a hit target. */
        ghost: "bg-transparent text-ink hover:bg-surface-soft",
        /* For use on navy / inverse-canvas surfaces. */
        inverse: "bg-canvas text-ink hover:bg-[#ececea]",
        inverseGhost:
          "bg-white/12 text-inverse-ink hover:bg-white/20 border-white/15",
        /* Single-shot promo colour. One per page, never two. */
        promo: "bg-accent-magenta text-canvas hover:brightness-108",
      },
      size: {
        sm: "h-10 px-4 text-[0.9375rem] font-medium tracking-[-0.006em]",
        md: "h-11 px-5 text-[0.9375rem] font-medium tracking-[-0.006em]",
        lg: "h-13 px-7 text-[1.0625rem] font-medium tracking-[-0.008em]",
        icon: "size-11 rounded-full px-0",
        "icon-sm": "size-10 rounded-full px-0",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
