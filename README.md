# NO-provplattform för högstadiet

En webbplattform för NO-lärare (biologi, fysik, kemi, teknik) på högstadiet i
Sverige. Läraren tolkar gamla **frisläppta** nationella prov med AI, bygger
frågebank, genererar prov (bank + AI-mix), publicerar till klasser, och rättar
med AI-stöd som läraren granskar och godkänner. Eleverna gör proven digitalt i
ett rent provläge med autosparande svar.

All UI-text är på svenska. Byggd med Next.js 14 (App Router), TypeScript,
Tailwind CSS, shadcn/ui-komponenter, Supabase (Postgres, Auth, Storage, RLS)
och Anthropic Claude. Deploy-redo för Vercel.

## Funktioner per fas

- **Fas 1 – Konto & klasser:** E-post/lösenord-auth, roller (lärare/elev),
  klasser med automatisk klasskod, samt inbjudan via klasskod eller
  e-postlänk.
- **Fas 2 – Frågebank & PDF-ingestion:** Ladda upp frisläppta NP-PDF:er → Claude
  tolkar och extraherar frågor, alternativ, facit och bedömningsanvisningar →
  läraren granskar/redigerar och godkänner innan de sparas.
- **Fas 3 – Provgenerering:** Välj klass, arbetsområde (Lgr22), nivå (E/C/A),
  frågetyper och antal. Provet blandar riktiga bankfrågor med nygenererade
  AI-frågor. Förhandsgranska, redigera, byt ut frågor, sätt tidsfönster/
  tidsgräns och publicera.
- **Fas 4 – Elevens provläge:** Rent provläge (en fråga i taget eller alla på en
  sida, lärarens val), autosparande svar, tidsgräns med auto-inlämning.
- **Fas 5 – Rättning & resultat:** Flerval rättas automatiskt; kortsvar och
  fritext får AI-förslag på poäng + nivå + motivering som läraren godkänner
  eller justerar per svar. Rättning kan göras per fråga eller per elev, och
  alla AI-förslag kan godkännas i klump. Resultat publiceras och blir synliga
  för eleverna. Resultatöversikt per elev och per fråga (svåraste frågorna).

**Lärarverktyg under provet:** live-övervakning av pågående prov (vem skriver,
hur långt de kommit, vem har lämnat in), möjlighet att återöppna ett inlämnat
försök och att ge enskilda elever förlängd tid. Frågor kan dessutom ha bilder
(diagram, figurer, foton) som visas i provläget och resultatvyerna.

**Övrigt:** glömt lösenord-flöde via e-postlänk, duplicering av prov till
samma eller annan klass (t.ex. parallellklass eller nästa läsår), samt
CSV-export av resultat (Excel-vänlig med poäng per fråga, totalpoäng och
betygsnivå per elev).

## Frågetyper

- Flerval (ett rätt svar)
- Flerval (flera rätta svar)
- Kortsvar (rättas med AI mot facit)
- Fritext/resonemang (AI-förslag + lärargranskning, med bedömningsmatris E/C/A)

## Mappstruktur

```
app/
  (publikt)         # startsida, logga-in, registrera, inbjudan
  larare/           # lärarvy: översikt, klasser, frågebank, prov, rättning
  elev/             # elevvy: mina prov, klasser, provläge, resultat
  api/larare/       # serverside AI-routes (ingestion, generering, rättning)
components/
  ui/               # shadcn/ui-komponenter
  questions/        # frågeeditor och frågevisning
lib/
  ai/               # Anthropic-klient, prompts, zod-scheman, AI-flöden
  supabase/         # klient-, server- och middleware-hjälpare
  types.ts, constants.ts, lgr22.ts, grading.ts, utils.ts
supabase/
  migrations/       # SQL-schema med RLS, RPC:er och Storage-policyer
  seed.sql          # exempelfrågor i alla fyra ämnen
```

## Kom igång

### 1. Installera beroenden

```bash
npm install
```

### 2. Skapa ett Supabase-projekt

1. Skapa ett projekt på [supabase.com](https://supabase.com).
2. Kör SQL:en i `supabase/migrations/0001_init.sql` i **SQL Editor**
   (skapar tabeller, RLS-policyer, RPC:er och Storage-bucketen `np-pdfs`),
   följt av `supabase/migrations/0002_forbattringar.sql` (bildstöd i frågor,
   förlängd tid per elev, återöppning av försök och bucketen
   `question-images`).
3. Kör `supabase/seed.sql` för att lägga in exempelfrågor i alla fyra ämnen.
4. Under **Authentication → Providers** – aktivera e-post/lösenord. För enkel
   lokal testning kan du stänga av e-postbekräftelse.
5. Under **Authentication → URL Configuration** – sätt Site URL till din
   app-URL och lägg till `https://din-app/auth/confirm` (och motsvarande för
   `http://localhost:3000`) i Redirect URLs, så att
   glömt lösenord-länkarna fungerar.

### 3. Miljövariabler

Kopiera `.env.example` till `.env.local` och fyll i:

```bash
cp .env.example .env.local
```

| Variabel | Beskrivning |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Projektets URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon-nyckel |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role-nyckel (endast server) |
| `ANTHROPIC_API_KEY` | Din Anthropic-nyckel |
| `NEXT_PUBLIC_APP_URL` | Bas-URL för inbjudningslänkar |

### 4. Starta

```bash
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000). Skapa ett lärarkonto,
skapa en klass och testa flödet. Skapa sedan ett elevkonto (via klasskod eller
inbjudningslänk) i ett annat webbläsarfönster för att göra provet.

## Deploy till Vercel

1. Pusha repot till GitHub och importera i Vercel.
2. Lägg in samma miljövariabler i Vercel-projektet.
3. Deploya. AI-routes körs som serverfunktioner (`maxDuration` satt till 300 s
   för PDF-tolkning och rättning).

## Säkerhet & integritet

- **All AI körs på servern** – Anthropic-nyckeln exponeras aldrig mot klienten.
  Alla AI-svar valideras med zod och görs om vid ogiltig JSON.
- **Row Level Security** på alla tabeller: elever ser endast sina egna försök,
  svar och publicerade resultat; lärare ser endast sina egna klasser och deras
  data. Elevens provfrågor hämtas via RPC utan facit, och resultat lämnas ut
  först när läraren publicerat rättningen.
- **GDPR:** endast namn och e-post lagras om eleverna – inga personnummer.
- **Endast frisläppta prov:** plattformen hämtar aldrig prov automatiskt från
  nätet. Allt material laddas upp manuellt av läraren.
```
