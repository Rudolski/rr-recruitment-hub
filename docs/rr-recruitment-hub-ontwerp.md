# RR Recruitment Hub — Functioneel Ontwerp

Versie 0.1 · Nog geen code, alleen ontwerp

## 1. Uitgangspunten

- Next.js, TypeScript, Tailwind CSS, Vercel hosting
- Supabase PostgreSQL (regio Frankfurt) en Supabase Auth
- Eén gebruiker bij start, ontwerp wel voorbereid op een tweede gebruiker later (denk aan Juul)
- Development en productie volledig gescheiden, geen productiedata in AI coding tools
- Row Level Security standaard aan, geen uitzonderingen
- Alle secrets uitsluitend server side
- Fictieve testdata tijdens de bouw

## 2. Pagina structuur (sitemap)

```
/dashboard
/klanten
/klanten/[id]                 (tabblad: gegevens, contacten, vacatures, placements, facturen, omzet)
/contactpersonen              (globaal overzicht, gekoppeld aan klant)
/vacatures
/vacatures/[id]                (tabblad: functie, sollicitatieprocedure, fee, gekoppelde kandidaten)
/kandidaten
/kandidaten/[id]
/placements
/placements/[id]
/facturen
/facturen/[id]
/rapportages/omzet-per-klant
/targets
/forecast
/tools/fee-calculator
/tools/contractgenerator
/tools/vacaturetekst
/tools/kandidaatintroductie
/tools/boolean-generator
/tools/outreach-generator
/instellingen
```

Sollicitatieprocedures krijgen geen eigen hoofdpagina maar leven als pipeline binnen een vacature (`/vacatures/[id]`), met een apart Kanban overzicht op `/pipeline` voor een cross vacature blik.

## 3. Database architectuur

### 3.1 Kerntabellen

**clients** (klanten)
`id, name, kvk_number, sector, region, status (prospect/actief/inactief), account_owner_id, notes, created_at, updated_at`

**contacts** (contactpersonen)
`id, client_id → clients, name, role, email, phone, is_primary, notes, created_at`

**vacancies** (vacatures)
`id, client_id → clients, title, function_group, location, salary_min, salary_max, employment_type, status (open/on hold/vervuld/geannuleerd), fee_agreement_id → fee_agreements, expected_fee, expected_close_month, success_probability, description, requirements, opened_at, closed_at, created_at`

De laatste drie velden voeden de forecast: verwachte fee, verwachte maand van sluiten en een percentage dat je zelf inschat. Dit vervangt je huidige Excel regel per vacature, bijvoorbeeld Udea Warehouse Manager, verwachte fee 11.000 euro, september, 50 procent kans.

**candidates** (kandidaten)
`id, name, email, phone, current_job_title, source, cv_link, status (in proces/beschikbaar/geplaatst/niet beschikbaar), notes, created_at`

**applications** (sollicitatieprocedures)
`id, vacancy_id → vacancies, candidate_id → candidates, stage (aangemeld/voorgesteld/gesprek1/gesprek2/aanbod/geplaatst/afgewezen/teruggetrokken), stage_updated_at, notes, created_at`

**placements**
`id, application_id → applications, client_id → clients, candidate_id → candidates, vacancy_id → vacancies, start_date, gross_annual_salary, fee_amount, fee_percentage, guarantee_months, guarantee_end_date, status (actief/uitval in garantie/afgerond), created_at`

**fee_agreements**
`id, client_id → clients, type (percentage/staffel/vast bedrag), percentage, fixed_amount, minimum_fee, valid_from, valid_until, notes`

Percentage ligt doorgaans tussen 18 en 25 procent. Eén klant werkt met een staffel, dat is de uitzondering, dus de staffel velden mogen leeg blijven bij de rest.

**invoices** (facturen)
`id, client_id → clients, placement_id → placements, invoice_number, entity_name, amount_excl_btw, btw_percentage, amount_incl_btw, status (concept/verzonden/betaald/te laat/gecrediteerd), sent_at, issue_date, due_date, paid_date, notes`

Belangrijk: facturen worden gemaakt in Snelstart Web, niet in de Hub. Deze tabel is dus geen factuurgenerator maar een registratie. Het factuurnummer voer je elke keer los in, zoals je nu ook in Snelstart doet, de Hub telt niet automatisch door. `entity_name` is een los invulveld voor het geval de factuur op naam van een andere entiteit van de klant staat, bijvoorbeeld Vos Bulk in plaats van Vos Logistics, puur ter referentie. De factuur hangt gewoon aan de klant, dus omzet per klant telt automatisch alles bij elkaar op, ongeacht welke naam er op de factuur stond. BTW staat standaard op 21 procent en alle omzetcijfers in de Hub, dashboard, forecast en rapportages, worden altijd exclusief BTW getoond.

