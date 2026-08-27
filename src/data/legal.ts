import { siteConfig } from '../config/site';

/**
 * Legal copy for /terms and /privacy.
 *
 * The headings define the real shape of each document. Each body paragraph is
 * finished, client-facing legal copy written in plain language.
 */

/** Searchable marker, kept exported for compatibility. No longer used in body copy. */
export const TODO_LEGAL = '[PLACEHOLDER — replace with reviewed legal copy]';

export interface LegalSection {
  heading: string;
  /** One rendered paragraph per string. */
  body: string[];
}

export interface LegalDocument {
  /** Drives the `<h1>`, the `<title>` and the footer link label. */
  title: string;
  eyebrow: string;
  summary: string;
  /** Shown in the page header. */
  updated: string;
  sections: LegalSection[];
}

const UPDATED = 'August 27, 2026';

export const terms: LegalDocument = {
  title: 'Terms and Conditions',
  eyebrow: 'Legal',
  summary: `The agreement between ${siteConfig.name} and the businesses we work with.`,
  updated: UPDATED,
  sections: [
    {
      heading: 'Who these terms cover',
      body: [
        `These terms are an agreement between ${siteConfig.name} ("we", "us", "our") and you — the business or individual who uses this website or engages our services. By browsing the site, submitting a form, booking a call, or working with us, you agree to these terms.`,
        `Where we sign a separate proposal or statement of work with you, that document sets out the specifics of your engagement — scope, deliverables and price. If anything in a signed statement of work conflicts with these terms, the statement of work wins for that engagement.`,
      ],
    },
    {
      heading: 'The services we provide',
      body: [
        `We are a marketing agency specialising in local SEO, Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO). Depending on your engagement, that can include audits, on-site and technical optimization, structured data, content, Google Business Profile work, and improving how your business appears in Google Search, the Google Maps local pack, and AI answer engines such as ChatGPT, Gemini, Perplexity and AI Overviews.`,
        `The exact scope of any engagement is described in your proposal or statement of work. Work outside that scope is agreed in writing before it starts, and may change the fee or timeline.`,
      ],
    },
    {
      heading: 'Fees, invoicing and late payment',
      body: [
        `Fees, the billing cycle and accepted payment methods are set out in your proposal or statement of work. Unless stated otherwise, invoices are due within the period noted on the invoice, and fees are exclusive of any applicable taxes.`,
        `If an invoice remains unpaid past its due date, we may pause work in progress until the account is brought current, and we may charge reasonable interest or costs on overdue amounts to the extent permitted by law. Paused work resumes once payment is received.`,
      ],
    },
    {
      heading: 'What we need from you',
      body: [
        `Good results depend on good access. You agree to provide timely access to your website and hosting, your Google Business Profile, your analytics and search consoles, and any other third-party tools relevant to the work — along with a named point of contact who can review and approve decisions.`,
        `We ask for reasonable response times on approvals and information requests. Delays in access or feedback can affect timelines and outcomes, and are not something we can be responsible for.`,
      ],
    },
    {
      heading: 'Ownership of work and deliverables',
      body: [
        `Once you have paid for the work in full, ownership of the deliverables we create specifically for you — such as audits, reports, published content, schema markup and configuration — passes to you.`,
        `We retain ownership of our own pre-existing materials, methods, templates and tooling. Where any of that is embedded in a deliverable, we grant you a non-exclusive licence to keep using it as part of that deliverable. You likewise keep ownership of any materials you provide to us.`,
      ],
    },
    {
      heading: 'Rankings, results and what is not guaranteed',
      body: [
        `Search rankings and AI-answer placement are decided by third-party systems — Google, Apple, Microsoft and AI answer engines among them — using algorithms we do not control and that change without notice. Because of that, we cannot and do not guarantee any specific ranking position, traffic level, call volume or revenue figure.`,
        `What we do commit to is diligent, current best-practice work aimed at improving your visibility. Any projection we share — including the output of the ROI calculator on this site — is an illustrative estimate to help you think about potential, not a promise or forecast of actual results.`,
      ],
    },
    {
      heading: 'Term, pause and cancellation',
      body: [
        `Your engagement runs for the term set out in your proposal or statement of work. Either of us may end the engagement by giving the notice period stated there; if none is stated, thirty (30) days' written notice applies.`,
        `You may ask to pause an engagement by agreement. On termination, you pay for work completed and any committed costs up to the end of the notice period, and we hand over the deliverables you have paid for.`,
      ],
    },
    {
      heading: 'Limitation of liability',
      body: [
        `To the fullest extent permitted by the governing law named below, our total liability arising out of or in connection with your engagement is capped at the total fees you paid us for that engagement in the twelve (12) months before the event giving rise to the claim.`,
        `We are not liable for indirect, incidental, special or consequential loss, including lost profits, lost revenue, lost data or loss of business opportunity. Nothing in these terms limits any liability that cannot lawfully be limited.`,
      ],
    },
    {
      heading: 'Confidentiality',
      body: [
        `Each of us may learn confidential information about the other — business plans, account data, pricing, methods and similar non-public material. Each of us agrees to keep the other's confidential information private and to use it only to carry out the engagement.`,
        `This does not apply to information that is or becomes public through no fault of the receiving party, or that must be disclosed by law. These obligations continue for two (2) years after the engagement ends.`,
      ],
    },
    {
      heading: 'Changes to these terms',
      body: [
        `We may update these terms from time to time. When we do, we will post the revised version on this page and update the date shown. For engagements already underway, the version in effect when you signed your proposal or statement of work continues to govern that engagement unless we agree otherwise in writing.`,
      ],
    },
    {
      heading: 'Governing law and disputes',
      body: [
        // TODO: flag for lawyer review — governing law/jurisdiction changed to Bangladesh.
        `These terms are governed by the laws of Bangladesh, without regard to its conflict-of-laws rules. You and we agree that the courts located in Dhaka, Bangladesh have exclusive jurisdiction over any dispute.`,
        `Before starting formal proceedings, both sides agree to try in good faith to resolve any dispute informally by talking it through first.`,
      ],
    },
    {
      heading: 'How to reach us',
      body: [
        `Questions about these terms can go to ${siteConfig.contact.email} or ${siteConfig.contact.phone}.`,
      ],
    },
  ],
};

