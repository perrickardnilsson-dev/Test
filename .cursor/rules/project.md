# Cursor-prompt: Modulär ERP-plattform för tillverkande företag

> **Monorepo-layout:** NO-lärarplattformen lever i repots rot. ERP-prototypen lever i `/erp` (egen Next.js-app med `/erp/app`, `/erp/core`, `/erp/modules`). Alla sökvägar nedan är relativa till `/erp` om inget annat anges. Lärarplattformen ska behållas parallellt — ersätt den inte.

> Klistra in hela detta dokument som din första prompt i Cursor (eller spara som `.cursor/rules/project.md` så att den alltid är i kontext). Kör sedan fas för fas.

---

## 1. Vad vi bygger

Vi bygger **grunden till ett molnbaserat affärssystem (ERP) för små och medelstora tillverkande företag i Norden**. Förebilden är svenska Monitor ERP, men vår tes är att motsvarande funktionalitet går att leverera med **radikalt enklare användarupplevelse**.

Det här är en **pitch-prototyp**, inte ett färdigt system. Målet är att kunna visa:

1. En **arkitektonisk grund** där affärsmoduler kan hängas på en i taget utan att koden faller isär.
2. **En modul byggd på djupet** — Lager & Artiklar — så trovärdig att en produktionschef nickar igenkännande.
3. **Multi-tenant SaaS** där ett nytt kundföretag skapas på sekunder.
4. En UX som får en Monitor-användare att säga "vänta, är det bara så här många klick?".

Prototypen ska kännas som en riktig produkt, inte en demo. Men den ska inte försöka bli komplett.

**Viktigt om upphovsrätt:** Vi kopierar inte Monitors kod, gränssnitt, ikoner, texter eller skärmbilder. Vi bygger vår egen lösning på samma välkända domänbegrepp inom tillverkningsindustri (artikel, lagerplats, nettobehovskörning m.m.), vilket är standardterminologi i branschen.

---

## 2. Domänen — så här fungerar ett tillverknings-ERP

Läs det här innan du skriver kod. Domänen är hela poängen; UI:t är enkelt i jämförelse.

Ett tillverkande företag har fem flöden som möts i lagret:

```
Prognos + Kundorder        →  EFTERFRÅGAN (demand)
Inköpsorder + Tillv.order  →  TILLGÅNG   (supply)
                    ↓
              LAGERSALDO (per artikel, lagerplats, batch/serienummer)
                    ↓
            SPÅRBARHET (vad blev vad, åt båda hållen)
```

**Centrala begrepp (använd exakt dessa namn i kod och UI, på svenska i UI):**

| Svenska | Engelska (kod) | Betydelse |
|---|---|---|
| Artikel | `part` | Allt som köps, tillverkas eller säljs. Systemets nav. |
| Artikelnummer | `partNumber` | Kundens egna nummerserie, ej vår ID. |
| Artikelstruktur / BOM | `bom` | Vilka artiklar som ingår i en tillverkad artikel. |
| Lagerställe | `warehouse` | Fysisk lagerbyggnad/enhet. |
| Lagerplats | `stockLocation` | Hylla/plats inom ett lagerställe. |
| Lagersaldo | `stockBalance` | Antal per artikel + plats + batch/individ. |
| Lagertransaktion | `stockTransaction` | Oföränderlig händelse: in, ut, flytt, justering. |
| Batch / Charge | `batch` | Grupp av enheter med gemensamt ursprung. |
| Individ / Serienummer | `serialUnit` | Enskild spårad enhet. |
| Behovsberäkning | `requirementCalculation` | Beräknar framtida behov per artikel. |
| Nettobehovskörning (NBK) | `netRequirementRun` | Nettar behov mot tillgång och lämnar förslag. |
| Inköpsförslag | `purchaseSuggestion` | Utfall av NBK: köp X st till datum Y. |
| Tillverkningsförslag | `manufacturingSuggestion` | Utfall av NBK: tillverka X st till datum Y. |
| Säkerhetslager | `safetyStock` | Buffert som aldrig ska planeras bort. |
| Ledtid | `leadTimeDays` | Tid från beställning till tillgänglighet. |
| Inventering | `inventoryCount` | Räkning och avstämning av faktiskt saldo. |
| PIA | `wip` | Produkter i arbete — värde bundet i pågående tillverkning. |