Een nieuwe factuurregel start standaard op status concept, ook al heb je de bedragen en het factuurnummer al ingevuld. Pas als je 'm daadwerkelijk verstuurd hebt in Snelstart, zet je de status handmatig op verzonden, waarbij `sent_at` automatisch de datum van dat moment vastlegt. Dit is de extra controlestap die je zocht: pas na die bevestiging telt de factuur mee in behaalde omzet, dashboard en forecast. Zo voorkom je dat een factuur die je wel hebt voorbereid maar per ongeluk nog niet hebt verstuurd toch als omzet meetelt.

De praktische werkwijze: op het moment dat je een kandidaat plaatst en de factuur voorbereidt, vul je in één formulier klant, vacature, kandidaat, startdatum, fee en de factuurgegevens tegelijk in, met de factuur nog op concept. Zodra je de factuur echt verstuurt, vink je 'm af naar verzonden. Wil je de plaatsing eerder al vastleggen, bijvoorbeeld omdat de kandidaat begint voordat er gefactureerd is, dan kan dat ook, en voeg je de factuurregel later toe.

**monthly_targets**
`id, year, month, target_revenue, target_placements, created_at`

Je voert een target alleen per maand in. Kwartaal en jaar totalen worden niet apart ingevoerd maar automatisch opgeteld uit de bijbehorende maanden. Zo blijft er één plek waar je het target bepaalt, en kun je op elk niveau, maand, kwartaal of jaar, het target naast de behaalde omzet uit de facturen leggen om de voortgang te zien.

**generated_documents**
`id, type (contract/vacaturetekst/kandidaatintro/outreach/boolean), related_entity_type, related_entity_id, content, created_at`
Slaat elke AI gegenereerde tekst op als geschiedenis, zodat niets verloren gaat en je oude versies kunt terugvinden.

**onedrive_links**
`id, related_entity_type, related_entity_id, url, label, created_at`
Alleen een verwijzing naar de OneDrive locatie, geen bestandsopslag in de applicatie zelf.

### 3.2 Relaties

- Eén klant heeft meerdere contactpersonen, vacatures, fee afspraken, placements en facturen. Facturen kunnen een afwijkende entiteitsnaam als referentie meekrijgen, bijvoorbeeld als een klant onder een andere naam factureert, maar tellen altijd mee bij de klant zelf
- Eén vacature hoort bij één klant en heeft meerdere sollicitatieprocedures
- Eén kandidaat kan op meerdere vacatures solliciteren, dus meerdere sollicitatieprocedures
- Een sollicitatieprocedure resulteert in maximaal één placement
- Een placement hoort bij precies één klant, kandidaat en vacature, en kan meerdere facturen hebben (bijvoorbeeld bij gefaseerde facturatie)
- Forecast en targets zijn losstaand en worden berekend of ingevoerd per maand, niet gekoppeld aan één klant

### 3.3 Voorbereid op meerdere gebruikers

Voeg vanaf het begin een `organization_id` en `owner_id` toe aan elke tabel, ook al is er nu maar één gebruiker. Dat voorkomt een pijnlijke migratie zodra Juul toegang moet krijgen. RLS filtert in de MVP simpelweg op de enige bestaande organisatie, maar de structuur staat al klaar voor uitbreiding.

## 4. Securitymodel

**Authenticatie**
Supabase Auth met e-mail en wachtwoord, later eventueel uit te breiden met een tweede gebruiker binnen dezelfde organisatie.

**Row Level Security**
Elke tabel heeft een policy die alleen rijen toont waar `organization_id` overeenkomt met de organisatie van de ingelogde gebruiker. Geen enkele tabel is zonder RLS bereikbaar, ook niet tijdelijk tijdens ontwikkeling.

**Secrets**
- Supabase service role key alleen gebruikt in server components en API routes, nooit in client bundels
- Anthropic API key alleen server side, aangeroepen via een Next.js server action of API route die als proxy dient
- Alle keys via Vercel environment variables, gescheiden per omgeving

**Scheiding development en productie**
- Twee losse Supabase projecten, één voor development met uitsluitend fictieve data, één voor productie
- Twee losse Vercel omgevingen met eigen environment variables
- Schema wijzigingen via versiebeheerde SQL migraties, nooit handmatig in productie aangepast
- AI coding tools werken uitsluitend tegen de development database

