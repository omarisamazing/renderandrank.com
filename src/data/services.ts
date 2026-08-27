export interface Service {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  icon: string;
  stickerColor: string; // From DESIGN.md sticker palette
  badgeText: string;
  metrics: { value: string; label: string }[];
  deliverables: string[];
  process: { step: string; title: string; desc: string }[];
  faqs: { q: string; a: string }[];
}

export const services: Service[] = [
  {
    id: "local-seo",
    slug: "local-seo",
    title: "Local SEO & Hyper-Local Visibility",
    shortDescription:
      "Dominate localized search queries in your service area. We engineer high-authority local citations, location landing pages, and structured geo-signals.",
    fullDescription:
      "When customers in your city search for your exact service, do you show up in the top organic results? Our local SEO infrastructure optimizes technical signals, builds location-specific content silos, and creates hyper-local authority that outranks competitors permanently.",
    icon: "MapPin",
    stickerColor: "accent-sky",
    badgeText: "High Demand",
    metrics: [
      { value: "+340%", label: "Average Local Organic Traffic Lift" },
      { value: "3.8x", label: "More Inbound Phone Calls & Bookings" },
      { value: "90 Days", label: "Typical Target Rank Realization" },
    ],
    deliverables: [
      "Hyper-local keyword & intent research tailored to service radiuses",
      "Full On-Page SEO optimization with localized Schema.org JSON-LD markup",
      "Localized silo architecture & high-converting service area landing pages",
      "Clean NAP (Name, Address, Phone) citation synchronization across 70+ directories",
      "Competitor gap analysis and geo-targeted backlink acquisition",
      "Monthly transparent reporting showing keyword movements and call volume",
    ],
    process: [
      {
        step: "01",
        title: "Local Market & Technical Audit",
        desc: "We diagnose your domain's health, NAP consistency, local entity profile, and competitor geo-footprints.",
      },
      {
        step: "02",
        title: "Geo-Architecture & Schema Engineering",
        desc: "We inject robust LocalBusiness Schema, optimize metadata, and construct dedicated neighborhood landing pages.",
      },
      {
        step: "03",
        title: "Citation & Authority Syndication",
        desc: "We syndicate your business information across high-tier data aggregators and secure local relevance citations.",
      },
      {
        step: "04",
        title: "Conversion Tracking & Scaling",
        desc: "We track calls, direction requests, and organic conversions, adjusting focus to expand your ranking radius.",
      },
    ],
    faqs: [
      {
        q: "How is Local SEO different from regular SEO?",
        a: "Local SEO specifically targets geographic search intent (e.g. 'HVAC repair near me' or 'plumber in Dallas'). It focuses heavily on Google Maps 3-Pack rankings, localized schema, proximity signals, and local directory citations.",
      },
      {
        q: "How quickly can my business expect to see rankings improve?",
        a: "Most local businesses see measurable movement in local search results within 30 to 60 days, with substantial ranking jumps and call volume spikes occurring between 60 and 90 days.",
      },
    ],
  },
  {
    id: "aeo-geo",
    slug: "aeo-geo",
    title: "AEO & Generative Engine Optimization (GEO)",
    shortDescription:
      "Get recommended by ChatGPT, Gemini, Perplexity, and Google AI Overviews when prospects ask AI assistants who the best local provider is.",
    fullDescription:
      "Modern searchers are asking AI assistants for recommendations instead of clicking 10 blue links. If an AI engine doesn't understand your business entity, you are invisible. We engineer your brand's presence across AI knowledge graphs, vector embeddings, and authoritative citations so generative engines choose and cite your business first.",
    icon: "Bot",
    stickerColor: "accent-purple",
    badgeText: "AI Era Search",
    metrics: [
      { value: "+420%", label: "AI Answer Engine Citation Rate" },
      { value: "#1", label: "Recommended Entity in Target Queries" },
      { value: "4 Engines", label: "ChatGPT, Gemini, Perplexity, Claude" },
    ],
    deliverables: [
      "AI Knowledge Graph and Entity verification and optimization",
      "Generative Engine Citation Audit across ChatGPT Search, Gemini, Perplexity & AI Overviews",
      "Semantic content structuring optimized for Large Language Model (LLM) ingestion",
      "Wikidata, Crunchbase, Schema.org and high-authority contextual entity citations",
      "FAQ & conversational query modeling to win direct AI answer snippets",
      "Prompt simulation testing to track real-time AI recommendations",
    ],
    process: [
      {
        step: "01",
        title: "AI Perception & Entity Audit",
        desc: "We query 5 major LLMs across 50+ localized prompts to benchmark how often your brand is cited vs competitors.",
      },
      {
        step: "02",
        title: "Knowledge Graph Alignment",
        desc: "We structure your entity definitions across Schema, authoritative registries, and third-party validation sources.",
      },
      {
        step: "03",
        title: "Semantic Content Optimization",
        desc: "We rewrite and format core website assets with semantic markup, clear direct answers, and data tables that LLMs love to quote.",
      },
      {
        step: "04",
        title: "Continuous Prompt Tracking",
        desc: "We continuously monitor generative engine answer outputs and refine entity signals to maintain AI recommendation dominance.",
      },
    ],
    faqs: [
      {
        q: "What is AEO vs GEO?",
        a: "AEO (Answer Engine Optimization) focuses on providing direct, concise answers for voice search, Google AI Overviews, and quick answers. GEO (Generative Engine Optimization) optimizes your brand's entity profile so conversational generative AI models (ChatGPT, Gemini, Perplexity) naturally cite and recommend your business.",
      },
      {
        q: "Why do local businesses need GEO right now?",
        a: "Over 40% of queries with commercial intent now trigger AI answers or occur directly within AI apps. If your local competitor is the only one cited by ChatGPT as the 'top-rated electrician in North Austin', they capture the high-intent lead before the customer ever sees Google.",
      },
    ],
  },
  {
    id: "google-maps",
    slug: "google-maps",
    title: "Google Maps 3-Pack Growth Engine",
    shortDescription:
      "Rank in the top 3 on Google Maps across your entire target service territory with optimized Google Business Profiles and review velocity systems.",
    fullDescription:
      "The top 3 listings in the Google Maps Pack capture over 70% of all local clicks and phone calls. We eliminate geo-grid dead zones and expand your ranking perimeter using advanced profile optimization, geo-tagged photo systems, review response automation, and behavioral engagement signals.",
    icon: "Compass",
    stickerColor: "accent-green",
    badgeText: "High Conversion",
    metrics: [
      { value: "70%+", label: "Of Total Local Clicks Captured in 3-Pack" },
      { value: "4.9", label: "Average client review rating, out of 5" },
      { value: "5-15 mi", label: "Expanded Geo-Grid Ranking Radius" },
    ],
    deliverables: [
      "Comprehensive Google Business Profile (GBP) complete overhaul & verification",
      "Primary & secondary category precision testing for maximum algorithmic reach",
      "Geo-grid ranking heatmaps tracking ranking pinpoints every 0.5 miles",
      "Automated SMS/Email review generation sequences to build steady review velocity",
      "High-engagement GBP weekly posts, updates, product catalogues & geo-tagged photo uploads",
      "Spam fighting: Reporting and removing illegitimate competitor keyword-stuffed listings",
    ],
    process: [
      {
        step: "01",
        title: "Geo-Grid Rank Mapping",
        desc: "We run a multi-point GPS grid audit to identify where your business currently ranks across every square mile of your city.",
      },
      {
        step: "02",
        title: "GBP Algorithmic Tuning",
        desc: "We calibrate business categories, service menus, attributes, hours, and descriptions to maximize relevancy score.",
      },
      {
        step: "03",
        title: "Review Velocity & Engagement",
        desc: "We deploy frictionless review capture workflows to generate authentic customer reviews with target keywords included.",
      },
      {
        step: "04",
        title: "Proximity Expansion",
        desc: "We build localized signals and landing pages that expand your ranking radius outward into neighboring towns and suburbs.",
      },
    ],
    faqs: [
      {
        q: "Can you help remove fake negative reviews?",
        a: "We systematically audit all reviews against Google's policies and submit formal policy violation appeals to remove spam or fraudulent reviews, while diluting legitimate negatives with positive customer review velocity.",
      },
      {
        q: "What if my competitors are keyword-stuffing their business name?",
        a: "We monitor your local geo-grid for competitors violating Google's guidelines by adding fake keywords or fake addresses, and file direct redressal complaints to clear the top 3 spots for your legitimate listing.",
      },
    ],
  },
];
