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

```
src/
  app/
    (app)/                 route group met de gedeelde app-shell (sidebar)
      dashboard/
      klanten/
      contactpersonen/
      vacatures/
      kandidaten/
      placements/
      facturen/
      tools/fee-calculator/
    layout.tsx             root layout
    page.tsx               redirect naar /dashboard
  components/
    sidebar.tsx            navigatie
    placeholder-page.tsx   tijdelijke module-inhoud
  lib/
    nav.ts                 navigatieconfiguratie
  utils/supabase/
    client.ts              browser client
    server.ts              server client (Server Components, Actions, Handlers)
    proxy.ts               sessie verversen per request
  proxy.ts                 Next.js 16 Proxy (voorheen middleware.ts)

supabase/
  migrations/              versiebeheerde SQL-migraties
docs/
  rr-recruitment-hub-ontwerp.md   functioneel ontwerp
```

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