**AVG**
- Dataminimalisatie: alleen vastleggen wat nodig is voor de recruitmentrelatie
- Bewaartermijn voor kandidaatgegevens vastleggen en na inactiviteit laten vervallen
- Verwerkersovereenkomsten afsluiten met Supabase en met Anthropic voor de API integratie
- Data blijft binnen de EU door de regiokeuze Frankfurt

## 5. Ontwikkelfasen

**Fase 0 — Fundament**
Project opzet, Supabase dev en prod omgeving, authenticatie, lege navigatie, deploy pipeline werkend.

**Fase 1 — MVP: de operationele kern en sturing**
Dashboard met behaalde omzet en prognose, Klanten, Contactpersonen, Vacatures met forecastvelden, Kandidaten, Sollicitatieprocedures, Placements, Facturen als registratie, Fee calculator. Geen AI, geen contractgenerator.

**Fase 2 — Verdere sturing**
Omzet per klant als apart rapportageoverzicht, Maandelijkse targets die automatisch doorrekenen naar kwartaal en jaar en afgezet worden tegen de behaalde omzet.

**Fase 3 — AI generatoren**
Contractgenerator, Vacaturetekstgenerator, Kandidaatintroductiegenerator, Boolean generator, Outreach en InMail generator. Alle via één centrale Claude API laag.

**Fase 4 — Afwerking**
OneDrive koppelingen, exportmogelijkheden, voorbereiding tweede gebruiker.

## 6. Dashboard, concreet

Behaalde omzet tot nu toe, gebaseerd op facturen met status verzonden of verder in het proces, exclusief BTW. Concept facturen tellen bewust nog niet mee. Filterbaar op klant en op een zelf in te stellen periode. Standaard staat de periode op dit jaar, met de mogelijkheid om een andere periode te kiezen.

Prognose voor de lopende maand en de volgende maand, opgebouwd uit alle openstaande vacatures met een ingevulde verwachte fee, verwachte maand en slagingspercentage. De rekenregel is simpel: verwachte fee vermenigvuldigd met slagingspercentage, opgeteld per maand. Voorbeeld: Udea Warehouse Manager, verwachte fee 11.000 euro, september, 50 procent, telt mee voor 5.500 euro in de septemberprognose.

## 7. MVP scope, concreet afgebakend

Wel in de MVP: Klanten, Contactpersonen, Vacatures inclusief de forecastvelden, Kandidaten, Sollicitatieprocedures, Placements met gecombineerde factuurregistratie, Fee calculator als losstaand rekentooltje, en het dashboard met behaalde omzet, zelf instelbare periode met dit jaar als standaard, en de prognose voor lopende en volgende maand zoals hierboven beschreven.

Niet in de MVP: Omzet per klant als apart rapportageoverzicht, Maandelijkse targets met de doorrekening naar kwartaal en jaar, alle tekstgeneratoren, Contractgenerator, OneDrive koppeling, Claude API integratie. Dit komt in latere fasen zodra de basis stabiel draait.

## 8. Welke onderdelen wel en geen AI nodig hebben

**Geen AI nodig, puur data en logica**
Dashboard, Klanten, Contactpersonen, Vacatures, Kandidaten, Sollicitatieprocedures, Placements, Facturen, Omzet per klant, Maandelijkse targets, Fee calculator, Forecast (rekenregel fee maal slagingspercentage, geen taalmodel nodig), OneDrive koppeling.

**Later Claude API, taalgedreven output**
Contractgenerator, Vacaturetekstgenerator, Kandidaatintroductiegenerator, LinkedIn Boolean generator, Outreach en InMail generator. Deze vijf lopen straks allemaal door dezelfde serverside laag die de Anthropic API aanroept, zodat de sleutel op één plek beheerd wordt en elke generator dezelfde stijl en kwaliteitscontrole deelt.

## 9. Toegang

Voorlopig ben jij de enige gebruiker. Juul krijgt geen toegang bij de start, mogelijk later tot losse modules. Het organization_id en owner_id ontwerp uit hoofdstuk 3.3 houdt hier al rekening mee, maar een systeem voor rechten per module bouwen we pas als dat daadwerkelijk nodig is.

## 10. Openstaande keuzes voor volgende stap

- Exacte staffel voor de ene klant die daarvan gebruikmaakt
- Of een target alleen op omzet stuurt, of ook op aantal placements per maand zoals de tabel nu al voorziet