**Spårbarhet** är det som säljer systemet till metall-, livsmedels- och medtech-kunder. Den ska fungera åt båda hållen:
- **Bakåt:** "Denna levererade produkt — vilka batcher av råmaterial sitter i den, och från vilken leverantör?"
- **Framåt:** "Leverantören återkallar batch B-4471 — vilka kundorder är drabbade?"

Detta modelleras som en **genealogi-graf**: varje förbrukning i en tillverkningsorder skapar en kant från konsumerad batch/individ till producerad batch/individ.

---

## 3. Teknisk stack (bestämd — ifrågasätt inte utan att fråga)

- **Next.js 15**, App Router, TypeScript strict mode
- **PostgreSQL 16** + **Drizzle ORM** (migrations i repo, ingen ORM-magi som gömmer SQL)
- **Better Auth** med organization-plugin för användare, organisationer och roller
- **Tailwind CSS + shadcn/ui** som bas, men se UX-avsnittet — vi ska inte se ut som varenda shadcn-app
- **TanStack Table** för alla listvyer, **TanStack Query** endast där server components inte räcker
- **Zod** för all validering, delad mellan klient och server
- **Server Actions** för mutationer, Route Handlers endast för publikt API
- **Vitest** för domänlogik, **Playwright** för de kritiska flödena
- **Docker Compose** för lokal Postgres

Kör allt i en **modulär monolit**. Inga mikrotjänster. Ingen event-buss över nätverk. Vi ska kunna deploya med en knapptryckning.

---

## 4. Arkitektur

### 4.1 Katalogstruktur

ERP-appen ligger under `/erp` i monorepot (NO-lärarplattformen äger roten):

```
/erp
  /app                      Next.js routes (tunna — bara komposition)
    /(auth)                 inloggning, registrering
    /(app)/[orgSlug]/...    allt bakom inloggning, tenant i URL
  /core                     plattformen — modulerna beror på denna, aldrig tvärtom
    /db                     schema, migrations, tenant-scopad klient
    /auth                   session, roller, behörighet
    /module-registry        modulregistret (se nedan)
    /numbering              nummerserier (artikelnr, ordernr...)
    /audit                  händelselogg
    /events                 in-process event-buss
    /ui                     designsystem, layout, tabell, kommandopalett
  /modules
    /inventory              LAGER & ARTIKLAR — bygg denna på djupet
    /purchasing             stubbe (nav + tomma vyer)
    /sales                  stubbe
    /manufacturing          stubbe
    /timekeeping            stubbe
    /accounting             stubbe
  /tests
```

### 4.2 Modulkontrakt

Varje modul exponerar ett manifest. Registret läser manifesten och bygger navigation, behörigheter och sidor. **Att lägga till en modul ska inte kräva ändringar i `/core`.**

```ts
export interface ModuleManifest {
  id: string;                    // 'inventory'
  name: string;                  // 'Lager'
  icon: LucideIcon;
  enabledByDefault: boolean;     // för paketering: Basic / Plus / Enterprise
  nav: NavItem[];                // vad som syns i vänstermenyn
  permissions: PermissionDef[];  // 'inventory.part.write' etc
  schema: DrizzleSchema;         // modulens tabeller
  seed?: (ctx: SeedContext) => Promise<void>;
  onEvent?: EventHandlerMap;     // reagera på andra modulers händelser
}
```

Regler som ska hålla:
- Moduler pratar med varandra **endast** via events eller publika service-funktioner — aldrig genom att importera varandras databastabeller direkt.
- All datamodell tillhör exakt en modul.
- `/core` känner inte till någon modul vid namn.

### 4.3 Multi-tenancy

Varje kundföretag är en **organisation**. En användare kan tillhöra flera.

