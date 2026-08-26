export interface FAQ {
  q: string;
  a: string;
  category?: string;
}

export const faqs: FAQ[] = [
  {
    category: "Comparison & Positioning",
    q: "How is this different from a $5 or $10 Fiverr citation gig?",
    a: "Cheap $5 gigs use automated bots to blast your business name to thousands of spam link farms, duplicate directories, and abandoned foreign sites. Google filters out or penalizes these spam networks. At Render and Rank, we perform 100% manual audits, submit only to verified high-DA Tier 1 & 2 business directories with strict NAP (Name, Address, Phone) consistency, and hand you a transparent Google Sheet containing every live link and login credential.",
  },
  {
    category: "Access & Security",
    q: "Do you need direct login access or ownership of my Google Business Profile?",
    a: "No, you never surrender primary ownership. We only request standard Manager or Delegate access to your Google Business Profile, which you can revoke at any second with a single click. You maintain 100% control of your digital assets at all times.",
  },
  {
    category: "Deliverables & Proof",
    q: "Will I receive a report with live links and logins that I can verify myself?",
    a: "Yes, 100%. Upon delivery, you receive a clean spreadsheet with every directory link created, indexed status, credentials used, and geo-grid coordinates. You can click into every single profile to verify the work yourself.",
  },
  {
    category: "Generative AI & Search",
    q: "Why do I need AI Search & AEO optimization in addition to Google Maps?",
    a: "Millions of high-income buyers now ask ChatGPT, Gemini, Perplexity, and Google AI Overviews questions like 'Who is the best local roofing contractor in Austin with verified reviews?' instead of clicking ads. We structure your schema data and entity knowledge graph so AI models cite and recommend your business as the definitive local authority.",
  },
  {
    category: "Contracts & Guarantees",
    q: "Do you guarantee #1 rankings, and are there long-term contracts?",
    a: "No legitimate search engineer guarantees #1 rankings because Google's algorithm is proprietary. Beware of any gig making fake 100% ranking promises. Instead, we guarantee our technical execution, 100% NAP accuracy, and transparent delivery. All our monthly plans are strictly month-to-month with zero lock-in contracts.",
  },
  {
    category: "Custom & Multi-Location",
    q: "Can I get a custom package if I manage multiple locations or a franchise?",
    a: "Yes! We build tailored geo-grid networks for multi-location clinics, regional home service contractors, and franchise branches. Schedule a call or message Omar directly to review your regional footprint and receive a custom multi-location proposal.",
  },
];
