/**
 * Navigatiestructuur. MVP-modules plus fase 2 (targets, rapportages)
 * en fase 3 (AI-generatoren).
 */
import { GENERATORS } from "@/lib/generators";

export type NavItem = {
  label: string;
  href: string;
  /** Korte omschrijving, getoond op de placeholder-pagina. */
  description: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    title: "Overzicht",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        description:
          "Behaalde omzet (facturen vanaf status verzonden, excl. btw) en de prognose voor de lopende en volgende maand.",
      },
      {
        label: "Targets",
        href: "/targets",
        description:
          "Maandtargets voor omzet en plaatsingen, automatisch opgeteld naar kwartaal en jaar en afgezet tegen de behaalde omzet.",
      },
    ],
  },
  {
    title: "Relatiebeheer",
    items: [
      {
        label: "Acquisitie",
        href: "/acquisitie",
        description:
          "De acquisitie-funnel per klant en de openstaande opvolgacties.",
      },
      {
        label: "Klanten",
        href: "/klanten",
        description:
          "Opdrachtgevers met acquisitiestatus, sector, regio en account owner.",
      },
      {
        label: "Contactpersonen",
        href: "/contactpersonen",
        description:
          "Globaal overzicht van alle contactpersonen, elk gekoppeld aan een klant.",
      },
    ],
  },
  {
    title: "Werving",
    items: [
      {
        label: "Vacatures",
        href: "/vacatures",
        description:
          "Opdrachten per klant, met de forecastvelden verwachte fee, verwachte sluitingsmaand en slagingskans.",
      },
      {
        label: "Placements",
        href: "/placements",
        description:
          "Geplaatste kandidaten met startdatum, fee, garantietermijn en de gekoppelde factuurregistratie.",
      },
    ],
  },
  {
    title: "Financieel",
    items: [
      {
        label: "Samenwerkingsovereenkomst",
        href: "/tools/samenwerkingsovereenkomst",
        description:
          "Vul de samenwerkingsovereenkomst per klant en download 'm als Word-document.",
      },
      {
        label: "Facturen",
        href: "/facturen",
        description:
          "Registratie van facturen uit Snelstart Web. Start op concept; telt pas mee in de omzet na handmatig op verzonden zetten.",
      },
    ],
  },
  {
    title: "Rapportages",
    items: [
      {
        label: "Omzet per klant",
        href: "/rapportages/omzet-per-klant",
        description:
          "Behaalde omzet (facturen vanaf verzonden, excl. btw) per klant, per jaar.",
      },
    ],
  },
  {
    title: "Tools",
    items: [
      {
        label: "Fee calculator",
        href: "/tools/fee-calculator",
        description:
          "Losstaand rekentooltje: fee op basis van jaarsalaris en percentage, geen opslag.",
      },
    ],
  },
  {
    title: "AI-generatoren",
    items: GENERATORS.map((g) => ({
      label: g.label,
      href: `/tools/generator/${g.key}`,
      description: g.description,
    })),
  },
  {
    title: "RR Recruitment",
    items: [
      {
        label: "Huisstijl & bestanden",
        href: "/rr-recruitment",
        description:
          "Logo's, beeldmerk, afbeeldingen en stijldocumenten centraal.",
      },
    ],
  },
];

export const navItems: NavItem[] = navSections.flatMap(
  (section) => section.items,
);
