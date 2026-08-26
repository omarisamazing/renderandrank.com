export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  location: string;
  avatar: string;
  rating: number;
  quote: string;
  highlight: string;
  metric: string;
  service: string;
}

export const testimonials: Testimonial[] = [
  {
    id: "test-1",
    name: "Marcus Vance",
    role: "Managing Owner",
    company: "Apex Climate HVAC",
    location: "Austin, Texas",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    quote:
      "Before working with Omar and Render and Rank, we were burning thousands every week on Google Ads. Within 90 days, we were sitting at #1 on Google Maps and ChatGPT was citing us for every local HVAC query. Our phones ring non-stop with qualified homeowners.",
    highlight: "Phones ring non-stop with qualified homeowners",
    metric: "1,228% Increase in Calls",
    service: "Local SEO & GEO",
  },
  {
    id: "test-2",
    name: "Dr. Elena Rostova",
    role: "Founder & Lead Dentist",
    company: "Lumina Dental Studio",
    location: "Denver, Colorado",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    quote:
      "Most agencies talk in confusing jargon and send useless PDF reports. Omar engineered our medical schema and Google Business Profile so clearly that we jumped straight into the Maps 3-Pack and gained 87 new five-star reviews in two months.",
    highlight: "Jumped straight into the Maps 3-Pack",
    metric: "+343% Consultation Growth",
    service: "GBP & AEO Optimization",
  },
  {
    id: "test-3",
    name: "David Sterling",
    role: "Senior Partner",
    company: "Vanguard Trial Attorneys",
    location: "Phoenix, Arizona",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    quote:
      "In personal injury law, PPC clicks cost $250+. Render and Rank built an organic entity moat that consistently generates high-value cases without relying solely on paid bidding wars. Omar is the most technical search expert we've hired.",
    highlight: "Saved $18k/month in PPC ad spend",
    metric: "4.5x ROI in 120 Days",
    service: "Full Local Authority Suite",
  },
  {
    id: "test-4",
    name: "Brett Hollingsworth",
    role: "Founder",
    company: "Ironclad Roofing",
    location: "Tampa, Florida",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    quote:
      "Our ranking radius expanded from 2 miles to over 15 miles across 4 counties. When storm season hit, our Google Maps listing was the undisputed #1 result. It brought in over $480k in booked contracts.",
    highlight: "$480k in organic storm contracts",
    metric: "Expanded to 4 Counties",
    service: "Google Maps Domination",
  },
];
