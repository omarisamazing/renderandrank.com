/**
 * Localised comparison-matrix + onboarding-timeline copy for `PricingPage`.
 * EN mirrors the inline data verbatim; tier names/prices stay product facts.
 * Boolean values drive the Included/Not-included icons and never translate.
 */
export interface PricingMatrixRow {
  label: string;
  values: (string | boolean)[];
}

export interface PricingTimelineStep {
  n: string;
  title: string;
  body: string;
  foot: string;
}

export interface PricingLocale {
  matrixEyebrow: string;
  matrixTitle: string;
  matrixCaption: string;
  matrixCol: string;
  srIncluded: string;
  srNotIncluded: string;
  matrix: PricingMatrixRow[];
  timelineEyebrow: string;
  timelineTitle: string;
  timelineSub: string;
  timeline: PricingTimelineStep[];
}

export const pricingDict: Record<string, PricingLocale> = {
  en: {
    matrixEyebrow: 'Retainers side by side',
    matrixTitle: 'What each tier includes',
    matrixCaption: 'Monthly retainer deliverables by tier',
    matrixCol: 'Deliverable',
    srIncluded: 'Included',
    srNotIncluded: 'Not included',
    matrix: [
      {
        label: 'Business Profile management',
        values: ['Weekly posts', 'Twice weekly + Q&A', 'Daily, multi-profile'],
      },
      {
        label: 'Manual tier-1 and tier-2 citations',
        values: ['Health check and sync', 'Expanded sync', 'Maximum coverage'],
      },
      {
        label: 'Generative schema and LLM calibration',
        values: [false, true, 'Priority entity graph'],
      },
      {
        label: 'Live spreadsheet and logins',
        values: [true, true, true],
      },
      {
        label: 'Support channel',
        values: ['Email', 'Monthly call', 'Private Slack'],
      },
      {
        label: 'Commitment',
        values: ['Month to month', 'Month to month', 'Month to month'],
      },
    ],
    timelineEyebrow: 'Onboarding',
    timelineTitle: 'What happens after you start',
    timelineSub: 'No multi-week onboarding lag. Here is how your first 30 days run.',
    timeline: [
      {
        n: '01',
        title: 'Day 1: Audit & Access',
        body: 'Omar pulls your baseline geo-grid and citation health. You grant Google Business Profile manager access in 2 clicks.',
        foot: 'Turnaround: 24 hours',
      },
      {
        n: '02',
        title: 'Day 7: Schema & Sync',
        body: 'LocalBusiness Schema.org JSON-LD and tier-1 citations are deployed and syndicated to major AI entity graphs.',
        foot: 'Foundation complete',
      },
      {
        n: '03',
        title: 'Day 30: Rank Report',
        body: 'You receive your first 30-day geo-grid movement report, showing exact radius expansion and call lift.',
        foot: 'First milestone report',
      },
    ],
  },
  es: {
    matrixEyebrow: 'Planes lado a lado',
    matrixTitle: 'Qué incluye cada nivel',
    matrixCaption: 'Entregables del plan mensual por nivel',
    matrixCol: 'Entregable',
    srIncluded: 'Incluido',
    srNotIncluded: 'No incluido',
    matrix: [
      {
        label: 'Gestión del Perfil de Empresa',
        values: ['Posts semanales', 'Dos veces por semana + Q&A', 'Diario, multi-perfil'],
      },
      {
        label: 'Citaciones manuales tier-1 y tier-2',
        values: ['Chequeo y sincronización', 'Sincronización ampliada', 'Cobertura máxima'],
      },
      {
        label: 'Esquema generativo y calibración LLM',
        values: [false, true, 'Grafo de entidades prioritario'],
      },
      {
        label: 'Hoja de cálculo y accesos en vivo',
        values: [true, true, true],
      },
      {
        label: 'Canal de soporte',
        values: ['Email', 'Llamada mensual', 'Slack privado'],
      },
      {
        label: 'Compromiso',
        values: ['Mes a mes', 'Mes a mes', 'Mes a mes'],
      },
    ],
    timelineEyebrow: 'Onboarding',
    timelineTitle: 'Qué pasa tras empezar',
    timelineSub: 'Sin semanas de espera. Así son tus primeros 30 días.',
    timeline: [
      {
        n: '01',
        title: 'Día 1: Auditoría y accesos',
        body: 'Omar obtiene tu geo-grid base y salud de citaciones. Concedes acceso de gestor al Perfil de Empresa en 2 clics.',
        foot: 'Entrega: 24 horas',
      },
      {
        n: '02',
        title: 'Día 7: Esquema y sincronización',
        body: 'Schema.org JSON-LD LocalBusiness y citaciones tier-1 desplegados y sindicados a los principales grafos de entidades IA.',
        foot: 'Base completa',
      },
      {
        n: '03',
        title: 'Día 30: Informe de ranking',
        body: 'Recibes tu primer informe de movimiento geo-grid a 30 días, con expansión exacta del radio y aumento de llamadas.',
        foot: 'Primer informe de hito',
      },
    ],
  },
  fr: {
    matrixEyebrow: 'Formules côte à côte',
    matrixTitle: 'Ce que chaque niveau inclut',
    matrixCaption: 'Livrables mensuels par formule',
    matrixCol: 'Livrable',
    srIncluded: 'Inclus',
    srNotIncluded: 'Non inclus',
    matrix: [
      {
        label: 'Gestion de la fiche d’établissement',
        values: ['Posts hebdomadaires', 'Deux fois par semaine + Q&R', 'Quotidien, multi-fiches'],
      },
      {
        label: 'Citations manuelles tier-1 et tier-2',
        values: ['Contrôle et synchro', 'Synchro étendue', 'Couverture maximale'],
      },
      {
        label: 'Schéma génératif et calibration LLM',
        values: [false, true, 'Graphe d’entités prioritaire'],
      },
      {
        label: 'Tableur et accès en direct',
        values: [true, true, true],
      },
      {
        label: 'Canal de support',
        values: ['E-mail', 'Appel mensuel', 'Slack privé'],
      },
      {
        label: 'Engagement',
        values: ['Au mois le mois', 'Au mois le mois', 'Au mois le mois'],
      },
    ],
    timelineEyebrow: 'Onboarding',
    timelineTitle: 'Ce qui se passe après le départ',
    timelineSub: 'Pas de semaines d’attente. Voici vos 30 premiers jours.',
    timeline: [
      {
        n: '01',
        title: 'Jour 1 : Audit et accès',
        body: 'Omar extrait votre géo-grid de référence et la santé des citations. Vous accordez l’accès gestionnaire à la fiche en 2 clics.',
        foot: 'Délai : 24 heures',
      },
      {
        n: '02',
        title: 'Jour 7 : Schéma et synchro',
        body: 'Schema.org JSON-LD LocalBusiness et citations tier-1 déployés et syndiqués vers les grands graphes d’entités IA.',
        foot: 'Fondation terminée',
      },
      {
        n: '03',
        title: 'Jour 30 : Rapport de classement',
        body: 'Vous recevez votre premier rapport de mouvement géo-grid à 30 jours, avec expansion exacte du rayon et hausse des appels.',
        foot: 'Premier rapport d’étape',
      },
    ],
  },
  de: {
    matrixEyebrow: 'Retainer im Vergleich',
    matrixTitle: 'Was jede Stufe enthält',
    matrixCaption: 'Monatliche Retainer-Leistungen je Stufe',
    matrixCol: 'Leistung',
    srIncluded: 'Enthalten',
    srNotIncluded: 'Nicht enthalten',
    matrix: [
      {
        label: 'Unternehmensprofil-Management',
        values: ['Wöchentliche Posts', 'Zweimal wöchentlich + Q&A', 'Täglich, multi-Profil'],
      },
      {
        label: 'Manuelle Tier-1- und Tier-2-Zitationen',
        values: ['Health-Check und Sync', 'Erweiterter Sync', 'Maximale Abdeckung'],
      },
      {
        label: 'Generatives Schema & LLM-Kalibrierung',
        values: [false, true, 'Prioritäts-Entity-Graph'],
      },
      {
        label: 'Live-Tabelle und Logins',
        values: [true, true, true],
      },
      {
        label: 'Support-Kanal',
        values: ['E-Mail', 'Monatlicher Call', 'Privates Slack'],
      },
      {
        label: 'Bindung',
        values: ['Monat für Monat', 'Monat für Monat', 'Monat für Monat'],
      },
    ],
    timelineEyebrow: 'Onboarding',
    timelineTitle: 'Was nach dem Start passiert',
    timelineSub: 'Keine wochenlange Anlaufphase. So laufen deine ersten 30 Tage.',
    timeline: [
      {
        n: '01',
        title: 'Tag 1: Audit & Zugang',
        body: 'Omar zieht dein Basis-Geo-Grid und deine Zitations-Health. Du gibst Manager-Zugang zum Unternehmensprofil in 2 Klicks.',
        foot: 'Turnaround: 24 Stunden',
      },
      {
        n: '02',
        title: 'Tag 7: Schema & Sync',
        body: 'LocalBusiness-Schema.org-JSON-LD und Tier-1-Zitationen werden deployed und an große KI-Entity-Graphen syndiziert.',
        foot: 'Fundament steht',
      },
      {
        n: '03',
        title: 'Tag 30: Rank-Report',
        body: 'Du erhältst deinen ersten 30-Tage-Geo-Grid-Report mit exakter Radius-Expansion und Anruf-Lift.',
        foot: 'Erster Meilenstein-Report',
      },
    ],
  },
  it: {
    matrixEyebrow: 'Piani a confronto',
    matrixTitle: 'Cosa include ogni livello',
    matrixCaption: 'Deliverable mensili per livello',
    matrixCol: 'Deliverable',
    srIncluded: 'Incluso',
    srNotIncluded: 'Non incluso',
    matrix: [
      {
        label: 'Gestione del Profilo dell’attività',
        values: ['Post settimanali', 'Due volte a settimana + Q&A', 'Quotidiano, multi-profilo'],
      },
      {
        label: 'Citazioni manuali tier-1 e tier-2',
        values: ['Check e sincronizzazione', 'Sincronizzazione estesa', 'Copertura massima'],
      },
      {
        label: 'Schema generativo e calibrazione LLM',
        values: [false, true, 'Entity graph prioritario'],
      },
      {
        label: 'Foglio live e accessi',
        values: [true, true, true],
      },
      {
        label: 'Canale di supporto',
        values: ['Email', 'Chiamata mensile', 'Slack privato'],
      },
      {
        label: 'Vincolo',
        values: ['Mese per mese', 'Mese per mese', 'Mese per mese'],
      },
    ],
    timelineEyebrow: 'Onboarding',
    timelineTitle: 'Cosa succede dopo l’avvio',
    timelineSub: 'Niente settimane di attesa. Ecco come vanno i tuoi primi 30 giorni.',
    timeline: [
      {
        n: '01',
        title: 'Giorno 1: Audit e accessi',
        body: 'Omar estrae il tuo geo-grid di base e la salute delle citazioni. Concedi l’accesso gestore al Profilo in 2 clic.',
        foot: 'Tempi: 24 ore',
      },
      {
        n: '02',
        title: 'Giorno 7: Schema e sync',
        body: 'Schema.org JSON-LD LocalBusiness e citazioni tier-1 distribuiti e sindacati ai principali entity graph IA.',
        foot: 'Fondamenta completa',
      },
      {
        n: '03',
        title: 'Giorno 30: Report di ranking',
        body: 'Ricevi il tuo primo report di movimento geo-grid a 30 giorni, con espansione esatta del raggio e lift delle chiamate.',
        foot: 'Primo report di tappa',
      },
    ],
  },
  pt: {
    matrixEyebrow: 'Planos lado a lado',
    matrixTitle: 'O que cada nível inclui',
    matrixCaption: 'Entregáveis mensais por nível',
    matrixCol: 'Entregável',
    srIncluded: 'Incluído',
    srNotIncluded: 'Não incluído',
    matrix: [
      {
        label: 'Gestão do Perfil da Empresa',
        values: ['Posts semanais', 'Duas vezes por semana + P&R', 'Diário, multi-perfil'],
      },
      {
        label: 'Citações manuais tier-1 e tier-2',
        values: ['Check-up e sincronização', 'Sincronização expandida', 'Cobertura máxima'],
      },
      {
        label: 'Esquema generativo e calibração LLM',
        values: [false, true, 'Grafo de entidades prioritário'],
      },
      {
        label: 'Planilha ao vivo e acessos',
        values: [true, true, true],
      },
      {
        label: 'Canal de suporte',
        values: ['E-mail', 'Chamada mensal', 'Slack privado'],
      },
      {
        label: 'Compromisso',
        values: ['Mês a mês', 'Mês a mês', 'Mês a mês'],
      },
    ],
    timelineEyebrow: 'Onboarding',
    timelineTitle: 'O que acontece após o início',
    timelineSub: 'Sem semanas de espera. Assim são seus primeiros 30 dias.',
    timeline: [
      {
        n: '01',
        title: 'Dia 1: Auditoria e acessos',
        body: 'Omar extrai seu geo-grid base e a saúde das citações. Você concede acesso de gerente ao Perfil em 2 cliques.',
        foot: 'Prazo: 24 horas',
      },
      {
        n: '02',
        title: 'Dia 7: Esquema e sincronização',
        body: 'Schema.org JSON-LD LocalBusiness e citações tier-1 implantados e sindicados aos grandes grafos de entidades IA.',
        foot: 'Base pronta',
      },
      {
        n: '03',
        title: 'Dia 30: Relatório de rank',
        body: 'Você recebe seu primeiro relatório de movimento geo-grid de 30 dias, com expansão exata do raio e alta nas chamadas.',
        foot: 'Primeiro relatório de marco',
      },
    ],
  },
  nl: {
    matrixEyebrow: 'Retainers naast elkaar',
    matrixTitle: 'Wat elk niveau bevat',
    matrixCaption: 'Maandelijkse retainer-deliverables per niveau',
    matrixCol: 'Deliverable',
    srIncluded: 'Inbegrepen',
    srNotIncluded: 'Niet inbegrepen',
    matrix: [
      {
        label: 'Bedrijfsprofielbeheer',
        values: ['Wekelijkse posts', 'Tweemaal per week + Q&A', 'Dagelijks, multi-profiel'],
      },
      {
        label: 'Handmatige tier-1- en tier-2-vermeldingen',
        values: ['Gezondheidscheck en sync', 'Uitgebreide sync', 'Maximale dekking'],
      },
      {
        label: 'Generatief schema & LLM-kalibratie',
        values: [false, true, 'Prioriteits-entity-graph'],
      },
      {
        label: 'Live spreadsheet en logins',
        values: [true, true, true],
      },
      {
        label: 'Supportkanaal',
        values: ['E-mail', 'Maandelijkse call', 'Privé-Slack'],
      },
      {
        label: 'Binding',
        values: ['Maand tot maand', 'Maand tot maand', 'Maand tot maand'],
      },
    ],
    timelineEyebrow: 'Onboarding',
    timelineTitle: 'Wat er na de start gebeurt',
    timelineSub: 'Geen wekenlange aanloop. Zo lopen je eerste 30 dagen.',
    timeline: [
      {
        n: '01',
        title: 'Dag 1: Audit & toegang',
        body: 'Omar trekt je basis-geo-grid en vermeldinggezondheid erbij. Je geeft beheerderstoegang tot het profiel in 2 klikken.',
        foot: 'Doorlooptijd: 24 uur',
      },
      {
        n: '02',
        title: 'Dag 7: Schema & sync',
        body: 'LocalBusiness-Schema.org-JSON-LD en tier-1-vermeldingen worden uitgerold en naar grote AI-entity-graphs gesyndiceerd.',
        foot: 'Fundament klaar',
      },
      {
        n: '03',
        title: 'Dag 30: Rankrapport',
        body: 'Je ontvangt je eerste 30-dagen-geo-grid-bewegingsrapport, met exacte radiusexpansie en oproeplift.',
        foot: 'Eerste mijlpaalrapport',
      },
    ],
  },
};