export const privacy: LegalDocument = {
  title: 'Privacy Policy',
  eyebrow: 'Legal',
  summary: 'What we collect, why we collect it, and the choices you have.',
  updated: UPDATED,
  sections: [
    {
      heading: 'What this policy covers',
      body: [
        `${siteConfig.name} is the data controller responsible for the personal information described here. We are based in Dhaka, Bangladesh and work with clients worldwide. This policy covers this website and the services we offer through it — including our free-audit form, our contact page and our online booking scheduler.`,
        `If you have any questions about your data or this policy, you can reach us using the contact details at the end of this page.`,
      ],
    },
    {
      heading: 'Information you give us',
      body: [
        `When you complete our free-audit form, send us a message through the contact page, or book a call using our scheduler, you give us information such as your name, email address, phone number, business or website details, and anything you type into a free-text field. When you book a call, the scheduler also collects your timezone.`,
        `We use this information to respond to you, prepare your audit, schedule and hold calls, and provide the services you ask for. Our lawful basis is your consent and, where you become a client, our legitimate interest in and contractual need to deliver the work.`,
      ],
    },
    {
      heading: 'Information collected automatically',
      body: [
        `Like most websites, we automatically collect some technical information when you visit — server logs, your device and browser type, the pages you view, referral information, and an approximate location derived from your IP address. We use this to keep the site secure, understand how it is used, and improve it.`,
        `We keep this technical data only as long as needed for those purposes, typically no longer than is reasonable for security and analytics, after which it is deleted or aggregated.`,
      ],
    },
    {
      heading: 'Cookies and similar technologies',
      body: [
        `We use cookies and local storage to make the site work and to understand how it is used. Strictly necessary cookies keep core features functioning and cannot be switched off. Analytics and any marketing cookies are optional and set only where consent is given.`,
        `You can manage or withdraw consent through your browser settings or any cookie controls we provide on the site. Blocking some cookies may affect how parts of the site work.`,
      ],
    },
    {
      heading: 'Third parties that process your data',
      body: [
        `We share personal data only with service providers that help us run our business, and only as far as they need it. Our booking scheduler is powered by Cal.com: when you reserve a slot, Cal.com receives the name, email address and timezone you enter, and processes that data under its own privacy policy. Our site and scheduling experience also rely on ${siteConfig.calCom.platform}.`,
        `We also use general categories of providers for hosting, email and analytics. Each provider processes data only on our instructions and under its own privacy terms; we do not sell your personal information.`,
      ],
    },
    {
      heading: 'How long we keep your data',
      body: [
        `We keep personal data only as long as we need it. Enquiry and audit-form records that do not become engagements are kept for a limited period so we can follow up, then deleted or anonymised. Client records are kept for the length of the engagement and for a reasonable period afterwards to meet legal, tax and accounting obligations.`,
      ],
    },
    {
      heading: 'Your rights over your data',
      body: [
        `Depending on where you live, you have rights over your personal data — including the right to access it, correct it, delete it, receive a portable copy, and object to or restrict certain processing. To exercise any of these, contact us using the details below and we will respond within the time the law allows.`,
        `Depending on your location, the GDPR (EU), UK GDPR, or US state privacy laws — such as those in Texas or California-style (CCPA) frameworks — may apply to you. If you believe we have mishandled your data, you may also complain to your local supervisory authority.`,
      ],
    },
    {
      heading: 'International transfers',
      body: [
        `We are based in the United States, and your data may be stored and processed there and in other countries where our service providers operate. Where data moves across borders, we rely on appropriate safeguards — such as standard contractual clauses or equivalent protections — so that it stays protected wherever it is handled.`,
      ],
    },
    {
      heading: 'Changes to this policy',
      body: [
        `We may update this policy from time to time. When we do, we will post the revised version on this page and update the date shown above. If a change is significant, we will take reasonable steps to make it clear — for example, by highlighting it on this page or contacting you directly.`,
      ],
    },
    {
      heading: 'How to reach us',
      body: [
        `Data protection questions can go to ${siteConfig.contact.email} or ${siteConfig.contact.phone}.`,
      ],
    },
  ],
};
