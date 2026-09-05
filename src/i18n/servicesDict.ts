/**
 * Localised service records for the locale services overview + detail pages.
 * EN stays canonical in `src/data/services.ts`; these six rows mirror its
 * shape exactly (id/slug/icon/stickerColor unchanged) so components swap the
 * array by URL locale with zero forks. Technical entities (NAP, Schema.org
 * JSON-LD, GBP, Tier-1/2, LLM) stay untranslated; surrounding copy is
 * transcreated per locale.
 */
import type { Service } from '../data/services';

export const servicesDict: Record<string, Service[]> = {
  es: [
    {
      id: 'local-seo',
      slug: 'local-seo',
      title: 'SEO local e hipervisibilidad local',
      shortDescription:
        'Domina las búsquedas localizadas en tu área de servicio. Diseñamos citaciones locales de alta autoridad, páginas de ubicación y señales geográficas estructuradas.',
      fullDescription:
        'Cuando clientes de tu ciudad buscan tu servicio exacto, ¿apareces en los primeros resultados orgánicos? Nuestra infraestructura de SEO local optimiza señales técnicas, construye silos de contenido por ubicación y crea autoridad hiperlocal que supera a la competencia de forma permanente.',
      icon: 'MapPin',
      stickerColor: 'accent-sky',
      badgeText: 'Alta demanda',
      metrics: [
        { value: '+340%', label: 'Aumento medio del tráfico orgánico local' },
        { value: '3.8x', label: 'Más llamadas y reservas entrantes' },
        { value: '90 días', label: 'Plazo típico para el ranking objetivo' },
      ],
      deliverables: [
        'Investigación de keywords hiperlocales e intención según radios de servicio',
        'Optimización SEO on-page completa con marcado Schema.org JSON-LD localizado',
        'Arquitectura de silos localizada y páginas por área de servicio de alta conversión',
        'Sincronización NAP (nombre, dirección, teléfono) en más de 70 directorios',
        'Análisis de brecha competitiva y adquisición de backlinks geo-dirigidos',
        'Informes mensuales transparentes con movimientos de keywords y volumen de llamadas',
      ],
      process: [
        {
          step: '01',
          title: 'Auditoría técnica y de mercado local',
          desc: 'Diagnosticamos la salud de tu dominio, consistencia NAP, perfil de entidad local y huella geográfica de competidores.',
        },
        {
          step: '02',
          title: 'Geo-arquitectura e ingeniería de esquema',
          desc: 'Inyectamos Schema LocalBusiness robusto, optimizamos metadatos y construimos páginas dedicadas por barrio.',
        },
        {
          step: '03',
          title: 'Sindicación de citaciones y autoridad',
          desc: 'Sindicamos tu información en agregadores de datos de primer nivel y aseguramos citaciones de relevancia local.',
        },
        {
          step: '04',
          title: 'Seguimiento de conversiones y escalado',
          desc: 'Medimos llamadas, solicitudes de ruta y conversiones orgánicas, ajustando el foco para expandir tu radio de ranking.',
        },
      ],
      faqs: [
        {
          q: '¿En qué se diferencia el SEO local del SEO normal?',
          a: 'El SEO local apunta a la intención geográfica («reparación de HVAC cerca de mí» o «fontanero en Dallas»). Se centra en rankings del 3-pack de Maps, esquema localizado, señales de proximidad y citaciones en directorios locales.',
        },
        {
          q: '¿En cuánto tiempo mejorará mi posicionamiento?',
          a: 'La mayoría de negocios locales ve movimiento medible en 30-60 días, con saltos sustanciales de ranking y picos de llamadas entre los 60 y 90 días.',
        },
      ],
    },
    {
      id: 'aeo-geo',
      slug: 'aeo-geo',
      title: 'AEO y optimización para motores generativos (GEO)',
      shortDescription:
        'Logra que ChatGPT, Gemini, Perplexity y AI Overviews te recomienden cuando un cliente pregunte a la IA quién es el mejor proveedor local.',
      fullDescription:
        'Los buscadores modernos piden recomendaciones a asistentes de IA en lugar de hacer clic en 10 enlaces. Si un motor de IA no entiende tu entidad, eres invisible. Diseñamos tu presencia en grafos de conocimiento, embeddings vectoriales y citaciones autorizadas para que los motores generativos elijan y citen tu negocio primero.',
      icon: 'Bot',
      stickerColor: 'accent-purple',
      badgeText: 'Búsqueda en la era IA',
      metrics: [
        { value: '+420%', label: 'Tasa de citación en motores de respuesta IA' },
        { value: '#1', label: 'Entidad recomendada en consultas objetivo' },
        { value: '4 motores', label: 'ChatGPT, Gemini, Perplexity, Claude' },
      ],
      deliverables: [
        'Verificación y optimización de entidad y grafo de conocimiento IA',
        'Auditoría de citaciones generativas en ChatGPT Search, Gemini, Perplexity y AI Overviews',
        'Estructuración semántica de contenido optimizada para ingesta por LLM',
        'Citaciones de entidad en Wikidata, Crunchbase, Schema.org y contextos de alta autoridad',
        'Modelado de FAQ y consultas conversacionales para ganar snippets de respuesta IA',
        'Pruebas de simulación de prompts para medir recomendaciones IA en tiempo real',
      ],
      process: [
        {
          step: '01',
          title: 'Auditoría de percepción IA y entidad',
          desc: 'Consultamos 5 LLM principales con más de 50 prompts localizados para medir cuánta citación obtiene tu marca frente a competidores.',
        },
        {
          step: '02',
          title: 'Alineación del grafo de conocimiento',
          desc: 'Estructuramos tus definiciones de entidad en Schema, registros autorizados y fuentes de validación de terceros.',
        },
        {
          step: '03',
          title: 'Optimización semántica de contenido',
          desc: 'Reescribimos y formateamos tus activos web clave con marcado semántico, respuestas directas y tablas de datos que los LLM adoran citar.',
        },
        {
          step: '04',
          title: 'Seguimiento continuo de prompts',
          desc: 'Monitoreamos las respuestas de los motores generativos y refinamos las señales de entidad para mantener la dominancia en recomendaciones IA.',
        },
      ],
      faqs: [
        {
          q: '¿Qué diferencia hay entre AEO y GEO?',
          a: 'AEO (optimización para motores de respuesta) ofrece respuestas directas para búsqueda por voz, AI Overviews y respuestas rápidas. GEO (optimización para motores generativos) optimiza el perfil de entidad de tu marca para que los modelos conversacionales (ChatGPT, Gemini, Perplexity) citen y recomienden tu negocio de forma natural.',
        },
        {
          q: '¿Por qué mi negocio local necesita GEO ahora mismo?',
          a: 'Más del 40 % de las consultas con intención comercial ya activan respuestas IA u ocurren dentro de apps de IA. Si tu competidor es el único citado por ChatGPT como el «mejor electricista del norte de Austin», captura el lead de alta intención antes de que el cliente vea Google.',
        },
      ],
    },
    {
      id: 'google-maps',
      slug: 'google-maps',
      title: 'Motor de crecimiento del 3-pack de Google Maps',
      shortDescription:
        'Entra en el top 3 de Google Maps en todo tu territorio con Perfiles de Empresa optimizados y sistemas de velocidad de reseñas.',
      fullDescription:
        'Los 3 primeros listados del pack de Google Maps capturan más del 70 % de los clics y llamadas locales. Eliminamos zonas muertas del geo-grid y expandimos tu perímetro con optimización avanzada del perfil, sistemas de fotos geo-etiquetadas, automatización de reseñas y señales de engagement conductual.',
      icon: 'Compass',
      stickerColor: 'accent-green',
      badgeText: 'Alta conversión',
      metrics: [
        { value: '+70 %', label: 'De los clics locales capturados en el 3-pack' },
        { value: '4.9', label: 'Valoración media de reseñas de clientes, sobre 5' },
        { value: '8-24 km', label: 'Radio de ranking geo-grid expandido' },
      ],
      deliverables: [
        'Renovación y verificación completa de tu Perfil de Empresa de Google (GBP)',
        'Pruebas de precisión de categorías primaria y secundaria para máximo alcance',
        'Mapas de calor geo-grid que miden tu ranking cada 0,8 km',
        'Secuencias automatizadas SMS/email para una velocidad de reseñas constante',
        'Publicaciones semanales GBP, novedades, catálogos y fotos geo-etiquetadas',
        'Lucha anti-spam: denuncia y eliminación de listados ilegítimos con keywords de competidores',
      ],
      process: [
        {
          step: '01',
          title: 'Mapeo de ranking geo-grid',
          desc: 'Ejecutamos una auditoría GPS multipunto para saber dónde rankeas en cada kilómetro cuadrado de tu ciudad.',
        },
        {
          step: '02',
          title: 'Ajuste algorítmico del GBP',
          desc: 'Calibramos categorías, menús de servicios, atributos, horarios y descripciones para maximizar la relevancia.',
        },
        {
          step: '03',
          title: 'Velocidad de reseñas y engagement',
          desc: 'Desplegamos flujos de captura de reseñas sin fricción para generar reseñas auténticas con keywords objetivo incluidas.',
        },
        {
          step: '04',
          title: 'Expansión de proximidad',
          desc: 'Construimos señales localizadas y páginas que expanden tu radio de ranking hacia pueblos y suburbios vecinos.',
        },
      ],
      faqs: [
        {
          q: '¿Pueden ayudar a eliminar reseñas negativas falsas?',
          a: 'Auditamos cada reseña contra las políticas de Google y presentamos apelaciones formales para eliminar reseñas spam o fraudulentas, mientras diluimos las negativas legítimas con velocidad de reseñas positivas.',
        },
        {
          q: '¿Y si mis competidores rellenan su nombre con keywords?',
          a: 'Monitoreamos tu geo-grid buscando competidores que violen las directrices con keywords o direcciones falsas, y presentamos denuncias directas para liberar los 3 primeros puestos para tu listado legítimo.',
        },
      ],
    },
  ],
  fr: [
    {
      id: 'local-seo',
      slug: 'local-seo',
      title: 'SEO local et visibilité hyper-locale',
      shortDescription:
        'Dominez les requêtes localisées de votre zone d’intervention. Nous concevons des citations locales à haute autorité, des pages de localisation et des signaux géo structurés.',
      fullDescription:
        'Quand des clients de votre ville cherchent votre service exact, apparaissez-vous dans les premiers résultats organiques ? Notre infrastructure SEO locale optimise les signaux techniques, construit des silos de contenu par zone et crée une autorité hyper-locale qui surpasse durablement la concurrence.',
      icon: 'MapPin',
      stickerColor: 'accent-sky',
      badgeText: 'Forte demande',
      metrics: [
        { value: '+340 %', label: 'Hausse moyenne du trafic organique local' },
        { value: '3,8x', label: 'Plus d’appels entrants et de réservations' },
        { value: '90 jours', label: 'Délai typique du classement visé' },
      ],
      deliverables: [
        'Recherche de mots-clés hyper-locaux et d’intention selon les rayons d’intervention',
        'Optimisation SEO on-page complète avec balisage Schema.org JSON-LD localisé',
        'Architecture en silos localisée et pages de zone à forte conversion',
        'Synchronisation NAP (nom, adresse, téléphone) sur plus de 70 annuaires',
        'Analyse des écarts concurrents et acquisition de backlinks géo-ciblés',
        'Reporting mensuel transparent : mouvements de mots-clés et volume d’appels',
      ],
      process: [
        {
          step: '01',
          title: 'Audit marché local et technique',
          desc: 'Nous diagnostiquons la santé de votre domaine, la cohérence NAP, votre profil d’entité locale et l’empreinte géo des concurrents.',
        },
        {
          step: '02',
          title: 'Géo-architecture et ingénierie du schéma',
          desc: 'Nous injectons un Schema LocalBusiness robuste, optimisons les métadonnées et construisons des pages dédiées par quartier.',
        },
        {
          step: '03',
          title: 'Syndication des citations et de l’autorité',
          desc: 'Nous syndiquons vos informations sur les agrégateurs de données de premier rang et sécurisons des citations à pertinence locale.',
        },
        {
          step: '04',
          title: 'Suivi des conversions et scale',
          desc: 'Nous suivons appels, demandes d’itinéraire et conversions organiques, en ajustant le cap pour élargir votre rayon de classement.',
        },
      ],
      faqs: [
        {
          q: 'En quoi le SEO local diffère-t-il du SEO classique ?',
          a: 'Le SEO local vise l’intention géographique (« dépannage HVAC près de moi » ou « plombier à Dallas »). Il mise sur le 3-pack Maps, le schéma localisé, les signaux de proximité et les citations dans les annuaires locaux.',
        },
        {
          q: 'En combien de temps mon classement va-t-il progresser ?',
          a: 'La plupart des entreprises locales voient un mouvement mesurable sous 30 à 60 jours, avec des bonds substantiels et des pics d’appels entre 60 et 90 jours.',
        },
      ],
    },
    {
      id: 'aeo-geo',
      slug: 'aeo-geo',
      title: 'AEO et optimisation pour moteurs génératifs (GEO)',
      shortDescription:
        'Faites-vous recommander par ChatGPT, Gemini, Perplexity et Google AI Overviews quand un prospect demande à l’IA le meilleur prestataire local.',
      fullDescription:
        'Les chercheurs modernes demandent des recommandations aux assistants IA au lieu de cliquer sur 10 liens. Si un moteur IA ne comprend pas votre entité, vous êtes invisible. Nous construisons votre présence dans les graphes de connaissances, les embeddings vectoriels et les citations faisant autorité pour que les moteurs génératifs choisissent et citent votre entreprise en premier.',
      icon: 'Bot',
      stickerColor: 'accent-purple',
      badgeText: 'Recherche ère IA',
      metrics: [
        { value: '+420 %', label: 'Taux de citation par les moteurs de réponse IA' },
        { value: '#1', label: 'Entité recommandée sur les requêtes visées' },
        { value: '4 moteurs', label: 'ChatGPT, Gemini, Perplexity, Claude' },
      ],
      deliverables: [
        'Vérification et optimisation d’entité et de graphe de connaissances IA',
        'Audit de citations génératives sur ChatGPT Search, Gemini, Perplexity et AI Overviews',
        'Structuration sémantique du contenu optimisée pour ingestion par LLM',
        'Citations d’entité Wikidata, Crunchbase, Schema.org et contextes à haute autorité',
        'Modélisation FAQ et requêtes conversationnelles pour gagner les extraits IA',
        'Tests de simulation de prompts pour mesurer les recommandations IA en temps réel',
      ],
      process: [
        {
          step: '01',
          title: 'Audit perception IA et entité',
          desc: 'Nous interrogeons 5 LLM majeurs sur plus de 50 prompts localisés pour mesurer la citation de votre marque face aux concurrents.',
        },
        {
          step: '02',
          title: 'Alignement du graphe de connaissances',
          desc: 'Nous structurons vos définitions d’entité dans Schema, les registres faisant autorité et les sources de validation tierces.',
        },
        {
          step: '03',
          title: 'Optimisation sémantique du contenu',
          desc: 'Nous réécrivons et formatons vos actifs web clés avec balisage sémantique, réponses directes et tableaux de données que les LLM adorent citer.',
        },
        {
          step: '04',
          title: 'Suivi continu des prompts',
          desc: 'Nous surveillons les réponses des moteurs génératifs et affinons les signaux d’entité pour garder la dominance en recommandations IA.',
        },
      ],
      faqs: [
        {
          q: 'Quelle différence entre AEO et GEO ?',
          a: 'L’AEO (optimisation pour moteurs de réponse) fournit des réponses directes pour la recherche vocale, AI Overviews et les réponses rapides. Le GEO (optimisation pour moteurs génératifs) optimise le profil d’entité de votre marque pour que les modèles conversationnels (ChatGPT, Gemini, Perplexity) citent et recommandent naturellement votre entreprise.',
        },
        {
          q: 'Pourquoi mon entreprise locale a-t-elle besoin du GEO dès maintenant ?',
          a: 'Plus de 40 % des requêtes à intention commerciale déclenchent déjà des réponses IA ou se jouent dans des apps IA. Si votre concurrent est le seul cité par ChatGPT comme « meilleur électricien du nord d’Austin », il capte le lead à forte intention avant même que le client voie Google.',
        },
      ],
    },
    {
      id: 'google-maps',
      slug: 'google-maps',
      title: 'Moteur de croissance du 3-pack Google Maps',
      shortDescription:
        'Entrez dans le top 3 de Google Maps sur tout votre territoire grâce à des fiches d’établissement optimisées et des systèmes de vélocité d’avis.',
      fullDescription:
        'Les 3 premiers résultats du pack Google Maps captent plus de 70 % des clics et appels locaux. Nous éliminons les zones mortes du géo-grid et élargissons votre périmètre avec optimisation avancée du profil, systèmes photo géo-taguées, automatisation des avis et signaux d’engagement comportementaux.',
      icon: 'Compass',
      stickerColor: 'accent-green',
      badgeText: 'Haute conversion',
      metrics: [
        { value: '+70 %', label: 'Des clics locaux captés dans le 3-pack' },
        { value: '4,9', label: 'Note moyenne des avis clients, sur 5' },
        { value: '8-24 km', label: 'Rayon de classement géo-grid élargi' },
      ],
      deliverables: [
        'Refonte et vérification complètes de votre fiche d’établissement Google (GBP)',
        'Tests de précision des catégories primaire et secondaire pour une portée maximale',
        'Cartes de chaleur géo-grid mesurant votre classement tous les 0,8 km',
        'Séquences automatisées SMS/e-mail pour une vélocité d’avis constante',
        'Posts hebdomadaires GBP, nouveautés, catalogues et photos géo-taguées',
        'Lutte anti-spam : signalement et suppression des fiches illégitimes bourrées de mots-clés',
      ],
      process: [
        {
          step: '01',
          title: 'Cartographie du rang géo-grid',
          desc: 'Nous exécutons un audit GPS multipoint pour savoir où vous classez sur chaque kilomètre carré de votre ville.',
        },
        {
          step: '02',
          title: 'Réglage algorithmique du GBP',
          desc: 'Nous calibrons catégories, menus de services, attributs, horaires et descriptions pour maximiser la pertinence.',
        },
        {
          step: '03',
          title: 'Vélocité d’avis et engagement',
          desc: 'Nous déployons des parcours de capture d’avis sans friction pour générer des avis authentiques incluant vos mots-clés.',
        },
        {
          step: '04',
          title: 'Expansion de proximité',
          desc: 'Nous construisons signaux localisés et pages qui élargissent votre rayon vers les villes et banlieues voisines.',
        },
      ],
      faqs: [
        {
          q: 'Pouvez-vous aider à supprimer de faux avis négatifs ?',
          a: 'Nous auditons chaque avis au regard des règles de Google et déposons des recours formels pour supprimer avis spam ou frauduleux, tout en diluant les négatifs légitimes par la vélocité d’avis positifs.',
        },
        {
          q: 'Et si mes concurrents bourrent leur nom de mots-clés ?',
          a: 'Nous surveillons votre géo-grid contre les concurrents violant les règles avec faux mots-clés ou fausses adresses, et déposons des plaintes directes pour libérer les 3 premières places pour votre fiche légitime.',
        },
      ],
    },
  ],
  de: [
    {
      id: 'local-seo',
      slug: 'local-seo',
      title: 'Local SEO & hyperlokale Sichtbarkeit',
      shortDescription:
        'Dominiere lokalisierte Suchanfragen in deinem Einzugsgebiet. Wir entwickeln hochautoritative lokale Zitationen, Standortseiten und strukturierte Geo-Signale.',
      fullDescription:
        'Wenn Kunden in deiner Stadt nach deiner exakten Leistung suchen, erscheinst du in den Top-Ergebnissen? Unsere Local-SEO-Infrastruktur optimiert technische Signale, baut standortspezifische Content-Silos und schafft hyperlokale Autorität, die Wettbewerber dauerhaft übertrifft.',
      icon: 'MapPin',
      stickerColor: 'accent-sky',
      badgeText: 'Hohe Nachfrage',
      metrics: [
        { value: '+340%', label: 'Durchschnittlicher Lift des lokalen organischen Traffics' },
        { value: '3,8x', label: 'Mehr eingehende Anrufe & Buchungen' },
        { value: '90 Tage', label: 'Typische Ziel-Ranking-Realisierung' },
      ],
      deliverables: [
        'Hyperlokale Keyword- & Intent-Recherche für deine Einzugsradien',
        'Komplette On-Page-Optimierung mit lokalisiertem Schema.org-JSON-LD-Markup',
        'Lokalisierte Silo-Architektur & konversionsstarke Einzugsgebiets-Landingpages',
        'Saubere NAP-Synchronisierung über 70+ Verzeichnisse',
        'Wettbewerber-Gap-Analyse und geo-targeted Backlink-Akquise',
        'Monatliches transparentes Reporting zu Keyword-Bewegungen und Anrufvolumen',
      ],
      process: [
        {
          step: '01',
          title: 'Lokales Markt- & Technik-Audit',
          desc: 'Wir diagnostizieren Domain-Health, NAP-Konsistenz, lokales Entity-Profil und Geo-Footprints der Wettbewerber.',
        },
        {
          step: '02',
          title: 'Geo-Architektur & Schema-Engineering',
          desc: 'Wir injizieren robustes LocalBusiness-Schema, optimieren Metadaten und bauen dedizierte Stadtteil-Landingpages.',
        },
        {
          step: '03',
          title: 'Zitations- & Autoritäts-Syndizierung',
          desc: 'Wir syndizieren deine Firmendaten über hochrangige Datenaggregatoren und sichern lokale Relevanz-Zitationen.',
        },
        {
          step: '04',
          title: 'Conversion-Tracking & Skalierung',
          desc: 'Wir tracken Anrufe, Routenanfragen und organische Conversions und justieren den Fokus, um deinen Ranking-Radius zu erweitern.',
        },
      ],
      faqs: [
        {
          q: 'Was unterscheidet Local SEO von normalem SEO?',
          a: 'Local SEO zielt auf geografische Suchintention („HVAC-Notdienst in der Nähe“ oder „Klempner in Dallas“). Es fokussiert Maps-3-Pack-Rankings, lokalisiertes Schema, Nähe-Signale und lokale Verzeichnis-Zitationen.',
        },
        {
          q: 'Wie schnell verbessern sich meine Rankings?',
          a: 'Die meisten lokalen Betriebe sehen in 30 bis 60 Tagen messbare Bewegung, mit deutlichen Rankingsprüngen und Anrufspitzen zwischen 60 und 90 Tagen.',
        },
      ],
    },
    {
      id: 'aeo-geo',
      slug: 'aeo-geo',
      title: 'AEO & Generative Engine Optimization (GEO)',
      shortDescription:
        'Werde von ChatGPT, Gemini, Perplexity und Google AI Overviews empfohlen, wenn Interessenten die KI nach dem besten lokalen Anbieter fragen.',
      fullDescription:
        'Moderne Sucher fragen KI-Assistenten nach Empfehlungen, statt 10 blaue Links zu klicken. Wenn eine KI-Engine deine Unternehmens-Entity nicht versteht, bist du unsichtbar. Wir entwickeln deine Markenpräsenz über KI-Knowledge-Graphen, Vektor-Embeddings und autoritative Zitationen, sodass generative Engines dein Business zuerst wählen und zitieren.',
      icon: 'Bot',
      stickerColor: 'accent-purple',
      badgeText: 'Suche im KI-Zeitalter',
      metrics: [
        { value: '+420%', label: 'KI-Answer-Engine-Zitationsrate' },
        { value: '#1', label: 'Empfohlene Entity bei Ziel-Queries' },
        { value: '4 Engines', label: 'ChatGPT, Gemini, Perplexity, Claude' },
      ],
      deliverables: [
        'KI-Knowledge-Graph- und Entity-Verifizierung und -Optimierung',
        'Generative-Engine-Citation-Audit über ChatGPT Search, Gemini, Perplexity & AI Overviews',
        'Semantische Content-Strukturierung, optimiert für LLM-Ingestion',
        'Wikidata-, Crunchbase-, Schema.org- und hochautoritative Kontext-Entity-Zitationen',
        'FAQ- & Conversational-Query-Modellierung für direkte KI-Antwort-Snippets',
        'Prompt-Simulations-Tests zum Tracking echter KI-Empfehlungen',
      ],
      process: [
        {
          step: '01',
          title: 'KI-Wahrnehmungs- & Entity-Audit',
          desc: 'Wir befragen 5 große LLMs mit 50+ lokalisierten Prompts und benchmarken, wie oft deine Marke vs. Wettbewerber zitiert wird.',
        },
        {
          step: '02',
          title: 'Knowledge-Graph-Alignment',
          desc: 'Wir strukturieren deine Entity-Definitionen über Schema, autoritative Register und Third-Party-Validierungsquellen.',
        },
        {
          step: '03',
          title: 'Semantische Content-Optimierung',
          desc: 'Wir schreiben Kern-Assets mit semantischem Markup, klaren Direktantworten und Datentabellen um, die LLMs gern zitieren.',
        },
        {
          step: '04',
          title: 'Kontinuierliches Prompt-Tracking',
          desc: 'Wir monitoren laufend generative Antwort-Outputs und verfeinern Entity-Signale, um die KI-Empfehlungsdominanz zu halten.',
        },
      ],
      faqs: [
        {
          q: 'Was ist AEO vs. GEO?',
          a: 'AEO (Answer Engine Optimization) liefert direkte, prägnante Antworten für Voice Search, AI Overviews und Quick Answers. GEO (Generative Engine Optimization) optimiert dein Marken-Entity-Profil, sodass konversationelle KI-Modelle (ChatGPT, Gemini, Perplexity) dein Business natürlich zitieren und empfehlen.',
        },
        {
          q: 'Warum brauchen lokale Betriebe GEO genau jetzt?',
          a: 'Über 40 % der Queries mit kommerzieller Intention triggern heute KI-Antworten oder finden direkt in KI-Apps statt. Wenn dein lokaler Wettbewerber als einziger von ChatGPT als „Top-Elektriker in Nord-Austin“ zitiert wird, schnappt er den High-Intent-Lead, bevor der Kunde je Google sieht.',
        },
      ],
    },
    {
      id: 'google-maps',
      slug: 'google-maps',
      title: 'Google Maps 3-Pack Growth Engine',
      shortDescription:
        'Ranke im Top-3 auf Google Maps im gesamten Zielgebiet — mit optimierten Unternehmensprofilen und Review-Velocity-Systemen.',
      fullDescription:
        'Die Top-3-Listings im Google Maps Pack vereinen über 70 % aller lokalen Klicks und Anrufe. Wir eliminieren Geo-Grid-Totzonen und erweitern deinen Ranking-Perimeter mit Profiloptimierung, Geo-Tag-Fotosystemen, Review-Response-Automatisierung und Behavioral-Engagement-Signalen.',
      icon: 'Compass',
      stickerColor: 'accent-green',
      badgeText: 'Hohe Conversion',
      metrics: [
        { value: '70 %+', label: 'Aller lokalen Klicks im 3-Pack' },
        { value: '4,9', label: 'Durchschnittliche Kundenbewertung, von 5' },
        { value: '8–24 km', label: 'Erweiterter Geo-Grid-Ranking-Radius' },
      ],
      deliverables: [
        'Kompletter Google-Unternehmensprofil-(GBP-)Overhaul & Verifizierung',
        'Primär- & Sekundär-Kategorie-Präzisionstests für maximale algorithmische Reichweite',
        'Geo-Grid-Ranking-Heatmaps im 0,8-km-Raster',
        'Automatisierte SMS-/E-Mail-Review-Sequenzen für stetige Review-Velocity',
        'GBP-Wochenposts, Updates, Produktkataloge & Geo-Tag-Fotouploads mit hohem Engagement',
        'Spam-Bekämpfung: Meldung und Entfernung illegitimer Keyword-gestopfter Wettbewerber-Listings',
      ],
      process: [
        {
          step: '01',
          title: 'Geo-Grid-Rank-Mapping',
          desc: 'Wir fahren ein GPS-Raster-Audit und identifizieren, wo du auf jedem Quadratkilometer deiner Stadt rankst.',
        },
        {
          step: '02',
          title: 'GBP-Algorithmus-Tuning',
          desc: 'Wir kalibrieren Kategorien, Leistungsmenüs, Attribute, Zeiten und Beschreibungen für maximalen Relevanz-Score.',
        },
        {
          step: '03',
          title: 'Review-Velocity & Engagement',
          desc: 'Wir deployen reibungslose Review-Capture-Workflows für authentische Kundenbewertungen mit Ziel-Keywords.',
        },
        {
          step: '04',
          title: 'Nähe-Expansion',
          desc: 'Wir bauen lokalisierte Signale und Landingpages, die deinen Ranking-Radius in Nachbarorte und Vororte erweitern.',
        },
      ],
      faqs: [
        {
          q: 'Könnt ihr Fake-Negativbewertungen entfernen lassen?',
          a: 'Wir auditieren alle Bewertungen gegen Googles Policies und stellen formale Policy-Verstoß-Appeals, um Spam- oder Betrugsbewertungen zu entfernen — während wir legitime Negative mit positiver Review-Velocity verwässern.',
        },
        {
          q: 'Was, wenn Wettbewerber ihren Firmennamen mit Keywords stopfen?',
          a: 'Wir monitoren dein Geo-Grid auf Wettbewerber, die mit Fake-Keywords oder Fake-Adressen gegen Googles Richtlinien verstoßen, und stellen direkte Redressal-Beschwerden, um die Top-3 für dein legitimes Listing freizuräumen.',
        },
      ],
    },
  ],
  it: [
    {
      id: 'local-seo',
      slug: 'local-seo',
      title: 'SEO locale e iper-visibilità locale',
      shortDescription:
        'Domina le query localizzate nella tua area di servizio. Progettiamo citazioni locali autorevoli, pagine di località e segnali geografici strutturati.',
      fullDescription:
        'Quando i clienti della tua città cercano il tuo esatto servizio, compari nei primi risultati organici? La nostra infrastruttura SEO locale ottimizza i segnali tecnici, costruisce silo di contenuti per località e crea autorevolezza iper-locale che supera i concorrenti in modo permanente.',
      icon: 'MapPin',
      stickerColor: 'accent-sky',
      badgeText: 'Alta richiesta',
      metrics: [
        { value: '+340%', label: 'Incremento medio del traffico organico locale' },
        { value: '3.8x', label: 'Più chiamate in entrata e prenotazioni' },
        { value: '90 giorni', label: 'Tempo tipico per il ranking obiettivo' },
      ],
      deliverables: [
        'Ricerca keyword iper-locali e intento su misura per raggi di servizio',
        'Ottimizzazione SEO on-page completa con markup Schema.org JSON-LD localizzato',
        'Architettura a silo localizzata e landing per area di servizio ad alta conversione',
        'Sincronizzazione NAP (nome, indirizzo, telefono) su oltre 70 directory',
        'Analisi del gap competitivo e acquisizione backlink geo-mirati',
        'Report mensili trasparenti su movimenti keyword e volume chiamate',
      ],
      process: [
        {
          step: '01',
          title: 'Audit tecnico e di mercato locale',
          desc: 'Diagnostichiamo salute del dominio, coerenza NAP, profilo di entità locale e impronte geografiche dei concorrenti.',
        },
        {
          step: '02',
          title: 'Geo-architettura e ingegneria dello schema',
          desc: 'Iniettiamo Schema LocalBusiness robusto, ottimizziamo i metadati e costruiamo landing dedicate per quartiere.',
        },
        {
          step: '03',
          title: 'Sindicazione di citazioni e autorevolezza',
          desc: 'Sindachiamo le tue informazioni sui data aggregator di primo livello e assicuriamo citazioni a rilevanza locale.',
        },
        {
          step: '04',
          title: 'Tracciamento conversioni e scaling',
          desc: 'Tracciamo chiamate, richieste di indicazioni e conversioni organiche, regolando il focus per espandere il tuo raggio di ranking.',
        },
      ],
      faqs: [
        {
          q: 'Come si differenzia la SEO locale dalla SEO normale?',
          a: 'La SEO locale punta all’intento geografico («riparazione HVAC vicino a me» o «idraulico a Dallas»). Si concentra su ranking nel 3-pack di Maps, schema localizzato, segnali di prossimità e citazioni nelle directory locali.',
        },
        {
          q: 'In quanto tempo migliorerà il mio posizionamento?',
          a: 'La maggior parte delle attività locali vede movimenti misurabili entro 30-60 giorni, con salti sostanziali e picchi di chiamate tra 60 e 90 giorni.',
        },
      ],
    },
    {
      id: 'aeo-geo',
      slug: 'aeo-geo',
      title: 'AEO e ottimizzazione per motori generativi (GEO)',
      shortDescription:
        'Fatti raccomandare da ChatGPT, Gemini, Perplexity e Google AI Overviews quando un prospect chiede all’IA il miglior fornitore locale.',
      fullDescription:
        'I ricercatori moderni chiedono raccomandazioni agli assistenti IA invece di cliccare 10 link. Se un motore IA non comprende la tua entità, sei invisibile. Progettiamo la tua presenza nei knowledge graph, negli embedding vettoriali e nelle citazioni autorevoli così che i motori generativi scelgano e citino per prima la tua attività.',
      icon: 'Bot',
      stickerColor: 'accent-purple',
      badgeText: 'Ricerca era AI',
      metrics: [
        { value: '+420%', label: 'Tasso di citazione nei motori di risposta AI' },
        { value: '#1', label: 'Entità raccomandata nelle query obiettivo' },
        { value: '4 motori', label: 'ChatGPT, Gemini, Perplexity, Claude' },
      ],
      deliverables: [
        'Verifica e ottimizzazione di entità e knowledge graph AI',
        'Audit delle citazioni generative su ChatGPT Search, Gemini, Perplexity e AI Overviews',
        'Strutturazione semantica dei contenuti ottimizzata per ingestione da LLM',
        'Citazioni di entità su Wikidata, Crunchbase, Schema.org e contesti ad alta autorevolezza',
        'Modellazione FAQ e query conversazionali per vincere gli snippet di risposta AI',
        'Test di simulazione dei prompt per misurare le raccomandazioni AI in tempo reale',
      ],
      process: [
        {
          step: '01',
          title: 'Audit di percezione AI ed entità',
          desc: 'Interroghiamo 5 LLM principali con oltre 50 prompt localizzati per misurare quanto il tuo brand viene citato rispetto ai concorrenti.',
        },
        {
          step: '02',
          title: 'Allineamento del knowledge graph',
          desc: 'Strutturiamo le tue definizioni di entità in Schema, registri autorevoli e fonti di validazione terze.',
        },
        {
          step: '03',
          title: 'Ottimizzazione semantica dei contenuti',
          desc: 'Riscriviamo e formattiamo i tuoi asset web chiave con markup semantico, risposte dirette e tabelle di dati che gli LLM adorano citare.',
        },
        {
          step: '04',
          title: 'Monitoraggio continuo dei prompt',
          desc: 'Monitoriamo gli output dei motori generativi e rifiniamo i segnali di entità per mantenere la dominanza nelle raccomandazioni AI.',
        },
      ],
      faqs: [
        {
          q: 'Cosa cambia tra AEO e GEO?',
          a: 'AEO (ottimizzazione per motori di risposta) fornisce risposte dirette per ricerca vocale, AI Overviews e risposte rapide. GEO (ottimizzazione per motori generativi) ottimizza il profilo di entità del tuo brand affinché i modelli conversazionali (ChatGPT, Gemini, Perplexity) citino e raccomandino naturalmente la tua attività.',
        },
        {
          q: 'Perché la mia attività locale ha bisogno del GEO proprio ora?',
          a: 'Oltre il 40% delle query con intento commerciale attiva già risposte AI o avviene dentro app AI. Se il tuo concorrente è l’unico citato da ChatGPT come «miglior elettricista nel nord di Austin», cattura il lead ad alto intento prima che il cliente veda Google.',
        },
      ],
    },
    {
      id: 'google-maps',
      slug: 'google-maps',
      title: 'Motore di crescita del 3-pack di Google Maps',
      shortDescription:
        'Entra nella top 3 di Google Maps in tutto il tuo territorio con Profili dell’attività ottimizzati e sistemi di velocity delle recensioni.',
      fullDescription:
        'I primi 3 risultati del pack di Google Maps catturano oltre il 70% di tutti i clic e le chiamate locali. Eliminiamo le zone morte del geo-grid ed espandiamo il tuo perimetro con ottimizzazione avanzata del profilo, sistemi fotografici geo-taggati, automazione delle risposte alle recensioni e segnali di engagement comportamentale.',
      icon: 'Compass',
      stickerColor: 'accent-green',
      badgeText: 'Alta conversione',
      metrics: [
        { value: '70%+', label: 'Dei clic locali catturati nel 3-pack' },
        { value: '4.9', label: 'Valutazione media recensioni clienti, su 5' },
        { value: '8-24 km', label: 'Raggio di ranking geo-grid espanso' },
      ],
      deliverables: [
        'Rifacimento e verifica completi del tuo Profilo dell’attività su Google (GBP)',
        'Test di precisione su categorie primaria e secondaria per massima portata',
        'Mappe di calore geo-grid che misurano il tuo ranking ogni 0,8 km',
        'Sequenze automatizzate SMS/email per una velocity di recensioni costante',
        'Post settimanali GBP, novità, cataloghi prodotti e foto geo-taggate ad alto engagement',
        'Lotta allo spam: segnalazione e rimozione di listing illegittimi imbottiti di keyword',
      ],
      process: [
        {
          step: '01',
          title: 'Mappatura del rank geo-grid',
          desc: 'Eseguiamo un audit GPS multipunto per sapere dove ti posizioni in ogni chilometro quadrato della tua città.',
        },
        {
          step: '02',
          title: 'Tuning algoritmico del GBP',
          desc: 'Calibriamo categorie, menu di servizi, attributi, orari e descrizioni per massimizzare la pertinenza.',
        },
        {
          step: '03',
          title: 'Velocity delle recensioni ed engagement',
          desc: 'Implementiamo flussi di acquisizione recensioni senza attriti per generare recensioni autentiche con keyword obiettivo.',
        },
        {
          step: '04',
          title: 'Espansione di prossimità',
          desc: 'Costruiamo segnali localizzati e landing che espandono il tuo raggio verso paesi e sobborghi vicini.',
        },
      ],
      faqs: [
        {
          q: 'Potete aiutare a rimuovere recensioni negative false?',
          a: 'Verifichiamo ogni recensione rispetto alle norme di Google e presentiamo ricorsi formali per rimuovere recensioni spam o fraudolente, diluendo le negative legittime con velocity di recensioni positive.',
        },
        {
          q: 'E se i concorrenti imbottiscono il nome di keyword?',
          a: 'Monitoriamo il tuo geo-grid contro concorrenti che violano le linee guida con keyword o indirizzi falsi, e presentiamo reclami diretti per liberare i primi 3 posti per il tuo listing legittimo.',
        },
      ],
    },
  ],
  pt: [
    {
      id: 'local-seo',
      slug: 'local-seo',
      title: 'SEO local e hipervisibilidade local',
      shortDescription:
        'Domine as buscas localizadas na sua área de atendimento. Projetamos citações locais de alta autoridade, páginas de localidade e sinais geográficos estruturados.',
      fullDescription:
        'Quando clientes da sua cidade buscam seu serviço exato, você aparece nos primeiros resultados orgânicos? Nossa infraestrutura de SEO local otimiza sinais técnicos, constrói silos de conteúdo por localidade e cria autoridade hiperlocal que supera concorrentes de forma permanente.',
      icon: 'MapPin',
      stickerColor: 'accent-sky',
      badgeText: 'Alta demanda',
      metrics: [
        { value: '+340%', label: 'Aumento médio do tráfego orgânico local' },
        { value: '3.8x', label: 'Mais chamadas recebidas e agendamentos' },
        { value: '90 dias', label: 'Prazo típico para o ranqueamento-alvo' },
      ],
      deliverables: [
        'Pesquisa de keywords hiperlocais e intenção por raios de atendimento',
        'Otimização SEO on-page completa com marcação Schema.org JSON-LD localizada',
        'Arquitetura em silos localizada e landings por área de atendimento de alta conversão',
        'Sincronização NAP (nome, endereço, telefone) em mais de 70 diretórios',
        'Análise de gap competitivo e aquisição de backlinks geo-direcionados',
        'Relatórios mensais transparentes com movimentos de keywords e volume de chamadas',
      ],
      process: [
        {
          step: '01',
          title: 'Auditoria técnica e de mercado local',
          desc: 'Diagnosticamos a saúde do seu domínio, consistência NAP, perfil de entidade local e pegada geográfica dos concorrentes.',
        },
        {
          step: '02',
          title: 'Geoarquitetura e engenharia de esquema',
          desc: 'Injetamos Schema LocalBusiness robusto, otimizamos metadados e construímos landings dedicadas por bairro.',
        },
        {
          step: '03',
          title: 'Sindicância de citações e autoridade',
          desc: 'Sindicamos suas informações nos agregadores de dados de primeiro nível e garantimos citações de relevância local.',
        },
        {
          step: '04',
          title: 'Tracking de conversões e escala',
          desc: 'Medimos chamadas, pedidos de rota e conversões orgânicas, ajustando o foco para expandir seu raio de ranqueamento.',
        },
      ],
      faqs: [
        {
          q: 'Como o SEO local difere do SEO normal?',
          a: 'O SEO local mira a intenção geográfica («reparo de HVAC perto de mim» ou «encanador em Dallas»). Foca em ranqueamento no 3-pack do Maps, esquema localizado, sinais de proximidade e citações em diretórios locais.',
        },
        {
          q: 'Em quanto tempo meu ranqueamento vai melhorar?',
          a: 'A maioria dos negócios locais vê movimento mensurável em 30-60 dias, com saltos substanciais e picos de chamadas entre 60 e 90 dias.',
        },
      ],
    },
    {
      id: 'aeo-geo',
      slug: 'aeo-geo',
      title: 'AEO e otimização para motores generativos (GEO)',
      shortDescription:
        'Seja recomendado por ChatGPT, Gemini, Perplexity e Google AI Overviews quando um prospect pergunta à IA quem é o melhor fornecedor local.',
      fullDescription:
        'Buscadores modernos pedem recomendações a assistentes de IA em vez de clicar em 10 links. Se um motor de IA não entende sua entidade, você é invisível. Projetamos sua presença em grafos de conhecimento, embeddings vetoriais e citações autorizadas para que os motores generativos escolham e citem seu negócio primeiro.',
      icon: 'Bot',
      stickerColor: 'accent-purple',
      badgeText: 'Busca na era IA',
      metrics: [
        { value: '+420%', label: 'Taxa de citação em motores de resposta IA' },
        { value: '#1', label: 'Entidade recomendada nas buscas-alvo' },
        { value: '4 motores', label: 'ChatGPT, Gemini, Perplexity, Claude' },
      ],
      deliverables: [
        'Verificação e otimização de entidade e grafo de conhecimento IA',
        'Auditoria de citações generativas em ChatGPT Search, Gemini, Perplexity e AI Overviews',
        'Estruturação semântica de conteúdo otimizada para ingestão por LLM',
        'Citações de entidade em Wikidata, Crunchbase, Schema.org e contextos de alta autoridade',
        'Modelagem de FAQ e buscas conversacionais para vencer snippets de resposta IA',
        'Testes de simulação de prompts para medir recomendações IA em tempo real',
      ],
      process: [
        {
          step: '01',
          title: 'Auditoria de percepção IA e entidade',
          desc: 'Consultamos 5 LLMs principais com mais de 50 prompts localizados para medir quanto sua marca é citada ante concorrentes.',
        },
        {
          step: '02',
          title: 'Alinhamento do grafo de conhecimento',
          desc: 'Estruturamos suas definições de entidade em Schema, registros autorizados e fontes de validação terceiras.',
        },
        {
          step: '03',
          title: 'Otimização semântica de conteúdo',
          desc: 'Reescrevemos e formatamos seus ativos web-chave com marcação semântica, respostas diretas e tabelas de dados que LLMs adoram citar.',
        },
        {
          step: '04',
          title: 'Monitoramento contínuo de prompts',
          desc: 'Monitoramos as respostas dos motores generativos e refinamos os sinais de entidade para manter a dominância em recomendações IA.',
        },
      ],
      faqs: [
        {
          q: 'Qual a diferença entre AEO e GEO?',
          a: 'AEO (otimização para motores de resposta) entrega respostas diretas para busca por voz, AI Overviews e respostas rápidas. GEO (otimização para motores generativos) otimiza o perfil de entidade da sua marca para que modelos conversacionais (ChatGPT, Gemini, Perplexity) citem e recomendem seu negócio naturalmente.',
        },
        {
          q: 'Por que meu negócio local precisa de GEO agora?',
          a: 'Mais de 40% das buscas com intenção comercial já disparam respostas IA ou acontecem dentro de apps de IA. Se seu concorrente é o único citado pelo ChatGPT como o «melhor eletricista do norte de Austin», ele captura o lead de alta intenção antes de o cliente ver o Google.',
        },
      ],
    },
    {
      id: 'google-maps',
      slug: 'google-maps',
      title: 'Motor de crescimento do 3-pack do Google Maps',
      shortDescription:
        'Entre no top 3 do Google Maps em todo o seu território com Perfis da Empresa otimizados e sistemas de velocidade de avaliações.',
      fullDescription:
        'Os 3 primeiros resultados do pack do Google Maps capturam mais de 70% de todos os cliques e chamadas locais. Eliminamos zonas mortas do geo-grid e expandimos seu perímetro com otimização avançada do perfil, sistemas de fotos geo-marcadas, automação de avaliações e sinais de engajamento comportamental.',
      icon: 'Compass',
      stickerColor: 'accent-green',
      badgeText: 'Alta conversão',
      metrics: [
        { value: '+70%', label: 'Dos cliques locais capturados no 3-pack' },
        { value: '4.9', label: 'Avaliação média de avaliações de clientes, de 5' },
        { value: '8-24 km', label: 'Raio de ranqueamento geo-grid expandido' },
      ],
      deliverables: [
        'Reforma e verificação completas do seu Perfil da Empresa no Google (GBP)',
        'Testes de precisão de categorias primária e secundária para alcance máximo',
        'Mapas de calor geo-grid medindo seu ranqueamento a cada 0,8 km',
        'Sequências automatizadas SMS/e-mail para velocidade de avaliações constante',
        'Posts semanais GBP, novidades, catálogos e fotos geo-marcadas de alto engajamento',
        'Combate a spam: denúncia e remoção de listagens ilegítimas com keywords de concorrentes',
      ],
      process: [
        {
          step: '01',
          title: 'Mapeamento de rank geo-grid',
          desc: 'Executamos uma auditoria GPS multiponto para saber onde você ranqueia em cada quilômetro quadrado da sua cidade.',
        },
        {
          step: '02',
          title: 'Ajuste algorítmico do GBP',
          desc: 'Calibramos categorias, menus de serviços, atributos, horários e descrições para maximizar a relevância.',
        },
        {
          step: '03',
          title: 'Velocidade de avaliações e engajamento',
          desc: 'Implantamos fluxos de captura de avaliações sem fricção para gerar avaliações autênticas com keywords-alvo.',
        },
        {
          step: '04',
          title: 'Expansão de proximidade',
          desc: 'Construímos sinais localizados e landings que expandem seu raio para cidades e subúrbios vizinhos.',
        },
      ],
      faqs: [
        {
          q: 'Vocês ajudam a remover avaliações negativas falsas?',
          a: 'Auditamos cada avaliação contra as políticas do Google e apresentamos recursos formais para remover avaliações spam ou fraudulentas, diluindo as negativas legítimas com velocidade de avaliações positivas.',
        },
        {
          q: 'E se meus concorrentes enchem o nome de keywords?',
          a: 'Monitoramos seu geo-grid contra concorrentes que violam as diretrizes com keywords ou endereços falsos, e apresentamos denúncias diretas para liberar os 3 primeiros lugares para sua listagem legítima.',
        },
      ],
    },
  ],
  nl: [
    {
      id: 'local-seo',
      slug: 'local-seo',
      title: 'Lokale SEO & hyperlokale zichtbaarheid',
      shortDescription:
        'Domineer gelokaliseerde zoekopdrachten in je werkgebied. Wij bouwen hoogautoritaire lokale vermeldingen, locatiepagina’s en gestructureerde geosignalen.',
      fullDescription:
        'Als klanten in je stad naar jouw exacte dienst zoeken, sta je dan in de top organische resultaten? Onze local-SEO-infrastructuur optimaliseert technische signalen, bouwt locatiespecifieke contentsilo’s en creëert hyperlokale autoriteit die concurrenten permanent verslaat.',
      icon: 'MapPin',
      stickerColor: 'accent-sky',
      badgeText: 'Veel vraag',
      metrics: [
        { value: '+340%', label: 'Gemiddelde lift van lokaal organisch verkeer' },
        { value: '3,8x', label: 'Meer inkomende oproepen & boekingen' },
        { value: '90 dagen', label: 'Typische realisatie van doelranking' },
      ],
      deliverables: [
        'Hyperlokaal zoekwoord- & intentonderzoek voor je werkstralen',
        'Volledige on-page-optimalisatie met gelokaliseerde Schema.org-JSON-LD-markup',
        'Gelokaliseerde silo-architectuur & converterende werkgebied-landingspagina’s',
        'Schone NAP-synchronisatie over 70+ directories',
        'Concurrentie-gap-analyse en geo-targeted backlink-acquisitie',
        'Maandelijkse transparante rapportage van zoekwoordbewegingen en oproepvolume',
      ],
      process: [
        {
          step: '01',
          title: 'Lokale markt- & techniekaudit',
          desc: 'We diagnosticeren je domeingezondheid, NAP-consistentie, lokale entityprofiel en geo-voetafdrukken van concurrenten.',
        },
        {
          step: '02',
          title: 'Geo-architectuur & schema-engineering',
          desc: 'We injecteren robuust LocalBusiness-schema, optimaliseren metadata en bouwen landingspagina’s per wijk.',
        },
        {
          step: '03',
          title: 'Vermelding- & autoriteitssyndicatie',
          desc: 'We syndiceren je bedrijfsgegevens over hoogwaardige data-aggregators en borgen lokale relevantievermeldingen.',
        },
        {
          step: '04',
          title: 'Conversietracking & opschaling',
          desc: 'We tracken oproepen, routaanvragen en organische conversies en stellen de focus bij om je rankingradius te vergroten.',
        },
      ],
      faqs: [
        {
          q: 'Waarin verschilt lokale SEO van normale SEO?',
          a: 'Lokale SEO richt zich op geografische zoekintentie («HVAC-nooddienst in de buurt» of «loodgieter in Dallas»). De focus ligt op Maps-3-pack-rankings, gelokaliseerd schema, nabijheidssignalen en lokale directoryvermeldingen.',
        },
        {
          q: 'Hoe snel verbeteren mijn rankings?',
          a: 'De meeste lokale bedrijven zien binnen 30–60 dagen meetbare beweging, met flinke rankingsprongen en oproeppieken tussen 60 en 90 dagen.',
        },
      ],
    },
    {
      id: 'aeo-geo',
      slug: 'aeo-geo',
      title: 'AEO & generatieve engine-optimalisatie (GEO)',
      shortDescription:
        'Word aanbevolen door ChatGPT, Gemini, Perplexity en Google AI Overviews als een prospect de AI naar de beste lokale aanbieder vraagt.',
      fullDescription:
        'Moderne zoekers vragen AI-assistenten om aanbevelingen in plaats van op 10 blauwe links te klikken. Als een AI-engine je entity niet begrijpt, ben je onzichtbaar. Wij bouwen je merkpresentie over AI-kennisgrafen, vector-embeddings en autoritaire vermeldingen zodat generatieve engines jouw bedrijf als eerste kiezen en citeren.',
      icon: 'Bot',
      stickerColor: 'accent-purple',
      badgeText: 'Zoeken in het AI-tijdperk',
      metrics: [
        { value: '+420%', label: 'AI-antwoordmachine-citatieratio' },
        { value: '#1', label: 'Aanbevolen entity bij doelzoekopdrachten' },
        { value: '4 engines', label: 'ChatGPT, Gemini, Perplexity, Claude' },
      ],
      deliverables: [
        'AI-kennisgraaf- en entityverificatie en -optimalisatie',
        'Generatieve-engine-citatieaudit over ChatGPT Search, Gemini, Perplexity & AI Overviews',
        'Semantische contentstructurering geoptimaliseerd voor LLM-ingestie',
        'Wikidata-, Crunchbase-, Schema.org- en hoogautoritaire contextuele entityvermeldingen',
        'FAQ- & conversationele-querymodellering voor directe AI-antwoordsnippets',
        'Promptsimulatietests voor realtime AI-aanbevelingen',
      ],
      process: [
        {
          step: '01',
          title: 'AI-perceptie- & entityaudit',
          desc: 'We bevragen 5 grote LLM’s met 50+ gelokaliseerde prompts en benchmarken hoe vaak je merk vs. concurrenten wordt geciteerd.',
        },
        {
          step: '02',
          title: 'Kennisgraaf-alignment',
          desc: 'We structureren je entitydefinities over schema, autoritaire registers en third-party-validatiebronnen.',
        },
        {
          step: '03',
          title: 'Semantische contentoptimalisatie',
          desc: 'We herschrijven en formatteren kernassets met semantische markup, heldere directe antwoorden en datatabellen die LLM’s graag citeren.',
        },
        {
          step: '04',
          title: 'Continue prompttracking',
          desc: 'We monitoren generatieve antwoordoutputs doorlopend en verfijnen entitysignalen om AI-aanbevelingsdominantie te behouden.',
        },
      ],
      faqs: [
        {
          q: 'Wat is AEO vs. GEO?',
          a: 'AEO (antwoordmachine-optimalisatie) levert directe, beknopte antwoorden voor voice search, AI Overviews en quick answers. GEO (generatieve engine-optimalisatie) optimaliseert je merk-entityprofiel zodat conversationele AI-modellen (ChatGPT, Gemini, Perplexity) je bedrijf vanzelf citeren en aanbevelen.',
        },
        {
          q: 'Waarom hebben lokale bedrijven GEO juist nu nodig?',
          a: 'Ruim 40% van de queries met commerciële intent triggert nu AI-antwoorden of vindt plaats in AI-apps. Als jouw lokale concurrent als enige door ChatGPT wordt geciteerd als «beste elektricien in Noord-Austin», pakt hij de high-intent lead voordat de klant ooit Google ziet.',
        },
      ],
    },
    {
      id: 'google-maps',
      slug: 'google-maps',
      title: 'Google Maps 3-pack-groeimotor',
      shortDescription:
        'Rank in de top 3 op Google Maps in je hele doelgebied met geoptimaliseerde bedrijfsprofielen en review-velocity-systemen.',
      fullDescription:
        'De top 3 listings in het Google Maps-pack pakken ruim 70% van alle lokale klikken en oproepen. We elimineren geo-grid-dode zones en vergroten je perimeter met profieloptimalisatie, geo-tag-fotosystemen, reviewresponsautomatisering en gedragsmatige engagementsignalen.',
      icon: 'Compass',
      stickerColor: 'accent-green',
      badgeText: 'Hoge conversie',
      metrics: [
        { value: '70%+', label: 'Van alle lokale klikken in de 3-pack' },
        { value: '4,9', label: 'Gemiddelde klantreviewscore, van 5' },
        { value: '8–24 km', label: 'Vergrote geo-grid-rankingradius' },
      ],
      deliverables: [
        'Complete Google-bedrijfsprofiel-(GBP-)overhaul & verificatie',
        'Primaire & secundaire categorie-precisietests voor maximaal bereik',
        'Geo-grid-ranking-heatmaps elke 0,8 km',
        'Geautomatiseerde sms-/e-mail-reviewsequenties voor gestage review-velocity',
        'GBP-weekposts, updates, productcatalogi & geo-tag-fotouploads met veel engagement',
        'Spam-bestrijding: melding en verwijdering van onrechtmatige keyword-gestopte listings',
      ],
      process: [
        {
          step: '01',
          title: 'Geo-grid-rankmapping',
          desc: 'We draaien een multipoint-gps-gridaudit om te zien waar je op elke vierkante kilometer van je stad rankt.',
        },
        {
          step: '02',
          title: 'GBP-algoritmetuning',
          desc: 'We kalibreren categorieën, dienstmenu’s, attributen, tijden en beschrijvingen voor maximale relevantiescore.',
        },
        {
          step: '03',
          title: 'Review-velocity & engagement',
          desc: 'We deployen frictieloze review-capture-workflows voor authentieke klantreviews met doelkeywords.',
        },
        {
          step: '04',
          title: 'Nabijheidsexpansie',
          desc: 'We bouwen gelokaliseerde signalen en landingspagina’s die je radius naar buursteden en suburbs vergroten.',
        },
      ],
      faqs: [
        {
          q: 'Kunnen jullie nep-negatieve reviews laten verwijderen?',
          a: 'We auditen alle reviews tegen Googles beleid en dienen formele beleidsschendingsberoepen in om spam- of frauduleuze reviews te verwijderen, terwijl we legitieme negatieven verdunnen met positieve review-velocity.',
        },
        {
          q: 'Wat als concurrenten hun bedrijfsnaam volstoppen met keywords?',
          a: 'We monitoren je geo-grid op concurrenten die met nepkeywords of nepadressen Googles richtlijnen schenden, en dienen directe redressalklachten in om de top 3 vrij te maken voor je legitieme listing.',
        },
      ],
    },
  ],
};
