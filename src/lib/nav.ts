/**
 * Navigatiestructuur voor de MVP. Alleen de modules uit hoofdstuk 7
 * van het functioneel ontwerp. Latere fasen (rapportages, targets,
 * forecast, AI-tools, instellingen) worden hier toegevoegd zodra ze
 * gebouwd worden.
 */

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
    ],
  },
  {
    title: "Relatiebeheer",
    items: [
      {
        label: "Klanten",
        href: "/klanten",
        description:
          "Opdrachtgevers met status prospect, actief of inactief, inclusief sector, regio en account owner.",
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
        label: "Kandidaten",
        href: "/kandidaten",
        description:
          "Kandidatenbestand met status, huidige functie, bron en verwijzing naar het cv.",
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
        label: "Fee-afspraken",
        href: "/fee-afspraken",
        description:
          "Percentage, staffel of vast bedrag per klant, met een eventuele minimum fee.",
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
];

export const navItems: NavItem[] = navSections.flatMap(
  (section) => section.items,
);
