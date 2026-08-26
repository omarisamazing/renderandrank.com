export interface CaseStudy {
  id: string;
  client: string;
  category: string;
  location: string;
  title: string;
  summary: string;
  beforeStats: {
    rank: string;
    calls: string;
    aiCitation: string;
  };
  afterStats: {
    rank: string;
    calls: string;
    aiCitation: string;
  };
  keyTakeaways: string[];
  timeline: string;
  badge: string;
}

export const portfolioCaseStudies: CaseStudy[] = [
  {
    id: "apex-hvac",
    client: "Apex Climate Heating & Air",
    category: "Home Services & HVAC",
    location: "Austin, TX",
    title: "From Invisible to #1 Google 3-Pack & Primary ChatGPT Local Recommendation",
    summary:
      "Apex was buried on page 3 with inconsistent directory listings and zero generative AI visibility. We rebuilt their local entity structure, optimized their GBP, and established strong local knowledge graph citations.",
    beforeStats: {
      rank: "#28 (Google Maps)",
      calls: "14 calls / mo",
      aiCitation: "0% (Not Cited by AI)",
    },
    afterStats: {
      rank: "#1 in 12 mi Radius",
      calls: "186 calls / mo",
      aiCitation: "88% of Local Prompts",
    },
    keyTakeaways: [
      "1,228% increase in tracked inbound phone inquiries in 90 days",
      "Secured #1 position for 'emergency HVAC repair Austin' across 35 geo-grid checkpoints",
      "Ranked as the top-cited recommendation in ChatGPT Search and Perplexity",
    ],
    timeline: "90 Days",
    badge: "HVAC & Contractors",
  },
  {
    id: "lumina-dental",
    client: "Lumina Dental Studio",
    category: "Healthcare & Dental",
    location: "Denver, CO",
    title: "Dominating Cosmetic & Family Dentistry in Google Maps & AI Overviews",
    summary:
      "A modern dental clinic struggling against legacy practices with thousands of reviews. We deployed automated review velocity workflows and engineered semantic medical schema to trigger direct Google AI Overviews recommendations.",
    beforeStats: {
      rank: "#14 (Google Maps)",
      calls: "32 calls / mo",
      aiCitation: "5% (Occasional)",
    },
    afterStats: {
      rank: "Top 3 Google 3-Pack",
      calls: "142 calls / mo",
      aiCitation: "92% AI Recommendation Rate",
    },
    keyTakeaways: [
      "+343% growth in high-ticket cosmetic dentistry consultation requests",
      "Generated 87 authentic 5-star Google reviews in 60 days via SMS pipelines",
      "Direct citation in Google AI Overviews for 'best cosmetic dentist Denver'",
    ],
    timeline: "60 Days",
    badge: "Medical & Dental",
  },
  {
    id: "vanguard-legal",
    client: "Vanguard Trial Attorneys",
    category: "Legal & Personal Injury",
    location: "Phoenix, AZ",
    title: "High-Value Personal Injury Local Domination Without Paying $250+ Per PPC Click",
    summary:
      "Vanguard was spending over $35,000/month on Google Ads with diminishing returns. We engineered local SEO authority, neighborhood landing page silos, and clean entity citations to capture high-intent organic case inquiries.",
    beforeStats: {
      rank: "#19 (Google Maps)",
      calls: "8 qualified leads / mo",
      aiCitation: "0% AI Recognition",
    },
    afterStats: {
      rank: "#2 in Phoenix Metro",
      calls: "49 qualified leads / mo",
      aiCitation: "75% in Gemini & ChatGPT",
    },
    keyTakeaways: [
      "Saved over $18,000/month in paid ad spend while increasing total qualified case volume",
      "Captured top positions for 'car accident attorney near me'",
      "Over 4.5x ROI within 120 days of deployment",
    ],
    timeline: "120 Days",
    badge: "Legal & Professional",
  },
  {
    id: "ironclad-roofing",
    client: "Ironclad Roofing & Restoration",
    category: "Contractors & Roofing",
    location: "Tampa, FL",
    title: "Capturing Post-Storm Roof Replacement Demand in Google Maps & Local Search",
    summary:
      "Engineered storm-response local landing pages and aggressive Google Business Profile optimization to capture emergency commercial and residential roof replacement searches.",
    beforeStats: {
      rank: "#34 in Tampa Bay",
      calls: "11 inquiries / mo",
      aiCitation: "0%",
    },
    afterStats: {
      rank: "#1 across 4 Counties",
      calls: "215 inquiries / mo",
      aiCitation: "84% Local Prompt Share",
    },
    keyTakeaways: [
      "$480,000+ in closed roof replacement contracts attributed directly to organic Maps traffic",
      "Expanded ranking radius across 4 adjacent county borders",
      "Automated photo geo-tagging generated 24,000+ monthly Google Maps photo views",
    ],
    timeline: "75 Days",
    badge: "Roofing & Construction",
  },
];
