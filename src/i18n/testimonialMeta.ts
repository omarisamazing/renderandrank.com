/**
 * Localised short facts for the attributed client testimonials
 * (`src/data/testimonials.ts` stays the single source for quotes, names,
 * companies and locations — a client's own words are never rewritten).
 * Only the metric pills and role titles localise, keyed by testimonial id.
 */
export interface TestimonialMeta {
  metric: string;
  role: string;
}

export const testimonialMeta: Record<string, Record<string, TestimonialMeta>> = {
  en: {
    'test-1': { metric: '1,228% Increase in Calls', role: 'Managing Owner' },
    'test-2': { metric: '+343% Consultation Growth', role: 'Founder & Lead Dentist' },
    'test-3': { metric: '4.5x ROI in 120 Days', role: 'Senior Partner' },
    'test-4': { metric: 'Expanded to 4 Counties', role: 'Founder' },
  },
  es: {
    'test-1': { metric: 'Aumento del 1.228 % en llamadas', role: 'Propietario gerente' },
    'test-2': { metric: '+343 % de crecimiento en consultas', role: 'Fundadora y dentista líder' },
    'test-3': { metric: 'ROI de 4,5x en 120 días', role: 'Socio senior' },
    'test-4': { metric: 'Expansión a 4 condados', role: 'Fundador' },
  },
  fr: {
    'test-1': { metric: 'Hausse de 1 228 % des appels', role: 'Propriétaire-gérant' },
    'test-2': { metric: '+343 % de consultations', role: 'Fondatrice et dentiste en chef' },
    'test-3': { metric: 'ROI x4,5 en 120 jours', role: 'Associé senior' },
    'test-4': { metric: 'Expansion à 4 comtés', role: 'Fondateur' },
  },
  de: {
    'test-1': { metric: '+1.228 % mehr Anrufe', role: 'Geschäftsführender Inhaber' },
    'test-2': { metric: '+343 % Beratungswachstum', role: 'Gründerin & leitende Zahnärztin' },
    'test-3': { metric: '4,5-facher ROI in 120 Tagen', role: 'Seniorpartner' },
    'test-4': { metric: 'Expansion auf 4 Countys', role: 'Gründer' },
  },
  it: {
    'test-1': { metric: 'Aumento del 1.228% nelle chiamate', role: 'Titolare gestore' },
    'test-2': { metric: '+343% di crescita nelle consulenze', role: 'Fondatrice e dentista capo' },
    'test-3': { metric: 'ROI di 4,5x in 120 giorni', role: 'Socio senior' },
    'test-4': { metric: 'Espansione a 4 contee', role: 'Fondatore' },
  },
  pt: {
    'test-1': { metric: 'Aumento de 1.228% nas chamadas', role: 'Proprietário-gerente' },
    'test-2': { metric: 'Crescimento de +343% nas consultas', role: 'Fundadora e dentista-chefe' },
    'test-3': { metric: 'ROI de 4,5x em 120 dias', role: 'Sócio sênior' },
    'test-4': { metric: 'Expansão para 4 condados', role: 'Fundador' },
  },
  nl: {
    'test-1': { metric: '1.228% meer oproepen', role: 'Beherend eigenaar' },
    'test-2': { metric: '+343% consultgroei', role: 'Oprichter & hoofdtandarts' },
    'test-3': { metric: '4,5x ROI in 120 dagen', role: 'Seniorpartner' },
    'test-4': { metric: "Uitgebreid naar 4 county's", role: 'Oprichter' },
  },
};
