/**
 * Navigatiestructuur van de Hub.
 */
import { GENERATORS } from "@/lib/generators";

export type NavItem = {
  label: string;
  href: string;
  /** Korte omschrijving. */
  description: string;
  /** Externe link — opent in een nieuw tabblad. */
  external?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    title: "Relatiebeheer",
    items: [
      {
        label: "Acquisitie",
        href: "/acquisitie",
        description:
          "De funnel per relatie en de openstaande opvolgacties.",
      },
      {
        label: "Klanten",
        href: "/klanten",
        description: "Opdrachtgevers met de status Klant.",
      },
      {
        label: "Prospects",
        href: "/prospects",
        description:
          "Relaties in de funnel: nieuw, in outreach, warm, afspraak gepland of voorstel gestuurd.",
      },
      {
        label: "Contactpersonen",
        href: "/contactpersonen",
        description: "Alle contactpersonen, gekoppeld aan een relatie.",
      },
      {
        label: "Archief",
        href: "/archief",
        description: "Inactieve relaties.",
      },
    ],
  },
  {
    title: "Werving",
    items: [
      {
        label: "Vacatures openstaand",
        href: "/vacatures",
        description:
          "Openstaande opdrachten met de forecastvelden (verwachte fee, maand, slagingskans).",
      },
      {
        label: "Placements",
        href: "/placements",
        description:
          "Geplaatste kandidaten met startdatum, fee, garantie en de factuurregels.",
      },
    ],
  },
  {
    title: "Financieel",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        description:
          "Behaalde omzet (netto/bruto), prognose en de opvolgacties van deze week.",
      },
      {
        label: "Targets",
        href: "/targets",
        description:
          "Maandtargets, automatisch opgeteld naar kwartaal en jaar en afgezet tegen de omzet.",
      },
      {
        label: "Omzet per klant",
        href: "/rapportages/omzet-per-klant",
        description:
          "Behaalde omzet per klant, per jaar, met doorklik naar de opbouw.",
      },
      {
        label: "Facturen",
        href: "/facturen",
        description:
          "Registratie van facturen uit Snelstart Web. Concept telt niet mee; verzonden en verder wel.",
      },
    ],
  },
  {
    title: "RR Recruitment",
    items: [
      {
        label: "Samenwerkingsovereenkomst",
        href: "/tools/samenwerkingsovereenkomst",
        description:
          "Vul de samenwerkingsovereenkomst per klant en download 'm als Word-document.",
      },
      {
        label: "Fee calculator",
        href: "/tools/fee-calculator",
        description:
          "Losstaand rekentooltje: fee op basis van jaarsalaris en percentage, geen opslag.",
      },
      {
        label: "Huisstijl & bestanden",
        href: "/rr-recruitment",
        description:
          "Logo's, beeldmerk, afbeeldingen en stijldocumenten centraal.",
      },
      {
        label: "Website (WordPress)",
        href: "https://rr-recruitment.nl/wp-admin/",
        description: "Beheeromgeving van de website.",
        external: true,
      },
      {
        label: "De Banensite",
        href: "https://accounts.debanensite.nl/login",
        description: "Vacaturesite-account.",
        external: true,
      },
      {
        label: "Snelstart Web",
        href: "https://web.snelstart.nl/",
        description: "Boekhouding en facturen.",
        external: true,
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
];

export const navItems: NavItem[] = navSections.flatMap(
  (section) => section.items,
);
