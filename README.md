# RR Recruitment Hub

Interne webapplicatie voor RR Recruitment. Next.js (App Router) + TypeScript +
Tailwind CSS, met Supabase (PostgreSQL, regio Frankfurt) voor data en auth.

Dit is de basisopzet uit **fase 0**: projectstructuur, Supabase-clients en lege
navigatie. Nog geen functionaliteit.

## Stack

- **Next.js 16** met de App Router en Turbopack
- **TypeScript**, strict
- **Tailwind CSS v4**
- **@supabase/ssr** voor server- en client-side Supabase-clients
- Hosting op **Vercel** (development en productie gescheiden)

## Aan de slag

```bash
npm install
cp .env.example .env.local   # vul de Supabase-waarden in
npm run dev
```

De app draait op http://localhost:3000 en stuurt door naar `/dashboard`.

### Environment variables

Zie `.env.example`. Voor de basisopzet zijn nodig:

| Variabele                       | Waar te vinden                                  |
| ------------------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase Dashboard → Project Settings → API    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API    |

De service role key en de Anthropic API key komen later en blijven strikt
server-side. `.env.local` staat in `.gitignore`.

## Projectstructuur

Elke module volgt hetzelfde patroon (blauwdruk = Klanten):

```
<module>/
  page.tsx              lijst
  nieuw/page.tsx        aanmaken
  [id]/page.tsx         bewerken + verwijderen
  <naam>-form.tsx       gedeeld client-formulier (useActionState)
  actions.ts            server actions ("use server"), zetten organization_id;
                        RLS scoped read/update/delete
```

```
src/
  app/
    (app)/                 route group met de gedeelde app-shell (sidebar)
      dashboard/           behaalde omzet + prognose lopende/volgende maand
      klanten/  contactpersonen/  vacatures/  kandidaten/
      placements/          incl. gecombineerde factuurregistratie
      facturen/            registratie; concept -> verzonden legt sent_at vast
      tools/fee-calculator/
    login/  auth/confirm/
    layout.tsx             root layout
    page.tsx               redirect naar /dashboard
  components/              sidebar, page-header, status-badges, ui-klassen
  lib/
    database.types.ts      handgeschreven Database-type (typet de clients)
    types.ts               rij-types + status-unions/labels
    form.ts  format.ts     form- en formatteer-helpers
    nav.ts                 navigatieconfiguratie
  utils/supabase/
    client.ts server.ts    browser- en server-client
    auth.ts                getSessionContext(): user + organization_id
    proxy.ts               sessie verversen + gating per request
  proxy.ts                 Next.js 16 Proxy (voorheen middleware.ts)

supabase/
  migrations/              versiebeheerde SQL-migraties
  seed.sql                 dev: koppel je account als organisatie-owner
docs/
  rr-recruitment-hub-ontwerp.md   functioneel ontwerp
```

Sollicitatieprocedures (`applications`) hebben geen eigen pagina maar leven als
pipeline op de vacaturedetailpagina. `fee_agreements` heeft nog geen UI; de
fee calculator is een losstaand rekentooltje.

## Database

Het MVP-schema staat in `supabase/migrations/001_init_mvp_schema.sql` en is al
uitgevoerd op het development-project. Row Level Security staat op elke tabel aan;
schemawijzigingen gaan uitsluitend via nieuwe migratiebestanden, nooit handmatig
op productie.

## Authenticatie

Supabase Auth met e-mail + wachtwoord. `/login` bevat het inlogformulier;
`src/utils/supabase/proxy.ts` stuurt niet-ingelogde bezoekers daarheen en
`src/app/(app)/layout.tsx` doet dezelfde check nog eens server-side.

Nieuwe gebruiker toevoegen (er is bewust geen publieke aanmeldpagina):

1. Supabase Dashboard → Authentication → Users → **Add user** (met "Auto
   Confirm User" aan).
2. `supabase/seed.sql` openen, het e-mailadres invullen en in de Supabase
   **SQL Editor** draaien. Dat maakt de organisatie aan en koppelt de
   gebruiker als `owner`. Zonder dat lidmaatschap toont RLS geen data.

## Volgende stappen (fase 0 afmaken)

- Eerste echte module (bijv. Klanten) als blauwdruk voor CRUD + RLS
- Vercel-project koppelen met gescheiden dev/prod environments