- **Varje** affärstabell har `organizationId uuid not null`.
- **PostgreSQL Row Level Security aktiveras på alla dessa tabeller.** Sessionens organisation sätts med `SET LOCAL app.current_org` i en transaktion; RLS-policyn filtrerar. Detta är säkerhetsnätet — appkoden ska filtrera också, men RLS är det som gör att en glömd `where` inte läcker data mellan kunder.
- All databasåtkomst går genom `getTenantDb(orgId)`. **Direkt import av den råa db-klienten i modulkod ska ge ESLint-fel.**
- Nummerserier (artikelnummer, ordernummer) är per organisation.
- Skriv ett test som verifierar att organisation A inte kan läsa organisation B:s data ens vid en medvetet trasig query.

---

## 5. UX — projektets viktigaste differentiator

Klassiska ERP-system är byggda för utbildade operatörer, inte för människor. Vi vänder på det. Följ dessa regler:

1. **Kommandopalett (Cmd/Ctrl+K) är primär navigation.** Sök artiklar, hoppa till vyer, kör åtgärder. Vänstermenyn finns, men proffsen ska aldrig behöva den.
2. **Progressiv avslöjning.** Nya artiklar skapas med fyra fält: nummer, benämning, enhet, typ. Allt annat — kalkyler, planeringsparametrar, spårbarhetsläge — ligger bakom "Fler inställningar" med vettiga defaults.
3. **Max en primär handling per vy.** Ingen skärm får ha tolv likvärdiga knappar.
4. **Inga modaler ovanpå modaler.** Använd sidopaneler (sheets) och inline-redigering.
5. **Tabeller som gör jobbet:** sökning, kolumnval, sparade vyer, tangentbordsnavigering, radexpansion. Alla listvyer använder samma komponent.
6. **Skriv på svenska, begripligt.** Inte "NBK-körning avslutad med 47 poster" utan "Klart — 47 artiklar behöver beställas de närmaste 30 dagarna." Behåll facktermerna, förklara dem inline.
7. **Optimistiska uppdateringar** överallt. Systemet ska kännas snabbt.
8. **Mobil är förstklassig i lagret.** Plocka, inleverera och inventera ska fungera på en telefon med kameraskanning, inte som en nedkrympt desktopvy.
9. **Visuell riktning:** lugn, tät, professionell. Inte SaaS-pastell. Riktig informationsdensitet i listor, generöst luftigt i formulär. Välj en typografi och en accentfärg och håll dig till dem — den ska inte se ut som en standardmall.

---

## 6. Datamodell — modulen Lager & Artiklar

Skapa detta i `/modules/inventory`. Alla tabeller har `organizationId`, `createdAt`, `updatedAt`, `createdBy`.

**`part` — artikel**
`partNumber` (unik per org), `description`, `unit` (st/kg/m/liter/timme), `type` (`purchased` | `manufactured` | `phantom` | `service`), `partGroupId`, `status` (`active` | `blocked` | `phased_out`), `standardCost`, `salesPrice`, `leadTimeDays`, `safetyStock`, `reorderPoint`, `lotSizingRule` (`lot_for_lot` | `fixed_qty` | `min_qty` | `economic_order_qty`), `lotSize`, `planningMethod` (`mrp` | `reorder_point` | `manual`), `traceabilityMode` (`none` | `batch` | `serial`), `defaultLocationId`, `weightKg`, `notes`

**`partGroup`** — varugrupp, hierarkisk (`parentId`).

**`bom` / `bomLine`** — artikelstruktur. `bom` hör till en tillverkad artikel och har `revision`, `validFrom`, `status`. `bomLine` har `componentPartId`, `quantityPer`, `scrapPercent`, `position`.
Beräkna och lagra **low-level code** per artikel (djupaste nivå den förekommer på) — det behövs för korrekt nivåvis MRP.

**`warehouse` / `stockLocation`** — lagerställe och plats. Plats har `code` (t.ex. `A-12-3`), `zone`, `pickSequence`, `type` (`picking` | `bulk` | `quarantine` | `wip`).

**`batch`** — `batchNumber`, `partId`, `supplierBatchNumber`, `productionDate`, `expiryDate`, `certificateRef`, `status` (`available` | `quarantine` | `blocked`).

**`serialUnit`** — `serialNumber`, `partId`, `batchId?`, `status`, `currentLocationId`.

