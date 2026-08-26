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
  };
  socials: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    youtube?: string;
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
    address: "Austin, TX & Serving Growth-Minded Businesses Worldwide",
    hours: "Mon – Fri: 9:00 AM – 6:00 PM EST",
  },
  forms: {
    auditEndpoint: null,
  },
  socials: {
    twitter: "https://x.com/renderandrank",
    linkedin: "https://linkedin.com/company/renderandrank",
    youtube: "https://youtube.com/@renderandrank",
  },
};

export const navLinks = [
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
  { name: "Portfolio", href: "/portfolio" },
  { name: "Pricing", href: "/pricing" },
  { name: "ROI Calculator", href: "/calculator" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
];
