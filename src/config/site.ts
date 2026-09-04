export interface SiteConfig {
  name: string;
  domain: string;
  url: string;
  tagline: string;
  description: string;
  founder: {
    name: string;
    role: string;
    bio: string;
    /** Author credential line shown on article bylines. */
    credentials: string;
    /** Author profile + publication URLs for Person sameAs. */
    sameAs: string[];
    /** Topics the author covers (knowsAbout). */
    knowsAbout: string[];
    /**
     * NOTE: No longer used for rendering. The founder portrait is now imported
     * as an optimized asset via `astro:assets` (see FounderSection.astro and
     * contact.astro, which import `src/assets/founder-omar-ali.png`). This value
     * is retained only for reference / non-Astro consumers.
     */
    avatar: string;
  };
  calCom: {
    /** Embed namespace — one per page, shared by the popup and inline calendar. */
    namespace: string;
    /** `<user-or-team>/<event-type>` as it appears in the cal.com URL. */
    eventLink: string;
    duration: string;
    platform: string;
    brandColor: string;
  };
  contact: {
    email: string;
    phone: string;
    address: string;
    hours: string;
  };
  forms: {
    /**
     * POST target for the free-audit form (Formspree, Basin, a Worker, …).
     * Leave null and the form falls back to composing an email instead of
     * silently dropping the submission.
     */
    auditEndpoint: string | null;
    /**
     * POST target for the contact "Send a message" form. Defaults to the
     * built-in Cloudflare Pages Function at `/api/contact`. If that endpoint
     * is unreachable or unconfigured, the form gracefully falls back to a
     * mailto draft so a submission is never lost.
     */
    contactEndpoint: string | null;
  };
  /**
   * Public (build-time) Cloudflare Turnstile site key. When non-empty the
   * contact / audit forms render the Turnstile widget; when empty they render
   * exactly as before with no widget or script. Server-side verification is
   * gated separately on `TURNSTILE_SECRET_KEY` in the Pages Function.
   */
  turnstileSiteKey: string;
  socials: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    youtube?: string;
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    reddit?: string;
  };
}

export const siteConfig: SiteConfig = {
  name: "Render and Rank",
  domain: "renderandrank.com",
  url: "https://renderandrank.com",
  tagline: "Local SEO, AEO & Generative Engine Optimization for Modern Businesses",
  description:
    "We help local businesses dominate Google Search, Google Maps 3-Pack, and AI Answer Engines (ChatGPT, Gemini, Perplexity, and AI Overviews). High-converting, zero-fluff search engineering.",
  founder: {
    name: "Omar Ali",
    role: "Founder & Lead Search Engineer",
    bio: "Obsessed with algorithmic search, entity graphs, and generative AI engines. I work directly with business owners to build high-converting local monopolies without agency bloat or junior account managers.",
    credentials: "10+ years driving organic growth for local businesses across the US, UK & Europe",
    sameAs: [
      "https://x.com/renderandrank",
      "https://linkedin.com/company/renderandrank",
      "https://youtube.com/@renderandrank",
    ],
    knowsAbout: [
      "Local SEO",
      "Google Business Profile",
      "Generative Engine Optimization",
      "Answer Engine Optimization",
      "Schema.org structured data",
    ],
    avatar: "/Omar Ali's Facebook Profile cropped.png",
  },
  calCom: {
    // Live event type on the Render and Rank Cal.com account (username
    // "renderandrank.com", event type id 6834737). `eventLink` is the exact
    // `<user-or-team>/<event-type>` slug from the cal.com URL:
    // https://cal.com/renderandrank.com/discovery. Everything else (the popup
    // on every CTA, the inline calendar on /book-a-call) reads from here.
    namespace: "discovery",
    eventLink: "renderandrank.com/discovery",
    duration: "30 min",
    platform: "Cal Video",
    brandColor: "#000000",
  },
  contact: {
    email: "hello@renderandrank.com",
    phone: "+1 (888) 736-3371",
    address: "Dhaka, Bangladesh — serving the USA, UK & Europe (US virtual office)",
    hours: "Mon–Fri · US, UK & EU hours covered",
  },
  forms: {
    auditEndpoint: null,
    contactEndpoint: "/api/contact",
  },
  turnstileSiteKey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ?? "",
  socials: {
    twitter: "https://x.com/renderandrank",
    linkedin: "https://linkedin.com/company/renderandrank",
    youtube: "https://youtube.com/@renderandrank",
    facebook: "https://facebook.com/renderandrank",
    instagram: "https://instagram.com/renderandrank",
    tiktok: "https://tiktok.com/@renderandrank",
    reddit: "https://reddit.com/r/renderandrank",
  },
};

export interface NavChild {
  name: string;
  description: string;
  href: string;
  tag?: string;
}

export interface NavLink {
  name: string;
  href: string;
  /** Footer row label when this entry renders as a dropdown menu. */
  footerLabel?: string;
  children?: NavChild[];
}

export const navLinks: NavLink[] = [
  { name: "Home", href: "/" },
  {
    name: "Services",
    href: "/services",
    children: [
      {
        name: "Local SEO Dominance",
        description: "Google Maps 3-pack, hyper-local rankings & citation networks.",
        href: "/services/local-seo",
        tag: "Core",
      },
      {
        name: "AEO & GEO Optimization",
        description: "Get cited and recommended by ChatGPT, Gemini, and AI Overviews.",
        href: "/services/aeo-geo",
        tag: "New",
      },
      {
        name: "Google Maps 3-Pack Growth",
        description: "Review velocity, proximity signals & Google Business Profile dominance.",
        href: "/services/google-maps",
        tag: "High ROI",
      },
      {
        name: "All Services Overview",
        description: "Explore our full range of local and generative search engineering.",
        href: "/services",
      },
    ],
  },
  {
    name: "Resources",
    href: "/blog",
    footerLabel: "All resources",
    children: [
      {
        name: "Blog",
        description: "Search engineering notes on Maps, schema, and AI visibility.",
        href: "/blog",
        tag: "New",
      },
      {
        name: "AI Checker",
        description: "See if AI answer engines recommend your business.",
        href: "/check",
      },
      {
        name: "ROI Calculator",
        description: "What missing the top 3 costs, in dollars.",
        href: "/calculator",
      },
    ],
  },
  { name: "Portfolio", href: "/portfolio" },
  { name: "Pricing", href: "/pricing" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
];