**`stockBalance`** — materialiserad vy/tabell: `partId` + `locationId` + `batchId?` → `quantity`, `reservedQuantity`, `averageCost`. Unik nyckel på kombinationen. **Uppdateras enbart via transaktioner, aldrig direkt.**

**`stockTransaction`** — oföränderlig huvudbok. `type` (`receipt` | `issue` | `transfer` | `adjustment` | `count` | `scrap`), `partId`, `quantity` (tecken avgör riktning), `fromLocationId?`, `toLocationId?`, `batchId?`, `serialUnitId?`, `unitCost`, `referenceType` (`purchase_order` | `manufacturing_order` | `customer_order` | `manual` | `count`), `referenceId`, `postedAt`, `postedBy`, `note`.
Rader får **aldrig** raderas eller ändras. En felaktig transaktion rättas med en motbokning.

**`genealogyEdge`** — spårbarhetsgrafen. `consumedBatchId?`, `consumedSerialId?`, `producedBatchId?`, `producedSerialId?`, `quantity`, `manufacturingOrderRef`, `occurredAt`.

**`demandLine` / `supplyLine`** — generiska tidsatta behov och tillgångar så att MRP fungerar innan Sälj/Inköp/Tillverkning finns som moduler. Fält: `partId`, `quantity`, `dueDate`, `sourceType`, `sourceId`, `status`.

**`inventoryCount` / `inventoryCountLine`** — inventering. Rad har `expectedQuantity`, `countedQuantity`, `countedBy`, `countedAt`, `varianceValue`.

**`netRequirementRun` / `planningSuggestion`** — körning med tidsstämpel, parametrar och resultat. Förslag har `partId`, `suggestedType` (`purchase` | `manufacture`), `quantity`, `orderDate`, `dueDate`, `pegging` (JSON: vilket behov som utlöste det), `status` (`open` | `accepted` | `rejected`).

---

## 7. Domänlogik — det här måste vara korrekt

Lägg all logik i rena funktioner i `/modules/inventory/domain/`, utan databasberoenden. Testa med Vitest. Databaslagret anropar dem.

### 7.1 Lagerbokföring
- All saldoförändring går genom `postStockTransaction()`, i en transaktion, som både skriver händelsen och uppdaterar `stockBalance`.
- **Vägt genomsnittspris** som värderingsmetod: vid inleverans `nyttSnitt = (gammaltVärde + inlevereratVärde) / nyttAntal`. Uttag sker till aktuellt snittpris. Dokumentera valet — FIFO kan komma senare.
- Negativt saldo blockeras som standard, men ska kunna tillåtas per lagerställe via inställning.
- Reservationer minskar tillgängligt saldo utan att flytta något fysiskt.

### 7.2 Nettobehovskörning (MRP)
Detta är kronjuvelen. Implementera nivåvis:

```
1. Beräkna low-level code för alla artiklar utifrån BOM-strukturen.
2. För varje nivå, uppifrån och ned:
   a. Samla alla behov per artikel, sorterade på datum (kundorder, prognos, behov från nivån ovan).
   b. Samla tillgång: nuvarande saldo, öppna inköpsorder, öppna tillverkningsorder.
   c. Netta i tidsordning. Tillgängligt saldo får aldrig gå under säkerhetslagret.
   d. Vid underskott: skapa förslag med kvantitet enligt partiformningsregeln.
   e. Räkna tillbaka orderdatum = förfallodatum − ledtid (använd arbetsdagskalender).
   f. Om artikeln är tillverkad: spräng ned BOM:en och skapa behov på nästa nivå.
3. Spara pegging — varje förslag ska kunna svara på "varför föreslås detta?".
```

Fallgropar att hantera medvetet: cirkulära BOM:ar (avbryt med tydligt fel), fantomartiklar (spräng igenom utan att planera), och orderdatum som hamnar i det förflutna (flagga som "försenat — beställ omgående").

### 7.3 Spårbarhet
Traversera `genealogyEdge` rekursivt med en `WITH RECURSIVE`-query, båda riktningarna, med djupbegränsning. Presentera som ett expanderbart träd **och** en påverkanssammanfattning: "Batch B-4471 finns i 3 tillverkningsorder → 7 färdiga produkter → 4 kundleveranser till 3 kunder."

