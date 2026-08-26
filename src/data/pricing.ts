export interface PricingPackage {
  id: string;
  name: string;
  badge?: string;
  isPopular?: boolean;
  price: string;
  period: string;
  delivery: string;
  description: string;
  idealFor: string;
  features: string[];
  ctaText: string;
  ctaHref: string;
  guarantee: string;
}

export const oneTimePricing: PricingPackage[] = [
  {
    id: "citation-basic",
    name: "Basic Citation Audit",
    badge: "Trial / Single Location",
    isPopular: false,
    price: "$35",
    period: "one-time",
    delivery: "5-day delivery",
    description:
      "Essential NAP audit and clean citation setup on core high-trust registries without spam link farms.",
    idealFor: "New businesses or single-location operators checking directory health",
    features: [
      "Complete NAP (Name, Address, Phone) consistency audit",
      "Manual Tier 1 high-authority directory submissions",
      "Algorithmic duplicate listing identification & cleanup checklist",
      "Transparent Google Sheet report with 100% live URLs and logins",
      "Zero automated spam directories that trigger Google penalties",
    ],
    ctaText: "Book the audit",
    ctaHref: "/book-a-call?package=citation-basic",
    guarantee: "100% manual audit. Live link report guaranteed.",
  },
  {
    id: "citation-standard",
    name: "Standard Authority Stack",
    badge: "Most chosen",
    isPopular: true,
    price: "$79",
    period: "one-time",
    delivery: "5-day delivery",
    description:
      "Comprehensive citation sync across 50+ Tier 2 directories plus full Google Business Profile optimization.",
    idealFor: "Established local service providers looking to jump into the Maps 3-pack",
    features: [
      "Everything in Basic Cleanup package included",
      "50+ Tier 2 high-DA localized citation submissions",
      "Complete Google Business Profile (GBP) category & bio calibration",
      "Local geo-grid pinpoint verification & duplicate suppression",
      "Automated review generation SMS & email templates included",
      "Direct turnaround by Lead Search Engineer Omar Ali",
    ],
    ctaText: "Book the authority stack",
    ctaHref: "/book-a-call?package=citation-standard",
    guarantee: "100% execution guarantee. Delivered in 5 business days.",
  },
  {
    id: "citation-premium",
    name: "Premium AI & Map Moat",
    badge: "Complete One-Time Package",
    isPopular: false,
    price: "$149",
    period: "one-time",
    delivery: "7-day delivery",
    description:
      "Full citation overhaul bundled with modern Generative Engine (AEO/GEO) structured schema setup.",
    idealFor: "High-ticket contractors, medical clinics, and law firms targeting search & AI answers",
    features: [
      "Everything in Standard Authority package included",
      "Generative AI Schema.org JSON-LD (LocalBusiness, GeoCoordinates, FAQ)",
      "ChatGPT & Google AI Overviews semantic citation calibration",
      "Apple Business Connect & Bing Places optimization",
      "30-day post-delivery ranking & citation indexing progress report",
      "Priority direct support via Slack or Email with Omar",
    ],
    ctaText: "Book the AI moat",
    ctaHref: "/book-a-call?package=citation-premium",
    guarantee: "Full 30-day telemetry audit & indexing report included.",
  },
];

export const monthlyPricing: PricingPackage[] = [
  {
    id: "retainer-basic",
    name: "Local Growth Core",
    badge: "Monthly Maintenance",
    isPopular: false,
    price: "$149",
    period: "per month",
    delivery: "Ongoing • Month-to-month",
    description:
      "Consistent monthly GBP management, review acceleration, and citation maintenance to hold local rank.",
    idealFor: "Local businesses wanting steady lead flow without hiring an agency employee",
    features: [
      "Everything in Citation Cleanup package included",
      "Weekly optimized Google Business Profile posts & geotagged updates",
      "Monthly NAP health & duplicate suppression monitoring",
      "Automated 5-Star review velocity workflow & reply templates",
      "Monthly geo-grid ranking radar & call tracking summary",
      "Month-to-month flexibility with zero long-term lock-in",
    ],
    ctaText: "Start Growth Core",
    ctaHref: "/book-a-call?plan=retainer-basic",
    guarantee: "Cancel anytime. No 12-month lock-in contracts.",
  },
  {
    id: "retainer-standard",
    name: "Local Lead Machine",
    badge: "Recommended",
    isPopular: true,
    price: "$249",
    period: "per month",
    delivery: "Ongoing • Month-to-month",
    description:
      "Our signature monthly system bundling local Maps 3-Pack domination with AI Answer Engine citations.",
    idealFor: "Competitive service businesses wanting to dominate both Google Maps and ChatGPT/Gemini",
    features: [
      "Everything in Local Growth Core included",
      "Full Generative Engine Optimization (GEO) for ChatGPT, Gemini & Perplexity",
      "Google AI Overviews semantic answer structuring & FAQ schema updates",
      "2x weekly high-intent GBP posts & localized Q&A management",
      "Monthly AI-mention audit & competitor displacement check",
      "Direct 1-on-1 monthly strategy call with Omar Ali",
    ],
    ctaText: "Start Lead Machine",
    ctaHref: "/book-a-call?plan=retainer-standard",
    guarantee: "Month-to-month commitment. Direct founder accountability.",
  },
  {
    id: "retainer-premium",
    name: "Market Dominator",
    badge: "Maximum Velocity",
    isPopular: false,
    price: "$349",
    period: "per month",
    delivery: "Ongoing • Priority SLA",
    description:
      "Aggressive multi-channel search & citation engineering for high-stakes markets and expansion territories.",
    idealFor: "Multi-service contractors, regional practices, or high-competition metro areas",
    features: [
      "Everything in Local Lead Machine package included",
      "Expanded monthly high-authority local backlinks & niche citations",
      "Multi-neighborhood landing page schema & entity structuring",
      "Priority 24-hour turnaround on all profile updates & asset requests",
      "Bi-weekly ranking telemetry and phone call conversion analysis",
      "Direct private Slack channel with Founder Omar Ali",
    ],
    ctaText: "Start Market Dominator",
    ctaHref: "/book-a-call?plan=retainer-premium",
    guarantee: "Priority turnaround SLA & direct founder partnership.",
  },
];