### 7.4 Inventering
Låst räkning: skapa inventeringsrader med förväntat saldo, registrera räknat antal, visa avvikelser med värde, kräv godkännande, bokför sedan justeringstransaktioner. Ingen justering utan spår.

---

## 8. Faser — bygg i denna ordning

Committa vid varje fasslut. Gå inte vidare med trasiga tester.

**Fas 0 — Skelett.** Next.js, TypeScript strict, Tailwind, shadcn, Drizzle, Docker Compose med Postgres, ESLint-regel som förbjuder direkt db-import i moduler. Health check-sida.

**Fas 1 — Plattform.** Better Auth med organisationer. RLS på plats med testet som bevisar isolering. Modulregister som bygger navigationen. Grundlayout: sidomeny, toppfält, kommandopalett. Skapa organisation-flöde.

**Fas 2 — Artikelregister.** CRUD med progressiv avslöjning. Varugrupper. Listvy med sök, filter, sparade vyer. Importera från CSV. Detta är första skärmen som ska kännas *bra* — lägg tid här.

**Fas 3 — Lagerstruktur och saldon.** Lagerställen, lagerplatser, transaktionsbokföring, saldovy per artikel och per plats, transaktionshistorik. Manuell in-/utleverans och flytt.

**Fas 4 — Batch och individ.** Spårbarhetsläge per artikel, batchregister, serienummer, genealogigraf, spårningsvy åt båda hållen. Seedad återkallningsdemo.

**Fas 5 — BOM och nettobehovskörning.** Strukturredigerare med trädvy, low-level code, MRP-motorn, förslagsvy där man kan acceptera/förkasta i bulk, pegging-förklaring per förslag.

**Fas 6 — Inventering.** Räkningsflöde inklusive mobilvy.

**Fas 7 — Mobilt lager.** Plocka, inleverera, inventera med streckkodsskanning via kameran (`BarcodeDetector` med Quagga/ZXing som fallback).

**Fas 8 — Pitch-läge.** Realistisk seed-data för ett fiktivt svenskt tillverkande bolag (~300 artiklar, 40 BOM:ar, 6 månaders historik, öppna order). Dashboard med de siffror en produktionschef faktiskt bryr sig om: bristlista, kommande behov, lagervärde, artiklar utan rörelse. Stubbmoduler synliga i menyn som "Kommer snart" så roadmapen syns i demon.

---

## 9. Kvalitetskrav

- TypeScript strict, inga `any`, inga `@ts-ignore` utan motiverande kommentar.
- All domänlogik enhetstestad. MRP-motorn ska ha minst 15 testfall inklusive flernivå-BOM, säkerhetslager, partiformning och försenade behov.
- Playwright-test för: skapa artikel → inleverera → tillverka → spåra → nettobehovskörning.
- Migrations i versionshantering, aldrig `db push` mot något annat än lokal utveckling.
- Varje modul har en `README.md` som förklarar dess datamodell och publika kontrakt.
- Skriv en `ARCHITECTURE.md` som förklarar modulregistret och tenancy-modellen för en ny utvecklare.

---

## 10. Utanför scope (bygg inte detta nu)

Redovisning på riktigt (verifikat, moms, SIE-export), lön, EDI, produktkonfigurator, maskinintegration, offertflöden, kundreskontra, hållbarhetsrapportering enligt CSRD. Lämna dem som stubbar. Vi visar en grund och en modul — inte ett halvfärdigt allt.

---

## 11. Så här ska du arbeta

- Fråga mig innan du inför ett större bibliotek eller avviker från stacken ovan.
- Bygg en fas i taget. Presentera vad du gjort och vad som är kvar innan du fortsätter.
- När domänlogiken är oklar — fråga hellre än gissa. Felaktig lagerlogik är värre än ingen lagerlogik.
- Föreslå förenklingar när du ser att jag överkomplicerar. Det här ska demoas, inte certifieras.

Börja med **Fas 0**. Bekräfta först din förståelse av arkitekturen med en kort sammanfattning, sätt sedan upp projektet.
